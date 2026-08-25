import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, verifyAccessToken, type AuthTokenPayload } from "./jwt";

// Next.js Route Handlers have no middleware-chaining like Express's
// `app.use(path, requireAuth, router)` — this HOF is the equivalent, called
// explicitly per handler. It only gates entry (missing/invalid/expired
// cookie -> 401, same as the old requireAuth); everything else a wrapped
// handler throws is its own responsibility to catch and map via
// toErrorResponse (see apiError.ts) — this never swallows business-logic
// errors, only auth failures.
export function withAuth<Context>(
  handler: (request: NextRequest, context: Context, user: AuthTokenPayload) => Promise<NextResponse>,
) {
  return async (request: NextRequest, context: Context): Promise<NextResponse> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    let user: AuthTokenPayload;
    try {
      user = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    return handler(request, context, user);
  };
}
