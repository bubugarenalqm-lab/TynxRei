"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Person = { id: string; slug: string; display_name: string };
const OnlineCtx = createContext(false);
export const usePartnerOnline = () => useContext(OnlineCtx);

const NAV = [
  { href: "/us", label: "Chúng mình" },
  { href: "/memory", label: "Vườn kỷ niệm" },
  { href: "/bloom", label: "Hoa mỗi ngày" },
  { href: "/little-things", label: "Điều nhỏ bé" },
  { href: "/story", label: "Câu chuyện" },
  { href: "/capsules", label: "Hộp thời gian" },
  { href: "/letters", label: "Thư" },
  { href: "/settings", label: "Cài đặt" },
];

export default function Shell({ me, partner, children }: { me: Person; partner: Person | null; children: React.ReactNode }) {
  const path = usePathname();
  const [online, setOnline] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const partnerId = partner?.id, partnerName = partner?.display_name ?? "Người ấy";

  useEffect(() => {
    const sb = createClient();
    void sb.rpc("mark_delivered");
    void sb.from("streak_log").upsert({ user_id: me.id }, { onConflict: "user_id,day", ignoreDuplicates: true });
    const presence = sb.channel("presence-us", { config: { presence: { key: me.id } } });
    presence
      .on("presence", { event: "sync" }, () => setOnline(!!partnerId && Object.keys(presence.presenceState()).includes(partnerId)))
      .subscribe(async (s) => { if (s === "SUBSCRIBED") await presence.track({ at: Date.now() }); });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pings = sb.channel(`pings-${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pings", filter: `to_user=eq.${me.id}` }, (p) => {
        setToast(`${partnerName} đang nghĩ về bạn`);
        clearTimeout(timer); timer = setTimeout(() => setToast(null), 6000);
        void sb.from("pings").update({ seen_at: new Date().toISOString() }).eq("id", (p.new as { id: string }).id);
      }).subscribe();
    return () => { clearTimeout(timer); void sb.removeChannel(presence); void sb.removeChannel(pings); };
  }, [me.id, partnerId, partnerName]);

  return (
    <OnlineCtx.Provider value={online}>
      <div className="flex h-dvh">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-card p-4 md:flex">
          <p className="px-3 py-2 font-display text-2xl">Tyn.fm</p>
          <nav aria-label="Điều hướng" className="mt-4 space-y-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={path.startsWith(n.href) ? "page" : undefined}
                className={`block rounded-xl px-3 py-2 text-sm ${path.startsWith(n.href) ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-bg"}`}>{n.label}</Link>
            ))}
          </nav>
          <p className="mt-auto px-3 text-xs text-muted">Đang đăng nhập: {me.display_name}</p>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">{children}</main>
        <nav aria-label="Điều hướng" className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-line bg-card md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path.startsWith(n.href) ? "page" : undefined}
              className={`min-w-24 flex-1 whitespace-nowrap px-2 py-4 text-center text-xs ${path.startsWith(n.href) ? "font-semibold text-brand" : "text-muted"}`}>{n.label}</Link>
          ))}
        </nav>
        {toast && <div role="status" className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-brand px-5 py-2 text-sm text-white shadow-soft">{toast}</div>}
      </div>
    </OnlineCtx.Provider>
  );
}
