"use client";
/* eslint-disable @next/next/no-img-element -- ảnh là signed URL của Supabase Storage */
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayKey, fmtDay, fmtTime, type Msg, type Rx } from "@/lib/types";
import Icon from "./Icon";
import { usePartnerOnline, type Person } from "./Shell";
import { useSigned } from "./useSigned";

const EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🥰"];
const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };

function Photo({ path }: { path: string }) {
  const url = useSigned("chat", path);
  return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh trong cuộc trò chuyện" className="max-h-72 rounded-2xl object-cover" /></a> : <div className="h-40 w-52 animate-pulse rounded-2xl bg-line" aria-label="Đang tải ảnh" />;
}
function Voice({ path }: { path: string }) {
  const url = useSigned("chat", path);
  return url ? <audio controls preload="metadata" src={url} className="h-10 max-w-full" aria-label="Tin nhắn thoại" /> : <span className="text-sm opacity-70">Đang tải tin nhắn thoại…</span>;
}
function FileLink({ path, name, mine }: { path: string; name: string; mine: boolean }) {
  const url = useSigned("chat", path, name);
  return <a href={url ?? undefined} className={`flex items-center gap-2 underline ${mine ? "text-white" : "text-brand"}`}><Icon name="clip" className="h-4 w-4" />{name}</a>;
}
function Linkified({ text, mine }: { text: string; mine: boolean }) {
  return <>{text.split(URL_RE).map((part, i) => (i % 2 ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={`underline ${mine ? "text-white" : "text-brand"}`}>{part}</a> : part))}</>;
}

