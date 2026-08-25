import { prisma } from "./prisma";

// A 6-digit PIN has only a million combinations — far weaker than a password
// — so PIN login gets its own basic brute-force throttle, keyed by IP.
// Backed by Postgres (not in-memory, unlike the old Express server) so it
// stays correct across Vercel's serverless function instances, which don't
// share memory with each other.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function isPinRateLimited(key: string): Promise<boolean> {
  const entry = await prisma.pinLoginAttempt.findUnique({ where: { key } });
  if (!entry || entry.resetAt.getTime() <= Date.now()) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export async function recordFailedPinAttempt(key: string): Promise<void> {
  const now = Date.now();
  const entry = await prisma.pinLoginAttempt.findUnique({ where: { key } });

  if (entry && entry.resetAt.getTime() > now) {
    await prisma.pinLoginAttempt.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return;
  }

  const resetAt = new Date(now + WINDOW_MS);
  await prisma.pinLoginAttempt.upsert({
    where: { key },
    update: { count: 1, resetAt },
    create: { key, count: 1, resetAt },
  });
}

export async function resetPinAttempts(key: string): Promise<void> {
  await prisma.pinLoginAttempt.deleteMany({ where: { key } });
}
