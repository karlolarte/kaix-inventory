import { NextResponse } from 'next/server'
import { z } from 'zod'
import { toErrorResponse } from '@/server/lib/apiError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'

const listQuerySchema = z.object({
  // ISO timestamp — only sales at/after this are returned. Omitted entirely
  // for the "All Time" range.
  since: z.string().datetime().optional(),
})

export const GET = withAuth(async (request) => {
  try {
    const { since } = listQuerySchema.parse({
      since: request.nextUrl.searchParams.get('since') ?? undefined,
    })

    const sales = await prisma.sale.findMany({
      where: since ? { createdAt: { gte: new Date(since) } } : undefined,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(sales)
  } catch (err) {
    return toErrorResponse(err)
  }
})
