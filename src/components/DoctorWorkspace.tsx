"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Check, ChevronRight, CircleHelp, Clock3, Download, FileImage, HeartPulse, LoaderCircle, Mic, Pause, Pill, Play, Plus, ShieldCheck, Siren, Stethoscope, Trash2, Upload, Users, Volume2, Camera, PhoneCall } from "lucide-react";
import BodyReportViewer, { type OrganId, type LabValue } from "@/components/BodyReportViewer";
import { useCareCoordination } from "@/components/CareCoordination";
import { preferredRecorderMimeType, toPrismaAudio } from "@/lib/audio";
import { createCareAlert } from "@/components/CaregiverContacts";

type Medicine = { name: string; dosage: string; timing: string; duration: string };
type Prescription = { medicines: Medicine[]; generalAdvice: string; hindiAudioScript: string };
type ReportResult = { summary: string; abnormalFlags: { test: string; value: string; status: string }[]; labValues?: LabValue[]; hindiAudioScript: string };
type EmergencyResult = { severity: string; firstAidSteps: string[]; hindiAudioScript: string };
type Tab = "doctor" | "guide" | "report";
type PillScan = { medicineName: string; strength: string; purpose: string; verdict: "match" | "mismatch" | "unclear"; reason: string; hindiAudioScript: string };

const samplePrescription: Prescription = {
  medicines: [
    { name: "Paracetamol 500 mg", dosage: "1 गोली", timing: "सुबह और रात, खाने के बाद", duration: "3 दिन" },
    { name: "ORS", dosage: "1 पैकेट पानी में", timing: "दिन भर थोड़ा-थोड़ा", duration: "ज़रूरत के अनुसार" }
  ],
  generalAdvice: "खूब पानी पिएं और आराम करें। बुखार बना रहे तो डॉक्टर से दोबारा मिलें।",
  hindiAudioScript: "नमस्ते। आपकी दवाइयाँ इस पर्चे पर लिखी हैं। पैरासिटामोल की एक गोली सुबह और रात खाने के बाद, तीन दिन लें। ओआरएस दिन भर थोड़ा-थोड़ा पिएं। खूब पानी पिएं और आराम करें। कोई परेशानी बढ़े तो डॉक्टर से मिलें।"
};

const sampleReport: ReportResult = {
  summary: "राहुल शर्मा की रिपोर्ट में कुछ मान सामान्य सीमा से बाहर हैं: TSH और HbA1c बढ़े हुए हैं, LDL और यूरिक एसिड बढ़े हुए हैं, जबकि हीमोग्लोबिन, विटामिन D और B12 कम हैं। SGOT/SGPT को रिपोर्ट में HIGH बताया गया है, पर उनके संख्यात्मक मान यहाँ उपलब्ध नहीं हैं। ये परिणाम अपने आप में निदान नहीं हैं; डॉक्टर से रिपोर्ट और लक्षणों के साथ चर्चा करें।",
  abnormalFlags: [],
  hindiAudioScript: "राहुल जी, आपकी रिपोर्ट में कुछ जाँच के मान ऊपर और कुछ नीचे हैं। इसका मतलब अपने आप में कोई बीमारी तय होना नहीं है। कृपया पूरी रिपोर्ट डॉक्टर को दिखाकर सलाह लें।",
  labValues: [
    { test: "TSH", value: "6.2", unit: "µIU/mL", referenceRange: "नमूना रिपोर्ट में सीमा नहीं दी गई; अपनी लैब की सीमा देखें", status: "high", organ: "thyroid", plainMeaning: "नमूना रिपोर्ट इसे HIGH बताती है; डॉक्टर इसे T3/T4 और लक्षणों के साथ देखेंगे।" },
    { test: "LDL cholesterol", value: "148", unit: "mg/dL", referenceRange: "आमतौर पर <100 mg/dL को optimal माना जाता है", status: "high", organ: "cardiovascular", plainMeaning: "LDL को अक्सर ‘खराब’ cholesterol कहा जाता है; लक्ष्य व्यक्ति के जोखिम के अनुसार डॉक्टर तय करते हैं।" },
    { test: "Hemoglobin", value: "11.2", unit: "g/dL", referenceRange: "वयस्क पुरुषों में सामान्य उदाहरण: 13.8–17.2 g/dL", status: "low", organ: "cardiovascular", plainMeaning: "हीमोग्लोबिन खून में ऑक्सीजन ले जाने में मदद करता है; डॉक्टर कारण और आगे की जाँच तय करेंगे।" },
    { test: "SGOT (AST)", value: "HIGH", referenceRange: "रिपोर्ट का संख्यात्मक मान नहीं दिया गया; लैब सीमा देखें", status: "high", organ: "liver", plainMeaning: "यह एंज़ाइम लिवर और कुछ अन्य ऊतकों से जुड़ा है; अकेले इससे बीमारी तय नहीं होती।" },
    { test: "SGPT (ALT)", value: "HIGH", referenceRange: "रिपोर्ट का संख्यात्मक मान नहीं दिया गया; लैब सीमा देखें", status: "high", organ: "liver", plainMeaning: "यह एंज़ाइम लिवर से जुड़ा है; डॉक्टर इसे बाकी LFT और लक्षणों के साथ समझेंगे।" },
    { test: "HbA1c", value: "6.1", unit: "%", referenceRange: "सामान्यतः <5.7%; 5.7–6.4% बढ़े जोखिम की सीमा", status: "high", organ: "pancreas", plainMeaning: "यह पिछले लगभग तीन महीनों की औसत blood sugar का संकेत देता है; डॉक्टर से पुष्टि करें।" },
    { test: "Vitamin D", value: "14", unit: "ng/mL", referenceRange: "कई लैब में पर्याप्त ≥20 ng/mL", status: "low", organ: "bones", plainMeaning: "विटामिन D हड्डियों के स्वास्थ्य में भूमिका निभाता है; इलाज की ज़रूरत डॉक्टर तय करेंगे।" },
    { test: "Vitamin B12", value: "180", unit: "pg/mL", referenceRange: "नमूना रिपोर्ट में सीमा नहीं दी गई; अपनी लैब की सीमा देखें", status: "low", organ: "bones", plainMeaning: "B12 खून और नसों के सामान्य काम के लिए ज़रूरी है।" },
    { test: "Uric acid", value: "7.8", unit: "mg/dL", referenceRange: "नमूना रिपोर्ट इसे HIGH बताती है; लैब की सीमा नहीं दी गई", status: "high", organ: "bones", plainMeaning: "बढ़ा मान अकेले gout साबित नहीं करता; लक्षणों के साथ डॉक्टर से बात करें।" }
  ]
};

