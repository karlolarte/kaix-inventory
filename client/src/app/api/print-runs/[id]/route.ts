import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { ConflictError } from '@/server/lib/httpError'
import { prisma, TRANSACTION_OPTIONS } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { idParamSchema } from '@/server/validators/common'
import { updatePrintRunSchema } from '@/server/validators/printRun'

type Context = { params: Promise<{ id: string }> }

const printRunInclude = {
  items: { include: { design: true, colorway: true, sizes: true } },
} as const

export const GET = withAuth<Context>(async (_request, context) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const printRun = await prisma.printRun.findUniqueOrThrow({
      where: { id },
      include: printRunInclude,
    })
    return NextResponse.json(printRun)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const PATCH = withAuth<Context>(async (request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const body = await request.json()
    const { items } = updatePrintRunSchema.parse(body)

    const existing = await prisma.printRun.findUniqueOrThrow({ where: { id } })
    if (existing.status === 'FINISHED') {
      throw new ConflictError("Finished print runs can't be edited.")
    }

    const printRun = await prisma.$transaction(async (tx) => {
      // Items (and their sizes, cascading) have no outside references, so a
      // clean delete-and-recreate is safe here — nothing to orphan.
      await tx.printRunItem.deleteMany({ where: { printRunId: id } })
      for (const item of items) {
        await tx.printRunItem.create({
          data: {
            printRunId: id,
            designId: item.designId,
            colorwayId: item.colorwayId,
            garmentStyle: item.garmentStyle,
            color: item.color,
            sizes: { create: item.sizes },
          },
        })
      }
      return tx.printRun.findUniqueOrThrow({ where: { id }, include: printRunInclude })
    }, TRANSACTION_OPTIONS)

    logActivity({
      action: 'UPDATE',
      entityType: 'PrintRun',
      entityId: printRun.id,
      message: `Edited print run (${printRun.items.length} line${printRun.items.length === 1 ? '' : 's'})`,
      userId: user.sub,
    })
    return NextResponse.json(printRun)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const DELETE = withAuth<Context>(async (_request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const existing = await prisma.printRun.findUniqueOrThrow({ where: { id } })
    if (existing.status === 'FINISHED') {
      throw new ConflictError('Finished print runs are part of the production log and can\'t be deleted.')
    }
    await prisma.printRun.delete({ where: { id } })
    logActivity({
      action: 'DELETE',
      entityType: 'PrintRun',
      entityId: id,
      message: 'Deleted a planned print run',
      userId: user.sub,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
