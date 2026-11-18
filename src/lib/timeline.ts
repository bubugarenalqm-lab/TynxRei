import type { createClient } from "@/lib/supabase/server";
import { dayKey } from "@/lib/types";

type SB = Awaited<ReturnType<typeof createClient>>;
export type TLKind = "beginning" | "memory" | "bloom" | "dream" | "capsule" | "song" | "letter";
export type TLEvent = { id: string; date: string; kind: TLKind; title: string; text?: string };
export const KIND_VI: Record<TLKind, string> = { beginning: "Khởi đầu", memory: "Kỷ niệm", bloom: "Hoa mỗi ngày", dream: "Giấc mơ đã thành", capsule: "Hộp thời gian", song: "Bài hát", letter: "Thư" };

/** Mọi thứ hai bạn đã giữ lại, theo thứ tự thời gian tăng dần. Không suy đoán, chỉ gom dữ liệu có sẵn. */
export async function loadTimeline(sb: SB, meId: string): Promise<{ events: TLEvent[]; failed: boolean }> {
  const [set, mem, bloom, dreams, caps, songs, letters] = await Promise.all([
    sb.from("couple_settings").select("value").eq("key", "started_on").maybeSingle(),
    sb.from("memories").select("id,title,content,memory_date"),
    sb.from("bloom_answers").select("prompt_date,prompt_text,user_id"),
    sb.from("dreams").select("id,title,description,achieved_at").eq("status", "achieved"),
    sb.rpc("list_capsules"),
    sb.from("songs").select("id,title,artist,note,created_at"),
    sb.rpc("list_letters"),
  ]);
  const ev: TLEvent[] = [];
  const started = set.data?.value as string | undefined;
  if (started) ev.push({ id: "start", date: started, kind: "beginning", title: "Ngày hai bạn bắt đầu" });
  (mem.data ?? []).forEach((m) => ev.push({ id: `m-${m.id}`, date: m.memory_date, kind: "memory", title: m.title, text: m.content ?? undefined }));
  const all = bloom.data ?? [];
  all.filter((b) => b.user_id === meId && all.some((o) => o.prompt_date === b.prompt_date && o.user_id !== meId))
    .forEach((b) => ev.push({ id: `b-${b.prompt_date}`, date: b.prompt_date, kind: "bloom", title: b.prompt_text }));
  (dreams.data ?? []).forEach((d) => d.achieved_at && ev.push({ id: `d-${d.id}`, date: dayKey(d.achieved_at), kind: "dream", title: d.title, text: d.description ?? undefined }));
  ((caps.data ?? []) as { id: string; title: string; unlock_at: string; message: string | null }[]).filter((c) => c.message !== null)
    .forEach((c) => ev.push({ id: `c-${c.id}`, date: dayKey(c.unlock_at), kind: "capsule", title: c.title, text: c.message ?? undefined }));
  (songs.data ?? []).forEach((s) => ev.push({ id: `s-${s.id}`, date: dayKey(s.created_at), kind: "song", title: s.title, text: [s.artist, s.note].filter(Boolean).join(" · ") || undefined }));
  ((letters.data ?? []) as { id: string; title: string; deliver_at: string; body: string | null }[]).filter((l) => l.body !== null)
    .forEach((l) => ev.push({ id: `l-${l.id}`, date: dayKey(l.deliver_at), kind: "letter", title: l.title, text: l.body ?? undefined }));
  ev.sort((a, b) => a.date.localeCompare(b.date));
  return { events: ev, failed: !!mem.error };
}
