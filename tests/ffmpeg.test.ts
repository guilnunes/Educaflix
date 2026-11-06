import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hasCommand, probeDuration } from '../server/media-tools';
import { Pipeline } from '../server/pipeline';
import { FfmpegVideoProvider } from '../server/providers/ffmpeg/video';
import { PiperSpeechProvider, piperBin } from '../server/providers/piper/speech';
import { resolveProviders } from '../server/providers/registry';
import { Skills } from '../server/skills';
import { JsonStore } from '../server/store';
import type { VideoOutput } from '../shared/types';

const ROOT = path.resolve(import.meta.dirname, '..');
const hasFfmpeg = await hasCommand('ffmpeg');
const piperVoice = path.join(process.env.PIPER_DATA_DIR || '.cache/piper', 'pt_BR-faber-medium.onnx');
const hasPiper = (await fs.stat(piperVoice).then(() => true, () => false)) && (await hasCommand(piperBin(), ['--help']));
let dir: string;

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'educaflix-ff-'));
});
afterAll(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe.skipIf(!hasFfmpeg)('montagem local com ffmpeg', () => {
  it('gera MP4 com legenda a partir do storyboard', { timeout: 180_000 }, async () => {
    const store = new JsonStore(dir);
    await store.init();
    const pipeline = new Pipeline({
      store,
      skills: new Skills(path.join(ROOT, 'skills')),
      // Com o Piper instalado (npm run setup:piper), a narração é real; senão, vídeo com silêncio.
      providers: (choice) => {
        const base = resolveProviders(choice);
        return {
          text: base.text,
          image: base.image,
          music: base.music,
          speech: hasPiper ? new PiperSpeechProvider() : base.speech,
          video: new FfmpegVideoProvider(),
        };
      },
    });
    const course = await pipeline.ensureCourse('matematica', 'ef-1');
    await (await pipeline.generateTopics(course.id)).done;
    let db = await store.read();
    const topic = db.topics.find((t) => t.title === 'Adição e subtração')!;
    await (await pipeline.generateThemes(topic.id)).done;
    db = await store.read();
    const theme = db.themes.find((t) => t.title === 'Os amigos do 10')!;
    const stage = (k: string) => db.stages.find((s) => s.theme_id === theme.id && s.kind === k)!;

    const s1 = await (await pipeline.generateStage(stage('script').id)).done;
    await pipeline.approve(s1.id);
    const b1 = await (await pipeline.generateStage(stage('storyboard').id)).done;
    await pipeline.approve(b1.id);
    const v1 = await (await pipeline.generateStage(stage('video').id)).done;
    expect(v1.error).toBeNull();
    const out = v1.output as VideoOutput;
    expect(out.format).toBe('mp4');
    expect(out.quiz?.length).toBeGreaterThan(0);
    const mp4 = store.resolve(out.path);
    const seconds = await probeDuration(mp4);
    expect(seconds).toBeGreaterThan(30);
    expect(Math.abs(seconds - out.duration_sec)).toBeLessThan(2);
    const vtt = await fs.readFile(store.resolve(out.subtitles_path!), 'utf8');
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('Nico');
    const size = (await fs.stat(mp4)).size;
    console.log(`MP4: ${seconds.toFixed(1)} s, ${(size / 1024 / 1024).toFixed(2)} MB`);
    if (process.env.KEEP_VIDEO) await fs.copyFile(mp4, process.env.KEEP_VIDEO);
  });
});
