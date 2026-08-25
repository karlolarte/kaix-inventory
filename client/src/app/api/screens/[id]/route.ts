import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { idParamSchema } from '@/server/validators/common'
import { updateScreenSchema } from '@/server/validators/screen'

type Context = { params: Promise<{ id: string }> }

const colorwayInclude = { colorways: { include: { shirtDesign: true } } } as const

export const GET = withAuth<Context>(async (_request, context) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const screen = await prisma.physicalScreen.findUniqueOrThrow({
      where: { id },
      include: colorwayInclude,
    })
    return NextResponse.json(screen)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const PATCH = withAuth<Context>(async (request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const body = await request.json()
    const { colorwayIds, ...data } = updateScreenSchema.parse(body)
    const screen = await prisma.physicalScreen.update({
      where: { id },
      data: {
        ...data,
        colorways: colorwayIds !== undefined ? { set: colorwayIds.map((id) => ({ id })) } : undefined,
      },
      include: colorwayInclude,
    })
    logActivity({
      action: 'UPDATE',
      entityType: 'PhysicalScreen',
      entityId: screen.id,
      message: `Updated ${screen.screenNumber} (${screen.status.replaceAll('_', ' ').toLowerCase()}, ${screen.colorways.length} colorway${screen.colorways.length === 1 ? '' : 's'})`,
      userId: user.sub,
    })
    return NextResponse.json(screen)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const DELETE = withAuth<Context>(async (_request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const deleted = await prisma.physicalScreen.delete({ where: { id } })
    logActivity({
      action: 'DELETE',
      entityType: 'PhysicalScreen',
      entityId: deleted.id,
      message: `Deleted ${deleted.screenNumber}`,
      userId: user.sub,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
