import type { ScriptScene, Subject } from '../../../shared/types';
import type { ImageProvider, ImageRequest, ImageResult } from '../types';

/**
 * Provedor de imagem de exemplo: desenha cada cena do storyboard em SVG,
 * com o personagem da matéria, os objetos da cena e a descrição visual.
 * Não chama nenhuma IA.
 */
export class MockImageProvider implements ImageProvider {
  readonly provider = 'mock';
  constructor(readonly model = 'mock-svg-v1') {}

  async generateImage(req: ImageRequest): Promise<ImageResult> {
    const svg = drawScene(req);
    return { data: Buffer.from(svg, 'utf8'), ext: 'svg', cost_usd: 0, cost_is_estimate: true, usage: { images: 1 } };
  }
}

const PALETTES = [
  { sky: '#e8f1ff', ground: '#cfe9c8', accents: ['#ff8a3d', '#ffc83d', '#4cc38a', '#e85d75', '#7b6cf6'] },
  { sky: '#fff3e2', ground: '#f2dfb8', accents: ['#e85d75', '#2fa3d6', '#ffc83d', '#4cc38a', '#ff8a3d'] },
];

function drawScene(req: ImageRequest): string {
  const { scene, script, subject, width: W, height: H } = req;
  const pal = PALETTES[(req.version - 1) % PALETTES.length];
  const guest = script.characters.find(
    (c) => c.role === 'pessoa citada' && mentions(scene, c.name),
  );
  const count = pickCount(scene);
  const parts: string[] = [];

  parts.push(`<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${pal.sky}"/><stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  parts.push(`<rect x="0" y="470" width="${W}" height="${H - 470}" fill="${pal.ground}"/>`);
  parts.push(decorations(scene, pal.accents));

  // Selo da cena e título
  parts.push(`<rect x="32" y="28" rx="22" width="128" height="44" fill="${subject.color}"/>`);
  parts.push(text(96, 58, `Cena ${scene.number}`, { size: 24, weight: 700, fill: '#fff', anchor: 'middle' }));
  parts.push(text(180, 60, scene.title, { size: 32, weight: 700, fill: '#1d2433' }));

  // Texto na tela, num quadro
  if (scene.on_screen_text) {
    const t = scene.on_screen_text.length > 34 ? scene.on_screen_text.slice(0, 33) + '…' : scene.on_screen_text;
    const size = t.length > 22 ? 34 : 52;
    parts.push(`<rect x="560" y="100" rx="18" width="680" height="110" fill="#264a3d" stroke="#8a6a3b" stroke-width="10"/>`);
    parts.push(text(900, 155 + size / 3, t, { size, weight: 700, fill: '#ffffff', anchor: 'middle' }));
  }

  parts.push(mascot(subject, scene, 270, 420));
  if (guest) parts.push(person(1080, 455, guest.name, pal.accents[1]));
  parts.push(objects(count, guest ? 560 : 620, guest ? 940 : 1200, 300, scene, pal.accents));

  // Legenda com a descrição visual
  const lines = wrap(scene.visual, 92).slice(0, 3);
  parts.push(`<rect x="32" y="${H - 150}" rx="16" width="${W - 64}" height="126" fill="#ffffff" stroke="#d5dbe6" stroke-width="2"/>`);
  lines.forEach((line, i) =>
    parts.push(text(56, H - 112 + i * 32, line, { size: 22, fill: '#2b3445' })),
  );
  parts.push(text(W - 40, H - 6, 'storyboard de exemplo (mock)', { size: 14, fill: '#8892a6', anchor: 'end' }));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'Baloo 2', 'Nunito', 'Trebuchet MS', 'Segoe UI', sans-serif">\n${parts.join('\n')}\n</svg>\n`;
}

/** O mascote. Em Matemática, o Nico é o número da cena com olhos e sorriso. */
function mascot(subject: Subject, scene: ScriptScene, cx: number, baseY: number) {
  const out: string[] = [];
  out.push(`<ellipse cx="${cx}" cy="${baseY + 18}" rx="120" ry="16" fill="#000" opacity="0.12"/>`);
  if (subject.id === 'matematica') {
    const n = pickNumber(scene) ?? 1;
    const label = String(n);
    const size = label.length >= 3 ? 170 : label.length === 2 ? 220 : 300;
    out.push(
      `<text x="${cx}" y="${baseY}" font-size="${size}" font-weight="900" text-anchor="middle" fill="${subject.color}" stroke="#ffffff" stroke-width="12" paint-order="stroke" stroke-linejoin="round">${label}</text>`,
    );
    const eyeY = baseY - size * 0.55;
    out.push(eye(cx - 30, eyeY), eye(cx + 30, eyeY));
    out.push(`<path d="M ${cx - 26} ${eyeY + 46} Q ${cx} ${eyeY + 72} ${cx + 26} ${eyeY + 46}" stroke="#1d2433" stroke-width="7" fill="none" stroke-linecap="round"/>`);
  } else {
    out.push(`<rect x="${cx - 95}" y="${baseY - 230}" rx="48" width="190" height="230" fill="${subject.color}" stroke="#fff" stroke-width="10"/>`);
    out.push(eye(cx - 34, baseY - 150), eye(cx + 34, baseY - 150));
    out.push(`<path d="M ${cx - 30} ${baseY - 100} Q ${cx} ${baseY - 74} ${cx + 30} ${baseY - 100}" stroke="#1d2433" stroke-width="7" fill="none" stroke-linecap="round"/>`);
  }
  out.push(text(cx, baseY + 52, subject.character_name, { size: 22, weight: 700, fill: '#1d2433', anchor: 'middle' }));
  return out.join('\n');
}

function eye(x: number, y: number) {
  return `<circle cx="${x}" cy="${y}" r="22" fill="#fff" stroke="#1d2433" stroke-width="4"/><circle cx="${x + 4}" cy="${y + 3}" r="10" fill="#1d2433"/>`;
}

/** Personagem convidado (pessoa citada no tema). */
function person(cx: number, baseY: number, name: string, color: string) {
  return [
    `<ellipse cx="${cx}" cy="${baseY + 10}" rx="70" ry="12" fill="#000" opacity="0.12"/>`,
    `<rect x="${cx - 55}" y="${baseY - 150}" rx="30" width="110" height="150" fill="${color}"/>`,
    `<circle cx="${cx}" cy="${baseY - 195}" r="55" fill="#f2c7a5"/>`,
    `<path d="M ${cx - 58} ${baseY - 205} Q ${cx - 40} ${baseY - 268} ${cx} ${baseY - 255} Q ${cx + 45} ${baseY - 272} ${cx + 58} ${baseY - 205} Q ${cx + 20} ${baseY - 235} ${cx - 58} ${baseY - 205} Z" fill="#5a3b2a"/>`,
    `<circle cx="${cx - 18}" cy="${baseY - 195}" r="6" fill="#1d2433"/><circle cx="${cx + 18}" cy="${baseY - 195}" r="6" fill="#1d2433"/>`,
    `<path d="M ${cx - 16} ${baseY - 172} Q ${cx} ${baseY - 160} ${cx + 16} ${baseY - 172}" stroke="#1d2433" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<rect x="${cx - 95}" y="${baseY + 24}" rx="12" width="190" height="34" fill="#ffffff" stroke="#d5dbe6"/>`,
    text(cx, baseY + 48, shorten(name, 18), { size: 18, weight: 700, fill: '#1d2433', anchor: 'middle' }),
  ].join('\n');
}

/** Desenha N objetos da cena (frutas, bolinhas...), até 10. */
function objects(count: number, x0: number, x1: number, y0: number, scene: ScriptScene, colors: string[]) {
  const n = Math.max(1, Math.min(count, 10));
  const perRow = n > 5 ? 5 : n;
  const rows = Math.ceil(n / perRow);
  const step = Math.min(110, (x1 - x0) / perRow);
  const kind = objectKind(scene);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    const x = x0 + step / 2 + c * step;
    const y = y0 + r * 110 + (rows === 1 ? 55 : 0);
    const color = colors[i % colors.length];
    if (kind === 'banana') {
      out.push(`<path d="M ${x - 36} ${y - 10} Q ${x} ${y + 40} ${x + 36} ${y - 10} Q ${x} ${y + 18} ${x - 36} ${y - 10} Z" fill="#ffd23f" stroke="#c99a12" stroke-width="3"/>`);
    } else if (kind === 'fruit') {
      out.push(`<circle cx="${x}" cy="${y}" r="34" fill="#ffa53d" stroke="#d17a12" stroke-width="3"/><path d="M ${x} ${y - 34} q 8 -16 20 -14" stroke="#3a8f3a" stroke-width="5" fill="none"/>`);
    } else if (kind === 'star') {
      out.push(`<path d="${starPath(x, y, 36, 16)}" fill="${color}" stroke="#ffffff" stroke-width="3"/>`);
    } else {
      out.push(`<circle cx="${x}" cy="${y}" r="32" fill="${color}"/><circle cx="${x - 10}" cy="${y - 10}" r="9" fill="#fff" opacity="0.6"/>`);
    }
    out.push(text(x, y + 62, String(i + 1), { size: 20, weight: 700, fill: '#4a5568', anchor: 'middle' }));
  }
  return out.join('\n');
}

