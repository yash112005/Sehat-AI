"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, RotateCcw, Sparkles, ZoomIn, ZoomOut } from "lucide-react";

export type OrganId = "thyroid" | "cardiovascular" | "liver" | "kidneys" | "pancreas" | "bones";
export type LabValue = {
  test: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status: "normal" | "high" | "low" | "unclear";
  organ: OrganId;
  plainMeaning?: string;
};

const organs: { id: OrganId; name: string; bodyLabel: string; x: number; y: number; functionText: string }[] = [
  { id: "thyroid", name: "Thyroid", bodyLabel: "थायरॉइड", x: 180, y: 117, functionText: "The thyroid is a small gland in the neck that helps regulate energy and body temperature." },
  { id: "cardiovascular", name: "Heart & blood", bodyLabel: "दिल और खून", x: 201, y: 196, functionText: "The heart pumps blood around the body, carrying oxygen to organs and tissues." },
  { id: "liver", name: "Liver", bodyLabel: "लिवर", x: 151, y: 245, functionText: "The liver helps process nutrients, make bile, and clear many substances from the blood." },
  { id: "pancreas", name: "Pancreas & sugar", bodyLabel: "शुगर", x: 190, y: 274, functionText: "The pancreas helps the body use sugar by making hormones such as insulin." },
  { id: "kidneys", name: "Kidneys", bodyLabel: "किडनी", x: 211, y: 310, functionText: "The kidneys filter waste and extra water from the blood to make urine." },
  { id: "bones", name: "Bones & joints", bodyLabel: "हड्डियाँ", x: 180, y: 418, functionText: "Bones and joints support movement; vitamin levels and uric acid are among several things a clinician may review." }
];

const languageOptions = [
  { label: "हिन्दी", code: "hi-IN", voice: "Nalini" }, { label: "English", code: "en-IN", voice: "Kaveri" }, { label: "Hinglish", code: "hi-en", voice: "Poorvi" },
  { label: "தமிழ்", code: "ta-IN", voice: "Trisha" }, { label: "తెలుగు", code: "te-IN", voice: "Lehara" }, { label: "ಕನ್ನಡ", code: "kn-IN", voice: "Saanvi" },
  { label: "മലയാളം", code: "ml-IN", voice: "Reshma" }, { label: "मराठी", code: "mr-IN", voice: "Zahira" }, { label: "বাংলা", code: "bn-IN", voice: "Kirra" },
  { label: "ગુજરાતી", code: "gu-IN", voice: "Falak" }, { label: "ਪੰਜਾਬੀ", code: "pa-IN", voice: "Mehuli" }
];

function organColor(id: OrganId, values: LabValue[]) {
  const tests = values.filter(value => value.organ === id);
  if (!tests.length) return "#94A3B8";
  if (tests.some(value => value.status === "high" || value.status === "low")) return "#EF4444";
  if (tests.every(value => value.status === "normal")) return "#10B981";
  return "#F59E0B";
}

function statusLabel(status: LabValue["status"]) {
  return status === "normal" ? "Normal" : status === "high" ? "HIGH" : status === "low" ? "LOW" : "जाँचें";
}

