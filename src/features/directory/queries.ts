import "server-only";

import { createClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/uploads/paths";

export type DirectoryBazaar = {
  id: string;
  name: string;
  brands: string[];
  linkUrl: string;
  photoUrls: string[];
};

/**
 * Approved bazaars, published version only, through search_directory() so no private column
 * ever reaches the page (FR-035 to FR-037, research R6).
 */
export async function searchDirectory(q = ""): Promise<DirectoryBazaar[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_directory", { q: q.slice(0, 80) });
  const photos = supabase.storage.from(BUCKETS.bazaarPhotos);
  return (data ?? []).map((bazaar) => ({
    id: bazaar.id,
    name: bazaar.name,
    brands: bazaar.brands,
    linkUrl: bazaar.link_url,
    photoUrls: (bazaar.photo_paths ?? []).map((path) => photos.getPublicUrl(path).data.publicUrl),
  }));
}
