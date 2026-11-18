"use client";
import Icon from "./Icon";

export default function PrintButton() {
  return <button onClick={() => window.print()} className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm text-white print:hidden"><Icon name="printer" className="h-4 w-4" />In / Lưu PDF</button>;
}
