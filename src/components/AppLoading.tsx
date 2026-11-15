"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";

export default function AppLoading() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(12);
  useEffect(() => {
    const started = Date.now(); setVisible(true); setProgress(12);
    const interval = window.setInterval(() => setProgress(value => Math.min(92, value + 9 + Math.random() * 15)), 110);
    const finish = () => { window.clearInterval(interval); const delay = Math.max(180, 620 - (Date.now() - started)); window.setTimeout(() => { setProgress(100); window.setTimeout(() => setVisible(false), 230); }, delay); };
    const fallback = window.setTimeout(finish, 1800);
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target === "_blank") return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin === window.location.origin && target.pathname !== pathname) { setVisible(true); setProgress(24); }
    };
    document.addEventListener("click", onClick);
    return () => { window.clearInterval(interval); window.clearTimeout(fallback); document.removeEventListener("click", onClick); };
  }, [pathname]);
  if (!visible) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020b08] transition-opacity duration-300" role="status" aria-live="polite" aria-label="Loading Sehat-AI"><div className="flex flex-col items-center"><div className="relative animate-logo-arrive"><div className="absolute -inset-5 rounded-[2rem] bg-emerald-400/20 blur-2xl animate-pulse"/><BrandMark size={148} className="relative rounded-[2rem] ring-2 ring-amber-300/70 shadow-[0_0_42px_rgba(16,185,129,.45)]"/></div><p className="mt-7 text-lg font-extrabold tracking-wide text-white">Sehat-AI</p><p className="mt-1 text-sm text-emerald-100">आपकी सेहत का साथी</p><div className="mt-7 h-1 w-48 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300 transition-[width] duration-200" style={{width:`${progress}%`}}/></div></div></div>;
}
