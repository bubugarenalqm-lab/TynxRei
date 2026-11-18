"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SignedImg from "./SignedImg";

export type Mem = { id: string; created_by: string; title: string; content: string | null; media_path: string | null; memory_date: string; author: string };

export default function MemoryGarden({ meId, items, today, q, onThisDay }: { meId: string; items: Mem[]; today: string; q: string; onThisDay: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Mem | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const f = "mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim(), content = String(fd.get("content") ?? "").trim() || null;
    const date = String(fd.get("memory_date") ?? "") || today, file = fd.get("photo") as File;
    if (!title) return setErr("Cần có tiêu đề.");
    if (file.size && (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024)) return setErr("Ảnh tối đa 15 MB.");
    setBusy(true); setErr(null);
    const sb = createClient();
    let media_path: string | undefined;
    if (file.size) {
      const ext = (file.name.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5).toLowerCase() || "jpg";
      media_path = `${meId}/${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from("memories").upload(media_path, file, { contentType: file.type });
      if (up.error) { setBusy(false); return setErr("Tải ảnh lên thất bại."); }
    }
    const row = { title, content, memory_date: date, ...(media_path ? { media_path } : {}) };
    const res = editing
      ? await sb.from("memories").update({ ...row, updated_at: new Date().toISOString() }).eq("id", editing.id)
      : await sb.from("memories").insert(row);
    if (res.error) { if (media_path) await sb.storage.from("memories").remove([media_path]); setBusy(false); return setErr("Không lưu được kỷ niệm."); }
    if (editing && media_path && editing.media_path) await sb.storage.from("memories").remove([editing.media_path]);
    setBusy(false); setOpen(false); setEditing(null); form.reset(); router.refresh();
  }
  async function del(m: Mem) {
    if (!confirm(`Xóa "${m.title}"?`)) return;
    const sb = createClient();
    const { error } = await sb.from("memories").delete().eq("id", m.id);
    if (error) return setErr("Không xóa được.");
    if (m.media_path) await sb.storage.from("memories").remove([m.media_path]);
    router.refresh();
  }

  const show = open || editing;
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Vườn kỷ niệm</h1>
        <button onClick={() => { setEditing(null); setOpen(!open); setErr(null); }} className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white">{show ? "Đóng" : "Thêm kỷ niệm"}</button>
      </div>
      <form action="/memory" className="mt-4"><input name="q" defaultValue={q} placeholder="Tìm kỷ niệm…" aria-label="Tìm kỷ niệm" className="w-full max-w-sm rounded-full border border-line bg-card px-4 py-2" /></form>
      {show && (
        <form key={editing?.id ?? "new"} onSubmit={submit} className="mt-5 max-w-xl space-y-3 rounded-3xl bg-card p-6 shadow-soft">
          <label className="block text-sm">Tiêu đề<input name="title" required maxLength={150} defaultValue={editing?.title} className={f} /></label>
          <label className="block text-sm">Điều muốn nhớ<textarea name="content" rows={4} maxLength={8000} defaultValue={editing?.content ?? ""} className={f} /></label>
          <label className="block text-sm">Ngày<input name="memory_date" type="date" max={today} defaultValue={editing?.memory_date ?? today} className={f} /></label>
          <label className="block text-sm">Ảnh {editing?.media_path ? "(chọn ảnh mới để thay)" : "(tùy chọn)"}<input name="photo" type="file" accept="image/*" className={f} /></label>
          {err && <p role="alert" className="text-sm text-brand">{err}</p>}
          <button disabled={busy} className="rounded-xl bg-brand px-5 py-2 text-white disabled:opacity-60">{busy ? "Đang lưu…" : "Lưu"}</button>
        </form>
      )}
      {!show && err && <p role="alert" className="mt-3 text-sm text-brand">{err}</p>}
      {onThisDay.length > 0 && <p className="mt-5 rounded-2xl bg-brand-soft px-4 py-3 text-sm">Ngày này những năm trước, hai bạn đã giữ lại {onThisDay.length} kỷ niệm. Chúng được đánh dấu bên dưới.</p>}
      {items.length === 0 ? <p className="mt-8 text-muted">{q ? "Không tìm thấy kỷ niệm nào." : "Vườn còn trống. Hãy gieo kỷ niệm đầu tiên."}</p> : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">{items.map((m) => (
          <li key={m.id} className={`overflow-hidden rounded-3xl bg-card shadow-soft ${onThisDay.includes(m.id) ? "ring-2 ring-brand" : ""}`}>
            {m.media_path && <SignedImg bucket="memories" path={m.media_path} className="h-48 w-full object-cover" />}
            <div className="p-5">
              <p className="text-xs text-muted">{new Date(m.memory_date + "T00:00:00").toLocaleDateString("vi-VN")} · {m.author}</p>
              <h2 className="font-display text-2xl">{m.title}</h2>
              {m.content && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{m.content}</p>}
              {m.created_by === meId && <p className="mt-3 flex gap-4 text-xs"><button onClick={() => { setEditing(m); setOpen(false); setErr(null); window.scrollTo({ top: 0 }); }} className="text-brand">Sửa</button><button onClick={() => del(m)} className="text-muted hover:text-brand">Xóa</button></p>}
            </div>
          </li>))}</ul>)}
    </div>
  );
}
