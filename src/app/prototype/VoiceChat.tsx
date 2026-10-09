"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { liveToken } from "./aiClient";

// Talk to Birdie out loud, like a call: real-time voice with Gemini Live. You can interrupt it
// mid-sentence, and what was said is kept as a transcript in the chat afterwards.

export type VoiceLine = { from: "me" | "bird"; text: string };
type Live = { sendRealtimeInput: (x: object) => void; sendClientContent: (x: object) => void; close: () => void };

const MAX_MS = 10 * 60_000;
// Runs on the audio thread: downsample the mic to 16 kHz 16-bit PCM in ~100 ms chunks, plus a loudness level.
const WORKLET = `class PcmOut extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.ratio = sampleRate / 16000; this.pos = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    let sum = 0;
    for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
    for (; this.pos < ch.length; this.pos += this.ratio) this.buf.push(ch[Math.floor(this.pos)]);
    this.pos -= ch.length;
    if (this.buf.length >= 1600) {
      const out = new Int16Array(this.buf.length);
      for (let i = 0; i < this.buf.length; i++) { const s = Math.max(-1, Math.min(1, this.buf[i])); out[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
      this.port.postMessage({ pcm: out.buffer, level: Math.sqrt(sum / ch.length) }, [out.buffer]);
      this.buf = [];
    }
    return true;
  }
}
registerProcessor("pcm-out", PcmOut);`;

// Audio has to be unlocked inside the tap that opens voice chat (phones block sound started later).
let primed: { mic: AudioContext; out: AudioContext } | null = null;
export function primeVoiceAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    primed = { mic: new AC(), out: new AC({ sampleRate: 24000 }) };
    void primed.out.resume(); void primed.mic.resume();
  } catch { primed = null; }
}

