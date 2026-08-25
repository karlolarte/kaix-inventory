import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { deleteUploadedFileIfUnreferenced } from '@/server/lib/uploads'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { idParamSchema } from '@/server/validators/common'
import { updateRawMaterialSchema } from '@/server/validators/rawMaterial'

type Context = { params: Promise<{ id: string }> }

export const GET = withAuth<Context>(async (_request, context) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const rawMaterial = await prisma.rawMaterial.findUniqueOrThrow({
      where: { id },
      include: { category: true },
    })
    return NextResponse.json(rawMaterial)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const PATCH = withAuth<Context>(async (request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const body = await request.json()
    const data = updateRawMaterialSchema.parse(body)

    const previous =
      data.imageUrl !== undefined
        ? await prisma.rawMaterial.findUnique({ where: { id }, select: { imageUrl: true } })
        : null

    const rawMaterial = await prisma.rawMaterial.update({
      where: { id },
      data,
      include: { category: true },
    })

    if (previous && previous.imageUrl && previous.imageUrl !== data.imageUrl) {
      await deleteUploadedFileIfUnreferenced(previous.imageUrl, id)
    }

    logActivity({
      action: 'UPDATE',
      entityType: 'RawMaterial',
      entityId: rawMaterial.id,
      message: `Updated raw material "${rawMaterial.name}" (${rawMaterial.sku})`,
      userId: user.sub,
    })
    return NextResponse.json(rawMaterial)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const DELETE = withAuth<Context>(async (_request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const deleted = await prisma.rawMaterial.delete({ where: { id } })
    await deleteUploadedFileIfUnreferenced(deleted.imageUrl, id)
    logActivity({
      action: 'DELETE',
      entityType: 'RawMaterial',
      entityId: deleted.id,
      message: `Deleted raw material "${deleted.name}" (${deleted.sku})`,
      userId: user.sub,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
