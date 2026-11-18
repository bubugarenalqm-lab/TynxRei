"use client";
import { useEffect, useState } from "react";
import Icon from "./Icon";

const STEPS = [
  { icon: "heart", title: "Chào mừng đến Tyn.fm", text: "Một không gian chỉ dành cho hai người. Không quảng cáo, không ai khác trong phòng." },
  { icon: "sprout", title: "Mỗi ngày một chút", text: "Trả lời Hoa mỗi ngày, gửi một cái chạm nhẹ, lưu một kỷ niệm. Không có áp lực hay điểm số." },
  { icon: "lock", title: "Riêng tư thật sự", text: "Trang của tôi và Hộp quà được mã hóa ngay trên máy bạn bằng mật khẩu riêng. Hộp thời gian và Thư chỉ mở đúng ngày." },
];
export default function Onboarding() {
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => { try { if (!localStorage.getItem("tf-onboarded")) setStep(0); } catch { /* bỏ qua */ } }, []);
  if (step === null) return null;
  const s = STEPS[step], last = step === STEPS.length - 1;
  const close = () => { try { localStorage.setItem("tf-onboarded", "1"); } catch { /* bỏ qua */ } setStep(null); };
  return (
    <div role="dialog" aria-modal="true" aria-label="Giới thiệu" className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-5">
      <div className="w-full max-w-sm rounded-3xl bg-card p-7 text-center shadow-soft">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand"><Icon name={s.icon} className="h-7 w-7" /></div>
        <h2 className="mt-4 font-display text-2xl">{s.title}</h2><p className="mt-2 text-sm text-muted">{s.text}</p>
        <div className="mt-6 flex items-center justify-between">
          <button onClick={close} className="text-sm text-muted">Bỏ qua</button>
          <button onClick={() => (last ? close() : setStep(step + 1))} className="rounded-full bg-brand px-6 py-2 text-sm font-medium text-white">{last ? "Bắt đầu" : "Tiếp"}</button>
        </div>
      </div>
    </div>
  );
}
