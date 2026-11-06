import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { AudioResult, MusicProvider, MusicRequest } from '../types';
import { audioDuration } from '../../media-tools';
import { env, round6, streamToBuffer } from '../util';

type Client = Pick<ElevenLabsClient, 'music'>;

/** Estilos em inglês (a API funciona melhor assim) para música infantil. */
const BASE_STYLES = [
  "children's song",
  'Brazilian Portuguese vocals',
  'cheerful kids choir',
  'catchy singalong chorus',
  'simple melody',
  'upbeat',
  'great production quality',
];
const NEGATIVE = ['explicit lyrics', 'scary', 'aggressive', 'heavy distortion'];

/**
 * Música com a ElevenLabs Music (chave ELEVENLABS_API_KEY, planos pagos).
 * Monta um plano de composição com uma parte por trecho da letra aprovada.
 */
export class ElevenLabsMusicProvider implements MusicProvider {
  readonly provider = 'elevenlabs';
  private client?: Client;

  constructor(
    readonly model: 'music_v2_5' | 'music_v2' | 'music_v1' = 'music_v2_5',
    client?: Client,
  ) {
    this.client = client;
  }

  async compose(req: MusicRequest): Promise<AudioResult> {
    const client = (this.client ??= new ElevenLabsClient({ apiKey: env('ELEVENLABS_API_KEY') }));
    const bpm = req.style.match(/(\d{2,3})\s*bpm/i)?.[1];
    const styles = bpm ? [...BASE_STYLES, `${bpm} bpm`] : BASE_STYLES;
    const parts = req.parts.length ? req.parts : [{ label: 'Refrão', lines: req.lyrics }];
    const chunks = parts.map((p, i) => ({
      text: `[${p.label}]\n${p.lines.join('\n')}`,
      durationMs: Math.min(120000, Math.max(3000, p.lines.length * 3500)),
      positiveStyles: i === 0 ? styles : ['same song', 'children vocals'],
      negativeStyles: NEGATIVE,
    }));
    const stream = await client.music.compose({ compositionPlan: { chunks }, modelId: this.model });
    const data = await streamToBuffer(stream);
    const seconds = await audioDuration(data, 'mp3');
    return {
      data,
      ext: 'mp3',
      duration_sec: Math.round(seconds * 10) / 10,
      cost_usd: round6((seconds / 60) * 0.15),
      cost_is_estimate: true,
      usage: { seconds },
    };
  }
}
