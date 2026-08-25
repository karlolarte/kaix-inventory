import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { idParamSchema } from '@/server/validators/common'
import { updateFinishedGoodSchema } from '@/server/validators/finishedGood'

type Context = { params: Promise<{ id: string }> }

export const GET = withAuth<Context>(async (_request, context) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const finishedGood = await prisma.finishedGood.findUniqueOrThrow({
      where: { id },
      include: { design: true, colorway: true },
    })
    return NextResponse.json(finishedGood)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const PATCH = withAuth<Context>(async (request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const body = await request.json()
    const data = updateFinishedGoodSchema.parse(body)
    const finishedGood = await prisma.finishedGood.update({
      where: { id },
      data,
      include: { design: true, colorway: true },
    })
    logActivity({
      action: 'UPDATE',
      entityType: 'FinishedGood',
      entityId: finishedGood.id,
      message: `Updated stock line "${finishedGood.design.designName} — ${finishedGood.color} / ${finishedGood.size}"`,
      userId: user.sub,
    })
    return NextResponse.json(finishedGood)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const DELETE = withAuth<Context>(async (_request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const deleted = await prisma.finishedGood.delete({
      where: { id },
      include: { design: true },
    })
    logActivity({
      action: 'DELETE',
      entityType: 'FinishedGood',
      entityId: deleted.id,
      message: `Deleted stock line "${deleted.design.designName} — ${deleted.color} / ${deleted.size}"`,
      userId: user.sub,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
