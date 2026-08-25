import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { BadRequestError } from '@/server/lib/httpError'
import { prisma, TRANSACTION_OPTIONS } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { adjustStockBatchSchema } from '@/server/validators/rawMaterial'

export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const { adjustments } = adjustStockBatchSchema.parse(body)

    const updated = await prisma.$transaction(async (tx) => {
      const results = []
      for (const { id, delta } of adjustments) {
        const current = await tx.rawMaterial.findUniqueOrThrow({ where: { id } })
        const nextQuantity = current.quantity + delta

        if (nextQuantity < 0) {
          throw new BadRequestError(
            `Adjustment would result in negative stock for ${current.name} (${current.sku}).`,
          )
        }

        results.push(
          await tx.rawMaterial.update({
            where: { id },
            data: { quantity: nextQuantity },
            include: { category: true },
          }),
        )
      }
      return results
    }, TRANSACTION_OPTIONS)

    for (const material of updated) {
      const delta = adjustments.find((a) => a.id === material.id)!.delta
      logActivity({
        action: 'STOCK_ADJUST',
        entityType: 'RawMaterial',
        entityId: material.id,
        message: `${delta >= 0 ? 'Added' : 'Removed'} ${Math.abs(delta)} ${material.unit ?? 'unit'}${Math.abs(delta) === 1 ? '' : 's'} of "${material.name}" (now ${material.quantity})`,
        userId: user.sub,
      })
    }
    return NextResponse.json(updated)
  } catch (err) {
    return toErrorResponse(err)
  }
})
