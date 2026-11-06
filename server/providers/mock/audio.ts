import type { AudioResult, MusicProvider, MusicRequest, SpeechProvider, SpeechRequest } from '../types';

/**
 * Voz de exemplo. Não gera arquivo: o player do admin lê a narração com a voz
 * do navegador (pt-BR). Só estima a duração para montar o vídeo.
 */
export class MockSpeechProvider implements SpeechProvider {
  readonly provider = 'mock';
  constructor(readonly model = 'mock-voz-navegador') {}

  async speak(req: SpeechRequest): Promise<AudioResult> {
    const words = req.text.split(/\s+/).filter(Boolean).length;
    return {
      data: null,
      ext: null,
      duration_sec: Math.round((words / 2.6 + 0.8) * 10) / 10,
      cost_usd: 0,
      cost_is_estimate: true,
      usage: { characters: req.text.length },
    };
  }
}

/**
 * Música de exemplo: um jingle sintetizado em WAV a partir da letra
 * (uma nota por sílaba, escala pentatônica, bumbo marcando o tempo).
 */
export class MockMusicProvider implements MusicProvider {
  readonly provider = 'mock';
  constructor(readonly model = 'mock-jingle-v1') {}

  async compose(req: MusicRequest): Promise<AudioResult> {
    const bpm = Number(req.style.match(/(\d{2,3})\s*bpm/i)?.[1] ?? 120);
    const samples = synthJingle(req.lyrics, bpm, req.duration_sec);
    return {
      data: encodeWav8(samples, RATE),
      ext: 'wav',
      duration_sec: Math.round((samples.length / RATE) * 10) / 10,
      cost_usd: 0,
      cost_is_estimate: true,
      usage: { seconds: samples.length / RATE },
    };
  }
}

const RATE = 11025;
// Pentatônica de dó (C5 D5 E5 G5 A5 C6)
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

function synthJingle(lyrics: string[], bpm: number, maxSec: number): Float32Array {
  const beat = 60 / bpm;
  const notes: { f: number; d: number }[] = [];
  let seed = hash(lyrics.join('|'));
  let idx = 2;
  for (const line of lyrics) {
    const syllables = Math.max(3, (line.toLowerCase().match(/[aeiouáéíóúâêôãõà]+/g) ?? []).length);
    for (let i = 0; i < syllables; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const stepMove = (seed % 3) - 1; // -1, 0, +1
      idx = Math.max(0, Math.min(SCALE.length - 1, idx + stepMove));
      const last = i === syllables - 1;
      notes.push({ f: SCALE[last ? 0 : idx], d: last ? beat : beat / 2 });
    }
    notes.push({ f: 0, d: beat / 2 });
  }

  const total = Math.min(maxSec, notes.reduce((s, n) => s + n.d, 0) + beat);
  const out = new Float32Array(Math.ceil(total * RATE));

  // Melodia
  let t = 0;
  for (const n of notes) {
    if (t >= total) break;
    if (n.f > 0) addTone(out, t, n.d * 0.95, n.f, 0.32);
    t += n.d;
  }
  // Bumbo em cada tempo e baixo alternando dó e sol
  for (let b = 0, bt = 0; bt < total; b++, bt += beat) {
    addKick(out, bt);
    addTone(out, bt, beat * 0.9, b % 4 < 2 ? 130.81 : 98.0, 0.14, 'triangle');
  }
  return out;
}

function addTone(buf: Float32Array, start: number, dur: number, f: number, amp: number, wave: 'mix' | 'triangle' = 'mix') {
  const s0 = Math.floor(start * RATE);
  const len = Math.floor(dur * RATE);
  for (let i = 0; i < len && s0 + i < buf.length; i++) {
    const tt = i / RATE;
    const env = Math.min(1, tt / 0.005) * Math.exp(-3 * (tt / dur));
    const ph = 2 * Math.PI * f * tt;
    const v =
      wave === 'triangle'
        ? (2 / Math.PI) * Math.asin(Math.sin(ph))
        : 0.7 * Math.sin(ph) + 0.3 * Math.sign(Math.sin(ph));
    buf[s0 + i] += amp * env * v;
  }
}

function addKick(buf: Float32Array, start: number) {
  const s0 = Math.floor(start * RATE);
  const len = Math.floor(0.12 * RATE);
  let ph = 0;
  for (let i = 0; i < len && s0 + i < buf.length; i++) {
    const tt = i / RATE;
    const f = 120 - 70 * (tt / 0.12);
    ph += (2 * Math.PI * f) / RATE;
    buf[s0 + i] += 0.45 * Math.exp(-tt * 30) * Math.sin(ph);
  }
}

function encodeWav8(samples: Float32Array, rate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + samples.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate, 28); // byte rate
  header.writeUInt16LE(1, 32); // block align
  header.writeUInt16LE(8, 34); // bits
  header.write('data', 36);
  header.writeUInt32LE(samples.length, 40);
  const data = Buffer.alloc(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data[i] = Math.round((v * 0.95 + 1) * 127.5);
  }
  return Buffer.concat([header, data]);
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
