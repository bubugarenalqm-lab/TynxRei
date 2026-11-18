"use client";
/* eslint-disable @next/next/no-img-element -- signed URL của Supabase Storage */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const cache = new Map<string, string>();
export default function SignedImg({ bucket, path, className }: { bucket: string; path: string; className?: string }) {
  const key = `${bucket}/${path}`;
  const [url, setUrl] = useState<string | null>(cache.get(key) ?? null);
  useEffect(() => {
    if (url) return;
    void createClient().storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) { cache.set(key, data.signedUrl); setUrl(data.signedUrl); }
    });
  }, [bucket, path, key, url]);
  return url ? <img src={url} alt="" loading="lazy" className={className} /> : <div className={`animate-pulse bg-line ${className ?? ""}`} aria-label="Đang tải ảnh" />;
}
