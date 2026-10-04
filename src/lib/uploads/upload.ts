import { createClient } from "@/lib/supabase/client";

import { compressImage } from "./compress";
import {
  buildPath,
  DOCUMENT_TYPES,
  IMAGE_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  type Bucket,
} from "./paths";

export type UploadKind = "image" | "document";

export type UploadOptions = {
  bucket: Bucket;
  /** First folder of the path: bazaar id, customer id or "unidentified". */
  folder: string;
  /** "image": photos only, compressed to JPEG. "document": photos or PDF up to 5 MB. */
  kind: UploadKind;
  /** Optional file-name prefix, e.g. the document type. */
  prefix?: string;
};

export class UploadError extends Error {}

function isImage(type: string) {
  return (IMAGE_TYPES as readonly string[]).includes(type);
}

/**
 * Validates, compresses (photos) and uploads a file with the user's own session so Storage
 * RLS applies (research R7, R9). Returns the path that the Server Action receives.
 */
export async function uploadFile(
  file: File,
  { bucket, folder, kind, prefix }: UploadOptions,
): Promise<string> {
  const allowed: readonly string[] =
    kind === "image" ? IMAGE_TYPES : DOCUMENT_TYPES;
  if (!allowed.includes(file.type)) {
    throw new UploadError(
      kind === "image"
        ? "Elige una foto (JPG, PNG o WebP)."
        : "Elige una foto o un PDF.",
    );
  }

  let toUpload = file;
  if (isImage(file.type)) {
    try {
      toUpload = await compressImage(file);
    } catch {
      throw new UploadError("No pudimos procesar la foto. Intenta con otra.");
    }
    if (toUpload.size > MAX_IMAGE_BYTES) {
      throw new UploadError("La foto es demasiado grande. Intenta con otra.");
    }
  } else if (toUpload.size > MAX_DOCUMENT_BYTES) {
    throw new UploadError("El archivo pesa más de 5 MB.");
  }

  const path = buildPath(folder, toUpload.type, prefix);
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, toUpload, { contentType: toUpload.type, upsert: false });

  if (error) {
    throw new UploadError(
      "No se pudo subir el archivo. Revisa tu conexión e intenta de nuevo.",
    );
  }
  return path;
}
