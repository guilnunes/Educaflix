import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { VideoProvider, VideoRequest, VideoResult, VideoSceneInput } from '../types';
import { FFMPEG, probeDuration, runOk, withTempDir } from '../../media-tools';
import { buildVtt, type CueScene } from './subtitles';

/** Anima uma cena a partir da imagem (ex.: Kling). Devolve um MP4 ou null para manter a imagem parada. */
export interface SceneAnimator {
  readonly label: string;
  /** Quais cenas animar (índices em `scenes`). */
  pick(scenes: VideoSceneInput[]): number[];
  animate(image: Buffer, scene: VideoSceneInput, prompt: string): Promise<{ video: Buffer; cost_usd: number }>;
}

const W = 1280;
const H = 720;
const FPS = 25;

/**
 * Monta o vídeo final na máquina, de graça: cada imagem do storyboard vira uma
 * cena com movimento suave de câmera, com a narração por cima; na cena da música
 * toca a música. Gera um MP4 e a legenda em WebVTT (também embutida no MP4).
 * Opcionalmente anima algumas cenas com um modelo de vídeo (`animator`).
 */
export class FfmpegVideoProvider implements VideoProvider {
  readonly provider: string;

  constructor(
    readonly model = 'montagem-local-v1',
    private readonly animator?: SceneAnimator,
    provider = 'ffmpeg',
  ) {
    this.provider = provider;
  }

  async render(req: VideoRequest): Promise<VideoResult> {
    return withTempDir(async (dir) => {
      const musicAbs = req.music_path ? req.resolve(req.music_path) : null;
      const musicDur = musicAbs ? await probeDuration(musicAbs) : 0;
      const animated = new Set(this.animator?.pick(req.scenes) ?? []);
      let animationCost = 0;

      const clips: string[] = [];
      const cueScenes: CueScene[] = [];
      let t = 0;

      for (const [i, scene] of req.scenes.entries()) {
        const png = path.join(dir, `cena-${i}.png`);
        await toFramePng(req.resolve(scene.image_path), png);

        const narrationAbs = scene.narration_audio_path ? req.resolve(scene.narration_audio_path) : null;
        const useMusic = scene.is_song && musicAbs;
        const audio = useMusic ? musicAbs : narrationAbs;
        const audioDur = useMusic ? musicDur : narrationAbs ? scene.narration_duration_sec : 0;
        const dur = round2(Math.max(audio ? audioDur + 0.8 : scene.duration_sec, 4));

        let animation: string | null = null;
        if (this.animator && animated.has(i)) {
          const res = await this.animator.animate(await fs.readFile(png), scene, `${scene.title}. ${scene.narration}`);
          animation = path.join(dir, `anim-${i}.mp4`);
          await fs.writeFile(animation, res.video);
          animationCost += res.cost_usd;
        }

        const clip = path.join(dir, `clip-${i}.mp4`);
        await renderClip({ png, animation, audio, dur, out: clip });
        clips.push(clip);
        cueScenes.push({
          start: t,
          end: t + dur,
          text: scene.is_song ? req.song_lines.join(' ') : scene.narration,
          lines: scene.is_song ? req.song_lines : undefined,
          speechSec: audio ? audioDur : dur,
        });
        t += dur;
      }

      const vtt = buildVtt(cueScenes);
      const vttFile = path.join(dir, 'legenda.vtt');
      await fs.writeFile(vttFile, vtt, 'utf8');

      const list = path.join(dir, 'clips.txt');
      await fs.writeFile(list, clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join('\n'));
      const out = path.join(dir, 'video.mp4');
      await runOk(FFMPEG, [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'concat', '-safe', '0', '-i', list,
        '-i', vttFile,
        '-map', '0:v', '-map', '0:a', '-map', '1:s',
        '-c:v', 'copy', '-c:a', 'copy', '-c:s', 'mov_text',
        '-metadata:s:s:0', 'language=por',
        '-movflags', '+faststart',
        out,
      ]);

      return {
        format: 'mp4',
        main: { name: 'video.mp4', data: await fs.readFile(out) },
        subtitles: { name: 'legenda.vtt', data: vtt },
        duration_sec: round2(t),
        cost_usd: animationCost,
        cost_is_estimate: true,
        usage: { seconds: round2(t) },
        detail: animated.size ? `${animated.size} cena(s) animada(s) com ${this.animator!.label}` : undefined,
      };
    });
  }
}

/** Converte a imagem da cena (SVG, PNG, JPG ou WebP) para PNG 1280x720. */
async function toFramePng(src: string, out: string) {
  const isSvg = src.toLowerCase().endsWith('.svg');
  await sharp(src, isSvg ? { density: 144 } : {})
    .resize(W, H, { fit: 'cover' })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(out);
}

async function renderClip(o: { png: string; animation: string | null; audio: string | null; dur: number; out: string }) {
  const inputs: string[] = [];
  let videoFilter: string;
  if (o.animation) {
    inputs.push('-i', o.animation);
    videoFilter = `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},tpad=stop_mode=clone:stop_duration=${o.dur},format=yuv420p[v]`;
  } else {
    // Movimento suave de câmera (zoom lento) sobre a imagem parada.
    const frames = Math.ceil(o.dur * FPS);
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', String(o.dur), '-i', o.png);
    videoFilter =
      `[0:v]scale=${W * 1.5}:${H * 1.5},` +
      `zoompan=z='min(1+0.08*on/${frames},1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},format=yuv420p[v]`;
  }
  if (o.audio) inputs.push('-i', o.audio);
  else inputs.push('-f', 'lavfi', '-t', String(o.dur), '-i', 'anullsrc=r=44100:cl=stereo');
  const audioFilter = '[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,apad[a]';

  await runOk(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error',
    ...inputs,
    '-filter_complex', `${videoFilter};${audioFilter}`,
    '-map', '[v]', '-map', '[a]',
    '-t', String(o.dur),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-r', String(FPS), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-ac', '2',
    o.out,
  ]);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
