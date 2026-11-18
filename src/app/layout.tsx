import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin", "vietnamese"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin", "vietnamese"], variable: "--font-display" });

export const metadata: Metadata = { title: "Tyn.fm", description: "Một nơi riêng cho hai người." };
export const viewport: Viewport = { themeColor: "#E2819F" };

const THEME = `(function(){try{var d=document.documentElement,t=localStorage.getItem('tf-theme'),a=localStorage.getItem('tf-accent'),s=localStorage.getItem('tf-size');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark');if(a)d.dataset.accent=a;if(s)d.dataset.textsize=s;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head>
      <body>{children}</body>
    </html>
  );
}
