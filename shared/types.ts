// Modelo de dados da Educaflix.
//
// Cada interface abaixo é uma tabela. Hoje cada tabela é um arquivo JSON em
// content/db/<tabela>.json (um array de linhas). Os nomes de tabelas e campos já
// estão em snake_case e os ids são UUID (exceto tabelas de referência, que usam
// slug), para a migração futura para Postgres/Supabase ser 1:1.
// Veja docs/modelo-de-dados.md para o esboço em SQL.

export type MediaType = 'text' | 'image' | 'audio' | 'video';
export type StageKind = 'script' | 'storyboard' | 'video';
export type GenerationKind = 'topics' | 'themes' | StageKind;
export type GenerationTarget = 'course' | 'topic' | 'stage';
export type GenerationStatus = 'running' | 'succeeded' | 'failed';

/** Estado de uma etapa de um tema. */
export type StageStatus =
  | 'locked' // a etapa anterior ainda não foi aprovada
  | 'ready' // pode gerar
  | 'generating' // a IA está gerando
  | 'awaiting_approval' // a versão mais nova espera aprovação
  | 'approved' // a versão mais nova foi aprovada
  | 'failed'; // a última geração falhou

export const STAGE_ORDER: StageKind[] = ['script', 'storyboard', 'video'];

/** Matéria (tabela de referência). */
export interface Subject {
  id: string; // slug, ex.: "matematica"
  name: string;
  color: string;
  character_name: string;
  character_summary: string;
  /** Arquivo da skill com estilo visual e personagem, relativo a skills/. */
  skill_file: string;
  sort_order: number;
}

/** Série/ano escolar (tabela de referência). */
export interface Grade {
  id: string; // slug, ex.: "ef-1"
  name: string; // "1º ano do Ensino Fundamental"
  former_name: string | null; // "antiga 1ª série do 1º grau"
  level: 'fundamental' | 'medio';
  year: number;
  age_min: number;
  age_max: number;
  sort_order: number;
}

/** Uma combinação Matéria + Série. É o ponto de partida do fluxo. */
export interface Course {
  id: string;
  subject_id: string;
  grade_id: string;
  created_at: string;
}

/** Assunto da matéria (gerado pela IA). */
export interface Topic {
  id: string;
  course_id: string;
  title: string;
  description: string;
  bncc_unit: string | null;
  sort_order: number;
  generation_id: string;
  created_at: string;
}

/** Tema de um assunto (gerado pela IA). Cada tema vira um vídeo. */
export interface Theme {
  id: string;
  topic_id: string;
  title: string;
  summary: string;
  learning_goal: string;
  bncc_codes: string[];
  /** Pessoas citadas no tema, que viram personagens. */
  people: string[];
  sort_order: number;
  generation_id: string;
  published_at: string | null;
  created_at: string;
}

/** Uma das três etapas de produção de um tema. */
export interface Stage {
  id: string;
  theme_id: string;
  kind: StageKind;
  status: StageStatus;
  /** Versão mais recente (pode estar gerando, aguardando ou aprovada). */
  current_generation_id: string | null;
  /** Versão aprovada (pode ser mais antiga que a atual). */
  approved_generation_id: string | null;
  /** A etapa anterior mudou de versão aprovada depois que esta foi aprovada. */
  outdated: boolean;
  updated_at: string;
}

/** Uma geração (uma versão). Guarda o resultado e o histórico. */
export interface Generation {
  id: string;
  kind: GenerationKind;
  target_type: GenerationTarget;
  target_id: string;
  theme_id: string | null;
  version: number;
  status: GenerationStatus;
  /** Observação opcional do admin, que entra no prompt. */
  note: string | null;
  skill_version: string;
  skill_hash: string;
  /** Ids das gerações aprovadas usadas como entrada (ex.: roteiro usado no storyboard). */
  inputs: Record<string, string>;
  output: unknown;
  error: string | null;
  cost_usd: number;
  duration_ms: number;
  created_at: string;
  finished_at: string | null;
}

