import type { Metadata } from "next";
import "./globals.css";
import AppLoading from "@/components/AppLoading";

export const metadata: Metadata = { title: "Sehat-AI | आपकी भाषा में सेहत", description: "Voice-first medical assistant for Indian doctors, ASHA workers, and families." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="hi"><body>{children}<AppLoading /></body></html>;
}
