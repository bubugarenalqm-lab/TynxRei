"use client";
import { useState } from "react";
import { KIND_VI, type TLEvent, type TLKind } from "@/lib/timeline";

const SPACING = 90, GROUND = 240;
const jitter = (i: number, range: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * range - range / 2; };

function Head({ kind }: { kind: TLKind }) {
  switch (kind) {
    case "beginning": return <path d="M0 8 C-14 -3 -9 -15 0 -8 C9 -15 14 -3 0 8z" fill="var(--brand)" />;
    case "sheet": return <g stroke="var(--fg)" strokeWidth="1.6" fill="var(--fg)"><ellipse cx="-3" cy="6" rx="5" ry="3.6" stroke="none" /><path d="M2 6V-10l7 3" fill="none" /></g>;
    case "letter": return <g><rect x="-10" y="-7" width="20" height="14" rx="2" fill="#fff" stroke="var(--brand)" strokeWidth="1.5" /><path d="M-10-6l10 8 10-8" fill="none" stroke="var(--brand)" strokeWidth="1.5" /></g>;
    default: {
      const c = kind === "bloom" ? "#A58BD6" : "var(--brand)";
      return <g stroke="#fff" strokeWidth=".8">{[0, 72, 144, 216, 288].map((r) => <circle key={r} r="5" cx="0" cy="-7" fill={c} transform={`rotate(${r})`} />)}<circle r="3.5" fill="#F8D98B" stroke="none" /></g>;
    }
  }
}

export default function GardenMap({ events }: { events: TLEvent[] }) {
  const [sel, setSel] = useState<TLEvent | null>(null);
  const width = Math.max(events.length * SPACING + 160, 600);
  return (
    <div>
      <div className="overflow-x-auto rounded-3xl border border-line bg-card shadow-soft">
        <svg width={width} height={320} viewBox={`0 0 ${width} 320`} role="group" aria-label="Bản đồ khu vườn">
          <rect width={width} height={GROUND} fill="var(--brand-soft)" opacity=".45" />
          <path d={`M0 ${GROUND} Q ${width / 4} ${GROUND - 14} ${width / 2} ${GROUND} T ${width} ${GROUND} V320 H0z`} fill="#CFE5D6" />
          {events.map((e, i) => {
            const x = 80 + i * SPACING, gy = GROUND + jitter(i, 10), top = gy - (70 + Math.abs(jitter(i + 7, 70)));
            const on = sel?.id === e.id;
            return (
              <g key={e.id} role="button" tabIndex={0} aria-label={`${KIND_VI[e.kind]}: ${e.title}`} className="cursor-pointer"
                onClick={() => setSel(e)} onKeyDown={(k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); setSel(e); } }}>
                <rect x={x - 22} y={top - 22} width={44} height={gy - top + 26} fill="transparent" />
                <line x1={x} y1={gy} x2={x} y2={top} stroke="#6FA98A" strokeWidth="2.5" strokeLinecap="round" />
                <ellipse cx={x - 8} cy={(gy + top) / 2 + 10} rx="7" ry="3.5" fill="#6FA98A" transform={`rotate(-30 ${x - 8} ${(gy + top) / 2 + 10})`} />
                <ellipse cx={x + 8} cy={(gy + top) / 2 - 6} rx="7" ry="3.5" fill="#6FA98A" transform={`rotate(30 ${x + 8} ${(gy + top) / 2 - 6})`} />
                {on && <circle cx={x} cy={top} r="17" fill="none" stroke="var(--brand)" strokeWidth="2" />}
                <g transform={`translate(${x} ${top})`}><Head kind={e.kind} /></g>
                <text x={x} y={GROUND + 44} textAnchor="middle" fontSize="10" fill="var(--muted)">{e.date.slice(8)}/{e.date.slice(5, 7)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-4 min-h-20 rounded-3xl bg-card p-5 shadow-soft" aria-live="polite">
        {sel ? (<><p className="text-xs text-muted">{KIND_VI[sel.kind]} · {new Date(sel.date + "T00:00:00").toLocaleDateString("vi-VN")}</p><h2 className="font-display text-2xl">{sel.title}</h2>{sel.text && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{sel.text}</p>}</>)
          : <p className="text-muted">Chạm vào một bông hoa, ngôi sao hay lá thư để mở nó ra.</p>}
      </div>
    </div>
  );
}
