export type Msg = { id: string; sender_id: string; content: string | null; media_type: string | null; media_path: string | null; created_at: string; delivered_at: string | null; seen_at: string | null };
export type Rx = { id: string; message_id: string; user_id: string; emoji: string };
export const TZ = "Asia/Ho_Chi_Minh";
export const dayKey = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
export const fmtTime = (d: string) => new Date(d).toLocaleTimeString("vi-VN", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
export const fmtDay = (d: string) => new Date(d).toLocaleDateString("vi-VN", { timeZone: TZ, weekday: "long", day: "numeric", month: "numeric", year: "numeric" });
