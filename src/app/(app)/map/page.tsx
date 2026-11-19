import { createClient } from "@/lib/supabase/server";
import GardenMap from "@/components/GardenMap";
import { loadTimeline } from "@/lib/timeline";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { events, failed } = await loadTimeline(sb, user?.id ?? "");
  return (
    <div className="flex-1 overflow-y-auto p-5 md:p-8">
      <h1 className="font-display text-4xl">Bản đồ khu vườn</h1>
      <p className="mt-1 text-sm text-muted">Mọi thứ hai bạn đã gieo, mọc dần từ trái sang phải. Kỷ niệm là hoa, Hoa mỗi ngày là hoa tím, sheet nhạc là nốt nhạc, thư là phong bì.</p>
      {failed ? <p role="alert" className="mt-6 text-brand">Chưa đọc được dữ liệu. Hãy chạy các file SQL (xem README).</p>
        : events.length === 0 ? <p className="mt-10 text-center text-muted">Khu vườn còn trống. Hãy gieo kỷ niệm đầu tiên.</p>
        : <div className="mt-6"><GardenMap events={events} /></div>}
    </div>
  );
}
