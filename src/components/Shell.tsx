"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/login/actions";
import Icon from "./Icon";
import Onboarding from "./Onboarding";

export type Person = { id: string; slug: string; display_name: string };
const OnlineCtx = createContext(false);
export const usePartnerOnline = () => useContext(OnlineCtx);

type Item = { href: string; label: string; icon: string };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "CÙNG NHAU", items: [
    { href: "/us", label: "Chúng mình", icon: "chat" }, { href: "/memory", label: "Vườn kỷ niệm", icon: "sparkles" },
    { href: "/bloom", label: "Hoa mỗi ngày", icon: "sprout" }, { href: "/little-things", label: "Điều nhỏ bé", icon: "heart" }] },
  { title: "KỶ VẬT", items: [
    { href: "/story", label: "Câu chuyện", icon: "calendar" }, { href: "/map", label: "Bản đồ khu vườn", icon: "map" },
    { href: "/capsules", label: "Hộp thời gian", icon: "hourglass" }, { href: "/letters", label: "Thư", icon: "mail" },
    { href: "/dreams", label: "Giấc mơ", icon: "star" }, { href: "/songs", label: "Bài hát", icon: "music" }, { href: "/scrapbook", label: "Sổ lưu niệm", icon: "scrap" }] },
  { title: "RIÊNG TÔI", items: [{ href: "/journal", label: "Trang của tôi", icon: "bookopen" }, { href: "/gifts", label: "Hộp quà", icon: "gift" }] },
];
const BOTTOM: Item[] = [{ href: "/help", label: "Trợ giúp", icon: "help" }, { href: "/settings", label: "Cài đặt", icon: "settings" }];
const TABS: Item[] = [{ href: "/us", label: "Chúng mình", icon: "chat" }, { href: "/memory", label: "Vườn", icon: "sparkles" }, { href: "/bloom", label: "Hoa", icon: "sprout" }, { href: "/little-things", label: "Nhỏ bé", icon: "heart" }];
const PETALS = [["8%", "12%", 14, 0], ["22%", "78%", 10, 3], ["46%", "30%", 12, 6], ["64%", "88%", 16, 2], ["80%", "14%", 11, 5], ["90%", "58%", 13, 8], ["34%", "52%", 9, 1]] as const;

export default function Shell({ me, partner, children }: { me: Person; partner: Person | null; children: React.ReactNode }) {
  const path = usePathname();
  const [online, setOnline] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const partnerId = partner?.id, partnerName = partner?.display_name ?? "Người ấy";
  const on = (h: string) => path === h || path.startsWith(h + "/");

  useEffect(() => { setMore(false); }, [path]);
  useEffect(() => {
    const sb = createClient();
    void sb.rpc("mark_delivered");
    void sb.from("streak_log").upsert({ user_id: me.id }, { onConflict: "user_id,day", ignoreDuplicates: true });
    const presence = sb.channel("presence-us", { config: { presence: { key: me.id } } });
    presence.on("presence", { event: "sync" }, () => setOnline(!!partnerId && Object.keys(presence.presenceState()).includes(partnerId)))
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

  function toggleTheme() {
    const dark = document.documentElement.classList.toggle("dark");
    try { localStorage.setItem("tf-theme", dark ? "dark" : "light"); } catch { /* bỏ qua */ }
  }
  const link = (n: Item, cls = "") => (
    <Link key={n.href} href={n.href} aria-current={on(n.href) ? "page" : undefined}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm ${on(n.href) ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-bg"} ${cls}`}><Icon name={n.icon} className="h-[18px] w-[18px]" />{n.label}</Link>
  );
  const Logo = () => (<span className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand"><Icon name="heart" className="h-5 w-5 fill-current" /></span><span className="font-display text-xl">Tyn.fm</span></span>);

  return (
    <OnlineCtx.Provider value={online}>
      <div className="app-shell flex h-dvh">
        <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-card p-4 md:flex print:hidden">
          <div className="px-2 py-1"><Logo /></div>
          <nav aria-label="Điều hướng" className="mt-4 flex-1">
            {GROUPS.map((g) => (<div key={g.title} className="mb-3"><p className="px-3 pb-1 text-[10px] font-semibold tracking-widest text-muted">{g.title}</p>{g.items.map((n) => link(n))}</div>))}
          </nav>
          <div className="border-t border-line pt-3">
            {BOTTOM.map((n) => link(n))}
            <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm text-muted hover:bg-bg"><Icon name="moon" className="h-[18px] w-[18px]" />Sáng / Tối</button>
            <div className="mt-2 flex items-center justify-between px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{me.display_name}</p><p className="truncate text-xs text-muted">{me.slug}</p></div>
              <form action={signOut}><button aria-label="Đăng xuất" className="rounded-full p-2 text-muted hover:bg-bg"><Icon name="logout" className="h-[18px] w-[18px]" /></button></form></div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3 md:hidden print:hidden">
            <button onClick={() => setMore(true)} aria-label="Mở menu" className="rounded-full p-1.5 text-muted"><Icon name="menu" /></button><Logo />
          </header>
          <main className="relative flex min-h-0 flex-1 flex-col pb-16 md:pb-0">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden print:hidden">
              {PETALS.map(([top, left, size, delay], i) => <span key={i} className="petal absolute bg-brand" style={{ top, left, width: size, height: size, animationDelay: `${delay}s` }} />)}
            </div>
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
          </main>
        </div>
        <nav aria-label="Điều hướng nhanh" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card md:hidden print:hidden">
          {TABS.map((n) => (<Link key={n.href} href={n.href} aria-current={on(n.href) ? "page" : undefined} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${on(n.href) ? "font-semibold text-brand" : "text-muted"}`}><Icon name={n.icon} className="h-5 w-5" />{n.label}</Link>))}
          <button onClick={() => setMore(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted"><Icon name="menu" className="h-5 w-5" />Thêm</button>
        </nav>
        {more && (
          <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 md:hidden" onClick={() => setMore(false)}>
            <div className="max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center justify-between"><Logo /><button onClick={() => setMore(false)} aria-label="Đóng" className="rounded-full p-2 text-muted"><Icon name="x" /></button></div>
              {GROUPS.map((g) => (<div key={g.title} className="mb-2"><p className="px-3 pb-1 text-[10px] font-semibold tracking-widest text-muted">{g.title}</p>{g.items.map((n) => link(n))}</div>))}
              <div className="border-t border-line pt-2">{BOTTOM.map((n) => link(n))}
                <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm text-muted"><Icon name="moon" className="h-[18px] w-[18px]" />Sáng / Tối</button>
                <form action={signOut}><button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm text-muted"><Icon name="logout" className="h-[18px] w-[18px]" />Đăng xuất ({me.display_name})</button></form></div>
            </div>
          </div>)}
        {toast && <div role="status" className="fixed left-1/2 top-4 z-[70] -translate-x-1/2 rounded-full bg-brand px-5 py-2 text-sm text-white shadow-soft">{toast}</div>}
        <Onboarding />
      </div>
    </OnlineCtx.Provider>
  );
}
