import type { Config } from "tailwindcss";
const config: Config = { content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { colors: { teal: { 50: "#e8f8f2", 700: "#087a55", 800: "#064e3b" }, brand: { green: "#087A55", deep: "#064E3B", mint: "#E8F8F2", background: "#F7FAFC", text: "#102A43", red: "#EF2929" } }, boxShadow: { soft: "0 12px 36px rgba(6,78,59,.08)" } } }, plugins: [] };
export default config;
