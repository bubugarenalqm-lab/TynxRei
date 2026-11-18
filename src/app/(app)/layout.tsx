import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Shell, { type Person } from "@/components/Shell";
import { signOut } from "../login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await sb.from("profiles").select("id,slug,display_name");
  const people = (data ?? []) as Person[];
  const me = people.find((p) => p.id === user.id);
  if (!me) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-sm space-y-4"><h1 className="font-display text-3xl">Chưa có hồ sơ</h1>
          <p className="text-muted">Tài khoản này chưa có hồ sơ. Hãy chạy file SQL thiết lập trong Supabase (xem README).</p>
          <form action={signOut}><button className="rounded-xl bg-brand px-5 py-2 text-white">Đăng xuất</button></form></div>
      </main>
    );
  }
  return <Shell me={me} partner={people.find((p) => p.id !== user.id) ?? null}>{children}</Shell>;
}
