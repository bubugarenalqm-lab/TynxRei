import { createClient } from "@/lib/supabase/server";
import Chat from "@/components/Chat";
import type { Person } from "@/components/Shell";
import type { Msg, Rx } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data: people } = await sb.from("profiles").select("id,slug,display_name");
  const list = (people ?? []) as Person[];
  const me = list.find((p) => p.id === user?.id)!;
  const m = await sb.from("messages").select("*").order("created_at", { ascending: false }).limit(200);
  const msgs = ((m.data ?? []) as Msg[]).reverse();
  const r = msgs.length ? await sb.from("message_reactions").select("*").in("message_id", msgs.map((x) => x.id)) : { data: [], error: null };
  if (m.error) return <p role="alert" className="p-8 text-brand">Chưa đọc được tin nhắn. Hãy chạy file SQL thiết lập (xem README).</p>;
  return <Chat me={me} partner={list.find((p) => p.id !== me.id) ?? null} initialMessages={msgs} initialReactions={(r.data ?? []) as Rx[]} />;
}
