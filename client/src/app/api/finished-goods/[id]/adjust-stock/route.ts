import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { BadRequestError } from '@/server/lib/httpError'
import { prisma, TRANSACTION_OPTIONS } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { recordFinishedGoodSale } from '@/server/services/SaleService'
import { idParamSchema } from '@/server/validators/common'
import { adjustStockSchema } from '@/server/validators/finishedGood'

type Context = { params: Promise<{ id: string }> }

export const POST = withAuth<Context>(async (request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const body = await request.json()
    const { delta, unitPrice } = adjustStockSchema.parse(body)

    const finishedGood = await prisma.$transaction(async (tx) => {
      const current = await tx.finishedGood.findUniqueOrThrow({
        where: { id },
        include: { design: true },
      })
      const nextQuantity = current.quantityOnHand + delta

      if (nextQuantity < 0) {
        throw new BadRequestError(
          `Adjustment would result in negative stock (${current.quantityOnHand} + ${delta}).`,
        )
      }

      // A negative delta means stock is leaving through a sale (as opposed to
      // a positive delta, which is new stock coming in) — log it so revenue
      // reporting has something real to work with.
      if (delta < 0) {
        await recordFinishedGoodSale(
          tx,
          {
            id: current.id,
            designId: current.designId,
            designName: current.design.designName,
            garmentStyle: current.garmentStyle,
            color: current.color,
            size: current.size,
            unitPrice: current.unitPrice,
          },
          -delta,
        )
      }

      return tx.finishedGood.update({
        where: { id },
        data: { quantityOnHand: nextQuantity, ...(unitPrice !== undefined ? { unitPrice } : {}) },
        include: { design: true, colorway: true },
      })
    }, TRANSACTION_OPTIONS)

    logActivity({
      action: 'STOCK_ADJUST',
      entityType: 'FinishedGood',
      entityId: finishedGood.id,
      message: `${delta >= 0 ? 'Restocked' : 'Sold'} ${Math.abs(delta)} × "${finishedGood.design.designName} — ${finishedGood.color} / ${finishedGood.size}" (now ${finishedGood.quantityOnHand})`,
      userId: user.sub,
    })
    return NextResponse.json(finishedGood)
  } catch (err) {
    return toErrorResponse(err)
  }
})
