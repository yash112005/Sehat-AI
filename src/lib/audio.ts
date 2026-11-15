export function preferredRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const supported = ["audio/mp4", "audio/aac", "audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/webm"];
  return supported.find(type => MediaRecorder.isTypeSupported(type)) ?? "";
}

function wavBlob(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2); const view = new DataView(buffer);
  const write = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  write(0,"RIFF"); view.setUint32(4,36+samples.length*2,true); write(8,"WAVE"); write(12,"fmt "); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); write(36,"data"); view.setUint32(40,samples.length*2,true);
  let offset=44; for (const sample of samples) { const value=Math.max(-1,Math.min(1,sample)); view.setInt16(offset,value<0?value*0x8000:value*0x7fff,true); offset+=2; }
  return new Blob([buffer],{type:"audio/wav"});
}

/** Turns MediaRecorder WebM/MP4 into a standards-compliant mono PCM WAV using the browser decoder. */
export async function toPrismaAudio(blob: Blob, filename = "recording") {
  const type = blob.type.toLowerCase();
  if (type.includes("wav") || type.includes("mpeg") || type.includes("mp3") || type.includes("flac") || type.includes("aac") || type.includes("ogg")) {
    const ext = type.includes("wav") ? "wav" : type.includes("mpeg") || type.includes("mp3") ? "mp3" : type.includes("flac") ? "flac" : type.includes("aac") ? "aac" : "ogg";
    return new File([blob], `${filename}.${ext}`, { type: blob.type || `audio/${ext}` });
  }
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const sourceRate = decoded.sampleRate; const targetRate = 16000; const targetLength = Math.ceil(decoded.length * targetRate / sourceRate);
    const mono = new Float32Array(targetLength); const channels = Array.from({length:decoded.numberOfChannels}, (_, index) => decoded.getChannelData(index));
    for(let i=0;i<targetLength;i++){const start=Math.floor(i*sourceRate/targetRate);const end=Math.min(decoded.length,Math.ceil((i+1)*sourceRate/targetRate));let sum=0,count=0;for(let j=start;j<end;j++){for(const channel of channels)sum+=channel[j];count+=channels.length;}mono[i]=count?sum/count:0;}
    return new File([wavBlob(mono,targetRate)],`${filename}.wav`,{type:"audio/wav"});
  } catch { throw new Error("Could not decode this browser recording. Try another browser or upload an MP3, M4A, OGG, or WAV file."); }
  finally { await context.close(); }
}
