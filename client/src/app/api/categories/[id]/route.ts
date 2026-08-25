import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { idParamSchema } from '@/server/validators/common'
import { updateCategorySchema } from '@/server/validators/category'

type Context = { params: Promise<{ id: string }> }

export const GET = withAuth<Context>(async (_request, context) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const category = await prisma.category.findUniqueOrThrow({
      where: { id },
      include: { rawMaterials: true },
    })
    return NextResponse.json(category)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const PATCH = withAuth<Context>(async (request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const body = await request.json()
    const data = updateCategorySchema.parse(body)
    const category = await prisma.category.update({ where: { id }, data })
    logActivity({
      action: 'UPDATE',
      entityType: 'Category',
      entityId: category.id,
      message: `Updated category "${category.name}"`,
      userId: user.sub,
    })
    return NextResponse.json(category)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const DELETE = withAuth<Context>(async (_request, context, user) => {
  try {
    const { id } = idParamSchema.parse(await context.params)
    const deleted = await prisma.category.delete({ where: { id } })
    logActivity({
      action: 'DELETE',
      entityType: 'Category',
      entityId: deleted.id,
      message: `Deleted category "${deleted.name}"`,
      userId: user.sub,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
