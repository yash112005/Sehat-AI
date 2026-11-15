import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
type Mode = "prescription" | "report" | "emergency" | "body-organ" | "body-tour" | "translate" | "pill-scan" | "symptom-map";

const prompts: Record<Mode, string> = {
  prescription: `Turn the doctor's Hinglish dictation into a patient prescription. Return ONLY valid JSON with shape {"medicines":[{"name":"","dosage":"","timing":"","duration":""}],"generalAdvice":"","hindiAudioScript":""}. Use only medicines and instructions stated in the dictation. Never invent missing dose, frequency, or duration: use "Please confirm with doctor". Audio script should be warm, polite, simple Hindi for elderly patients.`,
  report: `Explain the supplied medical report calmly in simple Hindi. This is informational, not a diagnosis. Mention out-of-range values only when clearly readable and recommend clinician follow-up. Never invent test values or reference ranges; use null when a range is not printed/readable. Return ONLY JSON: {"summary":"","abnormalFlags":[{"test":"","value":"","status":"high|low|normal|unclear"}],"labValues":[{"test":"","value":"","unit":null,"referenceRange":null,"status":"high|low|normal|unclear","organ":"thyroid|cardiovascular|liver|kidneys|pancreas|bones","plainMeaning":""}],"hindiAudioScript":""}. Include readable values for TSH/T3/T4, lipid profile/CBC, SGOT/SGPT/bilirubin, creatinine/urea, fasting sugar/HbA1c, vitamin D/B12/uric acid. Map them respectively to thyroid, cardiovascular, liver, kidneys, pancreas, bones. Use exact lab-provided reference ranges only; omit unclear values. Include a short disclaimer in the audio script.` ,
  emergency: `Triage these symptoms with safety first. Do not diagnose. Give exactly 3 immediate, safe first-aid steps and advise calling India's 108 ambulance for severe, worsening, breathing difficulty, unconsciousness, chest pain, stroke signs, heavy bleeding, or other life-threatening symptoms. Return ONLY JSON: {"severity":"urgent|emergency","firstAidSteps":["","",""],"hindiAudioScript":""}. Tell them to seek professional help; avoid medication dosing.`,
  "body-organ": `Create one short, calm narration in the requested Indian language. Explain in everyday words what the named organ does, then describe only the supplied lab results and ranges. Explain high/low values without diagnosing or causing panic. If there are no tests for that organ, say the uploaded report has no matching result. Do not invent values or ranges. Mention that ranges vary by lab and recommend discussing results with a clinician. Return ONLY JSON {"script":"..."}.`,
  "body-tour": `Create one concise, calm spoken narration for each of these organ IDs: thyroid, cardiovascular, liver, kidneys, pancreas, bones. Write every narration in the requested Indian language. Explain the organ's everyday function and only its supplied lab results/ranges; when no test is supplied, say no matching result was found. Do not invent values or ranges, diagnose, or alarm. Mention clinician follow-up calmly. Return ONLY JSON {"narrations":[{"organ":"thyroid","script":""},{"organ":"cardiovascular","script":""},{"organ":"liver","script":""},{"organ":"kidneys","script":""},{"organ":"pancreas","script":""},{"organ":"bones","script":""}]}.`,
  translate: `Translate the supplied medicine or health instructions accurately into the requested Indian language. Preserve medicine names, numbers, units, dose, timing, warnings and meaning exactly; do not add or remove medical advice. Use plain, easy-to-understand spoken language. Return ONLY JSON {"translation":"..."}.`,
  "pill-scan": `Inspect the medicine package image. Identify only text clearly visible on the pack (name and strength); do not infer a purpose or dosage when unclear. Compare the identified name and strength to the supplied active prescription JSON. Return ONLY JSON {"medicineName":"","strength":"","purpose":"","verdict":"match|mismatch|unclear","reason":"","hindiAudioScript":""}. Exact/clear match is required for match. If not clearly matching or image is unclear, do NOT tell patient to take it; say confirm with doctor/pharmacist. Never invent dosage or timing. The explanation must be in simple Hindi and not make a clinical safety guarantee.`,
  "symptom-map": `Map the patient's spoken symptom description conservatively to zero or more anatomical regions from: head, chest, right_abdomen, stomach, knees, throat. Return ONLY JSON {"regions":["..."],"duration":"...","severity":"mild|moderate|severe|unclear","doctorBrief":"..."}. Preserve the patient's words; do not diagnose or infer an organ disease. If location is unclear, return no region. Flag severe sudden chest pain, breathing difficulty, fainting, stroke signs, severe abdominal pain, or rapidly worsening symptoms as requiring urgent clinician/emergency assessment. The brief is for clinician review, not an automated diagnosis.`
};

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { mode?: Mode; text?: string; question?: string; imageBase64?: string; mimeType?: string; language?: string; prescription?: unknown };
    const mode = body.mode;
    if (!mode || !(mode in prompts)) return NextResponse.json({ error: "Mode must be prescription, report, or emergency." }, { status: 400 });
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const input: Array<string | { inlineData: { data: string; mimeType: string } }> = [prompts[mode]];
    if (mode === "report" || mode === "pill-scan") {
      if (!body.imageBase64) return NextResponse.json({ error: "A report image is required." }, { status: 400 });
      input.push({ inlineData: { data: body.imageBase64.replace(/^data:[^,]+,/, ""), mimeType: body.mimeType ?? "image/jpeg" } });
      if (mode === "report" && body.question) input.push(`Patient question: ${body.question}`);
      if (mode === "pill-scan") input.push(`Active prescription (compare only; never treat as verified if unclear): ${JSON.stringify(body.prescription ?? [])}`);
    } else {
      if (!body.text?.trim()) return NextResponse.json({ error: "Spoken text is required." }, { status: 400 });
      if (mode === "body-organ" || mode === "body-tour" || mode === "translate") input.push(`Requested language code: ${body.language ?? "hi-IN"}. Do not answer in any other language.`);
      input.push(`Spoken input: ${body.text}`);
    }
    const result = await model.generateContent(input);
    return NextResponse.json(parseJson(result.response.text()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not analyze this request." }, { status: 500 });
  }
}
