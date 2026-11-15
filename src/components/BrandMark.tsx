import Image from "next/image";

export default function BrandMark({ size = 44, className = "" }: { size?: number; className?: string }) {
  return <span className={`relative inline-grid shrink-0 overflow-hidden rounded-2xl bg-[#020b08] ring-1 ring-amber-300/50 shadow-[0_0_18px_rgba(16,185,129,.22)] ${className}`} style={{ width: size, height: size }}>
    <Image src="/sehat-ai-logo.png" alt="Sehat-AI" fill sizes={`${size}px`} className="object-cover" priority />
  </span>;
}
