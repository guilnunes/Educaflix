import type {
  Approval,
  Course,
  Database,
  Generation,
  GenerationKind,
  GenerationTarget,
  Grade,
  MediaType,
  ModelCall,
  ScriptOutput,
  Stage,
  StageKind,
  StoryboardOutput,
  Subject,
  Theme,
  ThemesOutput,
  Topic,
  TopicsOutput,
  VideoOutput,
} from '../shared/types';
import { STAGE_ORDER } from '../shared/types';
import { resolveProviders } from './providers/registry';
import type { ModelChoice, ProviderRole, ProviderSet, TextContext, VideoSceneInput } from './providers/types';
import type { PromptKey, SkillBundle, Skills } from './skills';
import { SCHEMAS } from './schemas';
import { type JsonStore, newId, nowIso } from './store';

export class FlowError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export interface GenerateOptions {
  note?: string | null;
  models?: ModelChoice;
}

export interface Started {
  generation: Generation;
  /** Termina quando a geração acaba (com sucesso ou falha). */
  done: Promise<Generation>;
}

export interface PipelineDeps {
  store: JsonStore;
  skills: Skills;
  /** Permite trocar os provedores (ex.: nos testes). Padrão: registry + .env. */
  providers?: (choice: ModelChoice) => ProviderSet;
  decidedBy?: string;
}

const ROLE_MEDIA: Record<ProviderRole, MediaType> = {
  text: 'text',
  image: 'image',
  speech: 'audio',
  music: 'audio',
  video: 'video',
};

type Recorder = <T extends { cost_usd: number; cost_is_estimate: boolean }>(
  role: ProviderRole,
  provider: { provider: string; model: string },
  purpose: string,
  prompt: string,
  fn: () => Promise<T>,
) => Promise<{ result: T; call: ModelCall }>;

interface WorkResult {
  output: unknown;
  apply?: (db: Database, gen: Generation) => void;
}

/**
 * O fluxo de produção: assuntos → temas → roteiro → storyboard → vídeo.
 * Cada geração vira uma versão (tabela generations) com as chamadas de modelo
 * (tabela model_calls). Cada etapa de um tema espera aprovação humana.
 */
export class Pipeline {
  private readonly store: JsonStore;
  private readonly skills: Skills;
  private readonly makeProviders: (choice: ModelChoice) => ProviderSet;
  private readonly decidedBy: string;

  constructor(deps: PipelineDeps) {
    this.store = deps.store;
    this.skills = deps.skills;
    this.makeProviders = deps.providers ?? resolveProviders;
    this.decidedBy = deps.decidedBy ?? 'admin';
  }

  /** Gerações que estavam rodando quando o servidor caiu viram "falhou". */
  async recoverInterrupted(): Promise<number> {
    return this.store.transact((db) => {
      let n = 0;
      for (const g of db.generations) {
        if (g.status !== 'running') continue;
        g.status = 'failed';
        g.error = 'Interrompida: o servidor foi reiniciado durante a geração.';
        g.finished_at = nowIso();
        n++;
      }
      for (const s of db.stages) {
        if (s.status === 'generating') {
          s.status = 'failed';
          s.updated_at = nowIso();
        }
      }
      return n;
    });
  }

  // -------------------------------------------------------------------------
  // Matéria + Série
  // -------------------------------------------------------------------------

  async ensureCourse(subjectId: string, gradeId: string): Promise<Course> {
    return this.store.transact((db) => {
      if (!db.subjects.some((s) => s.id === subjectId)) throw new FlowError('Matéria não encontrada.', 404);
      if (!db.grades.some((g) => g.id === gradeId)) throw new FlowError('Série não encontrada.', 404);
      const found = db.courses.find((c) => c.subject_id === subjectId && c.grade_id === gradeId);
      if (found) return found;
      const course: Course = { id: newId(), subject_id: subjectId, grade_id: gradeId, created_at: nowIso() };
      db.courses.push(course);
      return course;
    });
  }

  // -------------------------------------------------------------------------
  // Assuntos
  // -------------------------------------------------------------------------

