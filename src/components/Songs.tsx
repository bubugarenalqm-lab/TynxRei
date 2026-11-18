"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Song = { id: string; added_by: string; title: string; artist: string | null; url: string | null; note: string | null; created_at: string };
function embedUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const x = new URL(u), h = x.hostname.replace(/^www\./, ""), ok = (id?: string | null) => (id && /^[\w-]{6,40}$/.test(id) ? id : null);
    if (h === "youtu.be") { const id = ok(x.pathname.slice(1)); return id ? `https://www.youtube-nocookie.com/embed/${id}` : null; }
    if (h === "youtube.com" || h === "m.youtube.com" || h === "music.youtube.com") {
      const id = ok(x.searchParams.get("v") ?? x.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1]);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (h === "open.spotify.com") { const m = x.pathname.match(/^\/(?:intl-[a-z]+\/)?(track|album|playlist|episode)\/(\w{10,30})/); return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null; }
  } catch { /* url không hợp lệ */ }
  return null;
}
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

export default function Songs({ meId, items, names }: { meId: string; items: Song[]; names: Record<string, string> }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const f = "mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2";

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim(), artist = String(fd.get("artist") ?? "").trim() || null;
    const url = String(fd.get("url") ?? "").trim() || null, note = String(fd.get("note") ?? "").trim() || null;
    if (!title) return setErr("Cần có tên bài hát.");
    if (url && !/^https?:\/\//i.test(url)) return setErr("Liên kết phải bắt đầu bằng http:// hoặc https://");
    setBusy(true); setErr(null);
    const { error } = await createClient().from("songs").insert({ title, artist, url, note });
    setBusy(false);
    if (error) return setErr("Không lưu được bài hát.");
    form.reset(); router.refresh();
  }
  async function del(s: Song) {
    if (!confirm(`Xóa "${s.title}"?`)) return;
    const { error } = await createClient().from("songs").delete().eq("id", s.id);
    if (error) return setErr("Không xóa được.");
    router.refresh();
  }
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Bài hát của mình</h1>
      <p className="mt-1 text-sm text-muted">Những bài hát gắn với hai bạn, kèm lý do. Dán liên kết từ YouTube, Spotify hoặc nơi bạn nghe.</p>
      <form onSubmit={add} className="mt-6 max-w-xl space-y-3 rounded-3xl bg-card p-6 shadow-soft">
        <label className="block text-sm">Tên bài<input name="title" required maxLength={150} className={f} /></label>
        <label className="block text-sm">Nghệ sĩ<input name="artist" maxLength={150} className={f} /></label>
        <label className="block text-sm">Liên kết (tùy chọn)<input name="url" type="url" maxLength={500} placeholder="https://…" className={f} /></label>
        <label className="block text-sm">Vì sao là bài này<textarea name="note" rows={2} maxLength={1000} className={f} /></label>
        {err && <p role="alert" className="text-sm text-brand">{err}</p>}
        <button disabled={busy} className="rounded-xl bg-brand px-5 py-2 text-white disabled:opacity-60">Thêm bài hát</button>
      </form>
      {items.length === 0 ? <p className="mt-8 text-muted">Chưa có bài hát nào.</p> : (
        <ul className="mt-6 grid max-w-3xl gap-4 md:grid-cols-2">{items.map((s) => (
          <li key={s.id} className="rounded-3xl bg-card p-5 shadow-soft">
            <h2 className="font-display text-2xl">{s.title}</h2>
            <p className="text-sm text-muted">{s.artist ?? "Không rõ nghệ sĩ"} · {names[s.added_by] ?? ""} thêm</p>
            {s.note && <p className="mt-2 whitespace-pre-wrap text-sm">{s.note}</p>}
            {playing === s.id && embedUrl(s.url) && <iframe src={embedUrl(s.url)!} title={`Nghe ${s.title}`} loading="lazy" allow="encrypted-media; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" className="mt-3 h-40 w-full rounded-2xl border-0" />}
            <p className="mt-3 flex flex-wrap items-center gap-4 text-sm">{embedUrl(s.url) && <button onClick={() => setPlaying(playing === s.id ? null : s.id)} className="rounded-full bg-brand px-3 py-1 text-white">{playing === s.id ? "Đóng trình phát" : "Phát tại đây"}</button>}{s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand underline">Nghe trên {host(s.url)}</a>}
              {s.added_by === meId && <button onClick={() => del(s)} aria-label={`Xóa ${s.title}`} className="text-xs text-muted hover:text-brand">Xóa</button>}</p>
          </li>))}</ul>)}
    </div>
  );
}
