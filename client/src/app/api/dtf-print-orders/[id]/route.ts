import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { idParamSchema } from '@/server/validators/common'
import { updateDtfPrintOrderSchema } from '@/server/validators/dtfPrintOrder'

type Context = { params: Promise<{ id: string }> }

const dtfPrintOrderInclude = { colorway: { include: { shirtDesign: true } } } as const

export const GET = withAuth<Context>(async (_request, context) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const order = await prisma.dtfPrintOrder.findUniqueOrThrow({
      where: { id },
      include: dtfPrintOrderInclude,
    })
    return NextResponse.json(order)
  } catch (err) {
    return toErrorResponse(err)
  }
})

// Edits a line's colorway/quantity, or flips its `ordered` status — both go
// through this one route since a to-order line has nothing else to change.
export const PATCH = withAuth<Context>(async (request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const body = await request.json()
    const data = updateDtfPrintOrderSchema.parse(body)
    const order = await prisma.dtfPrintOrder.update({ where: { id }, data, include: dtfPrintOrderInclude })
    logActivity({
      action: 'UPDATE',
      entityType: 'DtfPrintOrder',
      entityId: order.id,
      message:
        data.ordered === true
          ? `Marked DTF order for "${order.colorway.colorwayName}" as ordered`
          : `Updated DTF order for "${order.colorway.colorwayName}" — ${order.colorway.shirtDesign.designName} (qty ${order.quantity})`,
      userId: user.sub,
    })
    return NextResponse.json(order)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const DELETE = withAuth<Context>(async (_request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const deleted = await prisma.dtfPrintOrder.delete({ where: { id }, include: dtfPrintOrderInclude })
    logActivity({
      action: 'DELETE',
      entityType: 'DtfPrintOrder',
      entityId: deleted.id,
      message: `Deleted DTF order for "${deleted.colorway.colorwayName}" — ${deleted.colorway.shirtDesign.designName}`,
      userId: user.sub,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
