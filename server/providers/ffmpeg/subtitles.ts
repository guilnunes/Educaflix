// Gera a legenda em WebVTT a partir das cenas do vídeo.

export interface CueScene {
  start: number;
  end: number;
  /** Texto falado na cena. */
  text: string;
  /** Linhas da letra, na cena da música. */
  lines?: string[];
  /** Quanto tempo a fala (ou música) dura dentro da cena. */
  speechSec: number;
}

const MAX_LINE = 42;

export function buildVtt(scenes: CueScene[]): string {
  const cues: { start: number; end: number; text: string }[] = [];
  for (const s of scenes) {
    const span = Math.max(1, Math.min(s.speechSec || s.end - s.start, s.end - s.start));
    const chunks = s.lines?.length ? pairLines(s.lines) : splitText(s.text);
    const total = chunks.reduce((n, c) => n + c.length, 0) || 1;
    let t = s.start;
    chunks.forEach((c, i) => {
      const last = i === chunks.length - 1;
      const len = (c.length / total) * span;
      const end = last ? Math.min(s.end, s.start + span + 0.4) : t + len;
      cues.push({ start: t, end, text: wrap(c) });
      t = end;
    });
  }
  return (
    'WEBVTT\n\n' +
    cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n')
  );
}

/** Quebra a fala em frases de até duas linhas de legenda. */
function splitText(text: string): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*/g) ?? [text];
  const out: string[] = [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length <= MAX_LINE * 2) {
      out.push(s);
      continue;
    }
    // Frase longa: divide por vírgulas ou palavras.
    let cur = '';
    for (const w of s.split(' ')) {
      if ((cur + ' ' + w).trim().length > MAX_LINE * 2) {
        out.push(cur.trim());
        cur = w;
      } else cur = `${cur} ${w}`;
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out;
}

function pairLines(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 2) out.push(lines.slice(i, i + 2).join('\n'));
  return out;
}

function wrap(text: string): string {
  if (text.includes('\n') || text.length <= MAX_LINE) return text;
  const words = text.split(' ');
  let best = text;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (a.length <= MAX_LINE + 6 && b.length <= MAX_LINE + 6 && diff < bestDiff) {
      best = `${a}\n${b}`;
      bestDiff = diff;
    }
  }
  return best;
}

function stamp(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`;
}
