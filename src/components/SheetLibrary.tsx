"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Pinned = { id: string; sheet_id: number; name: string; author: string | null; note: string | null; added_by: string };
type Row = { id: number; name: string; author: string | null; bpm: number | null };

export default function SheetLibrary({ configured, pinned, names, meId }: { configured: boolean; pinned: Pinned[]; names: Record<string, string>; meId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"pinned" | "lib">(pinned.length ? "pinned" : "lib");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pinnedIds = new Set(pinned.map((p) => p.sheet_id));

  const load = useCallback(async (term: string, offset: number) => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/sheets?q=${encodeURIComponent(term)}&offset=${offset}`);
      const j = (await res.json()) as { rows?: Row[]; total?: number | null; error?: string };
      if (!res.ok || !j.rows) throw new Error(j.error);
      setRows((p) => (offset ? [...p, ...j.rows!] : j.rows!)); setTotal(j.total ?? null);
    } catch { setErr("Không tải được thư viện. Server của bạn có thể đang ngủ (Render), hãy thử lại sau ít giây."); }
    setLoading(false);
  }, []);
  useEffect(() => { if (tab !== "lib" || !configured) return; const t = setTimeout(() => void load(q, 0), 350); return () => clearTimeout(t); }, [q, tab, configured, load]);

  async function pin(r: Row) {
    const { error } = await createClient().from("our_sheets").insert({ sheet_id: r.id, name: r.name, author: r.author });
    if (error) return setErr(error.code === "23505" ? "Bài này đã được ghim." : "Không ghim được. Hãy chạy 0006_our_sheets.sql (xem README).");
    router.refresh();
  }
  const tabBtn = (t: "pinned" | "lib", label: string) => <button onClick={() => setTab(t)} aria-pressed={tab === t} className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? "bg-brand text-white" : "border border-line"}`}>{label}</button>;
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Sheet nhạc</h1>
      <p className="mt-1 text-sm text-muted">Duyệt thư viện sheet của Tyn, đọc nhạc theo kiểu nốt rơi và nghe thử. Ghim bài của hai bạn kèm lời ghi chú.</p>
      <div className="mt-5 flex gap-2">{tabBtn("pinned", `Bài của mình (${pinned.length})`)}{tabBtn("lib", "Thư viện")}</div>
      {tab === "pinned" ? (pinned.length === 0 ? <p className="mt-8 text-muted">Chưa có bài nào được ghim. Sang tab Thư viện để chọn bài đầu tiên.</p> : (
        <ul className="mt-5 grid max-w-3xl gap-3 md:grid-cols-2">{pinned.map((p) => (
          <li key={p.id}><Link href={`/sheets/${p.sheet_id}`} className="block rounded-3xl bg-card p-5 shadow-soft hover:ring-2 hover:ring-brand">
            <h2 className="font-display text-2xl">{p.name}</h2><p className="text-sm text-muted">{p.author ?? "Không rõ tác giả"} · {names[p.added_by] ?? ""} ghim{p.added_by === meId ? " (bạn)" : ""}</p>
            {p.note && <p className="mt-2 whitespace-pre-wrap text-sm">{p.note}</p>}</Link></li>))}</ul>)
      ) : !configured ? (
        <div className="mt-6 max-w-xl rounded-3xl bg-card p-6 shadow-soft"><h2 className="font-display text-2xl">Chưa kết nối server sheet</h2><p className="mt-2 text-sm text-muted">Cần đặt các biến môi trường SHEET_* trên Vercel (xem README), rồi Redeploy.</p></div>
      ) : (
        <div className="mt-5 max-w-3xl">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên bài hoặc tác giả…" aria-label="Tìm sheet" className="w-full rounded-full border border-line bg-card px-4 py-2.5" />
          {err && <p role="alert" className="mt-3 text-sm text-brand">{err}</p>}
          {total !== null && <p className="mt-3 text-xs text-muted">{total} bài</p>}
          <ul className="mt-3 space-y-2">{rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft">
              <Link href={`/sheets/${r.id}`} className="min-w-0 flex-1"><p className="truncate font-medium">{r.name}</p><p className="truncate text-xs text-muted">{r.author ?? "Không rõ tác giả"}{r.bpm ? ` · ${r.bpm} BPM` : ""}</p></Link>
              {pinnedIds.has(r.id) ? <span className="text-xs text-muted">Đã ghim</span> : <button onClick={() => void pin(r)} className="rounded-full border border-line px-3 py-1 text-xs hover:border-brand">Ghim</button>}
            </li>))}</ul>
          {loading && <p className="mt-3 text-sm text-muted">Đang tải…</p>}
          {!loading && rows.length > 0 && total !== null && rows.length < total && <button onClick={() => void load(q, rows.length)} className="mt-4 rounded-full border border-line px-5 py-2 text-sm">Tải thêm</button>}
          {!loading && !err && rows.length === 0 && <p className="mt-6 text-muted">Không tìm thấy bài nào.</p>}
        </div>)}
    </div>
  );
}
