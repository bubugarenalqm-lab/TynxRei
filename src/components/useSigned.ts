"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const cache = new Map<string, string>();
/** Signed URL (1 giờ) cho tệp private trong Supabase Storage. */
export function useSigned(bucket: string, path: string, download?: string): string | null {
  const key = `${bucket}/${path}/${download ?? ""}`;
  const [url, setUrl] = useState<string | null>(cache.get(key) ?? null);
  useEffect(() => {
    if (url) return;
    void createClient().storage.from(bucket).createSignedUrl(path, 3600, download ? { download } : undefined).then(({ data }) => {
      if (data?.signedUrl) { cache.set(key, data.signedUrl); setUrl(data.signedUrl); }
    });
  }, [bucket, path, download, key, url]);
  return url;
}
