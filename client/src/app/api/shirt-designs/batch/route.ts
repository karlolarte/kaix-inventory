import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { ConflictError } from '@/server/lib/httpError'
import { prisma, TRANSACTION_OPTIONS } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { createShirtDesignBatchSchema } from '@/server/validators/shirtDesign'

// Mass-upload path: creates several designs (each with its own colorways) in one
// go, from text details alone — mainProductImage/colorway imageUrl are left blank
// here (see the validators) and filled in later via the normal Edit form.
export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const { items } = createShirtDesignBatchSchema.parse(body)

    const existing = await prisma.shirtDesign.findMany({ select: { designName: true } })
    const existingLower = new Set(existing.map((d) => d.designName.trim().toLowerCase()))
    const seenInBatch = new Set<string>()
    for (const item of items) {
      const lower = item.designName.trim().toLowerCase()
      if (existingLower.has(lower)) {
        throw new ConflictError(`A design named "${item.designName}" already exists.`)
      }
      if (seenInBatch.has(lower)) {
        throw new ConflictError(`Duplicate design name "${item.designName}" in this batch.`)
      }
      seenInBatch.add(lower)
    }

    const created = await prisma.$transaction(
      items.map(({ colorways, ...data }) =>
        prisma.shirtDesign.create({
          data: {
            ...data,
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
        }),
      ),
      TRANSACTION_OPTIONS,
    )
    logActivity({
      action: 'CREATE',
      entityType: 'ShirtDesign',
      message: `Added ${created.length} design${created.length === 1 ? '' : 's'} in a batch`,
      userId: user.sub,
    })
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
