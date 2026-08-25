import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { createFinishedGoodSchema } from '@/server/validators/finishedGood'

export const GET = withAuth(async () => {
  try {
    const finishedGoods = await prisma.finishedGood.findMany({
      orderBy: { createdAt: 'desc' },
      include: { design: true, colorway: true },
    })
    return NextResponse.json(finishedGoods)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const data = createFinishedGoodSchema.parse(body)
    const finishedGood = await prisma.finishedGood.create({
      data,
      include: { design: true, colorway: true },
    })
    logActivity({
      action: 'CREATE',
      entityType: 'FinishedGood',
      entityId: finishedGood.id,
      message: `Added stock line "${finishedGood.design.designName} — ${finishedGood.color} / ${finishedGood.size}"`,
      userId: user.sub,
    })
    return NextResponse.json(finishedGood, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
