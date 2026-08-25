import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js's own convention is .env.local for local secrets (auto-loaded by
// `next dev`/`next build`) — the Prisma CLI runs outside that process, so it
// needs to be told explicitly.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
