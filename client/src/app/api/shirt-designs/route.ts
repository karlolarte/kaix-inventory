import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { ConflictError } from '@/server/lib/httpError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { createShirtDesignSchema } from '@/server/validators/shirtDesign'

export const GET = withAuth(async () => {
  try {
    const designs = await prisma.shirtDesign.findMany({
      orderBy: { createdAt: 'desc' },
      include: { colorways: { include: { screens: { orderBy: { createdAt: 'asc' } } } } },
    })
    return NextResponse.json(designs)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const { colorways, ...data } = createShirtDesignSchema.parse(body)

    const duplicate = await prisma.shirtDesign.findFirst({
      where: { designName: { equals: data.designName, mode: 'insensitive' } },
      select: { id: true },
    })
    if (duplicate) {
      throw new ConflictError(`A design named "${data.designName}" already exists.`)
    }

    const design = await prisma.shirtDesign.create({
      data: {
        ...data,
        // A brand-new design can't have pre-existing colorway ids yet, so ignore
        // any `id` the client sent and let Prisma generate fresh ones.
        colorways: colorways
          ? {
              create: colorways.map(({ colorwayName, imageUrl, dtfPrintSize, screensNeeded }) => ({
                colorwayName,
                imageUrl,
                dtfPrintSize,
                screensNeeded,
              })),
            }
          : undefined,
      },
      include: { colorways: true },
    })
    logActivity({
      action: 'CREATE',
      entityType: 'ShirtDesign',
      entityId: design.id,
      message: `Added design "${design.designName}"`,
      userId: user.sub,
    })
    return NextResponse.json(design, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
