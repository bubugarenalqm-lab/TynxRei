import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/PrintButton";
import { KIND_VI, loadTimeline, type TLKind } from "@/lib/timeline";
import { dayKey } from "@/lib/types";

export const dynamic = "force-dynamic";
const shift = (m: string, d: number) => { const [y, mo] = m.split("-").map(Number); const t = new Date(Date.UTC(y, mo - 1 + d, 1)); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`; };
const ORDER: TLKind[] = ["beginning", "memory", "bloom", "dream", "capsule", "song", "letter"];

export default async function ScrapbookPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const cur = dayKey(new Date()).slice(0, 7);
  const q = (await searchParams).m;
  const month = q && /^\d{4}-(0[1-9]|1[0-2])$/.test(q) && q <= cur ? q : cur;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const from = `${month}-01`, to = `${shift(month, 1)}-01`;
  const [tl, msgs, moods] = await Promise.all([
    loadTimeline(sb, user?.id ?? ""),
    sb.from("messages").select("id", { count: "exact", head: true }).gte("created_at", `${from}T00:00:00+07:00`).lt("created_at", `${to}T00:00:00+07:00`),
    sb.from("mood_weather").select("mood").eq("user_id", user?.id ?? "").gte("day", from).lt("day", to),
  ]);
  if (tl.failed) return <p role="alert" className="p-8 text-brand">Chưa đọc được dữ liệu. Hãy chạy các file SQL (xem README).</p>;
  const items = tl.events.filter((e) => e.date.startsWith(month));
  const mood = (k: string) => (moods.data ?? []).filter((m) => m.mood === k).length;
  const [y, mo] = month.split("-");
  const nav = "rounded-full border border-line px-3 py-1.5 text-sm print:hidden";
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Sổ lưu niệm · Tháng {mo}/{y}</h1>
        <div className="flex items-center gap-2"><Link href={`/scrapbook?m=${shift(month, -1)}`} className={nav}>← Tháng trước</Link>
          {month < cur && <Link href={`/scrapbook?m=${shift(month, 1)}`} className={nav}>Tháng sau →</Link>}<PrintButton /></div>
      </div>
      <p className="mt-1 text-sm text-muted">Tự tổng hợp từ những gì hai bạn đã giữ lại trong tháng. Bấm In rồi chọn &ldquo;Lưu dưới dạng PDF&rdquo;.</p>
      <div className="mt-6 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
        {[["Tin nhắn", msgs.count ?? 0], ["Điều đã giữ", items.length], ["Ngày nắng của bạn", mood("sunny")], ["Ngày giông của bạn", mood("stormy")]].map(([l, n]) => (
          <div key={l as string} className="print-card rounded-3xl bg-card p-4 text-center shadow-soft"><p className="font-display text-3xl">{n}</p><p className="text-xs text-muted">{l}</p></div>))}
      </div>
      {items.length === 0 ? <p className="mt-8 text-muted">Tháng này chưa có gì được giữ lại.</p> :
        ORDER.map((k) => { const list = items.filter((e) => e.kind === k); return list.length === 0 ? null : (
          <section key={k} className="mt-8 max-w-3xl"><h2 className="font-display text-2xl">{KIND_VI[k]}</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">{list.map((e) => (<li key={e.id} className="print-card rounded-3xl bg-card p-5 shadow-soft"><p className="text-xs text-muted">{new Date(e.date + "T00:00:00").toLocaleDateString("vi-VN")}</p>
              <p className="font-medium">{e.title}</p>{e.text && <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-muted">{e.text}</p>}</li>))}</ul></section>); })}
    </div>
  );
}
