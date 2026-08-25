import { NextResponse } from 'next/server'
import { toErrorResponse } from '@/server/lib/apiError'
import { toProfile } from '@/server/lib/authProfile'
import { UnauthorizedError } from '@/server/lib/httpError'
import { prisma } from '@/server/lib/prisma'
import { withAuth } from '@/server/lib/withAuth'

export const GET = withAuth(async (_request, _context, authUser) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: authUser.sub } })
    if (!user) throw new UnauthorizedError('Not signed in.')
    return NextResponse.json(toProfile(user))
  } catch (err) {
    return toErrorResponse(err)
  }
})
