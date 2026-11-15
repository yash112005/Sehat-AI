import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const key = process.env.GNANI_API_KEY;
  if (!key) return NextResponse.json({ error: "GNANI_API_KEY is not configured." }, { status: 503 });
  try {
    const incoming = await request.formData();
    const audio = incoming.get("audio") ?? incoming.get("file");
    if (!(audio instanceof File)) return NextResponse.json({ error: "Upload an audio file in the 'audio' field." }, { status: 400 });
    if (audio.size === 0) return NextResponse.json({ error: "The audio recording is empty." }, { status: 400 });
    if (audio.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Audio must be under 20 MB." }, { status: 413 });
    const allowedTypes = new Set(["audio/mpeg", "audio/mp3", "audio/flac", "audio/aac", "audio/mp4", "audio/x-m4a", "audio/ogg", "audio/wav", "audio/x-wav", "audio/webm"]);
    const normalizedType = audio.type.toLowerCase().split(";")[0];
    if (normalizedType && !allowedTypes.has(normalizedType)) return NextResponse.json({ error: `Unsupported audio format (${normalizedType}). Please upload MP3, FLAC, AAC, M4A, OGG, or WAV.` }, { status: 415 });
    // MediaRecorder commonly returns WebM/Opus, which Prisma v2.5 rejects.
    // Convert it to WAV with ffmpeg when available; otherwise return a clear supported-format message.
    let uploadAudio: File = audio;
    const isWebm = normalizedType === "audio/webm" || audio.name.toLowerCase().endsWith(".webm");
    if (isWebm) {
      try {
        const { spawn } = await import("node:child_process");
        const { mkdtemp, readFile, rm, writeFile } = await import("node:fs/promises");
        const { tmpdir } = await import("node:os");
        const { join } = await import("node:path");
        const folder = await mkdtemp(join(tmpdir(), "sehat-audio-"));
        const inputPath = join(folder, "recording.webm"); const outputPath = join(folder, "recording.wav");
        try {
          await writeFile(inputPath, Buffer.from(await audio.arrayBuffer()));
          await new Promise<void>((resolve, reject) => {
            const ffmpeg = spawn("ffmpeg", ["-y", "-v", "error", "-i", inputPath, "-ac", "1", "-ar", "16000", outputPath]);
            let stderr = ""; ffmpeg.stderr.on("data", chunk => { stderr += chunk.toString(); });
            ffmpeg.on("error", reject); ffmpeg.on("close", code => code === 0 ? resolve() : reject(new Error(stderr || "Audio conversion failed.")));
          });
          uploadAudio = new File([await readFile(outputPath)], "recording.wav", { type: "audio/wav" });
        } finally { await rm(folder, { recursive: true, force: true }); }
      } catch (error) {
        const unavailable = error instanceof Error && ("code" in error) && (error as NodeJS.ErrnoException).code === "ENOENT";
        if (unavailable) return NextResponse.json({ error: "This browser recorded WebM audio, which Prisma does not accept. Install ffmpeg on the server or upload MP3, FLAC, AAC, M4A, OGG, or WAV." }, { status: 415 });
        return NextResponse.json({ error: "Could not convert the recording to a supported WAV format. Try uploading MP3, M4A, OGG, or WAV." }, { status: 415 });
      }
    }
    const upstreamForm = new FormData();
    upstreamForm.append("audio_file", uploadAudio, uploadAudio.name || "recording.wav");
    upstreamForm.append("model", "prisma-v2.5");
    // Prisma v2.5 accepts one language; automatic Indic detection is a v3 feature.
    upstreamForm.append("language_code", "hi-IN");
    const upstream = await fetch("https://api.vachana.ai/stt/v3", { method: "POST", headers: { "X-API-Key-ID": key }, body: upstreamForm, signal: AbortSignal.timeout(60_000) });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = payload?.error?.message ?? payload?.message ?? payload?.detail?.message ?? payload?.detail?.error_code;
      return NextResponse.json({ error: detail ?? `Speech recognition failed (Gnani HTTP ${upstream.status}).` }, { status: upstream.status });
    }
    const transcript = payload.transcript ?? payload.text ?? payload.result?.transcript ?? payload.data?.transcript;
    if (typeof transcript !== "string") return NextResponse.json({ error: "Speech API returned an unexpected response." }, { status: 502 });
    return NextResponse.json({ transcript });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not process audio." }, { status: 500 });
  }
}
