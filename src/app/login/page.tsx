"use client";
import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined);
  const f = "mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5";
  return (
    <main className="grid min-h-dvh place-items-center bg-brand-soft p-6">
      <form action={action} className="w-full max-w-sm space-y-5 rounded-3xl bg-card p-8 shadow-soft">
        <h1 className="font-display text-4xl">Tyn.fm</h1>
        <p className="text-sm text-muted">Chỉ dành cho hai người.</p>
        <label className="block text-sm">Tài khoản
          <input name="username" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} className={f} />
        </label>
        <label className="block text-sm">Mật khẩu
          <input name="password" type="password" required minLength={6} autoComplete="current-password" className={f} />
        </label>
        {state?.error && <p role="alert" className="text-sm text-brand">{state.error}</p>}
        <button disabled={pending} className="w-full rounded-xl bg-brand px-4 py-2.5 font-medium text-white disabled:opacity-60">{pending ? "Đang vào…" : "Vào"}</button>
      </form>
    </main>
  );
}
