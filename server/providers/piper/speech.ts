import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AudioResult, SpeechProvider, SpeechRequest } from '../types';
import { FFMPEG, audioDuration, run, withTempDir } from '../../media-tools';

/** Piper instalado por "npm run setup:piper" (em .cache/) ou no PATH. */
export function piperBin() {
  if (process.env.PIPER_BIN) return process.env.PIPER_BIN;
  const local = path.resolve('.cache/piper-venv/bin/piper');
  return existsSync(local) ? local : 'piper';
}

/**
 * Voz local e gratuita com o Piper (roda na CPU, sem internet depois de baixar a voz).
 * Instalação: veja o README ("Voz local com Piper").
 */
export class PiperSpeechProvider implements SpeechProvider {
  readonly provider = 'piper';

  constructor(
    readonly model = 'pt_BR-faber-medium',
    private readonly bin = piperBin(),
    private readonly dataDir = process.env.PIPER_DATA_DIR || path.resolve('.cache/piper'),
    private readonly lengthScale = process.env.PIPER_LENGTH_SCALE || '1.1',
  ) {}

  async speak(req: SpeechRequest): Promise<AudioResult> {
    return withTempDir(async (dir) => {
      const out = path.join(dir, 'fala.wav');
      let res;
      try {
        res = await run(
          this.bin,
          ['-m', this.model, '--data-dir', this.dataDir, '-f', out, '--length-scale', this.lengthScale, '--sentence-silence', '0.3'],
          { input: req.text, timeoutMs: 5 * 60 * 1000 },
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error('Piper não encontrado. Rode "npm run setup:piper" (veja o README).');
        }
        throw e;
      }
      if (res.code !== 0) throw new Error(`Piper falhou: ${res.stderr.trim().split('\n').slice(-3).join(' ')}`);
      const wav = await fs.readFile(out);
      const duration = Math.round((await audioDuration(wav, 'wav')) * 100) / 100;
      // MP3 ocupa ~10 vezes menos que WAV no repositório; sem ffmpeg, fica em WAV.
      const mp3 = path.join(dir, 'fala.mp3');
      const conv = await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', out, '-ac', '1', '-b:a', '64k', mp3]).catch(() => null);
      const asMp3 = conv?.code === 0;
      return {
        data: asMp3 ? await fs.readFile(mp3) : wav,
        ext: asMp3 ? 'mp3' : 'wav',
        duration_sec: duration,
        cost_usd: 0,
        cost_is_estimate: false,
        usage: { characters: req.text.length },
      };
    });
  }
}
