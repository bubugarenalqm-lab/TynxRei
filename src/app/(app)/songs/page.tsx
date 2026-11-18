import { createClient } from "@/lib/supabase/server";
import Songs, { type Song } from "@/components/Songs";
import type { Person } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function SongsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [s, p] = await Promise.all([sb.from("songs").select("*").order("created_at", { ascending: false }), sb.from("profiles").select("id,slug,display_name")]);
  if (s.error) return <p role="alert" className="p-8 text-brand">Chưa đọc được dữ liệu. Hãy chạy 0004_dreams_songs.sql (xem README).</p>;
  const names = Object.fromEntries(((p.data ?? []) as Person[]).map((x) => [x.id, x.display_name]));
  return <Songs meId={user?.id ?? ""} items={(s.data ?? []) as Song[]} names={names} />;
}
