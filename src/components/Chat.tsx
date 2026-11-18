"use client";
/* eslint-disable @next/next/no-img-element -- ảnh là signed URL của Supabase Storage */
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayKey, fmtDay, fmtTime, type Msg, type Rx } from "@/lib/types";
import { usePartnerOnline, type Person } from "./Shell";

const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🥰"];
const urlCache = new Map<string, string>();

function Photo({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(urlCache.get(path) ?? null);
  useEffect(() => {
    if (url) return;
    void createClient().storage.from("chat").createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) { urlCache.set(path, data.signedUrl); setUrl(data.signedUrl); }
    });
  }, [path, url]);
  return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh trong cuộc trò chuyện" className="max-h-72 rounded-xl object-cover" /></a>
    : <div className="h-40 w-52 animate-pulse rounded-xl bg-line" aria-label="Đang tải ảnh" />;
}

export default function Chat({ me, partner, initialMessages, initialReactions }: { me: Person; partner: Person | null; initialMessages: Msg[]; initialReactions: Rx[] }) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [rx, setRx] = useState<Rx[]>(initialReactions);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const online = usePartnerOnline();

  const addMsg = useCallback((m: Msg) => setMsgs((p) => (p.some((x) => x.id === m.id) ? p : [...p, m])), []);

  useEffect(() => {
    const sb = createClient();
    const seen = () => { if (document.visibilityState === "visible") void sb.rpc("mark_seen"); };
    seen();
    document.addEventListener("visibilitychange", seen); window.addEventListener("focus", seen);
    const ch = sb.channel("chat-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => { const m = p.new as Msg; addMsg(m); if (m.sender_id !== me.id) seen(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (p) => { const m = p.new as Msg; setMsgs((prev) => prev.map((x) => (x.id === m.id ? m : x))); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (p) => { const id = (p.old as { id: string }).id; setMsgs((prev) => prev.filter((x) => x.id !== id)); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (p) => { const r = p.new as Rx; setRx((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r])); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "message_reactions" }, (p) => { const r = p.new as Rx; setRx((prev) => prev.map((x) => (x.id === r.id ? r : x))); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (p) => { const id = (p.old as { id: string }).id; setRx((prev) => prev.filter((x) => x.id !== id)); })
      .subscribe();
    return () => { document.removeEventListener("visibilitychange", seen); window.removeEventListener("focus", seen); void sb.removeChannel(ch); };
  }, [me.id, addMsg]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true); setErr(null); setText("");
    const { data, error } = await createClient().from("messages").insert({ content: t }).select().single();
    if (error) { setErr("Không gửi được tin nhắn."); setText(t); } else if (data) addMsg(data as Msg);
    setBusy(false);
  }

  async function sendPhoto(file: File) {
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) return setErr("Chỉ gửi ảnh, tối đa 15 MB.");
    setBusy(true); setErr(null);
    const sb = createClient();
    const ext = (file.name.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5).toLowerCase() || "jpg";
    const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
    const up = await sb.storage.from("chat").upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); return setErr("Tải ảnh lên thất bại."); }
    const { data, error } = await sb.from("messages").insert({ media_type: "photo", media_path: path }).select().single();
    if (error) { await sb.storage.from("chat").remove([path]); setErr("Không gửi được ảnh."); } else if (data) addMsg(data as Msg);
    setBusy(false);
  }

  async function react(m: Msg, emoji: string) {
    setPicker(null);
    const sb = createClient();
    const mine = rx.find((r) => r.message_id === m.id && r.user_id === me.id);
    if (mine?.emoji === emoji) { await sb.from("message_reactions").delete().eq("id", mine.id); return; }
    const { error } = await sb.from("message_reactions").upsert({ message_id: m.id, emoji }, { onConflict: "message_id,user_id" });
    if (error) setErr("Không thả được cảm xúc.");
  }

  async function remove(m: Msg) {
    if (!confirm("Xóa tin nhắn này?")) return;
    const { error } = await createClient().from("messages").delete().eq("id", m.id);
    if (error) return setErr("Không xóa được tin nhắn.");
    setMsgs((p) => p.filter((x) => x.id !== m.id));
    if (m.media_path) void createClient().storage.from("chat").remove([m.media_path]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-card px-5 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft font-display text-lg text-brand">{(partner?.display_name ?? "?").charAt(0)}</div>
        <div><p className="font-medium leading-tight">{partner?.display_name ?? "Chưa có người ấy"}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted"><span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-line"}`} />{online ? "đang trực tuyến" : "ngoài tuyến"}</p></div>
      </header>
      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label="Tin nhắn">
        {msgs.length === 0 && <p className="mt-10 text-center text-muted">Chưa có tin nhắn nào. Nói điều gì đó đi.</p>}
        {msgs.map((m, i) => {
          const mineMsg = m.sender_id === me.id;
          const newDay = i === 0 || dayKey(msgs[i - 1].created_at) !== dayKey(m.created_at);
          const chips = rx.filter((r) => r.message_id === m.id);
          return (
            <div key={m.id}>
              {newDay && <p className="my-4 text-center text-xs text-muted">{fmtDay(m.created_at)}</p>}
              <div className={`group flex flex-col ${mineMsg ? "items-end" : "items-start"}`}>
                <div className={`flex items-center gap-1 ${mineMsg ? "flex-row-reverse" : ""}`}>
                  <div className={`max-w-[78vw] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 md:max-w-md ${mineMsg ? "bg-brand text-white" : "bg-card shadow-soft"}`}>
                    {m.media_type === "photo" && m.media_path && <Photo path={m.media_path} />}
                    {m.content}
                  </div>
                  <div className="flex gap-1 text-xs text-muted opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button onClick={() => setPicker(picker === m.id ? null : m.id)} aria-label="Thả cảm xúc" className="rounded-full px-2 py-1 hover:bg-line">+</button>
                    {mineMsg && <button onClick={() => remove(m)} aria-label="Xóa tin nhắn" className="rounded-full px-2 py-1 hover:bg-line">Xóa</button>}
                  </div>
                </div>
                {picker === m.id && <div className="my-1 flex gap-1 rounded-full bg-card px-2 py-1 shadow-soft">{EMOJIS.map((e) => <button key={e} onClick={() => react(m, e)} className="rounded-full px-1.5 text-lg hover:bg-line" aria-label={`Thả ${e}`}>{e}</button>)}</div>}
                {chips.length > 0 && <div className="-mt-1 flex gap-1">{chips.map((r) => <span key={r.id} className="rounded-full border border-line bg-card px-1.5 text-sm">{r.emoji}</span>)}</div>}
                <p className="mt-0.5 text-[11px] text-muted">{fmtTime(m.created_at)}{mineMsg && (m.seen_at ? " · Đã xem" : m.delivered_at ? " · Đã nhận" : " · Đã gửi")}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <div className="border-t border-line bg-card p-3">
        {err && <p role="alert" className="mb-2 text-sm text-brand">{err}</p>}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void sendPhoto(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Gửi ảnh" className="rounded-full px-3 py-2 text-sm text-muted hover:bg-bg">Ảnh</button>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={4000} placeholder="Nói điều gì đó…" aria-label="Soạn tin nhắn"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-line bg-bg px-4 py-2" />
          <button onClick={() => void send()} disabled={busy || !text.trim()} className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-50">Gửi</button>
        </div>
        <p className="mt-1 text-center text-[11px] text-muted">Enter để gửi · Shift+Enter xuống dòng</p>
      </div>
    </div>
  );
}