function toB64(buf: ArrayBuffer) {
  const b = new Uint8Array(buf); let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

export function VoiceChat({ system, title, onClose }: { system: string; title: string; onClose: (lines: VoiceLine[]) => void }) {
  const [status, setStatus] = useState<"connecting" | "listening" | "speaking" | "error">("connecting");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [lines, setLines] = useState<VoiceLine[]>([]);
  const mutedRef = useRef(false);
  const linesRef = useRef<VoiceLine[]>([]);
  const stopRef = useRef<() => void>(() => {});
  const level = useMotionValue(0);
  const smooth = useSpring(level, { stiffness: 300, damping: 25 });
  const scale = useTransform(smooth, [0, 0.25], [1, 1.35]);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => {
    let stopped = false, session: Live | null = null, stream: MediaStream | null = null, node: AudioWorkletNode | null = null;
    const ctx = primed ?? (() => { primeVoiceAudio(); return primed; })();
    primed = null;
    const out = ctx?.out, mic = ctx?.mic;
    const playing = new Set<AudioBufferSourceNode>();
    let playAt = 0, sealed = false;
    const fail = (m: string) => { if (!stopped) { setError(m); setStatus("error"); } };
    const say = (from: VoiceLine["from"], text: string) => {
      const ls = [...linesRef.current], last = ls[ls.length - 1];
      if (last && last.from === from && !sealed) ls[ls.length - 1] = { from, text: last.text + text };
      else ls.push({ from, text: text.trimStart() });
      sealed = false;
      linesRef.current = ls; setLines(ls);
    };
    const endTurn = () => { sealed = true; };
    const silence = () => { playing.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } }); playing.clear(); playAt = 0; };

    function onmessage(m: { serverContent?: { interrupted?: boolean; turnComplete?: boolean; modelTurn?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] }; inputTranscription?: { text?: string }; outputTranscription?: { text?: string } } }) {
      const sc = m.serverContent; if (!sc || !out) return;
      if (sc.interrupted) { silence(); setStatus("listening"); }
      if (sc.inputTranscription?.text) say("me", sc.inputTranscription.text);
      if (sc.outputTranscription?.text) say("bird", sc.outputTranscription.text);
      for (const p of sc.modelTurn?.parts ?? []) {
        if (!p.inlineData?.data) continue;
        const bin = atob(p.inlineData.data), n = bin.length >> 1;
        const buf = out.createBuffer(1, n, Number(/rate=(\d+)/.exec(p.inlineData.mimeType ?? "")?.[1] ?? 24000));
        const ch = buf.getChannelData(0);
        for (let i = 0; i < n; i++) { const v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); ch[i] = (v >= 0x8000 ? v - 0x10000 : v) / 0x8000; }
        const src = out.createBufferSource(); src.buffer = buf; src.connect(out.destination);
        playAt = Math.max(playAt, out.currentTime + 0.03); src.start(playAt); playAt += buf.duration;
        playing.add(src); setStatus("speaking");
        src.onended = () => { playing.delete(src); if (!playing.size && !stopped) setStatus("listening"); };
      }
      if (sc.turnComplete) endTurn();
    }

    (async () => {
      if (!out || !mic) return fail("This browser can't play live audio. Try Chrome.");
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }); }
      catch { return fail("Birdie needs your microphone. Allow it for this site in your browser settings, then try again."); }
      if (stopped) return;
      const tok = await liveToken(system);
      if (stopped) return;
      if (!tok.ok) return fail(tok.message);
      try {
        const { GoogleGenAI, Modality } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: tok.token, httpOptions: { apiVersion: "v1alpha" } });
        session = (await ai.live.connect({ model: tok.model, config: { responseModalities: [Modality.AUDIO] }, callbacks: {
          onmessage: onmessage as never,
          onerror: () => fail("The line dropped. Check your connection and try again."),
          onclose: (e: { code?: number }) => { if (!stopped && e?.code !== 1000) fail("The call ended. Tap the button to start again."); },
        } })) as unknown as Live;
        if (stopped) { session.close(); return; }
        await mic.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" })));
        node = new AudioWorkletNode(mic, "pcm-out");
        node.port.onmessage = (e: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
          if (stopped || !session) return;
          level.set(mutedRef.current ? 0 : e.data.level);
          if (!mutedRef.current) session.sendRealtimeInput({ audio: { data: toB64(e.data.pcm), mimeType: "audio/pcm;rate=16000" } });
        };
        mic.createMediaStreamSource(stream).connect(node);
        setStatus("listening");
        session.sendClientContent({ turns: [{ role: "user", parts: [{ text: "(I just opened voice chat. Say hi in one short sentence and ask what we're going over.)" }] }], turnComplete: true });
      } catch (e) { console.error("voice chat failed", e); fail("Couldn't start voice chat. Check your connection and try again."); }
    })();

    const cap = setTimeout(() => fail("That's 10 minutes. Start a new voice chat to keep going."), MAX_MS);
    stopRef.current = () => {
      stopped = true; clearTimeout(cap); silence();
      try { session?.close(); } catch { /* closed */ }
      node?.disconnect(); stream?.getTracks().forEach((t) => t.stop());
      void mic?.close().catch(() => {}); void out?.close().catch(() => {});
    };
    return () => stopRef.current();
  }, [system, level]);

  function end() { stopRef.current(); onClose(linesRef.current.map((l) => ({ ...l, text: l.text.trim() })).filter((l) => l.text)); }

  const shown = lines.slice(-2);
  const label = status === "connecting" ? "Connecting..." : status === "speaking" ? "Birdie is talking. Just speak to cut in." : status === "listening" ? (muted ? "You're muted" : "Listening...") : error;
  return (
    <motion.div className="absolute inset-0 z-[80] flex flex-col items-center bg-gradient-to-b from-[#2A1236] via-[#1B0F24] to-[#12121A] px-6 pb-10 pt-16 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="text-[13px] font-semibold text-white/60">Voice chat · {title}</div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="relative flex h-48 w-48 items-center justify-center">
          <motion.div style={{ scale: status === "listening" ? scale : 1 }} animate={status === "speaking" ? { scale: [1, 1.12, 1] } : status === "connecting" ? { opacity: [0.5, 1, 0.5] } : {}} transition={{ duration: status === "speaking" ? 0.9 : 1.4, repeat: status === "speaking" || status === "connecting" ? Infinity : 0 }}
            className={`absolute inset-0 rounded-full ${status === "error" ? "bg-white/10" : "bg-gradient-to-br from-[#D77BEA] to-[#8A2FA3] shadow-[0_0_80px_rgba(192,91,214,0.55)]"}`} />
          <span className="disp relative text-[44px] font-bold">B</span>
        </div>
        <div className="min-h-[22px] max-w-[300px] text-center text-[14px] font-semibold text-white/80">{label}</div>
        <div className="w-full max-w-[340px] space-y-2">
          {shown.map((l, i) => <div key={lines.length - shown.length + i} className={`line-clamp-3 text-center text-[13.5px] leading-snug ${l.from === "me" ? "text-white/50" : "text-white/90"}`}>{l.text}</div>)}
        </div>
      </div>
      <div className="flex items-center gap-8">
        <button onClick={() => setMuted((m) => !m)} disabled={status === "error"} aria-label={muted ? "Unmute" : "Mute"} className={`flex h-16 w-16 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-30 ${muted ? "bg-white text-[#2A1236]" : "bg-white/12 text-white"}`}>{muted ? <MicOff size={24} /> : <Mic size={24} />}</button>
        <button onClick={end} aria-label="End voice chat" className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E5484D] text-white transition active:scale-90"><PhoneOff size={24} /></button>
      </div>
    </motion.div>
  );
}
