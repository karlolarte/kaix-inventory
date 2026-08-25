import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { BadRequestError, ConflictError } from '@/server/lib/httpError'
import { prisma, TRANSACTION_OPTIONS } from '@/server/lib/prisma'
import { usesDtf } from '@/server/lib/printType'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { recordFinishedGoodSale } from '@/server/services/SaleService'
import { idParamSchema } from '@/server/validators/common'

type Context = { params: Promise<{ id: string }> }

const printRunInclude = {
  items: { include: { design: true, colorway: true, sizes: true } },
} as const

export const POST = withAuth<Context>(async (_request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)

    const { printRun, stockDeducted } = await prisma.$transaction(async (tx) => {
      const run = await tx.printRun.findUniqueOrThrow({
        where: { id },
        include: {
          items: {
            include: {
              sizes: true,
              design: { select: { printType: true, designName: true } },
              colorway: true,
            },
          },
        },
      })

      if (run.status === 'FINISHED') {
        throw new ConflictError('This print run has already been finished.')
      }

      let stockDeducted = 0

      // Blank-shirt raw materials are named with the fit ("Boxy" / "Oversized")
      // in the title and carry their own color + size, so each printed size on
      // each design line is matched against the one blank that fits all three
      // before deducting.
      for (const item of run.items) {
        let totalFreshPieces = 0
        for (const sizeLine of item.sizes) {
          // This exact variation may already be sitting in On-Hand Stock —
          // meaning today's order for it was actually fulfilled from that
          // existing stock rather than needing a fresh print. Checked first
          // so the "fresh" quantity below excludes it: that stock was
          // already printed (and its blank/DTF sheet already consumed)
          // whenever it was originally made, so deducting the full requested
          // amount again here would double-count material for those pieces.
          const finishedGood = await tx.finishedGood.findFirst({
            where: {
              designId: item.designId,
              colorwayId: item.colorwayId,
              garmentStyle: item.garmentStyle,
              color: item.color,
              size: sizeLine.size,
            },
          })

          const covered =
            finishedGood && finishedGood.quantityOnHand > 0
              ? Math.min(finishedGood.quantityOnHand, sizeLine.quantity)
              : 0
          const freshQuantity = sizeLine.quantity - covered
          totalFreshPieces += freshQuantity

          if (covered > 0) {
            await tx.finishedGood.update({
              where: { id: finishedGood!.id },
              data: { quantityOnHand: { decrement: covered } },
            })
            await recordFinishedGoodSale(
              tx,
              {
                id: finishedGood!.id,
                designId: item.designId,
                designName: item.design.designName,
                garmentStyle: item.garmentStyle,
                color: item.color,
                size: sizeLine.size,
                unitPrice: finishedGood!.unitPrice,
              },
              covered,
            )
            stockDeducted += covered
          }

          // Nothing fresh needed for this size — it was fully covered by
          // existing stock above, so no blank is consumed and no raw
          // material record needs to exist for it.
          if (freshQuantity === 0) continue

          const rawMaterial = await tx.rawMaterial.findFirst({
            where: {
              name: { contains: item.garmentStyle, mode: 'insensitive' },
              color: { equals: item.color, mode: 'insensitive' },
              size: sizeLine.size,
            },
          })

          if (!rawMaterial) {
            throw new BadRequestError(
              `No raw material found for ${item.garmentStyle} / ${item.color} / ${sizeLine.size}.`,
            )
          }
          if (rawMaterial.quantity < freshQuantity) {
            throw new BadRequestError(
              `Not enough ${rawMaterial.name} (${rawMaterial.color} ${rawMaterial.size}) on hand — need ${freshQuantity}, have ${rawMaterial.quantity}.`,
            )
          }

          await tx.rawMaterial.update({
            where: { id: rawMaterial.id },
            data: { quantity: { decrement: freshQuantity } },
          })
        }

        // DTF lines also draw down on-hand printed-transfer-sheet stock,
        // tracked per colorway rather than per size — one printed sheet
        // covers the whole run of that colorway regardless of garment size.
        // Only the fresh portion needs a sheet; anything fulfilled from
        // existing On-Hand Stock already had its sheet consumed earlier.
        if (usesDtf(item.design.printType) && totalFreshPieces > 0) {
          if (!item.colorway) {
            throw new BadRequestError(
              `${item.garmentStyle} / ${item.color} is a DTF design line with no colorway set — can't deduct DTF print stock.`,
            )
          }
          if (item.colorway.dtfStockQuantity < totalFreshPieces) {
            throw new BadRequestError(
              `Not enough DTF print stock for "${item.colorway.colorwayName}" — need ${totalFreshPieces}, have ${item.colorway.dtfStockQuantity}.`,
            )
          }
          await tx.designColorway.update({
            where: { id: item.colorway.id },
            data: { dtfStockQuantity: { decrement: totalFreshPieces } },
          })
        }
      }

      const updated = await tx.printRun.update({
        where: { id },
        data: { status: 'FINISHED', finishedAt: new Date() },
        include: printRunInclude,
      })

      return { printRun: updated, stockDeducted }
    }, TRANSACTION_OPTIONS)

    logActivity({
      action: 'UPDATE',
      entityType: 'PrintRun',
      entityId: printRun.id,
      message:
        `Finished print run (${printRun.items.length} line${printRun.items.length === 1 ? '' : 's'}) — raw materials deducted` +
        (stockDeducted > 0 ? `, ${stockDeducted} pc${stockDeducted === 1 ? '' : 's'} fulfilled from on-hand stock` : ''),
      userId: user.sub,
    })
    return NextResponse.json({ ...printRun, stockDeducted })
  } catch (err) {
    return toErrorResponse(err)
  }
})
