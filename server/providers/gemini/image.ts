import { GoogleGenAI } from '@google/genai';
import type { ImageProvider, ImageRequest, ImageResult } from '../types';
import { env } from '../util';

/** Preço estimado por imagem de ~1K (novembro de 2026). */
const PRICES: Record<string, number> = {
  'gemini-3.1-flash-image': 0.067,
  'gemini-3.1-flash-lite-image': 0.034,
};

type GenAI = Pick<GoogleGenAI, 'models'>;

/**
 * Imagens com o Gemini Flash Image (Google AI Studio, chave GOOGLE_API_KEY).
 * Aceita imagens de referência: o fluxo manda a primeira cena gerada como
 * referência das seguintes, para o personagem continuar igual.
 */
export class GeminiImageProvider implements ImageProvider {
  readonly provider = 'google';
  readonly supportsReferences = true;
  private client?: GenAI;

  constructor(
    readonly model = 'gemini-3.1-flash-image',
    client?: GenAI,
  ) {
    this.client = client;
  }

  async generateImage(req: ImageRequest): Promise<ImageResult> {
    const ai = (this.client ??= new GoogleGenAI({ apiKey: env('GOOGLE_API_KEY') }));
    const refs = req.references ?? [];
    const text = refs.length
      ? `${req.prompt}\n\nUse a imagem anexada como referência: mesmo personagem, mesmas cores e mesmo estilo.`
      : req.prompt;
    const res = await ai.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [{ text }, ...refs.map((r) => ({ inlineData: { mimeType: r.mime, data: r.data.toString('base64') } }))],
        },
      ],
      config: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
    });
    const candidate = res.candidates?.[0];
    const part = candidate?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) {
      throw new Error(`O Gemini não devolveu imagem${candidate?.finishReason ? ` (motivo: ${candidate.finishReason})` : ''}.`);
    }
    const mime = part.inlineData.mimeType ?? 'image/png';
    return {
      data: Buffer.from(part.inlineData.data, 'base64'),
      ext: mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png',
      cost_usd: PRICES[this.model] ?? PRICES['gemini-3.1-flash-image'],
      cost_is_estimate: true,
      usage: { images: 1 },
    };
  }
}
