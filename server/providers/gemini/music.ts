import { GoogleGenAI } from '@google/genai';
import type { AudioResult, MusicProvider, MusicRequest } from '../types';
import { audioDuration } from '../../media-tools';
import { env } from '../util';

/** Preço estimado por música (novembro de 2026). */
const PRICES: Record<string, number> = {
  'lyria-3-clip-preview': 0.04,
  'lyria-3-pro-preview': 0.08,
  'lyria-3.5': 0.08,
};

type GenAI = Pick<GoogleGenAI, 'models'>;

/**
 * Música com o Lyria (Google AI Studio, chave GOOGLE_API_KEY). Manda a letra
 * aprovada e o estilo; o modelo devolve o áudio (MP3) e o texto da letra.
 * O "clip" gera trechos de ~30 s, suficientes para a música do vídeo.
 */
export class LyriaMusicProvider implements MusicProvider {
  readonly provider = 'google';
  private client?: GenAI;

  constructor(
    readonly model = 'lyria-3-clip-preview',
    client?: GenAI,
  ) {
    this.client = client;
  }

  async compose(req: MusicRequest): Promise<AudioResult> {
    const ai = (this.client ??= new GoogleGenAI({ apiKey: env('GOOGLE_API_KEY') }));
    const res = await ai.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
    });
    const parts = res.candidates?.[0]?.content?.parts ?? [];
    const audio = parts.find((p) => p.inlineData?.mimeType?.startsWith('audio/') && p.inlineData.data);
    if (!audio?.inlineData?.data) throw new Error('O Lyria não devolveu áudio.');
    const mime = audio.inlineData.mimeType ?? 'audio/mpeg';
    const ext = mime.includes('wav') ? 'wav' : 'mp3';
    const data = Buffer.from(audio.inlineData.data, 'base64');
    return {
      data,
      ext,
      duration_sec: Math.round((await audioDuration(data, ext)) * 10) / 10,
      cost_usd: PRICES[this.model] ?? 0.08,
      cost_is_estimate: true,
    };
  }
}
