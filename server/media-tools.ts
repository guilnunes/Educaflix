import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Ferramentas locais de mídia (ffmpeg, ffprobe e outros programas de linha de comando).

export const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
export const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Roda um programa e devolve a saída. Rejeita se o programa não existir. */
export function run(
  cmd: string,
  args: string[],
  opts: { input?: string | Buffer; cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env ?? process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let timer: NodeJS.Timeout | undefined;
    if (opts.timeoutMs) timer = setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs);
    child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => err.push(d));
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') });
    });
    if (opts.input != null) child.stdin.end(opts.input);
    else child.stdin.end();
  });
}

/** Roda e lança erro com o fim do stderr se o programa falhar. */
export async function runOk(cmd: string, args: string[], opts: Parameters<typeof run>[2] = {}) {
  const res = await run(cmd, args, opts);
  if (res.code !== 0) {
    const tail = res.stderr.trim().split('\n').slice(-6).join('\n');
    throw new Error(`${path.basename(cmd)} falhou (código ${res.code}):\n${tail}`);
  }
  return res;
}

/** true se o programa existe e responde. */
export async function hasCommand(cmd: string, args = ['-version']): Promise<boolean> {
  try {
    const res = await run(cmd, args, { timeoutMs: 10000 });
    return res.code === 0;
  } catch {
    return false;
  }
}

/** Duração em segundos de um arquivo de áudio ou vídeo, via ffprobe. */
export async function probeDuration(file: string): Promise<number> {
  const res = await runOk(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  const n = Number(res.stdout.trim());
  if (!Number.isFinite(n)) throw new Error(`Não consegui ler a duração de ${path.basename(file)}.`);
  return n;
}

/** Duração de um áudio em memória. Usa o cabeçalho WAV quando dá; senão, ffprobe. */
export async function audioDuration(data: Buffer, ext: string): Promise<number> {
  if (ext === 'wav' && data.toString('ascii', 0, 4) === 'RIFF') {
    const byteRate = data.readUInt32LE(28);
    const dataIdx = data.indexOf('data', 12, 'ascii');
    if (byteRate > 0 && dataIdx > 0) return data.readUInt32LE(dataIdx + 4) / byteRate;
  }
  return withTempDir(async (dir) => {
    const file = path.join(dir, `audio.${ext}`);
    await fs.writeFile(file, data);
    return probeDuration(file);
  });
}

/** Cria uma pasta temporária, executa `fn` e apaga a pasta no fim. */
export async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'educaflix-'));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/** Estimativa de duração de fala em português (≈ 2,6 palavras por segundo). */
export function estimateSpeechSeconds(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.round((words / 2.6 + 0.8) * 10) / 10;
}
