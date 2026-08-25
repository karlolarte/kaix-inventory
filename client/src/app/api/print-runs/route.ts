import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { createPrintRunSchema } from '@/server/validators/printRun'

const printRunInclude = {
  items: { include: { design: true, colorway: true, sizes: true } },
} as const

export const GET = withAuth(async () => {
  try {
    const printRuns = await prisma.printRun.findMany({
      orderBy: { createdAt: 'desc' },
      include: printRunInclude,
    })
    return NextResponse.json(printRuns)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const { items } = createPrintRunSchema.parse(body)
    const printRun = await prisma.printRun.create({
      data: {
        items: {
          create: items.map((item) => ({
            designId: item.designId,
            colorwayId: item.colorwayId,
            garmentStyle: item.garmentStyle,
            color: item.color,
            sizes: { create: item.sizes },
          })),
        },
      },
      include: printRunInclude,
    })
    logActivity({
      action: 'CREATE',
      entityType: 'PrintRun',
      entityId: printRun.id,
      message: `Created a print run with ${printRun.items.length} line${printRun.items.length === 1 ? '' : 's'}`,
      userId: user.sub,
    })
    return NextResponse.json(printRun, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
