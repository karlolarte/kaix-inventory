import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { ConflictError } from '@/server/lib/httpError'
import { prisma, TRANSACTION_OPTIONS } from '@/server/lib/prisma'
import { freeOrphanedScreens } from '@/server/lib/screens'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { idParamSchema } from '@/server/validators/common'
import { updateShirtDesignSchema } from '@/server/validators/shirtDesign'

type Context = { params: Promise<{ id: string }> }

export const GET = withAuth<Context>(async (_request, context) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const design = await prisma.shirtDesign.findUniqueOrThrow({
      where: { id },
      include: {
        colorways: { include: { screens: { orderBy: { createdAt: 'asc' } } } },
        finishedGoods: true,
      },
    })
    return NextResponse.json(design)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const PATCH = withAuth<Context>(async (request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const body = await request.json()
    const { colorways, ...data } = updateShirtDesignSchema.parse(body)

    if (data.designName) {
      const duplicate = await prisma.shirtDesign.findFirst({
        where: { id: { not: id }, designName: { equals: data.designName, mode: 'insensitive' } },
        select: { id: true },
      })
      if (duplicate) {
        throw new ConflictError(`A design named "${data.designName}" already exists.`)
      }
    }

    const design = await prisma.$transaction(async (tx) => {
      if (colorways) {
        // Update existing colorways in place (by id) rather than deleting and
        // recreating them — recreating would issue new ids and silently drop
        // any screen already linked to the old colorway row.
        const existing = await tx.designColorway.findMany({
          where: { shirtDesignId: id },
          select: { id: true },
        })
        const existingIds = new Set(existing.map((c) => c.id))
        const keepIds = new Set(
          colorways.filter((c) => c.id && existingIds.has(c.id)).map((c) => c.id!),
        )
        const removedIds = [...existingIds].filter((colorwayId) => !keepIds.has(colorwayId))

        if (removedIds.length > 0) {
          // The many-to-many join rows cascade-delete with the colorway, but
          // that alone leaves any now-unlinked screen sitting at whatever
          // status it was left in — free it up here instead.
          const screensOnRemoved = await tx.physicalScreen.findMany({
            where: { colorways: { some: { id: { in: removedIds } } } },
            select: { id: true },
          })
          await tx.designColorway.deleteMany({ where: { id: { in: removedIds } } })
          await freeOrphanedScreens(
            tx,
            screensOnRemoved.map((screen) => screen.id),
          )
        }
        for (const colorway of colorways) {
          if (colorway.id && existingIds.has(colorway.id)) {
            // Dropping the screen count (e.g. 2 -> 1) frees up whichever
            // screen(s) were linked last, keeping the earliest-linked ones —
            // same "Screen 1" / "Screen 2" ordering shown on the Designs page.
            const current = await tx.designColorway.findUniqueOrThrow({
              where: { id: colorway.id },
              include: { screens: { orderBy: { createdAt: 'asc' }, select: { id: true } } },
            })
            const excessScreens = current.screens.slice(colorway.screensNeeded)

            await tx.designColorway.update({
              where: { id: colorway.id },
              data: {
                colorwayName: colorway.colorwayName,
                imageUrl: colorway.imageUrl,
                dtfPrintSize: colorway.dtfPrintSize,
                screensNeeded: colorway.screensNeeded,
                screens:
                  excessScreens.length > 0
                    ? { disconnect: excessScreens.map((screen) => ({ id: screen.id })) }
                    : undefined,
              },
            })

            if (excessScreens.length > 0) {
              await freeOrphanedScreens(
                tx,
                excessScreens.map((screen) => screen.id),
              )
            }
          } else {
            await tx.designColorway.create({
              data: {
                colorwayName: colorway.colorwayName,
                imageUrl: colorway.imageUrl,
                dtfPrintSize: colorway.dtfPrintSize,
                screensNeeded: colorway.screensNeeded,
                shirtDesignId: id,
              },
            })
          }
        }
      }

      return tx.shirtDesign.update({
        where: { id },
        data,
        include: { colorways: true },
      })
    }, TRANSACTION_OPTIONS)

    logActivity({
      action: 'UPDATE',
      entityType: 'ShirtDesign',
      entityId: design.id,
      message:
        data.active === false
          ? `Unlisted design "${design.designName}"`
          : data.active === true
            ? `Relisted design "${design.designName}"`
            : `Updated design "${design.designName}"`,
      userId: user.sub,
    })
    return NextResponse.json(design)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const DELETE = withAuth<Context>(async (_request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)

    // PrintRunItem.designId and FinishedGood.designId are both protected
    // references (production and stock history — see the Unlist comment on
    // the schema), so this would otherwise fail deep in a raw FK-constraint
    // error. Check first for a clear message; the Designs page itself no
    // longer offers hard delete for exactly this reason, but the API stays
    // available for designs that truly have neither.
    const [printRunItemCount, finishedGoodCount] = await Promise.all([
      prisma.printRunItem.count({ where: { designId: id } }),
      prisma.finishedGood.count({ where: { designId: id } }),
    ])
    if (printRunItemCount > 0 || finishedGoodCount > 0) {
      throw new ConflictError(
        "This design has print run or finished-stock history and can't be deleted — unlist it instead.",
      )
    }

    const deleted = await prisma.$transaction(async (tx) => {
      // Colorways (and their join rows with screens) cascade-delete with the
      // design, but that alone leaves any now-orphaned screen at whatever
      // status it was left in — free those up too.
      const linkedScreens = await tx.physicalScreen.findMany({
        where: { colorways: { some: { shirtDesignId: id } } },
        select: { id: true },
      })
      const design = await tx.shirtDesign.delete({ where: { id } })
      await freeOrphanedScreens(
        tx,
        linkedScreens.map((screen) => screen.id),
      )
      return design
    }, TRANSACTION_OPTIONS)

    logActivity({
      action: 'DELETE',
      entityType: 'ShirtDesign',
      entityId: deleted.id,
      message: `Deleted design "${deleted.designName}"`,
      userId: user.sub,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
