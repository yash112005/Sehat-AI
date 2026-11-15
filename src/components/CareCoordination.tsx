"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type SymptomBrief = { transcript: string; regions: string[]; duration: string; severity: string; doctorBrief: string; createdAt: string };
const Context = createContext<{ brief: SymptomBrief | null; setBrief: (brief: SymptomBrief | null) => void } | null>(null);
export function CareCoordinationProvider({ children }: { children: ReactNode }) { const [brief, setBriefState] = useState<SymptomBrief | null>(null); useEffect(() => { try { const saved = sessionStorage.getItem("sehat-ai-symptom-brief"); if (saved) setBriefState(JSON.parse(saved)); } catch { /* use an empty current-session brief */ } }, []); const setBrief = (value: SymptomBrief | null) => { setBriefState(value); try { if (value) sessionStorage.setItem("sehat-ai-symptom-brief", JSON.stringify(value)); else sessionStorage.removeItem("sehat-ai-symptom-brief"); } catch { /* in-memory state remains available */ } }; return <Context.Provider value={{ brief, setBrief }}>{children}</Context.Provider>; }
export function useCareCoordination() { const context = useContext(Context); if (!context) throw new Error("Care coordination provider missing"); return context; }
