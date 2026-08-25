import type { Prisma } from "../generated/prisma/client";

// Screens are shared many-to-many with colorways, so unlinking one here
// doesn't necessarily free it up — it might still be covering another
// colorway. Only screens left with zero colorways after the unlink actually
// get reset. NEEDS_RECLAIM rather than CLEAN_RECLAIMED because the physical
// screen still has emulsion on it — deleting/editing a design here doesn't
// wash it, it just means whatever's on it no longer belongs to a live design.
export async function freeOrphanedScreens(tx: Prisma.TransactionClient, screenIds: string[]) {
  if (screenIds.length === 0) return;
  const orphaned = await tx.physicalScreen.findMany({
    where: { id: { in: screenIds }, colorways: { none: {} } },
    select: { id: true },
  });
  if (orphaned.length === 0) return;
  await tx.physicalScreen.updateMany({
    where: { id: { in: orphaned.map((screen) => screen.id) } },
    data: { status: "NEEDS_RECLAIM" },
  });
}
