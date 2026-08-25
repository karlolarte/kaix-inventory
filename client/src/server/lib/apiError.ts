import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client";
import { HttpError } from "./httpError";

// Every Route Handler wraps its body in try/catch and calls this in the
// catch block — Next.js Route Handlers have no global error-middleware
// equivalent to Express's app.use(errorHandler), so each handler maps its
// own thrown errors to a response individually via this shared helper.
export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : "field";
      return NextResponse.json(
        { error: `A record with this ${target} already exists.` },
        { status: 409 },
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Referenced record does not exist." }, { status: 400 });
    }
  }

  console.error(err);

  // Surface the real message in dev so failures are diagnosable from the client
  // response alone, without needing access to the server's terminal.
  const isDev = process.env.NODE_ENV !== "production";
  const message = isDev && err instanceof Error ? err.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
