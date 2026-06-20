import { supabase } from "@/integrations/supabase/client";

export const COURSE_BUCKET = "course-uploads";

/** Get a signed URL for a storage path (1 hour). Returns null on failure. */
export async function getSignedUrl(path: string | null | undefined, expires = 3600): Promise<string | null> {
  if (!path) return null;
  // If already a full URL, return as-is
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from(COURSE_BUCKET).createSignedUrl(path, expires);
  if (error) return null;
  return data.signedUrl;
}

/** Batch-sign multiple paths. */
export async function signMany(paths: string[], expires = 3600): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const remote = paths.filter((p) => !/^https?:\/\//i.test(p));
  const passthrough = paths.filter((p) => /^https?:\/\//i.test(p));
  passthrough.forEach((p) => (map[p] = p));
  if (remote.length === 0) return map;
  const { data, error } = await supabase.storage.from(COURSE_BUCKET).createSignedUrls(remote, expires);
  if (error || !data) return map;
  data.forEach((d) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}
