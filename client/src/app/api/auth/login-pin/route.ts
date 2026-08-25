import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { toErrorResponse } from '@/server/lib/apiError'
import { toProfile } from '@/server/lib/authProfile'
import { getClientIp } from '@/server/lib/clientIp'
import { UnauthorizedError } from '@/server/lib/httpError'
import { ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_OPTIONS, signAccessToken } from '@/server/lib/jwt'
import { isPinRateLimited, recordFailedPinAttempt, resetPinAttempts } from '@/server/lib/pinRateLimit'
import { prisma } from '@/server/lib/prisma'

const loginPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pin } = loginPinSchema.parse(body)

    const rateLimitKey = getClientIp(request)
    if (await isPinRateLimited(rateLimitKey)) {
      throw new UnauthorizedError('Too many PIN attempts. Try again in a few minutes.')
    }

    // bcrypt hashes can't be looked up by equality — every candidate has to be
    // compared individually. Fine for this app's handful of accounts; each
    // login attempt is a login attempt either way, so it's counted the same.
    const candidates = await prisma.user.findMany({ where: { pinHash: { not: null } } })

    let matched: (typeof candidates)[number] | null = null
    for (const candidate of candidates) {
      if (candidate.pinHash && (await bcrypt.compare(pin, candidate.pinHash))) {
        matched = candidate
        break
      }
    }

    if (!matched) {
      await recordFailedPinAttempt(rateLimitKey)
      throw new UnauthorizedError('Invalid PIN.')
    }
    await resetPinAttempts(rateLimitKey)

    const token = signAccessToken({ sub: matched.id, role: matched.role })
    const response = NextResponse.json(toProfile(matched))
    response.cookies.set(ACCESS_TOKEN_COOKIE, token, ACCESS_TOKEN_COOKIE_OPTIONS)
    return response
  } catch (err) {
    return toErrorResponse(err)
  }
}