  async generateTopics(courseId: string, opts: GenerateOptions = {}): Promise<Started> {
    const providers = this.makeProviders(opts.models ?? {});
    ensureRoles(providers, ['text']);
    const db = await this.store.read();
    const course = must(db.courses.find((c) => c.id === courseId), 'Curso não encontrado.');
    const { subject, grade } = courseRefs(db, course);
    const note = cleanNote(opts.note);
    const bundle = await this.skills.bundle(subject, grade, ['topics']);

    return this.start(
      { kind: 'topics', target_type: 'course', target_id: course.id, theme_id: null, note, inputs: {}, bundle },
      async (gen, record) => {
        const prompt = await this.skills.render('topics', baseVars(subject, bundle), note);
        const ctx: TextContext = { subject, grade, note, version: gen.version };
        const { result } = await record('text', providers.text, 'lista de assuntos', fullPrompt(bundle, prompt), () =>
          providers.text.generateJson<TopicsOutput>({ task: 'topics', system: bundle.system, prompt, context: ctx, schema: SCHEMAS.topics }),
        );
        const output = normalizeTopics(result.data);
        return {
          output,
          apply: (db, gen) => mergeTopics(db, course.id, output, gen.id),
        };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Temas
  // -------------------------------------------------------------------------

  async generateThemes(topicId: string, opts: GenerateOptions = {}): Promise<Started> {
    const providers = this.makeProviders(opts.models ?? {});
    ensureRoles(providers, ['text']);
    const db = await this.store.read();
    const topic = must(db.topics.find((t) => t.id === topicId), 'Assunto não encontrado.');
    const course = must(db.courses.find((c) => c.id === topic.course_id), 'Curso não encontrado.');
    const { subject, grade } = courseRefs(db, course);
    const note = cleanNote(opts.note);
    const bundle = await this.skills.bundle(subject, grade, ['themes']);

    return this.start(
      { kind: 'themes', target_type: 'topic', target_id: topic.id, theme_id: null, note, inputs: {}, bundle },
      async (gen, record) => {
        const prompt = await this.skills.render(
          'themes',
          { ...baseVars(subject, bundle), assunto: topic.title, assunto_descricao: topic.description },
          note,
        );
        const ctx: TextContext = {
          subject,
          grade,
          note,
          version: gen.version,
          topic: { title: topic.title, description: topic.description },
        };
        const { result } = await record('text', providers.text, 'lista de temas', fullPrompt(bundle, prompt), () =>
          providers.text.generateJson<ThemesOutput>({ task: 'themes', system: bundle.system, prompt, context: ctx, schema: SCHEMAS.themes }),
        );
        const output = normalizeThemes(result.data);
        return { output, apply: (db, gen) => mergeThemes(db, topic.id, output, gen.id) };
      },
    );
  }

  // -------------------------------------------------------------------------
  // Etapas de um tema
  // -------------------------------------------------------------------------

  async generateStage(stageId: string, opts: GenerateOptions = {}): Promise<Started> {
    const providers = this.makeProviders(opts.models ?? {});
    const db = await this.store.read();
    const stage = must(db.stages.find((s) => s.id === stageId), 'Etapa não encontrada.');
    const ctx = themeRefs(db, stage.theme_id);
    if (stage.status === 'generating') throw new FlowError('Esta etapa já está gerando. Espere terminar.', 409);
    if (stage.status === 'locked') throw new FlowError('Aprove a etapa anterior antes de gerar esta.', 409);
    ensureRoles(providers, STAGE_ROLES[stage.kind]);

    const upstream = stagesOf(db, stage.theme_id);
    const inputs: Record<string, string> = {};
    if (stage.kind !== 'script') {
      inputs.script_generation_id = must(upstream.script.approved_generation_id, 'O roteiro ainda não foi aprovado.');
    }
    if (stage.kind === 'video') {
      inputs.storyboard_generation_id = must(upstream.storyboard.approved_generation_id, 'O storyboard ainda não foi aprovado.');
    }

    const note = cleanNote(opts.note);
    const keys: PromptKey[] = stage.kind === 'script' ? ['script'] : stage.kind === 'storyboard' ? ['storyboard'] : ['speech', 'music', 'video'];
    const bundle = await this.skills.bundle(ctx.subject, ctx.grade, keys);
    const vars = {
      ...baseVars(ctx.subject, bundle),
      assunto: ctx.topic.title,
      assunto_descricao: ctx.topic.description,
      tema: ctx.theme.title,
      tema_resumo: ctx.theme.summary,
      objetivo: ctx.theme.learning_goal,
      bncc: ctx.theme.bncc_codes.join(', ') || 'não informado',
      pessoas: ctx.theme.people.join(', ') || 'nenhuma',
    };

    return this.start(
      { kind: stage.kind, target_type: 'stage', target_id: stage.id, theme_id: ctx.theme.id, note, inputs, bundle },
      async (gen, record) => {
        const mediaDir = `themes/${ctx.theme.id}/${stage.kind}-v${gen.version}`;
        let output: unknown;

        if (stage.kind === 'script') {
          const prompt = await this.skills.render('script', vars, note);
          const text: TextContext = {
            subject: ctx.subject,
            grade: ctx.grade,
            note,
            version: gen.version,
            topic: { title: ctx.topic.title, description: ctx.topic.description },
            theme: ctx.theme,
          };
          const { result } = await record('text', providers.text, 'roteiro, quiz e música', fullPrompt(bundle, prompt), () =>
            providers.text.generateJson<ScriptOutput>({ task: 'script', system: bundle.system, prompt, context: text, schema: SCHEMAS.script }),
          );
          output = normalizeScript(result.data, note);
        } else if (stage.kind === 'storyboard') {
          const script = await this.outputOf<ScriptOutput>(inputs.script_generation_id);
          const frames: StoryboardOutput['frames'] = [];
          // A primeira cena gerada vira referência das outras, para o personagem não mudar.
          const references: { data: Buffer; mime: string }[] = [];
          for (const scene of script.scenes) {
            const cast = script.characters.filter((c) => `${scene.visual} ${scene.narration}`.includes(c.name.split(' ')[0]));
            const prompt = await this.skills.render(
              'storyboard',
              {
                ...vars,
                roteiro: '',
                estilo_visual: bundle.visualStyle,
                personagem_descricao: bundle.characterDescription,
                personagens_da_cena: cast.map((c) => `${c.name} (${c.description})`).join('; ') || 'só o personagem principal',
                cena_numero: String(scene.number),
                cena_titulo: scene.title,
                cena_visual: scene.visual,
                cena_texto_na_tela: scene.on_screen_text ?? 'nenhum',
              },
              note,
            );
            const { result, call } = await record('image', providers.image, `cena ${scene.number}`, prompt, () =>
              providers.image.generateImage({
                prompt,
                width: 1280,
                height: 720,
                scene,
                script,
                subject: ctx.subject,
                version: gen.version,
                references: providers.image.supportsReferences ? references : undefined,
              }),
            );
            if (providers.image.supportsReferences && references.length === 0 && result.ext !== 'svg') {
              references.push({ data: result.data, mime: `image/${result.ext === 'jpg' ? 'jpeg' : result.ext}` });
            }
            const path = await this.store.writeMedia(`${mediaDir}/cena-${pad(scene.number)}.${result.ext}`, result.data);
            call.output_path = path;
            frames.push({ scene_number: scene.number, caption: scene.visual, image_path: path });
          }
          output = { style: bundle.visualStyle, frames, notes_applied: note } satisfies StoryboardOutput;
        } else {
          const script = await this.outputOf<ScriptOutput>(inputs.script_generation_id);
          const storyboard = await this.outputOf<StoryboardOutput>(inputs.storyboard_generation_id);
          const scenes: VideoSceneInput[] = [];
          for (const scene of script.scenes) {
            const frame = must(
              storyboard.frames.find((f) => f.scene_number === scene.number),
              `O storyboard não tem imagem para a cena ${scene.number}.`,
            );
            const prompt = await this.skills.render('speech', { ...vars, texto: scene.narration }, null);
            const { result, call } = await record('speech', providers.speech, `narração da cena ${scene.number}`, prompt, () =>
              providers.speech.speak({ text: scene.narration, prompt, language: 'pt-BR' }),
            );
            let audioPath: string | null = null;
            if (result.data && result.ext) {
              audioPath = await this.store.writeMedia(`${mediaDir}/narracao-${pad(scene.number)}.${result.ext}`, result.data);
              call.output_path = audioPath;
            }
            scenes.push({
              scene_number: scene.number,
              title: scene.title,
              image_path: frame.image_path,
              narration: scene.narration,
              narration_audio_path: audioPath,
              narration_duration_sec: result.duration_sec,
              duration_sec: scene.duration_sec,
              is_song: scene.is_song,
            });
          }

          const lyrics = script.song.parts.flatMap((p) => p.lines);
          const musicPrompt = await this.skills.render(
            'music',
            { ...vars, musica_titulo: script.song.title, musica_estilo: script.song.style, letra: script.song.parts.map((p) => `[${p.label}]\n${p.lines.join('\n')}`).join('\n\n') },
            note,
          );
          const music = await record('music', providers.music, 'música', musicPrompt, () =>
            providers.music.compose({
              prompt: musicPrompt,
              title: script.song.title,
              style: script.song.style,
              lyrics,
              parts: script.song.parts,
              duration_sec: 30,
            }),
          );
          let musicPath: string | null = null;
          if (music.result.data && music.result.ext) {
            musicPath = await this.store.writeMedia(`${mediaDir}/musica.${music.result.ext}`, music.result.data);
            music.call.output_path = musicPath;
          }

          const videoPrompt = await this.skills.render(
            'video',
            {
              ...vars,
              cenas: scenes.map((s) => `- Cena ${s.scene_number} (${s.duration_sec} s): ${s.image_path}. Narração: "${s.narration}"`).join('\n'),
            },
            note,
          );
          const video = await record('video', providers.video, 'montagem do vídeo', videoPrompt, () =>
            providers.video.render({
              prompt: videoPrompt,
              title: script.title,
              scenes,
              music_path: musicPath,
              song_lines: lyrics,
              quiz: script.quiz,
              review: script.review,
              resolve: (p) => this.store.resolve(p),
            }),
          );
          const videoPath = await this.store.writeMedia(`${mediaDir}/${video.result.main.name}`, video.result.main.data);
          video.call.output_path = videoPath;
          if (video.result.detail) video.call.purpose = `montagem do vídeo (${video.result.detail})`;
          const subtitlesPath = video.result.subtitles
            ? await this.store.writeMedia(`${mediaDir}/${video.result.subtitles.name}`, video.result.subtitles.data)
            : null;
          output = {
            format: video.result.format,
            path: videoPath,
            subtitles_path: subtitlesPath,
            duration_sec: video.result.duration_sec,
            quiz: script.quiz,
            review: script.review,
            notes_applied: note,
          } satisfies VideoOutput;
        }

        return {
          output,
          apply: (db) => {
            const s = db.stages.find((x) => x.id === stage.id);
            if (!s) return;
            s.status = 'awaiting_approval';
            s.updated_at = nowIso();
            refreshStages(db, stage.theme_id);
          },
        };
      },
      (db) => {
        const s = must(db.stages.find((x) => x.id === stage.id), 'Etapa não encontrada.');
        if (s.status === 'generating') throw new FlowError('Esta etapa já está gerando. Espere terminar.', 409);
        if (s.status === 'locked') throw new FlowError('Aprove a etapa anterior antes de gerar esta.', 409);
        return (gen) => {
          s.status = 'generating';
          s.current_generation_id = gen.id;
          s.updated_at = nowIso();
        };
      },
      (db) => {
        const s = db.stages.find((x) => x.id === stage.id);
        if (s) {
          s.status = 'failed';
          s.updated_at = nowIso();
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Aprovação
  // -------------------------------------------------------------------------

  async approve(generationId: string, opts: { note?: string | null } = {}): Promise<Approval> {
    return this.store.transact((db) => {
      const gen = must(db.generations.find((g) => g.id === generationId), 'Versão não encontrada.');
      if (gen.target_type !== 'stage') throw new FlowError('Só as etapas de um tema precisam de aprovação.');
      if (gen.status !== 'succeeded') throw new FlowError('Só dá para aprovar uma versão gerada com sucesso.');
      const stage = must(db.stages.find((s) => s.id === gen.target_id), 'Etapa não encontrada.');
      if (stage.status === 'generating') throw new FlowError('Espere a geração em andamento terminar.', 409);

      const st = stagesOf(db, stage.theme_id);
      if (gen.kind !== 'script' && gen.inputs.script_generation_id !== st.script.approved_generation_id) {
        throw new FlowError('Esta versão foi feita com um roteiro que não é mais o aprovado. Gere de novo.', 409);
      }
      if (gen.kind === 'video' && gen.inputs.storyboard_generation_id !== st.storyboard.approved_generation_id) {
        throw new FlowError('Esta versão foi feita com um storyboard que não é mais o aprovado. Gere de novo.', 409);
      }

      stage.approved_generation_id = gen.id;
      stage.status = 'approved';
      stage.updated_at = nowIso();

      const approval: Approval = {
        id: newId(),
        generation_id: gen.id,
        stage_id: stage.id,
        theme_id: stage.theme_id,
        decision: 'approved',
        note: cleanNote(opts.note),
        decided_by: this.decidedBy,
        created_at: nowIso(),
      };
      db.approvals.push(approval);

      if (gen.kind === 'video') {
        const theme = db.themes.find((t) => t.id === stage.theme_id);
        if (theme) theme.published_at = nowIso();
      }
      refreshStages(db, stage.theme_id);
      return approval;
    });
  }

  // -------------------------------------------------------------------------
  // Execução das gerações
  // -------------------------------------------------------------------------

  private async start(
    spec: {
      kind: GenerationKind;
      target_type: GenerationTarget;
      target_id: string;
      theme_id: string | null;
      note: string | null;
      inputs: Record<string, string>;
      bundle: SkillBundle;
    },
    work: (gen: Generation, record: Recorder) => Promise<WorkResult>,
    onStart?: (db: Database) => (gen: Generation) => void,
    onFail?: (db: Database) => void,
  ): Promise<Started> {
    const generation = await this.store.transact((db) => {
      const mark = onStart?.(db);
      const version =
        Math.max(0, ...db.generations.filter((g) => g.kind === spec.kind && g.target_id === spec.target_id).map((g) => g.version)) + 1;
      const gen: Generation = {
        id: newId(),
        kind: spec.kind,
        target_type: spec.target_type,
        target_id: spec.target_id,
        theme_id: spec.theme_id,
        version,
        status: 'running',
        note: spec.note,
        skill_version: spec.bundle.version,
        skill_hash: spec.bundle.hash,
        inputs: spec.inputs,
        output: null,
        error: null,
        cost_usd: 0,
        duration_ms: 0,
        created_at: nowIso(),
        finished_at: null,
      };
      db.generations.push(gen);
      mark?.(gen);
      return gen;
    });

    const calls: ModelCall[] = [];
    const record: Recorder = async (role, provider, purpose, prompt, fn) => {
      const t0 = performance.now();
      const result = await fn();
      const call: ModelCall = {
        id: newId(),
        generation_id: generation.id,
        media_type: ROLE_MEDIA[role],
        role,
        provider: provider.provider,
        model: provider.model,
        purpose,
        prompt,
        output_path: null,
        cost_usd: round6(result.cost_usd),
        cost_is_estimate: result.cost_is_estimate,
        duration_ms: Math.round(performance.now() - t0),
        created_at: nowIso(),
      };
      calls.push(call);
      return { result, call };
    };

    const t0 = performance.now();
    const done = (async () => {
      let res: WorkResult | null = null;
      let error: string | null = null;
      try {
        res = await work(generation, record);
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
      return this.store.transact((db) => {
        const gen = must(db.generations.find((g) => g.id === generation.id), 'Versão sumiu do banco.');
        db.model_calls.push(...calls);
        gen.cost_usd = round6(calls.reduce((s, c) => s + c.cost_usd, 0));
        gen.duration_ms = Math.round(performance.now() - t0);
        gen.finished_at = nowIso();
        if (res && !error) {
          gen.status = 'succeeded';
          gen.output = res.output;
          res.apply?.(db, gen);
        } else {
          gen.status = 'failed';
          gen.error = error;
          onFail?.(db);
        }
        return { ...gen };
      });
    })();

    return { generation, done };
  }

  private async outputOf<T>(generationId: string): Promise<T> {
    const db = await this.store.read();
    const gen = must(db.generations.find((g) => g.id === generationId), 'Versão de entrada não encontrada.');
    return gen.output as T;
  }
}

// ---------------------------------------------------------------------------
// Regras de estado
// ---------------------------------------------------------------------------

const STAGE_ROLES: Record<StageKind, ProviderRole[]> = {
  script: ['text'],
  storyboard: ['image'],
  video: ['speech', 'music', 'video'],
};

/** Cria já os provedores que a geração vai usar, para erro de configuração aparecer antes de começar. */
function ensureRoles(providers: ProviderSet, roles: ProviderRole[]) {
  try {
    for (const r of roles) void providers[r];
  } catch (e) {
    throw new FlowError(e instanceof Error ? e.message : String(e), 400);
  }
}

function stagesOf(db: Database, themeId: string): Record<StageKind, Stage> {
  const out = {} as Record<StageKind, Stage>;
  for (const kind of STAGE_ORDER) {
    out[kind] = must(
      db.stages.find((s) => s.theme_id === themeId && s.kind === kind),
      `Etapa ${kind} do tema não encontrada.`,
    );
  }
  return out;
}

/**
 * Recalcula o que depende da aprovação das etapas anteriores:
 * libera a próxima etapa e marca como desatualizada a versão que foi feita
 * com uma entrada que não é mais a aprovada.
 */
export function refreshStages(db: Database, themeId: string) {
  const st = stagesOf(db, themeId);
  const genById = (id: string | null) => (id ? db.generations.find((g) => g.id === id) : undefined);

  const unlock = (stage: Stage, ready: boolean) => {
    if (stage.status === 'locked' && ready) stage.status = 'ready';
  };
  unlock(st.storyboard, !!st.script.approved_generation_id);
  unlock(st.video, !!st.storyboard.approved_generation_id);

  const check = (stage: Stage, deps: Partial<Record<'script_generation_id' | 'storyboard_generation_id', string | null>>) => {
    const gen = genById(stage.current_generation_id);
    if (!gen || gen.status !== 'succeeded') {
      stage.outdated = false;
      return;
    }
    stage.outdated = Object.entries(deps).some(([k, v]) => gen.inputs[k] !== v);
  };
  check(st.storyboard, { script_generation_id: st.script.approved_generation_id });
  check(st.video, {
    script_generation_id: st.script.approved_generation_id,
    storyboard_generation_id: st.storyboard.approved_generation_id,
  });
}

function mergeTopics(db: Database, courseId: string, output: TopicsOutput, generationId: string) {
  const hasThemes = (t: Topic) => db.themes.some((th) => th.topic_id === t.id);
  const kept = db.topics.filter((t) => t.course_id === courseId && hasThemes(t));
  db.topics = db.topics.filter((t) => t.course_id !== courseId || hasThemes(t));
  output.topics.forEach((t, i) => {
    const match = kept.find((k) => norm(k.title) === norm(t.title));
    if (match) {
      Object.assign(match, { description: t.description, bncc_unit: t.bncc_unit, sort_order: i });
    } else {
      db.topics.push({
        id: newId(),
        course_id: courseId,
        title: t.title,
        description: t.description,
        bncc_unit: t.bncc_unit,
        sort_order: i,
        generation_id: generationId,
        created_at: nowIso(),
      });
    }
  });
  // Assuntos antigos que já têm temas continuam, no fim da lista.
  kept
    .filter((k) => !output.topics.some((t) => norm(t.title) === norm(k.title)))
    .forEach((k, i) => (k.sort_order = output.topics.length + i));
}

function mergeThemes(db: Database, topicId: string, output: ThemesOutput, generationId: string) {
  const started = (th: Theme) => db.stages.some((s) => s.theme_id === th.id && s.current_generation_id);
  const kept = db.themes.filter((t) => t.topic_id === topicId && started(t));
  const removed = new Set(db.themes.filter((t) => t.topic_id === topicId && !started(t)).map((t) => t.id));
  db.themes = db.themes.filter((t) => !removed.has(t.id));
  db.stages = db.stages.filter((s) => !removed.has(s.theme_id));

  output.themes.forEach((t, i) => {
    const match = kept.find((k) => norm(k.title) === norm(t.title));
    if (match) {
      match.sort_order = i;
      return;
    }
    const theme: Theme = {
      id: newId(),
      topic_id: topicId,
      title: t.title,
      summary: t.summary,
      learning_goal: t.learning_goal,
      bncc_codes: t.bncc_codes,
      people: t.people,
      sort_order: i,
      generation_id: generationId,
      published_at: null,
      created_at: nowIso(),
    };
    db.themes.push(theme);
    for (const kind of STAGE_ORDER) {
      db.stages.push({
        id: newId(),
        theme_id: theme.id,
        kind,
        status: kind === 'script' ? 'ready' : 'locked',
        current_generation_id: null,
        approved_generation_id: null,
        outdated: false,
        updated_at: nowIso(),
      });
    }
  });
  kept
    .filter((k) => !output.themes.some((t) => norm(t.title) === norm(k.title)))
    .forEach((k, i) => (k.sort_order = output.themes.length + i));
}

// ---------------------------------------------------------------------------
// Validação das respostas dos modelos
// ---------------------------------------------------------------------------

function normalizeTopics(data: TopicsOutput): TopicsOutput {
  if (!Array.isArray(data?.topics) || data.topics.length === 0) throw new Error('O modelo não devolveu nenhum assunto.');
  return {
    topics: data.topics.map((t) => ({ title: str(t.title), description: str(t.description), bncc_unit: t.bncc_unit || null })),
    notes_applied: data.notes_applied ?? null,
  };
}

function normalizeThemes(data: ThemesOutput): ThemesOutput {
  if (!Array.isArray(data?.themes) || data.themes.length === 0) throw new Error('O modelo não devolveu nenhum tema.');
  return {
    themes: data.themes.map((t) => ({
      title: str(t.title),
      summary: str(t.summary),
      learning_goal: str(t.learning_goal),
      bncc_codes: Array.isArray(t.bncc_codes) ? t.bncc_codes.map(String) : [],
      people: Array.isArray(t.people) ? t.people.map(String) : [],
    })),
    notes_applied: data.notes_applied ?? null,
  };
}

function normalizeScript(data: ScriptOutput, note: string | null): ScriptOutput {
  if (!Array.isArray(data?.scenes) || data.scenes.length === 0) throw new Error('O roteiro veio sem cenas.');
  return {
    title: str(data.title),
    logline: str(data.logline),
    characters: Array.isArray(data.characters) ? data.characters : [],
    scenes: data.scenes.map((s, i) => ({
      number: Number(s.number) || i + 1,
      title: str(s.title),
      narration: str(s.narration),
      visual: str(s.visual),
      on_screen_text: s.on_screen_text ? String(s.on_screen_text) : null,
      duration_sec: Number(s.duration_sec) || 12,
      is_song: !!s.is_song,
    })),
    song: {
      title: str(data.song?.title),
      style: str(data.song?.style),
      hook: str(data.song?.hook),
      parts: Array.isArray(data.song?.parts) ? data.song.parts : [],
    },
    quiz: Array.isArray(data.quiz) ? data.quiz : [],
    review: Array.isArray(data.review) ? data.review.map(String) : [],
    notes_applied: data.notes_applied ?? note,
  };
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function courseRefs(db: Database, course: Course): { subject: Subject; grade: Grade } {
  return {
    subject: must(db.subjects.find((s) => s.id === course.subject_id), 'Matéria não encontrada.'),
    grade: must(db.grades.find((g) => g.id === course.grade_id), 'Série não encontrada.'),
  };
}

function themeRefs(db: Database, themeId: string) {
  const theme = must(db.themes.find((t) => t.id === themeId), 'Tema não encontrado.');
  const topic = must(db.topics.find((t) => t.id === theme.topic_id), 'Assunto não encontrado.');
  const course = must(db.courses.find((c) => c.id === topic.course_id), 'Curso não encontrado.');
  return { theme, topic, course, ...courseRefs(db, course) };
}

function baseVars(subject: Subject, bundle: SkillBundle) {
  return {
    materia: subject.name,
    serie: bundle.gradeLabel,
    faixa_etaria: bundle.ageLabel,
    personagem: subject.character_name,
  };
}

function fullPrompt(bundle: SkillBundle, prompt: string) {
  return `### Instruções (skill v${bundle.version})\n\n${bundle.system}\n\n### Pedido\n\n${prompt}`;
}

function must<T>(v: T | null | undefined, message: string): T {
  if (v == null) throw new FlowError(message, 404);
  return v;
}

function cleanNote(note: string | null | undefined) {
  const n = note?.trim();
  return n ? n.slice(0, 2000) : null;
}

const str = (v: unknown) => (v == null ? '' : String(v));
const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const pad = (n: number) => String(n).padStart(2, '0');
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

