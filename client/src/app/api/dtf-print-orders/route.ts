import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { createDtfPrintOrderSchema } from '@/server/validators/dtfPrintOrder'

const dtfPrintOrderInclude = { colorway: { include: { shirtDesign: true } } } as const

export const GET = withAuth(async () => {
  try {
    const orders = await prisma.dtfPrintOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: dtfPrintOrderInclude,
    })
    return NextResponse.json(orders)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const data = createDtfPrintOrderSchema.parse(body)
    const order = await prisma.dtfPrintOrder.create({ data, include: dtfPrintOrderInclude })
    logActivity({
      action: 'CREATE',
      entityType: 'DtfPrintOrder',
      entityId: order.id,
      message: `Added DTF order for "${order.colorway.colorwayName}" — ${order.colorway.shirtDesign.designName} (qty ${order.quantity})`,
      userId: user.sub,
    })
    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
