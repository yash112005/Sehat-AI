import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const key = process.env.GNANI_API_KEY;
  if (!key) return NextResponse.json({ error: "GNANI_API_KEY is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { text?: string; voice?: string; language?: string };
    if (!body.text?.trim()) return NextResponse.json({ error: "Text is required." }, { status: 400 });
    const upstream = await fetch("https://api.vachana.ai/api/v1/tts/inference", { method: "POST", headers: { "X-API-Key-ID": key, "Content-Type": "application/json", Accept: "audio/wav" }, body: JSON.stringify({ text: body.text, voice: body.voice ?? "Nalini", language: body.language ?? "hi-IN", model: "timbre-v2.5", audio_config: { encoding: "linear_pcm", container: "wav", num_channels: 1, sample_rate: 48000, sample_width: 2 } }), signal: AbortSignal.timeout(60_000) });
    if (!upstream.ok) {
      const bodyText = await upstream.text().catch(() => "");
      let detail = bodyText;
      try { const parsed = JSON.parse(bodyText); detail = parsed.message ?? parsed.error?.message ?? parsed.detail?.message ?? bodyText; } catch { /* use the upstream response text */ }
      return NextResponse.json({ error: detail || `Speech synthesis failed (Gnani HTTP ${upstream.status}).` }, { status: upstream.status });
    }
    return new Response(upstream.body, { headers: { "Content-Type": upstream.headers.get("content-type")?.includes("audio") ? upstream.headers.get("content-type")! : "audio/wav", "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not synthesize audio." }, { status: 500 });
  }
}
