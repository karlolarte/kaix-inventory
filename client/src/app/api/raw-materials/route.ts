import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { createRawMaterialSchema, listRawMaterialsQuerySchema } from '@/server/validators/rawMaterial'

export const GET = withAuth(async (request) => {
  try {
    const { categoryId } = listRawMaterialsQuerySchema.parse({
      categoryId: request.nextUrl.searchParams.get('categoryId') ?? undefined,
    })
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { name: 'asc' },
      include: { category: true },
    })
    return NextResponse.json(rawMaterials)
  } catch (err) {
    return toErrorResponse(err)
  }
})

export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const data = createRawMaterialSchema.parse(body)
    const rawMaterial = await prisma.rawMaterial.create({ data, include: { category: true } })
    logActivity({
      action: 'CREATE',
      entityType: 'RawMaterial',
      entityId: rawMaterial.id,
      message: `Added raw material "${rawMaterial.name}" (${rawMaterial.sku})`,
      userId: user.sub,
    })
    return NextResponse.json(rawMaterial, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
