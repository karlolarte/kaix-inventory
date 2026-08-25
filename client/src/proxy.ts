import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from '@/server/lib/jwt'

// Coarse, pre-render auth gate for page routes (Next.js 16 renamed
// middleware.ts -> proxy.ts, same job). API routes are NOT covered here —
// they get their own 401 JSON via withAuth per-handler, which is what an API
// caller expects instead of an HTML redirect. Proxy defaults to the Node.js
// runtime in Next 16, so this can fully verify the JWT (not just check the
// cookie exists) and catch an expired/tampered token before any protected
// page even starts rendering.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isExempt =
    pathname.startsWith('/api') ||
    pathname === '/login' ||
    pathname.startsWith('/icons') ||
    pathname === '/favicon.png' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'

  if (isExempt) {
    return NextResponse.next()
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  if (token) {
    try {
      verifyAccessToken(token)
      return NextResponse.next()
    } catch {
      // fall through to redirect
    }
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