function ErrorMessage({ children }: { children: React.ReactNode }) { return <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{children}</p>; }

function AudioGuidePlayer({ text }: { text: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const createAudio = async () => {
    if (url) return url;
    const preferred = localStorage.getItem("sehat-ai-language") ?? "hi-IN";
    const voices: Record<string, string> = { "hi-IN": "Nalini", "en-IN": "Kaveri", "hi-en": "Poorvi", "mr-IN": "Zahira", "ta-IN": "Trisha", "te-IN": "Lehara", "gu-IN": "Falak", "bn-IN": "Kirra" };
    let spokenText = text;
    if (!new Set(["hi-IN", "hi-en"]).has(preferred)) {
      const translated = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "translate", text, language: preferred }) });
      const result = await translated.json(); if (!translated.ok) throw new Error(result.error ?? "अनुवाद तैयार नहीं हो सका।"); spokenText = result.translation ?? text;
    }
    const response = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: spokenText, language: preferred, voice: voices[preferred] ?? "Nalini" }) });
    if (!response.ok) throw new Error("Audio अभी तैयार नहीं हो सका।");
    const objectUrl = URL.createObjectURL(await response.blob()); if (audioRef.current) audioRef.current.src = objectUrl; setUrl(objectUrl); return objectUrl;
  };
  const play = async () => {
    setError("");
    if (!url && isPlaying && "speechSynthesis" in window) { window.speechSynthesis.cancel(); setIsPlaying(false); return; }
    if (audioRef.current && url) {
      if (audioRef.current.paused) { await audioRef.current.play(); setIsPlaying(true); }
      else { audioRef.current.pause(); setIsPlaying(false); }
      return;
    }
    setBusy(true);
    try { const objectUrl = await createAudio(); if (audioRef.current) { audioRef.current.src = objectUrl; await audioRef.current.play(); setIsPlaying(true); } }
    catch (reason) { if ("speechSynthesis" in window) { const utterance = new SpeechSynthesisUtterance(text); utterance.lang = localStorage.getItem("sehat-ai-language") ?? "hi-IN"; utterance.onend = () => setIsPlaying(false); window.speechSynthesis.speak(utterance); setIsPlaying(true); } else setError(reason instanceof Error ? reason.message : "आवाज़ उपलब्ध नहीं है।"); }
    finally { setBusy(false); }
  };
  const download = async () => { setError(""); setBusy(true); try { const objectUrl = await createAudio(); const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = "sehat-ai-medicine-guide.wav"; anchor.click(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Audio डाउनलोड नहीं हो सका।"); } finally { setBusy(false); } };
  const seek = (value: number) => { if (audioRef.current) { audioRef.current.currentTime = value; setCurrent(value); } };
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  return <div className="rounded-2xl bg-[#087A55] p-4 text-white shadow-lg shadow-emerald-900/10 sm:p-5"><audio ref={audioRef} className="hidden" onTimeUpdate={event => setCurrent(event.currentTarget.currentTime)} onLoadedMetadata={event => setDuration(event.currentTarget.duration || 0)} onEnded={() => setIsPlaying(false)} /><div className="flex items-center gap-3"><button onClick={() => void play()} disabled={busy} aria-label={isPlaying ? "Pause medicine audio" : "Play medicine audio"} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#087A55] transition hover:bg-emerald-50 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={21} /> : isPlaying ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}</button><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{isPlaying ? "आपकी दवा की गाइड चल रही है" : "दवाई कैसे खाएं? सुनें"}</p><p className="mt-1 text-xs text-emerald-100">Gnani Timbre v2.5 · हिंदी आवाज़</p></div><button onClick={() => void download()} disabled={busy} aria-label="Download audio guide" className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 hover:bg-white/20"><Download size={18} /></button></div><div className="mt-4 flex items-center gap-2"><span className="text-[10px] tabular-nums text-emerald-100">{formatTime(current)}</span><input aria-label="Audio progress" type="range" min="0" max={Math.max(duration, 0)} step="0.1" value={Math.min(current, duration || 0)} onChange={event => seek(Number(event.target.value))} className="h-1.5 min-w-0 flex-1 accent-white" /><span className="text-[10px] tabular-nums text-emerald-100">{formatTime(duration)}</span></div>{error && <p role="alert" className="mt-2 text-xs text-amber-100">{error}</p>}</div>;
}

function useAudioAssistant() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopResolver = useRef<((text: string) => void) | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); recorder.current?.stream.getTracks().forEach(t => t.stop()); }, []);

  const start = async (autoStop = true) => {
    setError(""); setSeconds(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot record audio. Try a recent version of Chrome.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredRecorderMimeType();
      const media = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks.current = []; recorder.current = media;
      media.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      media.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: media.mimeType || "audio/webm" });
        setBusy(true);
        try {
          const wav = await toPrismaAudio(blob, "recording");
          const data = new FormData(); data.append("audio", wav, "recording.wav");
          const res = await fetch("/api/stt", { method: "POST", body: data });
          const json = await res.json(); if (!res.ok) throw new Error(json.error ?? "Speech recognition failed.");
          stopResolver.current?.(json.transcript ?? "");
        } catch (e) { setError(e instanceof Error ? e.message : "Could not transcribe audio."); stopResolver.current?.(""); }
        finally { setBusy(false); stopResolver.current = null; }
      };
      media.start(); setRecording(true);
      timer.current = setInterval(() => setSeconds(s => { if (s >= 29 && autoStop) { if (timer.current) clearInterval(timer.current); media.stop(); setRecording(false); return 30; } return s + 1; }), 1000);
      return new Promise<string>(resolve => { stopResolver.current = resolve; });
    } catch (e) { setError(e instanceof Error ? e.message : "Microphone access was unavailable."); return ""; }
  };

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    setRecording(false);
  };
  return { recording, seconds, busy, error, setError, start, stop };
}

