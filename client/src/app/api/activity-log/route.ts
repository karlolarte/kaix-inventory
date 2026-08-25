import { NextResponse } from 'next/server'
import { z } from 'zod'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'

const PAGE_SIZE = 30

const listQuerySchema = z.object({
  // Cursor pagination on createdAt+id rather than offset — this table only
  // grows, so an offset would drift under concurrent inserts between pages.
  cursor: z.string().uuid().optional(),
})

export const GET = withAuth(async (request) => {
  try {
    const { cursor } = listQuerySchema.parse({
      cursor: request.nextUrl.searchParams.get('cursor') ?? undefined,
    })

    const entries = await prisma.activityLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { user: { select: { email: true } } },
    })

    const hasMore = entries.length > PAGE_SIZE
    const page = hasMore ? entries.slice(0, PAGE_SIZE) : entries

    return NextResponse.json({
      entries: page,
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
})
