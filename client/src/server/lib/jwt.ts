import jwt from "jsonwebtoken";
import type { Role } from "../generated/prisma/enums";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
}

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Paste one into client/.env.local before using auth.");
  }
  return secret;
}

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: SEVEN_DAYS_SECONDS });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, jwtSecret()) as AuthTokenPayload;
}

export const ACCESS_TOKEN_COOKIE = "access_token";

const isProduction = process.env.NODE_ENV === "production";

export const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  // The old Express server lived on a different registrable domain than the
  // Vercel-hosted client (a genuinely cross-site request), which forced
  // SameSite=None. Now that both live in the same Next.js app, every request
  // is same-site, so Lax works even in production — and it doesn't need
  // Secure to function locally over plain HTTP either.
  sameSite: "lax" as const,
  // Seconds, not ms — Next's `cookies().set()` takes maxAge in seconds
  // (Express's res.cookie() wanted milliseconds, hence the old `* 1000`).
  maxAge: SEVEN_DAYS_SECONDS,
};