export default function BodyReportViewer({
  values,
  onNarrate,
  onTour,
  onSpeak
}: {
  values: LabValue[];
  onNarrate: (organ: OrganId, language: string) => Promise<string>;
  onTour: (language: string) => Promise<Record<OrganId, string>>;
  onSpeak: (script: string, language: string, voice: string) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<OrganId>("cardiovascular");
  const [language, setLanguage] = useState("hi-IN");
  const [rotation, setRotation] = useState(-8);
  const [zoom, setZoom] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [touring, setTouring] = useState(false);
  const [error, setError] = useState("");
  const drag = useRef<{ x: number; rotation: number } | null>(null);
  const cancelTour = useRef(false);
  useEffect(() => { const saved = window.localStorage.getItem("sehat-ai-language"); if (saved && languageOptions.some(option => option.code === saved)) setLanguage(saved); }, []);
  const selected = organs.find(organ => organ.id === selectedId)!;
  const selectedValues = values.filter(value => value.organ === selectedId);
  const voice = languageOptions.find(option => option.code === language)?.voice ?? "Nalini";

  const speakOrgan = async (id: OrganId) => {
    setSelectedId(id); setError(""); setSpeaking(true);
    try { const script = await onNarrate(id, language); await onSpeak(script, language, voice); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "आवाज़ तैयार नहीं हो सकी।"); }
    finally { setSpeaking(false); }
  };

  const startTour = async () => {
    if (touring) { cancelTour.current = true; return; }
    setError(""); setTouring(true); cancelTour.current = false;
    try {
      const narrations = await onTour(language);
      for (const organ of organs) {
        if (cancelTour.current) break;
        setSelectedId(organ.id);
        const script = narrations[organ.id];
        if (script) await onSpeak(script, language, voice);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Guided tour शुरू नहीं हो सका।"); }
    finally { setTouring(false); cancelTour.current = false; }
  };

  const pin = (id: OrganId) => {
    const organ = organs.find(item => item.id === id)!;
    const color = organColor(id, values);
    return <g key={id} data-organ-pin="true" role="button" tabIndex={0} aria-label={`${organ.name}: ${values.filter(value => value.organ === id).map(value => `${value.test} ${statusLabel(value.status)}`).join(", ") || "no matching tests"}`} onClick={() => void speakOrgan(id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void speakOrgan(id); } }} className="cursor-pointer outline-none">
      <title>{organ.name} — click to hear</title>
      <circle cx={organ.x} cy={organ.y} r="16" fill={color} opacity=".16" className="animate-pulse" />
      <circle cx={organ.x} cy={organ.y} r="9" fill={color} stroke="white" strokeWidth="3" className="drop-shadow-md" />
      <circle cx={organ.x} cy={organ.y} r="3" fill="white" />
      {selectedId === id && <circle cx={organ.x} cy={organ.y} r="14" fill="none" stroke={color} strokeWidth="2" strokeDasharray="3 3" />}
    </g>;
  };

  return <section className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-50 px-4 py-3">
      <div><p className="text-[11px] font-bold uppercase tracking-widest text-teal-700">Interactive anatomy</p><h3 className="mt-0.5 font-extrabold text-slate-900">शरीर पर टैप करके रिपोर्ट सुनें</h3></div>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Headphones size={15} className="text-teal-700" /><span className="sr-only">Narration language</span><select value={language} onChange={event => { setLanguage(event.target.value); window.localStorage.setItem("sehat-ai-language", event.target.value); }} className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-teal-600">{languageOptions.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label>
    </header>
    <div className="grid lg:grid-cols-[minmax(260px,.9fr)_minmax(290px,1.1fr)]">
      <div className="relative min-h-[410px] overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,#e6fffb_0%,#f7fffd_57%,#ffffff_100%)] p-3">
        <div className="absolute left-4 top-4 z-10 flex gap-1 rounded-xl border border-white bg-white/90 p-1 shadow-sm"><button onClick={() => setZoom(value => Math.min(1.5, +(value + .1).toFixed(1)))} aria-label="Zoom in" className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-800"><ZoomIn size={17} /></button><button onClick={() => setZoom(value => Math.max(.8, +(value - .1).toFixed(1)))} aria-label="Zoom out" className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-800"><ZoomOut size={17} /></button><button onClick={() => { setRotation(-8); setZoom(1); setSelectedId("cardiovascular"); }} aria-label="Reset view" className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-800"><RotateCcw size={16} /></button></div>
        <div className="absolute right-4 top-5 z-10 rounded-full border border-white bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-500">3D VIEW · drag to rotate</div>
        <div className="mx-auto flex h-[390px] max-w-[330px] touch-pan-y select-none items-center justify-center overflow-hidden" onPointerDown={event => { if ((event.target as Element).closest("[data-organ-pin]")) return; drag.current = { x: event.clientX, rotation }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (drag.current) setRotation(Math.max(-32, Math.min(32, drag.current.rotation + (event.clientX - drag.current.x) * .35))); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          <svg viewBox="0 0 360 560" role="img" aria-label="Interactive 3D style anatomy with clickable lab result hotspots" className="h-full w-full overflow-visible transition-transform duration-700 ease-out" style={{ transform: `perspective(900px) rotateY(${rotation}deg) scale(${zoom})`, transformOrigin: `${selected.x}px ${selected.y}px` }}>
            <defs>
              <linearGradient id="skin-shade" x1="0" x2="1" y1="0" y2=".3"><stop stopColor="#bfded9" /><stop offset=".28" stopColor="#f4d9c8" /><stop offset=".55" stopColor="#f8e4d6" /><stop offset="1" stopColor="#b8d6d2" /></linearGradient>
              <linearGradient id="body-shadow" x1="0" x2="1"><stop stopColor="#0f766e" stopOpacity=".14" /><stop offset=".48" stopColor="#fff" stopOpacity=".2" /><stop offset="1" stopColor="#0f766e" stopOpacity=".08" /></linearGradient>
              <radialGradient id="organ-tint"><stop stopColor="#f97373" stopOpacity=".8" /><stop offset="1" stopColor="#dc2626" stopOpacity=".28" /></radialGradient>
              <filter id="soft-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <ellipse cx="180" cy="547" rx="70" ry="9" fill="#0f766e" opacity=".1" />
            <path d="M148 106 Q130 105 115 120 L101 143 81 211 Q75 233 82 251 Q87 265 98 263 Q106 261 109 249 L128 196 132 260 Q129 277 133 292 L141 325 146 374 136 503 Q135 524 148 530 Q160 535 164 518 L180 390 196 518 Q200 535 212 530 Q225 524 224 503 L214 374 219 325 227 292 Q231 277 228 260 L232 196 251 249 Q254 261 262 263 Q273 265 278 251 Q285 233 279 211 L259 143 245 120 Q230 105 212 106 L198 111 162 111 Z" fill="url(#skin-shade)" stroke="#a9cbc5" strokeWidth="2" />
            <path d="M149 108 Q180 121 211 108 L223 139 216 256 Q203 272 180 274 Q157 272 144 256 L137 139Z" fill="url(#body-shadow)" opacity=".7" />
            <ellipse cx="180" cy="61" rx="30" ry="38" fill="url(#skin-shade)" stroke="#a9cbc5" strokeWidth="2" />
            <path d="M158 45 Q162 22 184 22 Q204 23 209 48 Q198 38 181 39 Q169 39 158 45" fill="#315a56" opacity=".9" />
            <rect x="167" y="91" width="26" height="28" rx="8" fill="url(#skin-shade)" stroke="#a9cbc5" />
            <path d="M171 111 Q160 103 158 114 L159 126 Q163 132 170 125 L174 121 M189 111 Q200 103 202 114 L201 126 Q197 132 190 125 L186 121" fill="#f87171" stroke="#be123c" strokeWidth="1.5" />
            <path d="M198 177 C188 162 171 175 178 189 L201 211 220 188 C229 174 212 163 201 178 L199 181Z" fill="url(#organ-tint)" stroke="#e35b65" strokeWidth="1.5" />
            <path d="M145 232 Q164 220 184 231 Q181 248 162 255 Q149 254 143 246Z" fill="#9dc96c" stroke="#6b9b52" strokeWidth="1.5" />
            <path d="M166 270 Q179 264 189 270 L201 273 190 280 176 279 164 277Z" fill="#f7c76c" stroke="#d7a74d" strokeWidth="1.5" />
            <path d="M151 286 C137 283 136 300 147 308 Q155 311 162 302 L164 292Z M209 286 C223 283 224 300 213 308 Q205 311 198 302 L196 292Z" fill="#ca8b7a" stroke="#a9655a" strokeWidth="1.5" />
            <path d="M180 285 L180 376 M180 376 L180 393" stroke="#f4f3e8" strokeWidth="9" strokeLinecap="round" opacity=".8" />
            <path d="M180 289 L180 375" stroke="#9bb3ab" strokeWidth="2" strokeDasharray="4 5" />
            <circle cx="154" cy="430" r="13" fill="#f4f3e8" stroke="#bac9bf" strokeWidth="2" /><circle cx="206" cy="430" r="13" fill="#f4f3e8" stroke="#bac9bf" strokeWidth="2" />
            <path d="M152 376 L151 503 M207 376 L209 503" stroke="#f1eee3" strokeWidth="6" strokeLinecap="round" opacity=".55" />
            {organs.map(organ => pin(organ.id))}
          </svg>
        </div>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" /> सामान्य</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-500" /> ध्यान दें</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-slate-400" /> रिपोर्ट में नहीं</span></div>
      </div>
      <div className="flex flex-col border-t border-teal-50 p-4 lg:border-l lg:border-t-0">
        <div className="flex items-start justify-between gap-2"><div><span className="text-[11px] font-bold uppercase tracking-widest text-teal-700">{selected.bodyLabel}</span><h4 className="mt-1 text-lg font-extrabold text-slate-900">{selected.name}</h4></div><span className="mt-1 h-3.5 w-3.5 rounded-full ring-4 ring-white" style={{ backgroundColor: organColor(selectedId, values), boxShadow: `0 0 0 2px ${organColor(selectedId, values)}33` }} /></div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{selected.functionText}</p>
        <div className="my-4 h-px bg-slate-100" />
        <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">जुड़े हुए टेस्ट</p><span className="text-[10px] text-slate-400">रिपोर्ट बनाम लैब रेंज</span></div>
        {selectedValues.length ? <div className="max-h-44 space-y-2 overflow-y-auto pr-1">{selectedValues.map((value, index) => <div key={`${value.test}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-800">{value.test}</p><p className="mt-1 text-xs text-slate-500">सामान्य सीमा: {value.referenceRange || "रिपोर्ट में नहीं दी गई"}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold ${value.status === "normal" ? "bg-emerald-100 text-emerald-800" : value.status === "unclear" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>{statusLabel(value.status)}</span></div><p className="mt-2 text-sm font-semibold text-slate-700">{value.value}{value.unit ? ` ${value.unit}` : ""}</p>{value.plainMeaning && <p className="mt-1 text-xs leading-5 text-slate-500">{value.plainMeaning}</p>}</div>)}</div> : <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">इस रिपोर्ट में इस अंग से जुड़ा कोई मान नहीं मिला।</div>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        <button onClick={() => void speakOrgan(selectedId)} disabled={speaking || touring} className="mt-auto flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:opacity-60"><Headphones size={17} /> {speaking ? "सुनाया जा रहा है…" : `${selected.bodyLabel} के बारे में सुनें`}</button>
        <button onClick={() => void startTour()} disabled={speaking} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-extrabold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60">{touring ? <Pause size={17} /> : <Play size={17} fill="currentColor" />} {touring ? "Tour रोकें" : <><Sparkles size={17} /> Guided Body Tour · पूरे शरीर की रिपोर्ट सुनें</>}</button>
        <p className="mt-2 text-center text-[10px] leading-4 text-slate-400">AI व्याख्या केवल जानकारी है; लैब की सीमा अलग हो सकती है। डॉक्टर से पुष्टि करें।</p>
      </div>
    </div>
  </section>;
}
