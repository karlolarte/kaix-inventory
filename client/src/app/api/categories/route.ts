import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { createCategorySchema } from '@/server/validators/category'

export const GET = withAuth(async () => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { rawMaterials: true } } },
    })
    return NextResponse.json(categories)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const data = createCategorySchema.parse(body)
    const category = await prisma.category.create({ data })
    logActivity({
      action: 'CREATE',
      entityType: 'Category',
      entityId: category.id,
      message: `Added category "${category.name}"`,
      userId: user.sub,
    })
    return NextResponse.json(category, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
