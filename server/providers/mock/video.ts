import type { AnimaticManifest } from '../../../shared/types';
import type { VideoProvider, VideoRequest, VideoResult } from '../types';

/**
 * Vídeo de exemplo em forma de "animatic": um manifest JSON com as cenas,
 * legendas, narração e música, tocado pelo player do admin no navegador.
 * Um provedor real devolveria um MP4 pela mesma interface.
 */
export class MockVideoProvider implements VideoProvider {
  readonly provider = 'mock';
  constructor(readonly model = 'mock-animatic-v1') {}

  async render(req: VideoRequest): Promise<VideoResult> {
    const manifest: AnimaticManifest = {
      title: req.title,
      language: 'pt-BR',
      scenes: req.scenes.map((s) => ({
        scene_number: s.scene_number,
        title: s.title,
        image_path: s.image_path,
        subtitle: s.narration,
        narration_audio_path: s.narration_audio_path,
        duration_sec: Math.max(s.duration_sec, Math.ceil(s.narration_duration_sec + 1)),
        is_song: s.is_song,
        lyrics: s.is_song ? req.song_lines : [],
      })),
      music_path: req.music_path,
      quiz: req.quiz,
      review: req.review,
    };
    const duration = manifest.scenes.reduce((sum, s) => sum + s.duration_sec, 0);
    return {
      format: 'animatic',
      main: { name: 'video.json', data: JSON.stringify(manifest, null, 2) + '\n' },
      duration_sec: duration,
      cost_usd: 0,
      cost_is_estimate: true,
      usage: { seconds: duration },
    };
  }
}
