import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Pipeline } from '../server/pipeline';
import { Skills } from '../server/skills';
import { JsonStore } from '../server/store';
import type { AnimaticManifest, ScriptOutput, StoryboardOutput, VideoOutput } from '../shared/types';

const ROOT = path.resolve(import.meta.dirname, '..');
let dir: string;
let store: JsonStore;
let pipeline: Pipeline;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'educaflix-'));
  store = new JsonStore(dir);
  await store.init();
  pipeline = new Pipeline({ store, skills: new Skills(path.join(ROOT, 'skills')) });
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

async function setupTheme(title = 'Juntar e acrescentar: a adição') {
  const course = await pipeline.ensureCourse('matematica', 'ef-1');
  await (await pipeline.generateTopics(course.id)).done;
  let db = await store.read();
  const topic = db.topics.find((t) => t.title === 'Adição e subtração')!;
  await (await pipeline.generateThemes(topic.id)).done;
  db = await store.read();
  const theme = db.themes.find((t) => t.title === title)!;
  const stage = (kind: string) => db.stages.find((s) => s.theme_id === theme.id && s.kind === kind)!;
  return { course, topic, theme, script: stage('script'), storyboard: stage('storyboard'), video: stage('video') };
}

describe('fluxo de geração', () => {
  it('lista assuntos e temas de Matemática do 1º ano', async () => {
    const { topic, theme } = await setupTheme();
    const db = await store.read();
    expect(db.topics.length).toBe(6);
    expect(db.themes.filter((t) => t.topic_id === topic.id).length).toBe(3);
    expect(theme.bncc_codes).toContain('EF01MA08');
    expect(db.stages.filter((s) => s.theme_id === theme.id).map((s) => s.status)).toEqual(['ready', 'locked', 'locked']);
  });

  it('roda as três etapas com aprovação e publica o tema', async () => {
    const { theme, script, storyboard, video } = await setupTheme();

    await expect(pipeline.generateStage(storyboard.id)).rejects.toThrow(/Aprove a etapa anterior/);

    const s1 = await (await pipeline.generateStage(script.id)).done;
    expect(s1.status).toBe('succeeded');
    expect((s1.output as ScriptOutput).quiz.length).toBe(3);
    await pipeline.approve(s1.id);

    const b1 = await (await pipeline.generateStage(storyboard.id)).done;
    const frames = (b1.output as StoryboardOutput).frames;
    expect(frames.length).toBe((s1.output as ScriptOutput).scenes.length);
    const svg = await fs.readFile(store.resolve(frames[0].image_path), 'utf8');
    expect(svg).toContain('<svg');
    await pipeline.approve(b1.id);

    const v1 = await (await pipeline.generateStage(video.id)).done;
    expect(v1.status).toBe('succeeded');
    const out = v1.output as VideoOutput;
    const manifest = JSON.parse(await fs.readFile(store.resolve(out.path), 'utf8')) as AnimaticManifest;
    expect(manifest.scenes.some((s) => s.is_song && s.lyrics.length > 0)).toBe(true);
    expect(manifest.music_path).toMatch(/musica\.wav$/);
    await pipeline.approve(v1.id);

    const db = await store.read();
    expect(db.themes.find((t) => t.id === theme.id)!.published_at).not.toBeNull();
    expect(db.approvals.length).toBe(3);

    const calls = db.model_calls.filter((c) => c.generation_id === v1.id);
    expect(new Set(calls.map((c) => c.media_type))).toEqual(new Set(['audio', 'video']));
    for (const c of db.model_calls) {
      expect(c.prompt.length).toBeGreaterThan(20);
      expect(c.model).toBeTruthy();
      expect(c.duration_ms).toBeGreaterThanOrEqual(0);
    }
  });

  it('guarda versões com a observação e marca etapas desatualizadas', async () => {
    const { script, storyboard } = await setupTheme();
    const s1 = await (await pipeline.generateStage(script.id)).done;
    await pipeline.approve(s1.id);
    const b1 = await (await pipeline.generateStage(storyboard.id)).done;
    await pipeline.approve(b1.id);

    const s2 = await (await pipeline.generateStage(script.id, { note: 'Use mangas em vez de bananas' })).done;
    expect(s2.version).toBe(2);
    expect(s2.note).toBe('Use mangas em vez de bananas');
    const call = (await store.read()).model_calls.find((c) => c.generation_id === s2.id)!;
    expect(call.prompt).toContain('Use mangas em vez de bananas');

    // Antes de aprovar a v2, o storyboard continua válido.
    let db = await store.read();
    expect(db.stages.find((s) => s.id === storyboard.id)!.outdated).toBe(false);

    await pipeline.approve(s2.id);
    db = await store.read();
    expect(db.stages.find((s) => s.id === storyboard.id)!.outdated).toBe(true);
    // A versão antiga do storyboard não pode mais ser aprovada.
    await expect(pipeline.approve(b1.id)).rejects.toThrow(/roteiro que não é mais o aprovado/);

    const b2 = await (await pipeline.generateStage(storyboard.id)).done;
    expect(b2.inputs.script_generation_id).toBe(s2.id);
    await pipeline.approve(b2.id);
    db = await store.read();
    expect(db.stages.find((s) => s.id === storyboard.id)!.outdated).toBe(false);
  });

  it('gerar assuntos de novo preserva os que já têm temas', async () => {
    const { course, topic } = await setupTheme();
    const before = await store.read();
    const g2 = await (await pipeline.generateTopics(course.id, { note: 'mais curto' })).done;
    expect(g2.version).toBe(2);
    const after = await store.read();
    expect(after.topics.find((t) => t.id === topic.id)).toBeTruthy();
    expect(after.topics.length).toBe(before.topics.length);
  });
});
