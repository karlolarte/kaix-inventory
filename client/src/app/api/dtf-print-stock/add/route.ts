import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { addDtfStockSchema } from '@/server/validators/dtfPrintStock'

// Increments on-hand DTF print stock for one colorway. There's no separate
// "stock" resource — the running total lives directly on DesignColorway
// (dtfStockQuantity), the same way screensNeeded does, since it's a 1:1
// property of that colorway's print file. This endpoint is purely additive;
// finishing a print run is what decrements it.
export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const { colorwayId, quantity } = addDtfStockSchema.parse(body)
    const colorway = await prisma.designColorway.update({
      where: { id: colorwayId },
      data: { dtfStockQuantity: { increment: quantity } },
      include: { shirtDesign: true },
    })
    logActivity({
      action: 'STOCK_ADJUST',
      entityType: 'DesignColorway',
      entityId: colorway.id,
      message: `Added ${quantity} DTF sheet${quantity === 1 ? '' : 's'} for "${colorway.colorwayName}" — ${colorway.shirtDesign.designName} (now ${colorway.dtfStockQuantity})`,
      userId: user.sub,
    })
    return NextResponse.json(colorway)
  } catch (err) {
    return toErrorResponse(err)
  }
})
