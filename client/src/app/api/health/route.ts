import { NextResponse } from 'next/server'
import { prisma } from '@/server/lib/prisma'

// Touches the DB, not just the app process — Header.tsx polls this every 30s
// for the online/offline badge. Deliberately not behind withAuth (unlike
// everything else) so it works as a liveness check even when signed out.
export async function GET() {
  await prisma.category.count()
  return NextResponse.json({ status: 'ok', service: 'kaix-inventory' })
}