/** Cada chamada a um modelo dentro de uma geração. Base da comparação de modelos. */
export interface ModelCall {
  id: string;
  generation_id: string;
  media_type: MediaType;
  /** Papel do modelo: "texto", "imagem", "voz", "música" ou "vídeo". */
  role: 'text' | 'image' | 'speech' | 'music' | 'video';
  provider: string;
  model: string;
  /** Para que serviu: "roteiro", "cena 3", "narração da cena 2"... */
  purpose: string;
  prompt: string;
  output_path: string | null;
  cost_usd: number;
  cost_is_estimate: boolean;
  duration_ms: number;
  created_at: string;
}

/** Registro de aprovação de uma versão. */
export interface Approval {
  id: string;
  generation_id: string;
  stage_id: string;
  theme_id: string;
  decision: 'approved';
  note: string | null;
  decided_by: string;
  created_at: string;
}

export interface Database {
  subjects: Subject[];
  grades: Grade[];
  courses: Course[];
  topics: Topic[];
  themes: Theme[];
  stages: Stage[];
  generations: Generation[];
  model_calls: ModelCall[];
  approvals: Approval[];
}

export type TableName = keyof Database;

export const TABLES: TableName[] = [
  'subjects',
  'grades',
  'courses',
  'topics',
  'themes',
  'stages',
  'generations',
  'model_calls',
  'approvals',
];

// ---------------------------------------------------------------------------
// Formato do resultado (generations.output) de cada tipo de geração.
// ---------------------------------------------------------------------------

export interface TopicsOutput {
  topics: { title: string; description: string; bncc_unit: string | null }[];
  notes_applied?: string | null;
}

export interface ThemesOutput {
  themes: {
    title: string;
    summary: string;
    learning_goal: string;
    bncc_codes: string[];
    people: string[];
  }[];
  notes_applied?: string | null;
}

export interface ScriptCharacter {
  name: string;
  role: 'mascote' | 'pessoa citada' | 'apoio';
  description: string;
}

export interface ScriptScene {
  number: number;
  title: string;
  /** Texto da narração. Também é a legenda. */
  narration: string;
  /** O que aparece na tela. Base do storyboard. */
  visual: string;
  on_screen_text: string | null;
  duration_sec: number;
  /** Cena em que a música toca. */
  is_song: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

export interface ScriptOutput {
  title: string;
  logline: string;
  characters: ScriptCharacter[];
  scenes: ScriptScene[];
  song: {
    title: string;
    style: string;
    hook: string;
    parts: { label: string; lines: string[] }[];
  };
  quiz: QuizQuestion[];
  review: string[];
  notes_applied?: string | null;
}

export interface StoryboardFrame {
  scene_number: number;
  caption: string;
  image_path: string;
}

export interface StoryboardOutput {
  style: string;
  frames: StoryboardFrame[];
  notes_applied?: string | null;
}

export interface VideoScene {
  scene_number: number;
  title: string;
  image_path: string;
  subtitle: string;
  narration_audio_path: string | null;
  duration_sec: number;
  is_song: boolean;
  lyrics: string[];
}

/** Vídeo em forma de "animatic": cenas + legenda + narração + música, tocado no navegador. */
export interface AnimaticManifest {
  title: string;
  language: 'pt-BR';
  scenes: VideoScene[];
  music_path: string | null;
  quiz: QuizQuestion[];
  review: string[];
}

export interface VideoOutput {
  format: 'animatic' | 'mp4';
  /** Para "animatic": caminho do manifest JSON. Para "mp4": caminho do arquivo. */
  path: string;
  duration_sec: number;
  notes_applied?: string | null;
}

/** Rótulos em português usados na interface. */
export const STAGE_LABELS: Record<StageKind, string> = {
  script: 'Roteiro, quiz e música',
  storyboard: 'Storyboard',
  video: 'Vídeo',
};

export const KIND_LABELS: Record<GenerationKind, string> = {
  topics: 'Assuntos',
  themes: 'Temas',
  script: 'Roteiro, quiz e música',
  storyboard: 'Storyboard',
  video: 'Vídeo',
};

export const MEDIA_LABELS: Record<MediaType, string> = {
  text: 'Texto',
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
};

export const STATUS_LABELS: Record<StageStatus, string> = {
  locked: 'Bloqueada',
  ready: 'Pronta para gerar',
  generating: 'Gerando…',
  awaiting_approval: 'Aguardando aprovação',
  approved: 'Aprovada',
  failed: 'Falhou',
};
