import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { createScreenSchema } from '@/server/validators/screen'

const colorwayInclude = { colorways: { include: { shirtDesign: true } } } as const

export const GET = withAuth(async () => {
  try {
    const screens = await prisma.physicalScreen.findMany({
      orderBy: { screenNumber: 'asc' },
      include: colorwayInclude,
    })
    return NextResponse.json(screens)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const { colorwayIds, ...data } = createScreenSchema.parse(body)
    const screen = await prisma.physicalScreen.create({
      data: {
        ...data,
        colorways: { connect: colorwayIds.map((id) => ({ id })) },
      },
      include: colorwayInclude,
    })
    logActivity({
      action: 'CREATE',
      entityType: 'PhysicalScreen',
      entityId: screen.id,
      message: `Added ${screen.screenNumber}`,
      userId: user.sub,
    })
    return NextResponse.json(screen, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
