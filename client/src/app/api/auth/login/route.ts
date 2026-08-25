import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { toErrorResponse } from '@/server/lib/apiError'
import { toProfile } from '@/server/lib/authProfile'
import { ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_OPTIONS, signAccessToken } from '@/server/lib/jwt'
import { UnauthorizedError } from '@/server/lib/httpError'
import { prisma } from '@/server/lib/prisma'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required'),
  password: z.string().min(1, 'password is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { email } })
    // Same error for "no such user" and "wrong password" — don't tell an
    // attacker which half of the pair was wrong.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid email or password.')
    }

    const token = signAccessToken({ sub: user.id, role: user.role })
    const response = NextResponse.json(toProfile(user))
    response.cookies.set(ACCESS_TOKEN_COOKIE, token, ACCESS_TOKEN_COOKIE_OPTIONS)
    return response
  } catch (err) {
    return toErrorResponse(err)
  }
}
