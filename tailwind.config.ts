import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { bg: "var(--bg)", card: "var(--card)", fg: "var(--fg)", muted: "var(--muted)", line: "var(--line)", brand: "var(--brand)", "brand-soft": "var(--brand-soft)" },
    fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"], display: ["var(--font-display)", "Georgia", "serif"] },
    boxShadow: { soft: "0 8px 30px -12px rgba(90,60,75,.2)" },
  } },
  plugins: [],
};
export default config;