function decorations(scene: ScriptScene, colors: string[]) {
  if (!scene.is_song) {
    return [80, 300, 520, 1180].map((x, i) => `<path d="${starPath(x, 130 + (i % 2) * 50, 10, 4)}" fill="${colors[i % colors.length]}" opacity="0.5"/>`).join('');
  }
  return [140, 420, 700, 980, 1180]
    .map((x, i) => text(x, 160 + (i % 2) * 70, i % 2 ? '♫' : '♪', { size: 64, fill: colors[i % colors.length] }))
    .join('');
}

function starPath(cx: number, cy: number, R: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

function objectKind(scene: ScriptScene) {
  const s = `${scene.visual} ${scene.narration}`.toLowerCase();
  if (s.includes('banana')) return 'banana';
  if (/(manga|laranja|fruta|maçã)/.test(s)) return 'fruit';
  if (/(bolinha|tampinha|bola)/.test(s)) return 'ball';
  return 'star';
}

function mentions(scene: ScriptScene, name: string) {
  const s = `${scene.title} ${scene.visual} ${scene.narration}`;
  return s.includes(name) || s.includes(name.split(' ')[0]);
}

function pickNumber(scene: ScriptScene): number | null {
  const src = `${scene.on_screen_text ?? ''} ${scene.visual}`;
  const m = src.match(/\d+/g);
  if (!m) return null;
  // O resultado costuma ser o último número da cena (ex.: "2 + 3 = 5").
  return Math.min(Number(m[m.length - 1]), 100);
}

function pickCount(scene: ScriptScene) {
  const n = pickNumber(scene);
  return n && n <= 10 ? n : 3;
}

function wrap(s: string, max: number) {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function shorten(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function text(
  x: number,
  y: number,
  value: string,
  o: { size: number; weight?: number; fill: string; anchor?: 'start' | 'middle' | 'end' },
) {
  return `<text x="${x}" y="${y}" font-size="${o.size}" font-weight="${o.weight ?? 400}" fill="${o.fill}" text-anchor="${o.anchor ?? 'start'}">${esc(value)}</text>`;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
