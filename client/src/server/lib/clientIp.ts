import type { NextRequest } from 'next/server'

// `NextRequest.ip` was removed in Next.js 15 — Vercel (and most proxies) set
// x-forwarded-for instead, a comma-separated list closest-hop-first.
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const first = forwardedFor?.split(',')[0]?.trim()
  return first || 'unknown'
}
