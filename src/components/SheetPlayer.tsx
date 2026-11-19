"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Pinned } from "./SheetLibrary";

type Note = { t: number; k: number };
type Sheet = { name: string; author: string | null; bpm: number | null; notes: Note[]; durationMs: number };
const INSTRUMENTS: [string, string][] = [["GrandPiano", "Piano lớn"], ["Piano", "Piano"], ["Harp", "Hạc cầm"], ["Kalimba", "Kalimba"], ["Flute", "Sáo"], ["Guitar", "Guitar"]];
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const WINDOW = 2400; // ms của bài nhìn trước, dùng cho vẽ nốt rơi
const ERRORS: Record<string, string> = {
  not_configured: "Chưa kết nối server sheet (xem README, các biến SHEET_*).", device_mismatch: "License của web đang gắn với thiết bị khác.", expired: "License của web đã hết hạn.",
  revoked: "License của web đã bị thu hồi.", not_found: "Không tìm thấy bài này trên server.", bad_format: "Sheet có định dạng không đọc được.", bad_aes_key: "Khóa giải mã (SHEET_AES_KEY_HEX) chưa đúng.",
};
const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
function lowerBound(a: Note[], t: number) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m].t < t) lo = m + 1; else hi = m; } return lo; }

export default function SheetPlayer({ sheetId, pinned, meId, configured }: { sheetId: number; pinned: Pinned | null; meId: string; configured: boolean }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [error, setError] = useState<string | null>(configured ? null : ERRORS.not_configured);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [inst, setInst] = useState("GrandPiano");
  const [speed, setSpeed] = useState(1);
  const [vol, setVol] = useState(0.8);
  const [audioBusy, setAudioBusy] = useState(false);
  const [note, setNote] = useState(pinned?.note ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const cache = useRef(new Map<string, AudioBuffer[]>());
  const buffers = useRef<AudioBuffer[]>([]);
  const active = useRef(new Set<AudioBufferSourceNode>());
  const playingRef = useRef(false), baseRef = useRef(0), pausedRef = useRef(0), nextRef = useRef(0), speedRef = useRef(1);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const notesRef = useRef<Note[]>([]);
  const rollRef = useRef<HTMLCanvasElement>(null), gridRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!configured) return;
    let dead = false;
    fetch(`/api/sheets/${sheetId}`).then(async (r) => {
      const j = (await r.json()) as Sheet & { error?: string };
      if (dead) return;
      if (!r.ok) return setError(ERRORS[j.error ?? ""] ?? "Không tải được sheet. Server của bạn có thể đang ngủ, hãy thử lại sau ít giây.");
      notesRef.current = j.notes; setSheet(j);
    }).catch(() => { if (!dead) setError("Không tải được sheet. Hãy thử lại."); });
    return () => { dead = true; };
  }, [sheetId, configured]);

  const getPos = useCallback(() => (playingRef.current && ctxRef.current ? (ctxRef.current.currentTime - baseRef.current) * speedRef.current * 1000 : pausedRef.current), []);
  const ensureAudio = useCallback(() => {
    if (!ctxRef.current) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC(), master = ctx.createGain(), comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination); ctxRef.current = ctx; masterRef.current = master;
    }
    return ctxRef.current;
  }, []);
  const loadInstrument = useCallback(async (name: string) => {
    const hit = cache.current.get(name);
    if (hit) { buffers.current = hit; return; }
    setAudioBusy(true);
    const ctx = ensureAudio();
    try {
      const bufs = await Promise.all(Array.from({ length: 15 }, async (_, i) => ctx.decodeAudioData(await (await fetch(`/audio/${name}/${i}.mp3`)).arrayBuffer())));
      cache.current.set(name, bufs); buffers.current = bufs;
    } catch { setMsg("Không tải được âm thanh của đàn này."); }
    setAudioBusy(false);
  }, [ensureAudio]);

  const stopActive = () => { active.current.forEach((s) => { try { s.stop(); } catch { /* đã dừng */ } }); active.current.clear(); };
  const tick = useCallback(() => {
    const ctx = ctxRef.current, ns = notesRef.current;
    if (!ctx) return;
    while (nextRef.current < ns.length) {
      const n = ns[nextRef.current], when = baseRef.current + n.t / 1000 / speedRef.current;
      if (when > ctx.currentTime + 0.15) break;
      const buf = buffers.current[n.k];
      if (buf && masterRef.current) {
        const src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = buf; g.gain.value = 0.7; src.connect(g); g.connect(masterRef.current);
        src.start(Math.max(when, ctx.currentTime)); active.current.add(src); src.onended = () => active.current.delete(src);
      }
      nextRef.current++;
    }
    const end = ns.length ? ns[ns.length - 1].t : 0;
    if (getPos() > end + 700) { clearInterval(timer.current); playingRef.current = false; pausedRef.current = 0; setPlaying(false); setPos(0); }
  }, [getPos]);

  async function play() {
    if (!sheet || sheet.notes.length === 0) return;
    const ctx = ensureAudio();
    if (ctx.state === "suspended") await ctx.resume();
    await loadInstrument(inst);
    let p = pausedRef.current;
    if (p >= sheet.durationMs) p = 0;
    baseRef.current = ctx.currentTime - p / 1000 / speedRef.current;
    nextRef.current = lowerBound(notesRef.current, p);
    playingRef.current = true; setPlaying(true); setMsg(null);
    clearInterval(timer.current); timer.current = setInterval(tick, 30);
  }
  function pause() { pausedRef.current = getPos(); playingRef.current = false; clearInterval(timer.current); setPlaying(false); }
  function seek(ms: number) {
    const v = Math.max(0, Math.min(sheet?.durationMs ?? 0, ms));
    stopActive(); pausedRef.current = v; setPos(v);
    if (playingRef.current && ctxRef.current) { baseRef.current = ctxRef.current.currentTime - v / 1000 / speedRef.current; nextRef.current = lowerBound(notesRef.current, v); }
  }
  function changeSpeed(s: number) {
    const p = getPos(); speedRef.current = s; setSpeed(s);
    if (playingRef.current && ctxRef.current) baseRef.current = ctxRef.current.currentTime - p / 1000 / s;
  }
  useEffect(() => { if (masterRef.current) masterRef.current.gain.value = vol; }, [vol, playing]);
  useEffect(() => { if (ctxRef.current) void loadInstrument(inst); }, [inst, loadInstrument]);
  useEffect(() => () => { clearInterval(timer.current); stopActive(); void ctxRef.current?.close(); }, []);

  // Vẽ "đọc nhạc": 15 làn = 15 phím của đàn, nốt rơi xuống vạch dưới; bảng 3×5 sáng lên theo phím đang bấm
  useEffect(() => {
    if (!sheet) return;
    let raf = 0, last = 0, frame = 0, brand = "#E2819F", line = "#EFE6E8", fg = "#3B3638";
    const draw = (now: number) => {
      const cv = rollRef.current, gv = gridRef.current;
      if (cv && gv) {
        if (frame++ % 60 === 0) { const cs = getComputedStyle(document.documentElement); brand = cs.getPropertyValue("--brand").trim() || brand; line = cs.getPropertyValue("--line").trim() || line; fg = cs.getPropertyValue("--fg").trim() || fg; }
        const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
        if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        const g = cv.getContext("2d")!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
        const p = getPos(), lane = w / 15, hit = h - 16, ns = notesRef.current, lit = new Array<boolean>(15).fill(false);
        g.strokeStyle = line; g.lineWidth = 1;
        for (let i = 0; i <= 15; i++) { g.globalAlpha = i % 5 === 0 ? 1 : 0.5; g.beginPath(); g.moveTo(i * lane, 0); g.lineTo(i * lane, h); g.stroke(); }
        g.globalAlpha = 1;
        for (let i = lowerBound(ns, p - 200); i < ns.length && ns[i].t <= p + WINDOW; i++) {
          const n = ns[i], y = hit - ((n.t - p) / WINDOW) * hit, near = Math.abs(n.t - p) < 110;
          if (n.t >= p - 110 && n.t <= p + 40) lit[n.k] = true;
          g.fillStyle = brand; g.globalAlpha = n.t < p ? 0.35 : 0.5 + 0.5 * (1 - (n.t - p) / WINDOW);
          g.beginPath(); g.roundRect(n.k * lane + 3, y - 9, lane - 6, 12, 5); g.fill();
          if (near) { g.globalAlpha = 1; g.strokeStyle = fg; g.lineWidth = 1.5; g.stroke(); g.strokeStyle = line; g.lineWidth = 1; }
        }
        g.globalAlpha = 1; g.fillStyle = brand; g.fillRect(0, hit + 3, w, 2);
        const gd = gv.getContext("2d")!, gw = 150, gh = 90;
        if (gv.width !== Math.round(gw * dpr)) { gv.width = Math.round(gw * dpr); gv.height = Math.round(gh * dpr); }
        gd.setTransform(dpr, 0, 0, dpr, 0, 0); gd.clearRect(0, 0, gw, gh);
        for (let k = 0; k < 15; k++) {
          const x = (k % 5) * 30 + 15, y = Math.floor(k / 5) * 30 + 15;
          gd.beginPath(); gd.arc(x, y, 11, 0, Math.PI * 2); gd.fillStyle = lit[k] ? brand : line; gd.fill();
        }
        if (now - last > 100) { last = now; setPos(Math.min(p, sheet.durationMs)); }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [sheet, getPos]);

  async function savePin() {
    if (!sheet) return;
    const sb = createClient();
    const res = pinned ? await sb.from("our_sheets").update({ note: note.trim() || null }).eq("id", pinned.id)
      : await sb.from("our_sheets").insert({ sheet_id: sheetId, name: sheet.name, author: sheet.author, note: note.trim() || null });
    if (res.error) return setMsg("Không lưu được. Hãy chạy 0006_our_sheets.sql (xem README).");
    setMsg(pinned ? "Đã lưu ghi chú." : "Đã ghim vào bài của mình."); router.refresh();
  }
  async function unpin() {
    if (!pinned || !confirm("Bỏ ghim bài này?")) return;
    const { error } = await createClient().from("our_sheets").delete().eq("id", pinned.id);
    if (error) return setMsg("Chỉ người ghim mới bỏ ghim được."); router.refresh();
  }
  const sel = "rounded-xl border border-line bg-card px-3 py-2 text-sm";
  const canEdit = !pinned || pinned.added_by === meId;
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <Link href="/sheets" className="text-sm text-muted hover:text-fg">← Sheet nhạc</Link>
      <h1 className="mt-2 font-display text-4xl">{sheet?.name ?? (error ? "Sheet nhạc" : "Đang tải…")}</h1>
      {sheet && <p className="text-sm text-muted">{sheet.author ?? "Không rõ tác giả"}{sheet.bpm ? ` · ${sheet.bpm} BPM` : ""} · {sheet.notes.length} nốt · {fmt(sheet.durationMs)}</p>}
      {error && <p role="alert" className="mt-6 max-w-xl rounded-2xl bg-card p-5 text-brand shadow-soft">{error}</p>}
      {sheet && (sheet.notes.length === 0 ? <p className="mt-6 text-muted">Sheet này không có nốt nào để hiển thị.</p> : (
        <>
          <div className="mt-5 flex flex-col gap-4 md:flex-row">
            <canvas ref={rollRef} role="img" aria-label="Nốt nhạc rơi xuống theo 15 làn phím" className="h-[360px] w-full flex-1 rounded-3xl border border-line bg-card shadow-soft" />
            <div className="shrink-0 rounded-3xl border border-line bg-card p-4 shadow-soft md:w-[190px]"><p className="mb-2 text-xs text-muted">Bàn phím 3×5 của đàn</p><canvas ref={gridRef} aria-hidden style={{ width: 150, height: 90 }} /></div>
          </div>
          <p className="mt-2 text-xs text-muted">Mỗi cột là một phím trong 15 phím của đàn. Nốt rơi xuống vạch dưới là lúc bấm.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={() => (playing ? pause() : void play())} disabled={audioBusy} className="rounded-full bg-brand px-6 py-2.5 font-medium text-white disabled:opacity-60">{audioBusy ? "Đang tải âm thanh…" : playing ? "Tạm dừng" : "Nghe thử"}</button>
            <button onClick={() => seek(0)} className="rounded-full border border-line px-4 py-2 text-sm">Về đầu</button>
            <select value={inst} onChange={(e) => setInst(e.target.value)} aria-label="Nhạc cụ" className={sel}>{INSTRUMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <select value={speed} onChange={(e) => changeSpeed(Number(e.target.value))} aria-label="Tốc độ" className={sel}>{SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}</select>
            <label className="flex items-center gap-2 text-sm text-muted">Âm lượng<input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(Number(e.target.value))} aria-label="Âm lượng" className="w-24 accent-[var(--brand)]" /></label>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted"><span className="w-10 text-right">{fmt(pos)}</span>
            <input type="range" min={0} max={sheet.durationMs} step={100} value={Math.min(pos, sheet.durationMs)} onChange={(e) => seek(Number(e.target.value))} aria-label="Tiến trình" className="flex-1 accent-[var(--brand)]" /><span className="w-10">{fmt(sheet.durationMs)}</span></div>
          {msg && <p role="status" className="mt-3 text-sm text-muted">{msg}</p>}
          <section className="mt-8 max-w-xl rounded-3xl bg-card p-6 shadow-soft" aria-label="Bài của mình">
            <h2 className="font-display text-2xl">{pinned ? "Bài của mình" : "Ghim vào bài của mình"}</h2>
            {pinned && <p className="text-xs text-muted">Ghim bởi {pinned.added_by === meId ? "bạn" : "người ấy"}</p>}
            <label className="mt-3 block text-sm">Vì sao bài này đặc biệt?<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} disabled={!canEdit} className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2" /></label>
            <div className="mt-3 flex gap-3">{canEdit && <button onClick={() => void savePin()} className="rounded-full bg-brand px-5 py-2 text-sm text-white">{pinned ? "Lưu ghi chú" : "Ghim bài này"}</button>}
              {pinned && pinned.added_by === meId && <button onClick={() => void unpin()} className="rounded-full border border-line px-5 py-2 text-sm text-muted">Bỏ ghim</button>}</div>
          </section>
        </>))}
    </div>
  );
}
