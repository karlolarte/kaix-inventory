import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { deleteUploadedFile } from '@/server/lib/uploads'
import { prisma, TRANSACTION_OPTIONS } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'
import { logActivity } from '@/server/services/ActivityLogService'
import { deleteRawMaterialBatchSchema } from '@/server/validators/rawMaterial'

export const POST = withAuth(async (request, _context, user) => {
  try {
    const body = await request.json()
    const { ids } = deleteRawMaterialBatchSchema.parse(body)

    const deleted = await prisma.$transaction(
      ids.map((id) => prisma.rawMaterial.delete({ where: { id } })),
      TRANSACTION_OPTIONS,
    )

    const uniqueImageUrls = [...new Set(deleted.map((item) => item.imageUrl))].filter(
      (url): url is string => Boolean(url),
    )
    for (const imageUrl of uniqueImageUrls) {
      const stillReferenced = await prisma.rawMaterial.count({ where: { imageUrl } })
      if (stillReferenced === 0) {
        await deleteUploadedFile(imageUrl)
      }
    }

    logActivity({
      action: 'DELETE',
      entityType: 'RawMaterial',
      message: `Deleted ${deleted.length} raw material${deleted.length === 1 ? '' : 's'} in a batch`,
      userId: user.sub,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return toErrorResponse(err)
  }
})
