import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma, TRANSACTION_OPTIONS } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { createRawMaterialBatchSchema } from '@/server/validators/rawMaterial'

export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const { items } = createRawMaterialBatchSchema.parse(body)
    const created = await prisma.$transaction(
      items.map((data) => prisma.rawMaterial.create({ data, include: { category: true } })),
      TRANSACTION_OPTIONS,
    )
    logActivity({
      action: 'CREATE',
      entityType: 'RawMaterial',
      message: `Added ${created.length} raw material${created.length === 1 ? '' : 's'} in a batch`,
      userId: user.sub,
    })
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
