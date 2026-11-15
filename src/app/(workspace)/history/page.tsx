"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileHeart, Pill, UserRound } from "lucide-react";

type Prescription = { medicines: { name: string; dosage: string; timing: string; duration: string }[]; generalAdvice: string };
const fallback: Prescription = { medicines: [{ name: "Paracetamol 500 mg", dosage: "1 गोली", timing: "खाने के बाद", duration: "3 दिन" }, { name: "ORS", dosage: "1 पैकेट पानी में", timing: "दिन भर थोड़ा-थोड़ा", duration: "ज़रूरत के अनुसार" }], generalAdvice: "खूब पानी पिएं और आराम करें।" };

export default function PatientHistoryPage() {
  const [prescription, setPrescription] = useState<Prescription>(fallback);
  useEffect(() => { try { const saved = localStorage.getItem("sehat-ai-prescription"); if (saved) setPrescription(JSON.parse(saved)); } catch { /* keep demo data */ } }, []);
  return <main className="mx-auto max-w-5xl px-4 py-6 sm:px-7 sm:py-8"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#10A37F]">Patient records</p><h2 className="mt-1 text-2xl font-extrabold text-[#102A43]">Patient history</h2><p className="mt-2 text-sm text-slate-500">आपके हाल के पर्चे और स्वास्थ्य जानकारी।</p></div><section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#E8F8F2] text-[#087A55]"><UserRound size={22} /></span><div><h3 className="font-extrabold text-[#102A43]">Rahul Sharma</h3><p className="text-xs text-slate-500">Patient profile · demo record</p></div></div><div className="mt-5 flex items-center gap-2 text-sm font-bold text-[#102A43]"><Pill size={17} className="text-[#087A55]" /> Recent prescription</div><div className="mt-3 space-y-2">{prescription.medicines.map((medicine, index) => <div key={`${medicine.name}-${index}`} className="grid gap-1 rounded-xl bg-[#F7FAFC] p-4 sm:grid-cols-4 sm:items-center"><strong className="text-sm text-[#102A43]">{medicine.name || "दवा"}</strong><span className="text-xs text-slate-600">{medicine.dosage}</span><span className="text-xs text-slate-600">{medicine.timing}</span><span className="text-xs font-semibold text-[#087A55]">{medicine.duration}</span></div>)}</div><p className="mt-4 rounded-xl bg-[#E8F8F2] p-3 text-sm leading-6 text-[#064E3B]">{prescription.generalAdvice}</p><Link href="/reports" className="mt-5 flex items-center justify-between rounded-xl border border-slate-100 p-4 text-sm font-bold text-[#087A55]"><span className="flex items-center gap-2"><FileHeart size={17} /> रिपोर्ट समझें और स्वास्थ्य इतिहास जोड़ें</span><ArrowRight size={16} /></Link></section></main>;
}
