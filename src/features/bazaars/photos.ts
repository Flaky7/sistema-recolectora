import "server-only";

import type { ServerClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/uploads/paths";

/** Proposal photos are signed for 60 minutes (research R7). */
const PHOTO_URL_SECONDS = 60 * 60;

/**
 * URLs to show a bazaar's photos in order: published ones by their public URL, photos still
 * under review through signed links created with the viewer's session (FR-030).
 */
export async function photoUrls(
  supabase: ServerClient,
  bazaarId: string,
  paths: string[],
): Promise<{ path: string; url: string }[]> {
  if (paths.length === 0) return [];
  const { data: published } = await supabase
    .from("bazaar_photos")
    .select("storage_path")
    .eq("bazaar_id", bazaarId);
  const publicPaths = new Set((published ?? []).map((p) => p.storage_path));
  const privatePaths = paths.filter((p) => !publicPaths.has(p));

  const signed = privatePaths.length
    ? ((
        await supabase.storage
          .from(BUCKETS.bazaarPhotoSubmissions)
          .createSignedUrls(privatePaths, PHOTO_URL_SECONDS)
      ).data ?? [])
    : [];
  const signedByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  return paths.map((path) => ({
    path,
    url: publicPaths.has(path)
      ? supabase.storage.from(BUCKETS.bazaarPhotos).getPublicUrl(path).data
          .publicUrl
      : (signedByPath.get(path) ?? ""),
  }));
}

export function publicPhotoUrl(supabase: ServerClient, path: string) {
  return supabase.storage.from(BUCKETS.bazaarPhotos).getPublicUrl(path).data
    .publicUrl;
}
