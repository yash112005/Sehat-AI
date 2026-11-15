"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, ChevronRight, ClipboardList, FileHeart, HeartPulse, Home, Languages, Menu, Pill, Settings, ShieldAlert, Users, X } from "lucide-react";
import { CareCoordinationProvider } from "@/components/CareCoordination";
import { getUiLanguage, tr, type UiLanguage } from "@/components/uiLanguage";
import BrandMark from "@/components/BrandMark";

const doctorLinks = [
  { label: "Dashboard", href: "/doctor", icon: Home }, { label: "Patients", href: "/doctor/patients", icon: Users },
  { label: "Prescriptions", href: "/doctor/prescription", icon: Pill }, { label: "Reports", href: "/doctor/reports", icon: FileHeart },
  { label: "Emergency help", href: "/doctor/emergency", icon: ShieldAlert }, { label: "Appointments", href: "/doctor/appointments", icon: CalendarDays }, { label: "Settings", href: "/doctor/settings", icon: Settings }
];
const patientLinks = [
  { label: "My dashboard", href: "/patient", icon: Home }, { label: "My symptoms", href: "/patient/symptoms", icon: Activity }, { label: "My medicines", href: "/patient/guide", icon: Pill },
  { label: "Understand a report", href: "/patient/reports", icon: FileHeart }, { label: "Emergency help", href: "/patient/emergency", icon: ShieldAlert }, { label: "Appointments", href: "/patient/appointments", icon: CalendarDays },
  { label: "Health history", href: "/patient/history", icon: ClipboardList }, { label: "Settings", href: "/patient/settings", icon: Settings }
];

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<UiLanguage>("hi");
  useEffect(() => { const refresh = () => setLanguage(getUiLanguage()); refresh(); window.addEventListener("storage", refresh); window.addEventListener("sehat-language-change", refresh); return () => { window.removeEventListener("storage", refresh); window.removeEventListener("sehat-language-change", refresh); }; }, []);
  const patientMode = pathname.startsWith("/patient");
  const links = patientMode ? patientLinks : doctorLinks;
  const active = links.find(link => link.href === pathname) ?? links.find(link => link.href !== "/doctor" && link.href !== "/patient" && pathname.startsWith(`${link.href}/`)) ?? links[0];
  const close = () => setMenuOpen(false);
  const sidebar = <>
    <div className="flex items-center gap-3 px-5 py-6"><BrandMark size={46}/><span><strong className="block text-[17px] font-extrabold tracking-tight text-[#064E3B]">Sehat-AI</strong><small className="text-[11px] font-semibold text-slate-500">सेहत का साथी</small></span></div>
    <div className="mx-4 mb-4 flex items-center justify-between rounded-xl bg-[#E8F8F2] px-3 py-2"><span className="text-xs font-bold text-[#064E3B]">{tr(language, patientMode ? "patientSpace" : "doctorSpace")}</span><Link href={patientMode ? "/doctor" : "/patient"} onClick={close} className="text-[10px] font-bold text-[#087A55] hover:underline">{tr(language, patientMode ? "doctorView" : "patientView")}</Link></div>
    <nav className="space-y-1 px-3" aria-label="Workspace navigation">{links.map(({ label, href, icon: Icon }) => { const selected = href === pathname || pathname.startsWith(`${href}/`); const key = patientMode ? ({"My dashboard":"dashboard","My symptoms":"symptoms","My medicines":"medicines","Understand a report":"report","Emergency help":"emergency","Appointments":"appointments","Health history":"history","Settings":"settings"}[label] ?? label) : ({"Dashboard":"dashboard","Patients":"history","Prescriptions":"medicines","Reports":"report","Emergency help":"emergency","Appointments":"appointments","Settings":"settings"}[label] ?? label); return <Link key={href} href={href} onClick={close} aria-current={selected ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${selected ? "bg-[#E8F8F2] text-[#087A55]" : "text-slate-600 hover:bg-slate-50 hover:text-[#064E3B]"}`}><Icon size={18} strokeWidth={selected ? 2.4 : 1.9} /><span className="flex-1">{tr(language, key)}</span>{selected && <ChevronRight size={15} />}</Link>; })}</nav>
    {!patientMode && <div className="mx-4 mt-7 rounded-2xl bg-[#064E3B] p-4 text-white"><div className="flex items-center gap-2 text-sm font-bold"><Activity size={17} /> Today at a glance</div><p className="mt-2 text-xs leading-5 text-emerald-100">Voice-first care, prescriptions and reports in one place.</p><Link href="/emergency" className="mt-3 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15"><ShieldAlert size={15} /> Emergency help</Link></div>}
    <div className="mt-auto border-t border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#E8F8F2] text-sm font-extrabold text-[#087A55]">{patientMode ? "R" : "A"}</span><span className="min-w-0"><strong className="block truncate text-xs text-[#102A43]">{patientMode ? "Rahul Sharma" : "Dr. Asha Mehta"}</strong><small className="text-[10px] text-slate-500">{patientMode ? "Patient account" : "Primary care"}</small></span></div></div>
  </>;

  return <CareCoordinationProvider><div className="min-h-screen bg-[#F7FAFC] text-[#102A43]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-slate-100 bg-white lg:flex">{sidebar}</aside>
    {menuOpen && <div className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden" onClick={close}><aside className="flex h-full w-[min(82vw,300px)] flex-col bg-white shadow-2xl" onClick={event => event.stopPropagation()}><div className="flex justify-end px-3 pt-3"><button onClick={close} aria-label="Close navigation" className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><X size={20} /></button></div>{sidebar}</aside></div>}
    <div className="lg:pl-[252px]">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-100 bg-white/95 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button onClick={() => setMenuOpen(true)} aria-label="Open navigation" className="rounded-xl p-2 text-slate-600 hover:bg-slate-50 lg:hidden"><Menu size={21} /></button><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#10A37F]">{tr(language, patientMode ? "patientPortal" : "careWorkspace")}</p><h1 className="text-sm font-extrabold text-[#102A43] sm:text-base">{tr(language, patientMode ? ({"My dashboard":"dashboard","My symptoms":"symptoms","My medicines":"medicines","Understand a report":"report","Emergency help":"emergency","Appointments":"appointments","Health history":"history","Settings":"settings"}[active.label] ?? "dashboard") : ({"Dashboard":"dashboard","Patients":"history","Prescriptions":"medicines","Reports":"report","Emergency help":"emergency","Appointments":"appointments","Settings":"settings"}[active.label] ?? "dashboard"))}</h1></div></div><div className="flex items-center gap-2"><span className="hidden rounded-full bg-[#E8F8F2] px-3 py-1.5 text-[11px] font-bold text-[#087A55] sm:inline-flex">Gnani AI · Gemini</span><Link href={patientMode ? "/patient/settings" : "/doctor/settings"} aria-label={tr(language,"chooseLanguage")} className="grid h-9 w-9 place-items-center rounded-full border border-slate-100 text-slate-600 hover:bg-slate-50"><Languages size={17} /></Link><span className="hidden h-9 w-9 place-items-center rounded-full bg-[#E8F8F2] text-xs font-extrabold text-[#087A55] sm:grid">{patientMode ? "R" : "A"}</span></div></header>
      <div className="page-enter pb-20 lg:pb-0">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-100 bg-white/95 px-2 py-2 backdrop-blur lg:hidden" aria-label="Quick navigation">{(patientMode ? [patientLinks[0], patientLinks[3], patientLinks[4], patientLinks[5]] : [doctorLinks[0], doctorLinks[3], doctorLinks[4], doctorLinks[6]]).map(({ label, href, icon: Icon }) => { const selected = href === pathname; return <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-bold ${selected ? "text-[#087A55]" : "text-slate-500"}`}><Icon size={18} />{label}</Link>; })}</nav>
    </div>
  </div></CareCoordinationProvider>;
}
