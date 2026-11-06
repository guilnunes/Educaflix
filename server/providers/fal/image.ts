import { createFalClient, type FalClient } from '@fal-ai/client';
import type { ImageProvider, ImageRequest, ImageResult } from '../types';
import { download, env } from '../util';

/** Preço estimado por imagem de ~1 megapixel (novembro de 2026). */
const PRICES: Record<string, number> = {
  'fal-ai/flux-2/klein/4b': 0.003,
  'fal-ai/flux-2/klein/9b': 0.006,
};

type Client = Pick<FalClient, 'subscribe'>;

/** Imagens com FLUX.2 Klein no fal.ai (chave FAL_KEY). Barato, pesos abertos. */
export class FalFluxImageProvider implements ImageProvider {
  readonly provider = 'fal';
  private client?: Client;

  constructor(
    readonly model = 'fal-ai/flux-2/klein/4b',
    client?: Client,
  ) {
    this.client = client;
  }

  async generateImage(req: ImageRequest): Promise<ImageResult> {
    const client = (this.client ??= createFalClient({ credentials: env('FAL_KEY') }));
    const res = await client.subscribe(this.model, {
      input: { prompt: req.prompt, image_size: 'landscape_16_9', num_images: 1, output_format: 'png' },
    });
    const url = (res.data as { images?: { url: string }[] }).images?.[0]?.url;
    if (!url) throw new Error('O fal não devolveu imagem.');
    return {
      data: await download(url),
      ext: 'png',
      cost_usd: PRICES[this.model] ?? 0.006,
      cost_is_estimate: true,
      usage: { images: 1 },
    };
  }
}