async function speakHindi(text: string, language = "hi-IN", voice = "Nalini") {
  if (!text.trim()) return;
  try {
    const response = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice, language }) });
    if (!response.ok) throw new Error("Timbre unavailable");
    const url = URL.createObjectURL(await response.blob());
    const audio = new Audio(url);
    try { await new Promise<void>((resolve, reject) => { audio.onended = () => resolve(); audio.onerror = () => reject(new Error("Audio playback failed.")); audio.play().catch(reject); }); }
    finally { URL.revokeObjectURL(url); }
  } catch {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text); utterance.lang = language === "hi-en" ? "hi-IN" : language; utterance.rate = .88;
      await new Promise<void>((resolve, reject) => { utterance.onend = () => resolve(); utterance.onerror = () => reject(new Error("Browser speech playback failed.")); window.speechSynthesis.speak(utterance); });
    } else throw new Error("Audio playback is unavailable in this browser.");
  }
}

function organForTest(test: string): OrganId {
  const name = test.toLowerCase();
  if (/tsh|thyroid|t3|t4/.test(name)) return "thyroid";
  if (/sgot|sgpt|ast|alt|bilirubin|liver|alp|ggt/.test(name)) return "liver";
  if (/creatinine|urea|bun|kidney|egfr/.test(name)) return "kidneys";
  if (/hba1c|glucose|sugar|fasting/.test(name)) return "pancreas";
  if (/vitamin|b12|uric acid|uric/.test(name)) return "bones";
  return "cardiovascular";
}

function normalizeReportResult(raw: Partial<ReportResult>): ReportResult {
  const flags = Array.isArray(raw.abnormalFlags) ? raw.abnormalFlags : [];
  const incoming = Array.isArray(raw.labValues) ? raw.labValues : flags;
  const labValues: LabValue[] = incoming.map((item) => {
    const value = item as LabValue & { reference_range?: string; plain_meaning?: string };
    const status = String(value.status ?? "unclear").toLowerCase();
    return {
      test: String(value.test ?? "Test"), value: String(value.value ?? "—"),
      unit: typeof value.unit === "string" ? value.unit : undefined,
      referenceRange: typeof value.referenceRange === "string" ? value.referenceRange : typeof value.reference_range === "string" ? value.reference_range : undefined,
      status: status === "normal" || status === "high" || status === "low" ? status : "unclear",
      organ: ["thyroid", "cardiovascular", "liver", "kidneys", "pancreas", "bones"].includes(String(value.organ)) ? value.organ : organForTest(String(value.test ?? "")),
      plainMeaning: typeof value.plainMeaning === "string" ? value.plainMeaning : typeof value.plain_meaning === "string" ? value.plain_meaning : undefined
    };
  });
  return { summary: String(raw.summary ?? "रिपोर्ट की व्याख्या तैयार है।"), abnormalFlags: flags, labValues, hindiAudioScript: String(raw.hindiAudioScript ?? "कृपया अपनी रिपोर्ट डॉक्टर को दिखाएं।") };
}

async function analyze(mode: string, payload: Record<string, unknown>) {
  const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, ...payload }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Analysis failed."); return data;
}

