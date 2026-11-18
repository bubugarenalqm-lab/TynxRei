"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TZ } from "@/lib/types";
import SignedImg from "./SignedImg";

export type Capsule = { id: string; created_by: string; title: string; unlock_at: string; created_at: string; message: string | null; media_path: string | null };
const d = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { timeZone: TZ });

export default function Capsules({ meId, items, names, minDate, nowISO }: { meId: string; items: Capsule[]; names: Record<string, string>; minDate: string; nowISO: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const f = "mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim(), message = String(fd.get("message") ?? "").trim(), date = String(fd.get("date") ?? "");
    if (!title || !message) return setErr("Cần có tiêu đề và nội dung.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < minDate) return setErr("Ngày mở phải ở tương lai.");
    if (!confirm(`Niêm phong tới ${new Date(date + "T00:00:00").toLocaleDateString("vi-VN")}? Không ai (kể cả bạn) mở được trước ngày đó.`)) return;
    const photo = fd.get("photo") as File;
    if (photo.size && (!photo.type.startsWith("image/") || photo.size > 15 * 1024 * 1024)) return setErr("Ảnh tối đa 15 MB.");
    setBusy(true); setErr(null);
    const sb = createClient();
    let media_path: string | null = null;
    if (photo.size) {
      const ext = (photo.name.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5).toLowerCase() || "jpg";
      media_path = `${meId}/${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from("memories").upload(media_path, photo, { contentType: photo.type });
      if (up.error) { setBusy(false); return setErr("Tải ảnh lên thất bại."); }
    }
    const { error } = await sb.from("time_capsules").insert({ title, message, media_path, unlock_at: `${date}T00:00:00+07:00` });
    setBusy(false);
    if (error) { if (media_path) await sb.storage.from("memories").remove([media_path]); return setErr("Không niêm phong được hộp thời gian."); }
    form.reset(); router.refresh();
  }
  const sealed = items.filter((i) => i.message === null), opened = items.filter((i) => i.message !== null);
  const left = (iso: string) => Math.max(1, Math.ceil((Date.parse(iso) - Date.parse(nowISO)) / 864e5));
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Hộp thời gian</h1>
      <p className="mt-1 text-sm text-muted">Viết cho tương lai. Hộp chỉ mở vào đúng ngày đã chọn, không ai mở sớm được.</p>
      <form onSubmit={submit} className="mt-6 max-w-xl space-y-3 rounded-3xl bg-card p-6 shadow-soft">
        <label className="block text-sm">Tiêu đề<input name="title" required maxLength={120} className={f} /></label>
        <label className="block text-sm">Điều muốn gửi vào tương lai<textarea name="message" required rows={4} maxLength={8000} className={f} /></label>
        <label className="block text-sm">Ảnh (tùy chọn, sẽ bị niêm phong cùng lời nhắn)<input name="photo" type="file" accept="image/*" className={f} /></label>
        <label className="block text-sm">Ngày mở<input name="date" type="date" min={minDate} required className={f} /></label>
        {err && <p role="alert" className="text-sm text-brand">{err}</p>}
        <button disabled={busy} className="rounded-xl bg-brand px-5 py-2 text-white disabled:opacity-60">{busy ? "Đang niêm phong…" : "Niêm phong"}</button>
      </form>
      <section className="mt-8 max-w-2xl" aria-label="Hộp đang niêm phong"><h2 className="font-display text-2xl">Đang niêm phong</h2>
        {sealed.length === 0 ? <p className="mt-2 text-sm text-muted">Chưa có hộp nào.</p> : <ul className="mt-3 space-y-3">{sealed.map((c) => (
          <li key={c.id} className="rounded-3xl bg-card p-5 shadow-soft"><p className="font-medium">{c.title}</p>
            <p className="text-sm text-muted">{names[c.created_by] ?? ""} viết · mở ngày {d(c.unlock_at)} · còn {left(c.unlock_at)} ngày</p></li>))}</ul>}</section>
      {opened.length > 0 && <section className="mt-8 max-w-2xl" aria-label="Hộp đã mở"><h2 className="font-display text-2xl">Đã mở</h2>
        <ul className="mt-3 space-y-3">{opened.map((c) => (<li key={c.id} className="rounded-3xl bg-brand-soft p-5"><p className="font-medium">{c.title}</p>
          <p className="text-xs text-muted">{names[c.created_by] ?? ""} viết ngày {d(c.created_at)} · mở ngày {d(c.unlock_at)}</p><p className="mt-2 whitespace-pre-wrap">{c.message}</p>{c.media_path && <SignedImg bucket="memories" path={c.media_path} className="mt-3 max-h-80 rounded-2xl object-cover" />}</li>))}</ul></section>}
    </div>
  );
}
