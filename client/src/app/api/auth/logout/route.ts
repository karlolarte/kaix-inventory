import { NextResponse } from 'next/server'
import { ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_OPTIONS } from '@/server/lib/jwt'

export async function POST() {
  const response = NextResponse.json({ success: true })
  // Same attributes used to set the cookie (httpOnly/secure/sameSite) — a
  // browser only overwrites/expires a cookie when those match, same reason
  // Express's res.clearCookie() takes the original options object too.
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', { ...ACCESS_TOKEN_COOKIE_OPTIONS, maxAge: 0 })
  return response
}