function RecordButton({ recording, busy, seconds, onClick, label, red = false }: { recording: boolean; busy: boolean; seconds: number; onClick: () => void; label: string; red?: boolean }) {
  return <div className="flex flex-col items-center gap-3">
    <button type="button" onClick={onClick} disabled={busy} aria-label={recording ? "Stop recording" : label} className={`relative grid h-24 w-24 place-items-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-60 ${red ? "bg-[#EF2929] shadow-rose-200" : "bg-teal-700 shadow-teal-200"}`}>
      {recording && <span className="absolute inset-[-9px] animate-ping rounded-full border-2 border-current opacity-25" />}
      {busy ? <LoaderCircle className="animate-spin" size={32} /> : recording ? <Pause size={32} fill="currentColor" /> : <Mic size={34} />}
    </button>
    <div className="flex min-h-6 items-center gap-2 text-center text-sm font-semibold text-slate-600">
      {recording ? <><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> Recording · {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")} / 00:30</> : busy ? "आवाज़ समझी जा रही है…" : label}
    </div>
    {recording && <div className="wave flex h-5 items-center gap-1" aria-label="Recording waveform">{Array.from({ length: 13 }, (_, i) => <span key={i} style={{ height: `${8 + (i * 13 % 15)}px` }} />)}</div>}
  </div>;
}

export default function DoctorWorkspace({ initialTab = "doctor", showStats = true }: { initialTab?: Tab; showStats?: boolean }) {
  const { brief, setBrief } = useCareCoordination();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [transcript, setTranscript] = useState("");
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportUrl, setReportUrl] = useState("");
  const [reportQuestion, setReportQuestion] = useState("");
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [emergencyText, setEmergencyText] = useState("");
  const [emergency, setEmergency] = useState<EmergencyResult | null>(null);
  const [pillFile, setPillFile] = useState<File | null>(null);
  const [pillPreview, setPillPreview] = useState("");
  const [pillQuestion, setPillQuestion] = useState("");
  const [pillResult, setPillResult] = useState<PillScan | null>(null);
  const [pillBusy, setPillBusy] = useState(false);
  const [pillError, setPillError] = useState("");
  const [missedTwice, setMissedTwice] = useState(false);
  const [caregiverAlert, setCaregiverAlert] = useState("");
  const [caregiverBusy, setCaregiverBusy] = useState(false);
  const audio = useAudioAssistant();
  const reportAudio = useAudioAssistant();
  const emergencyAudio = useAudioAssistant();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (reportUrl) URL.revokeObjectURL(reportUrl); }, [reportUrl]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sehat-ai-prescription");
      if (saved) setPrescription(JSON.parse(saved) as Prescription);
      else if (initialTab === "guide") setPrescription(samplePrescription);
    } catch { if (initialTab === "guide") setPrescription(samplePrescription); }
  }, [initialTab]);
  useEffect(() => { if (prescription) window.localStorage.setItem("sehat-ai-prescription", JSON.stringify(prescription)); }, [prescription]);

  const getDoctorDictation = async () => {
    if (audio.recording) { audio.stop(); return; }
    setError(""); const text = await audio.start();
    if (text) { setTranscript(text); await createPrescription(text); }
  };
  const createPrescription = async (text: string) => {
    setAnalyzing(true); setError("");
    try { setPrescription(await analyze("prescription", { text }) as Prescription); }
    catch (e) { setError(e instanceof Error ? e.message : "Prescription could not be prepared."); }
    finally { setAnalyzing(false); }
  };
  const updateMedicine = (index: number, field: keyof Medicine, value: string) => setPrescription(p => p ? ({ ...p, medicines: p.medicines.map((m, i) => i === index ? { ...m, [field]: value } : m) }) : p);
  const playScript = async (script: string, language = "hi-IN", voice = "Nalini") => { setPlaying(true); setError(""); try { await speakHindi(script, language, voice); } catch (e) { setError(e instanceof Error ? e.message : "Could not play audio."); } finally { setPlaying(false); } };
  const confirmPrescription = () => { if (prescription) { setTab("guide"); void playScript(prescription.hindiAudioScript); } };
  const scanPill = async (file: File) => { setPillFile(file); setPillPreview(URL.createObjectURL(file)); setPillResult(null); setPillError(""); };
  const analyzePill = async () => {
    if (!pillFile) { setPillError("पहले दवाई के पत्ते की तस्वीर लें।"); return; }
    setPillBusy(true); setPillError("");
    try {
      const imageBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("तस्वीर नहीं पढ़ सके।")); reader.readAsDataURL(pillFile); });
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "pill-scan", imageBase64, mimeType: pillFile.type, question: pillQuestion, prescription: prescription?.medicines ?? [] }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "दवाई की जाँच नहीं हो सकी।");
      const safeResult: PillScan = { ...result, verdict: result.verdict === "match" && prescription?.medicines.some(m => m.name.toLowerCase().includes(String(result.medicineName).toLowerCase()) || String(result.medicineName).toLowerCase().includes(m.name.toLowerCase().split(" ")[0])) ? "match" : result.verdict === "match" ? "unclear" : result.verdict };
      setPillResult(safeResult);
      if (safeResult.verdict === "match") void playScript(safeResult.hindiAudioScript || safeResult.reason);
      else void playScript("सावधान। यह दवाई आपके पर्चे से साफ़ तौर पर मेल नहीं खाती। इसे लेने से पहले अपने डॉक्टर या फार्मासिस्ट से पुष्टि करें।");
    } catch (reason) { setPillError(reason instanceof Error ? reason.message : "दवाई की जाँच नहीं हो सकी।"); }
    finally { setPillBusy(false); }
  };
  const speakCaregiverAlert = async () => { setCaregiverBusy(true); try { await playScript(caregiverAlert); } finally { setCaregiverBusy(false); } };

  const narrateOrgan = async (organ: OrganId, language: string) => {
    const data = reportResult?.labValues?.filter(value => value.organ === organ) ?? [];
    const response = await analyze("body-organ", { text: JSON.stringify({ organ, labValues: data }), language }) as { script?: string };
    if (!response.script) throw new Error("इस अंग की आवाज़ तैयार नहीं हो सकी।");
    return response.script;
  };
  const narrateTour = async (language: string) => {
    const response = await analyze("body-tour", { text: JSON.stringify({ labValues: reportResult?.labValues ?? [] }), language }) as { narrations?: { organ: OrganId; script: string }[] };
    if (!response.narrations?.length) throw new Error("शरीर की रिपोर्ट के लिए आवाज़ तैयार नहीं हो सकी।");
    return Object.fromEntries(response.narrations.map(item => [item.organ, item.script])) as Record<OrganId, string>;
  };

  const chooseReport = (file?: File) => { if (!file) return; if (!file.type.startsWith("image/") && file.type !== "application/pdf") { setError("कृपया PDF या रिपोर्ट की image चुनें।"); return; } if (file.size > 10 * 1024 * 1024) { setError("File 10 MB से छोटी होनी चाहिए।"); return; } if (reportUrl) URL.revokeObjectURL(reportUrl); setReportFile(file); setReportUrl(URL.createObjectURL(file)); setReportResult(null); setError(""); };
  const analyzeReport = async () => {
    if (!reportFile) { setError("पहले रिपोर्ट की तस्वीर चुनें।"); return; }
    setAnalyzing(true); setError("");
    try { const imageBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read this image.")); reader.readAsDataURL(reportFile); }); const response = await analyze("report", { imageBase64, mimeType: reportFile.type, question: reportQuestion }) as Partial<ReportResult>; const normalized = normalizeReportResult(response); setReportResult(normalized); const critical = normalized.abnormalFlags.some(flag => /critical|very high|very low/i.test(`${flag.status} ${flag.value}`)) || normalized.labValues?.some(value => /critical/i.test(value.status)); if (critical) { const msg = "नमस्ते, रिपोर्ट में एक बहुत असामान्य मान दिखा है। कृपया आज ही डॉक्टर से बात करने में मदद करें। यह अपने आप में निदान नहीं है।"; setCaregiverAlert(msg); setMissedTwice(false); createCareAlert(msg,"Critical lab report"); } }
    catch (e) { setError(e instanceof Error ? e.message : "Report could not be analyzed."); }
    finally { setAnalyzing(false); }
  };
  const loadSampleReport = () => { if (reportUrl) URL.revokeObjectURL(reportUrl); setReportUrl(""); setReportResult(sampleReport); setReportQuestion(""); setReportFile(null); setError(""); };
  const downloadSummary = () => {
    if (!reportResult) return;
    const lines = ["Sehat-AI — Report explanation", "", reportResult.summary, "", ...(reportResult.labValues ?? []).map(value => `${value.test}: ${value.value}${value.unit ? ` ${value.unit}` : ""} | ${value.status.toUpperCase()} | Reference: ${value.referenceRange ?? "not provided"}`), "", "Informational only. Please review with a clinician."];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "sehat-ai-report-summary.txt"; anchor.click(); URL.revokeObjectURL(url);
  };
  const askReport = async () => {
    setError(""); const text = await reportAudio.start(); if (text) setReportQuestion(text);
  };
  const handleEmergency = async () => {
    if (emergencyAudio.recording) { emergencyAudio.stop(); return; }
    setError(""); const text = await emergencyAudio.start();
    if (!text) return;
    setEmergencyText(text); setAnalyzing(true);
    try { const result = await analyze("emergency", { text }) as EmergencyResult; setEmergency(result); if (result.severity === "emergency") createCareAlert(`Emergency symptoms reported: ${text}`,"Emergency"); await playScript(result.hindiAudioScript); }
    catch (e) { setError(e instanceof Error ? e.message : "Triage could not be prepared."); }
    finally { setAnalyzing(false); }
  };

  const tabs: { id: Tab; title: string; hindi: string; icon: typeof Stethoscope }[] = [
    { id: "doctor", title: "Doctor OPD", hindi: "बोलकर पर्चा", icon: Stethoscope },
    { id: "guide", title: "Patient Guide", hindi: "मरीज़ की गाइड", icon: Volume2 },
    { id: "report", title: "Report & SOS", hindi: "रिपोर्ट व मदद", icon: Activity }
  ];

  return <main className="min-h-[calc(100vh-68px)] pb-24 lg:pb-10">
    <section className="mx-auto max-w-6xl px-4 pt-7 sm:px-6 sm:pt-10 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Voice-first care</div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">नमस्ते, आज हम कैसे मदद करें?</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">अपनी भाषा में बोलें। पर्चा बनाएं, रिपोर्ट समझें या ज़रूरत पड़ने पर मदद पाएं।</p></div><div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex"><span className="grid h-9 w-9 place-items-center rounded-full bg-white text-teal-700"><CircleHelp size={19} /></span> आसान · सुरक्षित · आपकी भाषा में</div></div>

      {showStats && tab === "doctor" && <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">{[{ label: "Today's Patients", value: "48", icon: Users }, { label: "Prescriptions", value: "42", icon: Pill }, { label: "Follow-ups", value: "12", icon: Clock3 }, { label: "Alerts", value: "3", icon: AlertTriangle }].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><span><small className="text-xs font-semibold text-slate-500">{label}</small><strong className="mt-1 block text-2xl font-extrabold text-[#102A43]">{value}</strong></span><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E8F8F2] text-[#087A55]"><Icon size={19} /></span></div>)}</div>}

      <nav className="mb-6 grid grid-cols-3 rounded-2xl border border-teal-100 bg-white p-1.5 shadow-sm" aria-label="Main features">
        {tabs.map(({ id, title, hindi, icon: Icon }) => <button key={id} onClick={() => { setTab(id); setError(""); }} className={`flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold transition sm:min-h-[60px] sm:flex-row sm:gap-2 sm:text-sm ${tab === id ? "bg-teal-700 text-white shadow-md" : "text-slate-600 hover:bg-teal-50"}`} aria-current={tab === id ? "page" : undefined}><Icon size={19} /><span>{title}<span className={`block text-[10px] font-medium sm:ml-1 sm:inline sm:text-xs ${tab === id ? "text-teal-100" : "text-slate-400"}`}>({hindi})</span></span></button>)}
      </nav>

      {error && <div className="mb-5"><ErrorMessage>{error}</ErrorMessage></div>}
      {tab === "doctor" && <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <section className="rounded-3xl border border-teal-100 bg-white p-5 shadow-soft sm:p-7">
          <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Doctor OPD</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">बोलकर पर्चा बनाएं</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Mic /></span></div>
          <p className="mb-7 text-sm leading-6 text-slate-600">मरीज़ की जानकारी और दवाइयों के निर्देश बोलें। हम आपकी Hinglish को पर्चे में बदलेंगे।</p>
          <div className="rounded-2xl bg-teal-50/70 px-4 py-7"><RecordButton recording={audio.recording} busy={audio.busy} seconds={audio.seconds} onClick={() => void getDoctorDictation()} label="बोलने के लिए माइक दबाएं" /></div>
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-500"><ShieldCheck size={17} className="shrink-0 text-teal-700" /> Listening via Prisma v2.5 · Noise-resilient Hinglish · अधिकतम 30 सेकंड</div>
          {audio.error && <ErrorMessage>{audio.error}</ErrorMessage>}
          {transcript && <div className="mt-5 rounded-2xl border border-teal-100 bg-white p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-teal-700">आपने कहा</p><p className="text-sm leading-6 text-slate-700">“{transcript}”</p></div>}
          <button onClick={() => { const sample = "Patient ko bukhar aur halka dehydration hai. Paracetamol 500 mg ek goli subah aur raat khane ke baad 3 din. ORS din bhar thoda thoda pilayein. Paani zyada piyein aur aaram karein."; setTranscript(sample); void createPrescription(sample); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 px-4 py-3 text-sm font-bold text-teal-800 transition hover:bg-teal-50"><Play size={16} /> Test Sample Hinglish</button>
        </section>

        <section className="rounded-3xl border border-teal-100 bg-white p-5 shadow-soft sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Digital prescription</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">दवाई का पर्चा</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Pill /></span></div>
          {analyzing && <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><LoaderCircle className="animate-spin text-teal-700" size={32} /><p className="font-semibold text-slate-600">पर्चा तैयार हो रहा है…</p></div>}
          {!prescription && !analyzing && <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-5 text-center"><div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-50 text-slate-400"><Pill size={25} /></div><p className="font-bold text-slate-700">आपका पर्चा यहाँ दिखेगा</p><p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">माइक से बोलें या नमूना आज़माएं। भेजने से पहले हर दवा की जाँच करें।</p></div>}
          {prescription && !analyzing && <div className="space-y-4">
            {prescription.medicines.map((medicine, i) => <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><div className="mb-3 flex items-center gap-2 font-bold text-slate-800"><span className="grid h-7 w-7 place-items-center rounded-full bg-teal-100 text-xs text-teal-800">{i + 1}</span> Medicine</div><div className="grid gap-2 sm:grid-cols-2">{(["name", "dosage", "timing", "duration"] as const).map(key => <label key={key} className="text-[11px] font-bold uppercase tracking-wide text-slate-500"><span className="mb-1 block">{key}</span><input value={medicine[key]} onChange={e => updateMedicine(i, key, e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>)}</div><button aria-label="Remove medicine" onClick={() => setPrescription(p => p ? ({ ...p, medicines: p.medicines.filter((_, index) => index !== i) }) : p)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><Trash2 size={13} /> हटाएं</button></div>)}
            <button onClick={() => setPrescription(p => p ? ({ ...p, medicines: [...p.medicines, { name: "", dosage: "", timing: "", duration: "" }] }) : p)} className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-teal-300 py-2.5 text-sm font-bold text-teal-800 hover:bg-teal-50"><Plus size={16} /> दवा जोड़ें</button>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">सामान्य सलाह<textarea value={prescription.generalAdvice} onChange={e => setPrescription({ ...prescription, generalAdvice: e.target.value })} rows={2} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm font-medium normal-case leading-6 text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> AI से बना पर्चा डॉक्टर जाँचें और पुष्टि करें। अधूरी दवा जानकारी की पुष्टि ज़रूरी है।</div>
            <button onClick={confirmPrescription} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-100 transition hover:bg-teal-800"><Check size={18} /> Confirm &amp; Send Audio Guide <ArrowRight size={17} /></button>
          </div>}
        </section>
      </div>}

      {tab === "doctor" && brief && <section className="mt-5 rounded-3xl border border-rose-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-rose-700">Patient-reported · AI mapped</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Pre-consultation doctor brief</h2></div><button onClick={() => setBrief(null)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">Clear from session</button></div><p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">“{brief.transcript}”</p><div className="mt-3 flex flex-wrap gap-2">{brief.regions.map(region => <span key={region} className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">{region.replaceAll("_", " ")}</span>)}</div><p className="mt-3 text-sm leading-6 text-slate-700">{brief.doctorBrief}</p><p className="mt-2 text-xs text-slate-500">Duration: {brief.duration} · reported severity: {brief.severity} · {brief.createdAt}</p><p className="mt-3 text-xs text-amber-800">AI-mapped patient report; confirm location, duration, and severity directly with the patient. Not a diagnosis.</p></section>}

      {tab === "guide" && <div className="mx-auto max-w-3xl rounded-3xl border border-teal-100 bg-white p-5 shadow-soft sm:p-8">
        <div className="mb-6 flex items-center gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Volume2 size={27} /></div><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Patient Guide</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">मरीज़ की ऑडियो गाइड</h2><p className="mt-1 text-sm text-slate-500">दवाइयाँ कब और कैसे लें?</p></div></div>
        {!prescription ? <div className="rounded-2xl bg-amber-50 p-5 text-sm leading-6 text-amber-900">पहले Doctor OPD टैब में पर्चा बनाकर पुष्टि करें।</div> : <>
          <div className="mb-5 rounded-2xl bg-[#e9f8f1] p-4 sm:p-5"><div className="mb-3 flex items-center gap-2 text-sm font-bold text-teal-900"><Pill size={17} /> आपकी दवाइयाँ</div><div className="space-y-3">{prescription.medicines.map((m, i) => <div key={i} className="flex gap-3 rounded-xl bg-white/90 p-3.5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Pill size={19} /></div><div className="min-w-0 flex-1"><div className="font-bold text-slate-800">{m.name || "दवा"}</div><div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600"><span className="flex items-center gap-1"><Clock3 size={13} /> {m.timing || "डॉक्टर से पूछें"}</span><span>{m.dosage || "डॉक्टर से पूछें"} · {m.duration || "डॉक्टर से पूछें"}</span></div></div></div>)}</div></div>
          <div className="mb-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-700"><div className="rounded-xl bg-amber-50 px-2 py-3"><span className="block text-2xl">☀️</span>सुबह</div><div className="rounded-xl bg-sky-50 px-2 py-3"><span className="block text-2xl">🌤️</span>दोपहर</div><div className="rounded-xl bg-indigo-50 px-2 py-3"><span className="block text-2xl">🌙</span>रात</div></div>
          {prescription.generalAdvice && <p className="mb-5 rounded-xl border-l-4 border-teal-600 bg-teal-50 p-4 text-sm leading-6 text-slate-700"><strong>ध्यान रखें: </strong>{prescription.generalAdvice}</p>}
          <AudioGuidePlayer text={prescription.hindiAudioScript} />
        </>}
      </div>}

      {tab === "guide" && <section className="mx-auto mt-5 max-w-3xl rounded-3xl border border-teal-100 bg-white p-5 shadow-soft sm:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Dawai Pehchano · Gemini Vision</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">दवाई का पत्ता दिखाएं</h2><p className="mt-1 text-sm text-slate-500">पर्चे से तुलना करें और डॉक्टर से पुष्टि करें।</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Camera /></span></div><input type="file" accept="image/*" capture="environment" className="hidden" id="pill-strip-upload" onChange={e => { const file = e.target.files?.[0]; if (file) void scanPill(file); }} /><div className="mt-4 grid gap-2 sm:grid-cols-2"><label htmlFor="pill-strip-upload" className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-teal-200 px-4 py-3 text-sm font-bold text-teal-800"><Camera size={17} /> दवाई का पत्ता दिखाएं</label><button onClick={() => { const sample = new File([new Blob()], "sample-pill-strip-demo.png", { type: "image/png" }); setPillFile(sample); setPillPreview(""); setPillQuestion("Yeh kis kaam ki hai aur kab khani hai?"); setPillResult({ medicineName: "Paracetamol", strength: "500 mg", purpose: "बुखार या दर्द में उपयोग की जाने वाली दवा।", verdict: prescription?.medicines.some(m => m.name.toLowerCase().includes("paracetamol")) ? "match" : "unclear", reason: "डेमो परिणाम है; असली पैक की तस्वीर और डॉक्टर/फार्मासिस्ट से पुष्टि करें।", hindiAudioScript: "दादा जी, नमूने में पैरासिटामोल 500 मिलीग्राम लिखा है। यह डेमो है, असली दवा लेने से पहले अपने पर्चे और डॉक्टर से पुष्टि करें।" }); }} className="min-h-12 rounded-xl bg-[#E8F8F2] px-4 py-3 text-sm font-bold text-[#064E3B]">Test Sample Pill Strip</button></div>{pillPreview && <img src={pillPreview} alt="Medicine strip preview" className="mt-4 max-h-56 w-full rounded-xl bg-slate-50 object-contain" />}{pillFile && <p className="mt-2 truncate text-xs text-slate-500">{pillFile.name} {pillPreview ? "· image ready" : "· sample only, not a real scan"}</p>}<label className="mt-4 block text-xs font-bold text-slate-600">अपना सवाल (optional)<input value={pillQuestion} onChange={e => setPillQuestion(e.target.value)} placeholder="Yeh kis kaam ki hai aur kab khani hai?" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-teal-600" /></label>{pillError && <p role="alert" className="mt-3 text-sm text-rose-700">{pillError}</p>}<button disabled={!pillFile || pillBusy || !pillPreview} onClick={() => void analyzePill()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087A55] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{pillBusy ? <LoaderCircle className="animate-spin" size={18} /> : <Activity size={18} />}{pillBusy ? "पैक पढ़ रहे हैं…" : "पर्चे से मिलाएं"}</button>{pillResult && <div className={`mt-4 rounded-2xl border p-4 ${pillResult.verdict === "match" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}><p className={`font-extrabold ${pillResult.verdict === "match" ? "text-emerald-800" : "text-rose-800"}`}>{pillResult.verdict === "match" ? "सही दवाई (Prescription name matches)" : "सावधान! पर्चे से पुष्टि नहीं हुई"}</p><p className="mt-2 text-sm leading-6 text-slate-700">{pillResult.medicineName} {pillResult.strength} · {pillResult.purpose}</p><p className="mt-1 text-xs leading-5 text-slate-600">{pillResult.reason} केवल नाम/strength मिलान है; इसे सुरक्षा की गारंटी न मानें।</p><button onClick={() => void playScript(pillResult.verdict === "match" ? pillResult.hindiAudioScript : "सावधान। यह दवाई पर्चे से स्पष्ट रूप से मेल नहीं खाती। डॉक्टर या फार्मासिस्ट से पूछे बिना इसे न लें।")} className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-teal-800"><Volume2 size={16} /> हिंदी में सुनें</button></div>}<div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-600"><strong>सुरक्षा:</strong> पैक की AI पहचान गलत हो सकती है। दवा, dose या timing बदलने से पहले डॉक्टर/फार्मासिस्ट से पूछें। यह औषधीय सुरक्षा सत्यापन नहीं है।</div></section>}

      {tab === "guide" && <section className="mx-auto mt-5 max-w-3xl rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><Users size={20} /></span><div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Family & ASHA caregiver</p><h2 className="font-extrabold text-[#102A43]">देखभाल में परिवार साथ</h2></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-bold">बेटा · Rohan (Bengaluru)</p><a href="tel:+910000000000" className="mt-1 text-xs text-teal-700">Demo contact · add a verified number</a></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-bold">आशा दीदी · Sunita Ji</p><span className="mt-1 block text-xs text-slate-500">Demo contact · add a verified number</span></div></div><button onClick={() => { const next = !missedTwice; setMissedTwice(next); setCaregiverAlert(next ? "नमस्ते, आपके पिताजी ने दवाई की ऑडियो गाइड दो बार नहीं सुनी है। कृपया उनसे बात करके डॉक्टर की बताई दवा के निर्देश याद दिलाएं।" : ""); }} className="mt-4 min-h-12 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{missedTwice ? "Missed-dose alert simulated ✓" : "Simulate Missed Dose (2x)"}</button>{caregiverAlert && <div role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-extrabold text-amber-900"><PhoneCall size={17} /> Caregiver notification · demo</p><p className="mt-2 rounded-xl bg-white p-3 text-sm leading-6 text-slate-700">{caregiverAlert}</p><p className="mt-2 text-xs leading-5 text-amber-800">यह केवल इस डेमो स्क्रीन पर दिखता है। कोई WhatsApp/SMS नहीं भेजा गया क्योंकि caregiver नंबर/consent सेवा जुड़ी नहीं है।</p><button onClick={() => void speakCaregiverAlert()} disabled={caregiverBusy} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#087A55] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{caregiverBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Volume2 size={16} />} Play caregiver voice summary</button></div>}</section>}

      {tab === "report" && <div className="grid gap-5 lg:grid-cols-2">
        <section className={`rounded-3xl border border-teal-100 bg-white p-5 shadow-soft sm:p-7 ${reportResult ? "lg:col-span-2" : ""}`}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><FileImage /></span><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Bolo Report</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">रिपोर्ट समझें</h2></div></div><button onClick={loadSampleReport} className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs font-extrabold text-teal-800 transition hover:bg-teal-100 sm:text-sm">Load Sample Lab Report</button></div><p className="mb-5 text-sm leading-6 text-slate-600">ब्लड टेस्ट या मेडिकल रिपोर्ट की साफ़ तस्वीर अपलोड करें। सवाल बोलकर पूछें या लिखें।</p>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={e => chooseReport(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); chooseReport(e.dataTransfer.files?.[0]); }} className="flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 p-3 text-center transition hover:bg-teal-50"><span className="grid h-11 w-11 place-items-center rounded-full bg-white text-teal-700 shadow-sm"><Upload /></span><span className="mt-2 text-sm font-bold text-teal-900">{reportFile ? reportFile.name : "रिपोर्ट की PDF या तस्वीर चुनें"}</span><span className="mt-1 text-xs text-slate-500">PDF, JPG, PNG · अधिकतम 10 MB</span></button>
          {reportUrl && (reportFile?.type === "application/pdf" ? <iframe src={reportUrl} title="Selected medical report PDF preview" className="mt-3 h-52 w-full rounded-xl border border-slate-200" /> : <img src={reportUrl} alt="Selected medical report preview" className="mt-3 max-h-48 w-full rounded-xl border border-slate-200 object-contain" />)}
          <div className="mt-4 flex items-center gap-2"><button onClick={() => void askReport()} disabled={reportAudio.busy} className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white ${reportAudio.recording ? "bg-rose-600" : "bg-teal-700"}`} aria-label="Ask a question by voice">{reportAudio.busy ? <LoaderCircle className="animate-spin" size={20} /> : <Mic size={21} />}</button><input value={reportQuestion} onChange={e => setReportQuestion(e.target.value)} placeholder="जैसे: इसमें सब ठीक है?" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></div>
          {reportAudio.error && <ErrorMessage>{reportAudio.error}</ErrorMessage>}
          <button onClick={() => void analyzeReport()} disabled={analyzing} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60">{analyzing ? <LoaderCircle className="animate-spin" size={18} /> : <Activity size={18} />} {analyzing ? "रिपोर्ट देख रहे हैं…" : "रिपोर्ट समझाएं"}</button>
          {reportResult && <div className="mt-5 grid gap-4 xl:grid-cols-[.8fr_1.2fr]"><div className="rounded-2xl bg-teal-50 p-4"><h3 className="font-bold text-teal-900">सरल भाषा में</h3><p className="mt-2 text-sm leading-6 text-slate-700">{reportResult.summary}</p>{reportResult.abnormalFlags.length > 0 && <div className="mt-3 space-y-2">{reportResult.abnormalFlags.map((f, i) => <div key={i} className="rounded-xl bg-white p-3 text-sm"><span className="font-bold">{f.test}</span> · {f.value}<span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">{f.status}</span></div>)}</div>}<div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => void playScript(reportResult.hindiAudioScript)} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"><Volume2 size={18} /> हिंदी में सुनें</button><button onClick={downloadSummary} className="flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white py-3 text-sm font-bold text-teal-800"><Download size={17} /> Download</button></div><p className="mt-3 text-xs leading-5 text-slate-500">यह जानकारी है, निदान नहीं। सामान्य सीमाएँ लैब और व्यक्ति के अनुसार बदल सकती हैं; डॉक्टर से पुष्टि करें।</p></div><BodyReportViewer values={reportResult.labValues ?? []} onNarrate={narrateOrgan} onTour={narrateTour} onSpeak={playScript} /></div>}
        </section>

        <section className={`overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-soft ${reportResult ? "lg:col-span-2" : ""}`}><div className="bg-[#EF2929] p-5 text-white sm:p-7"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-rose-100">Emergency triage</p><h2 className="mt-1 text-xl font-extrabold">तुरंत मदद चाहिए?</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15"><Siren /></span></div><p className="mb-6 text-sm leading-6 text-rose-50">लक्षण बताएं। गंभीर हालत में मदद आने तक सुरक्षित प्राथमिक कदम और 108 की सलाह पाएं।</p><div className="rounded-2xl bg-white/10 px-4 py-6"><RecordButton recording={emergencyAudio.recording} busy={emergencyAudio.busy || analyzing} seconds={emergencyAudio.seconds} onClick={() => void handleEmergency()} label="लक्षण बताने के लिए SOS दबाएं" red /></div><p className="mt-3 text-center text-xs text-rose-100">अधिकतम 30 सेकंड · माइक्रोफ़ोन की अनुमति दें</p></div>
          <div className="p-5 sm:p-7"><div className="grid gap-2 sm:grid-cols-2"><a href="tel:108" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 text-base font-extrabold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"><span className="grid h-8 w-8 place-items-center rounded-full bg-rose-600 text-white"><span className="text-sm">108</span></span> Call 108 · एम्बुलेंस</a><a href="tel:112" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-white text-base font-extrabold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50"><span className="grid h-8 w-8 place-items-center rounded-full bg-rose-100 text-rose-700"><span className="text-sm">112</span></span> Call 112 · मदद</a></div>{emergencyAudio.error && <div className="mt-3"><ErrorMessage>{emergencyAudio.error}</ErrorMessage></div>}{emergencyText && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">लक्षण: “{emergencyText}”</p>}
            {emergency && <div className="mt-5"><div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800"><AlertTriangle size={17} /> {emergency.severity === "emergency" ? "आपातकाल — तुरंत मदद बुलाएं" : "तुरंत डॉक्टर से संपर्क करें"}</div><div className="space-y-3">{emergency.firstAidSteps.slice(0, 3).map((step, i) => <div key={i} className="flex gap-3 rounded-xl border border-slate-100 p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-100 font-extrabold text-rose-700">{i + 1}</span><p className="pt-1 text-sm leading-6 text-slate-700">{step}</p></div>)}</div><button onClick={() => void playScript(emergency.hindiAudioScript)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-sm font-bold text-white"><Volume2 size={18} /> निर्देश हिंदी में सुनें</button></div>}
            <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" /> यह प्राथमिक मार्गदर्शन है, आपात सेवा का विकल्प नहीं। जान का खतरा लगे तो अभी 108 पर कॉल करें।</div>
          </div></section>
      </div>}

      <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-teal-100 py-5 text-center text-xs text-slate-400 sm:flex-row sm:text-left"><span className="flex items-center gap-1"><ShieldCheck size={14} /> आपकी जानकारी सुरक्षित रूप से संभाली जाती है</span><span>Sehat-AI · Great Indian AI Internship Challenge</span></footer>
    </section>
  </main>;
}
