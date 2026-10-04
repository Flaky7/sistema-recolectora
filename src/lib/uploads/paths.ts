/** Buckets and path rules (contracts/storage.md). Shared by the browser and Server Actions. */

export const BUCKETS = {
  bazaarPhotos: "bazaar-photos",
  bazaarPhotoSubmissions: "bazaar-photo-submissions",
  bazaarDocuments: "bazaar-documents",
  paymentProofs: "payment-proofs",
  packagePhotos: "package-photos",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export const UNIDENTIFIED_FOLDER = "unidentified";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"] as const;

/** Limits match the bucket configuration in supabase/migrations/20261004001100_storage.sql. */
export const MAX_IMAGE_BYTES = 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extensionFor(mimeType: string): string {
  const extension = EXTENSIONS[mimeType];
  if (!extension) throw new Error(`Tipo de archivo no permitido: ${mimeType}`);
  return extension;
}

/** "{folder}/{prefix-}{uuid}.{ext}" with a random, non-guessable name. */
export function buildPath(
  folder: string,
  mimeType: string,
  prefix?: string,
): string {
  const name = `${prefix ? `${prefix}-` : ""}${crypto.randomUUID()}`;
  return `${folder}/${name}.${extensionFor(mimeType)}`;
}

/**
 * Server-side check that a path sent by the browser is inside the expected folder and has a
 * simple file name (no "..", no nested folders).
 */
export function isPathInFolder(path: string, folder: string): boolean {
  const prefix = `${folder}/`;
  if (!path.startsWith(prefix)) return false;
  const fileName = path.slice(prefix.length);
  return /^[A-Za-z0-9_-]+\.(jpg|png|webp|pdf)$/.test(fileName);
}
