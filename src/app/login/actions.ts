"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{2,30}$/),
  password: z.string().min(6).max(72),
});
/** Supabase Auth cần email; tài khoản đăng nhập được ánh xạ sang email nội bộ, không gửi thư thật. */
export const usernameToEmail = (u: string) => `${u}@tynxrei.example.com`;

export async function signIn(_: { error?: string } | undefined, form: FormData) {
  const parsed = schema.safeParse({ username: form.get("username"), password: form.get("password") });
  if (!parsed.success) return { error: "Tài khoản hoặc mật khẩu không hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(parsed.data.username), password: parsed.data.password });
  if (error) return { error: "Đăng nhập không thành công." };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
