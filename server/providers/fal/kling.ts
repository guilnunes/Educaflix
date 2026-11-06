import { createFalClient, type FalClient } from '@fal-ai/client';
import type { SceneAnimator } from '../ffmpeg/video';
import type { VideoSceneInput } from '../types';
import { download, env } from '../util';

type Client = Pick<FalClient, 'subscribe' | 'storage'>;

const PRICE_PER_SECOND = 0.084;
const CLIP_SECONDS = 5;

/**
 * Anima algumas cenas com o Kling (imagem para vídeo) no fal.ai (chave FAL_KEY).
 * Só as cenas principais, para o custo ficar baixo; as outras seguem com a imagem
 * parada e movimento de câmera.
 */
export class KlingAnimator implements SceneAnimator {
  readonly label = 'Kling';
  private client?: Client;

  constructor(
    private readonly model = process.env.FAL_KLING_MODEL || 'fal-ai/kling-video/v3/standard/image-to-video',
    private readonly maxScenes = Number(process.env.KLING_SCENES || 3),
    client?: Client,
  ) {
    this.client = client;
  }

  /** Abertura e cenas espalhadas pelo vídeo, fora a da música. */
  pick(scenes: VideoSceneInput[]): number[] {
    const candidates = scenes.map((s, i) => ({ s, i })).filter(({ s }) => !s.is_song).map(({ i }) => i);
    if (candidates.length <= this.maxScenes) return candidates;
    const out = new Set<number>();
    for (let k = 0; k < this.maxScenes; k++) out.add(candidates[Math.round((k * (candidates.length - 1)) / Math.max(1, this.maxScenes - 1))]);
    return [...out];
  }

  async animate(image: Buffer, _scene: VideoSceneInput, prompt: string) {
    const client = (this.client ??= createFalClient({ credentials: env('FAL_KEY') }));
    const imageUrl = await client.storage.upload(new Blob([new Uint8Array(image)], { type: 'image/png' }));
    const res = await client.subscribe(this.model, {
      input: {
        prompt: `${prompt}\nAnimação 2D infantil, movimento suave dos personagens, câmera estável.`,
        image_url: imageUrl,
        duration: String(CLIP_SECONDS),
        negative_prompt: 'texto distorcido, deformação, terror',
      },
    });
    const url = (res.data as { video?: { url: string } }).video?.url;
    if (!url) throw new Error('O Kling não devolveu vídeo.');
    return { video: await download(url), cost_usd: PRICE_PER_SECOND * CLIP_SECONDS };
  }
}