export default function Chat({ me, partner, initialMessages, initialReactions }: { me: Person; partner: Person | null; initialMessages: Msg[]; initialReactions: Rx[] }) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [rx, setRx] = useState<Rx[]>(initialReactions);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const online = usePartnerOnline();
  const today = dayKey(new Date());

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
    return () => { document.removeEventListener("visibilitychange", seen); window.removeEventListener("focus", seen); void sb.removeChannel(ch); clearInterval(timer.current); };
  }, [me.id, addMsg]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  async function sendText() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true); setErr(null); setText("");
    const { data, error } = await createClient().from("messages").insert({ content: t }).select().single();
    if (error) { setErr("Không gửi được tin nhắn."); setText(t); } else if (data) addMsg(data as Msg);
    setBusy(false);
  }

  async function sendMedia(blob: Blob, ext: string, type: "photo" | "voice" | "file", label: string | null) {
    setBusy(true); setErr(null);
    const sb = createClient();
    const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
    const up = await sb.storage.from("chat").upload(path, blob, { contentType: blob.type || "application/octet-stream" });
    if (up.error) { setBusy(false); return setErr("Tải tệp lên thất bại."); }
    const { data, error } = await sb.from("messages").insert({ media_type: type, media_path: path, content: label }).select().single();
    if (error) { await sb.storage.from("chat").remove([path]); setErr("Không gửi được."); } else if (data) addMsg(data as Msg);
    setBusy(false);
  }
  const extOf = (n: string, d: string) => (n.split(".").pop() ?? d).replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase() || d;
  function pickPhoto(f: File) { if (!f.type.startsWith("image/") || f.size > 15 * 1024 * 1024) return setErr("Chỉ gửi ảnh, tối đa 15 MB."); void sendMedia(f, extOf(f.name, "jpg"), "photo", null); }
  function pickFile(f: File) { if (f.size > 15 * 1024 * 1024) return setErr("Tệp tối đa 15 MB."); void sendMedia(f, extOf(f.name, "bin"), "file", f.name.slice(0, 150)); }

  async function startRec() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setErr("Trình duyệt này không hỗ trợ ghi âm.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = []; cancelled.current = false;
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop()); clearInterval(timer.current); setRecording(false);
        if (cancelled.current) return;
        const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
        if (blob.size > 0) void sendMedia(blob, blob.type.includes("mp4") ? "m4a" : "webm", "voice", null);
      };
      r.start(); recorder.current = r; setRecording(true); setSecs(0);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch { setErr("Không truy cập được micro. Hãy cho phép quyền ghi âm."); }
  }
  useEffect(() => { if (recording && secs >= 120) recorder.current?.stop(); }, [secs, recording]);
  const stopRec = (cancel: boolean) => { cancelled.current = cancel; recorder.current?.stop(); };

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
  const iconBtn = "rounded-full p-2 text-muted hover:bg-bg disabled:opacity-40";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-card px-5 py-3">
        <div className="relative"><div className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft font-display text-lg text-brand">{(partner?.display_name ?? "?").charAt(0)}</div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${online ? "bg-emerald-500" : "bg-slate-300"}`} /></div>
        <div><p className="font-medium leading-tight">{partner?.display_name ?? "Chưa có người ấy"}</p><p className="text-xs text-muted">{online ? "đang trực tuyến" : "ngoài tuyến"}</p></div>
      </header>
      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label="Tin nhắn">
        {msgs.length === 0 && <p className="mt-10 text-center text-muted">Chưa có tin nhắn nào. Nói điều gì đó đi.</p>}
        {msgs.map((m, i) => {
          const mineMsg = m.sender_id === me.id;
          const newDay = i === 0 || dayKey(msgs[i - 1].created_at) !== dayKey(m.created_at);
          const chips = rx.filter((r) => r.message_id === m.id);
          const firstUrl = m.media_type ? null : (m.content?.match(URL_RE)?.[0] ?? null);
          return (
            <div key={m.id}>
              {newDay && <div className="my-4 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />{dayKey(m.created_at) === today ? "Hôm nay" : fmtDay(m.created_at)}<span className="h-px flex-1 bg-line" /></div>}
              <div className={`group flex flex-col ${mineMsg ? "items-end" : "items-start"}`}>
                <div className={`flex items-center gap-1 ${mineMsg ? "flex-row-reverse" : ""}`}>
                  <div className={`max-w-[78vw] space-y-2 whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 md:max-w-md ${mineMsg ? "bg-brand text-white" : "border border-line bg-card"}`}>
                    {m.media_type === "photo" && m.media_path && <Photo path={m.media_path} />}
                    {m.media_type === "voice" && m.media_path && <Voice path={m.media_path} />}
                    {m.media_type === "file" && m.media_path && <FileLink path={m.media_path} name={m.content ?? "tệp"} mine={mineMsg} />}
                    {!m.media_type && m.content && <p><Linkified text={m.content} mine={mineMsg} /></p>}
                    {firstUrl && <a href={firstUrl} target="_blank" rel="noopener noreferrer" className="block rounded-2xl border border-line bg-card px-3 py-2 text-sm text-fg no-underline"><span className="font-medium">{host(firstUrl)}</span><span className="block text-xs text-muted">Mở liên kết</span></a>}
                  </div>
                  <div className="flex gap-1 text-xs text-muted opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button onClick={() => setPicker(picker === m.id ? null : m.id)} aria-label="Thả cảm xúc" className="rounded-full px-2 py-1 hover:bg-line">+</button>
                    {mineMsg && <button onClick={() => remove(m)} aria-label="Xóa tin nhắn" className="rounded-full px-2 py-1 hover:bg-line">Xóa</button>}
                  </div>
                </div>
                {picker === m.id && <div className="my-1 flex gap-1 rounded-full bg-card px-2 py-1 shadow-soft">{EMOJIS.map((e) => <button key={e} onClick={() => react(m, e)} className="rounded-full px-1.5 text-lg hover:bg-line" aria-label={`Thả ${e}`}>{e}</button>)}</div>}
                {chips.length > 0 && <div className="-mt-1 flex gap-1">{chips.map((r) => <span key={r.id} className="rounded-full border border-brand bg-card px-1.5 text-sm">{r.emoji}</span>)}</div>}
                <p className="mt-0.5 text-[11px] text-muted">{fmtTime(m.created_at)}{mineMsg && (m.seen_at ? " · Đã xem" : m.delivered_at ? " · Đã nhận" : " · Đã gửi")}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <div className="border-t border-line bg-card p-3">
        {err && <p role="alert" className="mb-2 text-sm text-brand">{err}</p>}
        <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickPhoto(f); }} />
        <input ref={fileRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickFile(f); }} />
        {recording ? (
          <div className="flex items-center gap-3 rounded-full border border-brand px-4 py-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand" /><span className="flex-1 text-sm">Đang ghi âm… {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
            <button onClick={() => stopRec(true)} className="text-sm text-muted">Hủy</button>
            <button onClick={() => stopRec(false)} aria-label="Gửi tin nhắn thoại" className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white"><Icon name="send" className="h-[18px] w-[18px]" /></button></div>
        ) : (
          <div className="flex items-end gap-1.5">
            <button onClick={() => imgRef.current?.click()} disabled={busy} aria-label="Gửi ảnh" className={iconBtn}><Icon name="image" /></button>
            <button onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Đính kèm tệp" className={iconBtn}><Icon name="clip" /></button>
            <button onClick={() => void startRec()} disabled={busy} aria-label="Ghi âm" className={iconBtn}><Icon name="mic" /></button>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={4000} placeholder="Nói điều gì đó…" aria-label="Soạn tin nhắn"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void sendText(); } }}
              className="max-h-32 min-h-10 flex-1 resize-none rounded-3xl border border-line bg-bg px-4 py-2" />
            <button onClick={() => void sendText()} disabled={busy || !text.trim()} aria-label="Gửi" className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white disabled:opacity-40"><Icon name="send" className="h-[18px] w-[18px]" /></button>
          </div>)}
        <p className="mt-1 text-center text-[11px] text-muted">Enter để gửi · Shift+Enter xuống dòng</p>
      </div>
    </div>
  );
}
