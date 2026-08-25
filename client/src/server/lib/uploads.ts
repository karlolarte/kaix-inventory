import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";

// Legacy local-disk cleanup from before the Cloudinary migration — no code
// path writes new files here anymore (see app/api/uploads/route.ts), and on
// Vercel this directory won't exist at all, so `fs.unlink` just throws
// ENOENT (already swallowed below) and this becomes a harmless no-op. Kept
// only so any pre-Cloudinary `/uploads/...` RawMaterial rows that haven't
// been backfilled to Cloudinary yet still behave exactly as before. Safe to
// delete once that one-time backfill (see the migration plan) is done.
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function deleteUploadedFile(imageUrl: string | null | undefined) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;

  const filePath = path.join(UPLOADS_DIR, path.basename(imageUrl));
  // Guard against a crafted imageUrl escaping the uploads directory.
  if (path.dirname(filePath) !== UPLOADS_DIR) return;

  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

// Apparel variants often share one photo across the whole product (same imageUrl on
// every color/size sibling), so the file can only be removed once no raw material —
// including the one just deleted — references it anymore.
export async function deleteUploadedFileIfUnreferenced(imageUrl: string | null, excludeId: string) {
  if (!imageUrl) return;
  const stillReferenced = await prisma.rawMaterial.count({
    where: { imageUrl, id: { not: excludeId } },
  });
  if (stillReferenced === 0) {
    await deleteUploadedFile(imageUrl);
  }
}
