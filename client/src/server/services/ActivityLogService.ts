import { after } from "next/server";
import type { ActivityAction } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";

interface LogActivityInput {
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  message: string;
  userId?: string | null;
}

// Still fire-and-forget from the caller's perspective (returns immediately,
// same as the old Express version) — but the actual write now runs inside
// `after()` instead of a bare `.then().catch()`. On Vercel, a serverless
// function can freeze as soon as the response is sent; a detached promise
// not part of the awaited chain may never finish. `after()` is Next's
// primitive for exactly this: work that shouldn't block the response, but
// still needs to reliably complete after it's sent.
export function logActivity(input: LogActivityInput): void {
  after(async () => {
    try {
      await prisma.activityLog.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? undefined,
          message: input.message,
          userId: input.userId ?? undefined,
        },
      });
    } catch (err) {
      console.error("[activity-log] failed to write entry:", err);
    }
  });
}
