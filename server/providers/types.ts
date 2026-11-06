import type {
  Grade,
  ScriptOutput,
  ScriptScene,
  Subject,
  QuizQuestion,
} from '../../shared/types';

// Camada de provedores de modelo.
//
// O fluxo (server/pipeline) só conhece estas interfaces. Para trocar de modelo,
// crie uma classe que implemente a interface do tipo e registre em registry.ts.
// Nada no fluxo precisa mudar.

/** Tudo o que um provedor de texto precisa saber sobre a tarefa. */
export interface TextContext {
  subject: Subject;
  grade: Grade;
  note: string | null;
  version: number;
  topic?: { title: string; description: string };
  theme?: {
    title: string;
    summary: string;
    learning_goal: string;
    bncc_codes: string[];
    people: string[];
  };
}

export type TextTask = 'topics' | 'themes' | 'script';

export interface TextRequest {
  task: TextTask;
  /** Instruções fixas: skill + estilo da matéria + faixa etária. */
  system: string;
  /** Pedido da tarefa, com a observação do admin quando houver. */
  prompt: string;
  /** Contexto estruturado. Provedores reais podem ignorar; o mock usa. */
  context: TextContext;
}

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  images?: number;
  seconds?: number;
  characters?: number;
}

export interface ProviderResult {
  /** Custo estimado em dólares. */
  cost_usd: number;
  /** true quando o custo é uma estimativa (tabela de preços), false quando vem da fatura. */
  cost_is_estimate: boolean;
  usage?: Usage;
}

export interface TextResult<T = unknown> extends ProviderResult {
  /** Resposta já convertida de JSON. */
  data: T;
}

export interface TextProvider {
  readonly provider: string;
  readonly model: string;
  generateJson<T>(req: TextRequest): Promise<TextResult<T>>;
}

export interface ImageRequest {
  prompt: string;
  width: number;
  height: number;
  /** Contexto estruturado da cena. Provedores reais podem ignorar; o mock usa. */
  scene: ScriptScene;
  script: ScriptOutput;
  subject: Subject;
  version: number;
}

export interface ImageResult extends ProviderResult {
  data: Buffer;
  ext: 'svg' | 'png' | 'jpg' | 'webp';
}

export interface ImageProvider {
  readonly provider: string;
  readonly model: string;
  generateImage(req: ImageRequest): Promise<ImageResult>;
}

export interface AudioResult extends ProviderResult {
  /** null quando o provedor não gera arquivo (o mock de voz usa a voz do navegador). */
  data: Buffer | null;
  ext: 'wav' | 'mp3' | 'ogg' | null;
  duration_sec: number;
}

export interface SpeechRequest {
  text: string;
  prompt: string;
  language: 'pt-BR';
}

export interface SpeechProvider {
  readonly provider: string;
  readonly model: string;
  speak(req: SpeechRequest): Promise<AudioResult>;
}

export interface MusicRequest {
  prompt: string;
  title: string;
  style: string;
  lyrics: string[];
  duration_sec: number;
}

export interface MusicProvider {
  readonly provider: string;
  readonly model: string;
  compose(req: MusicRequest): Promise<AudioResult>;
}

export interface VideoSceneInput {
  scene_number: number;
  title: string;
  /** Caminho relativo a content/ */
  image_path: string;
  narration: string;
  narration_audio_path: string | null;
  narration_duration_sec: number;
  duration_sec: number;
  is_song: boolean;
}

export interface VideoRequest {
  prompt: string;
  title: string;
  scenes: VideoSceneInput[];
  music_path: string | null;
  song_lines: string[];
  quiz: QuizQuestion[];
  review: string[];
  /** Converte caminho relativo a content/ em caminho absoluto, para quem precisa ler os arquivos. */
  resolve: (contentRelative: string) => string;
}

export interface VideoFile {
  name: string;
  data: Buffer | string;
}

export interface VideoResult extends ProviderResult {
  format: 'animatic' | 'mp4';
  /** Arquivo principal (manifest JSON ou mp4), gravado na pasta da geração. */
  main: VideoFile;
  duration_sec: number;
}

export interface VideoProvider {
  readonly provider: string;
  readonly model: string;
  render(req: VideoRequest): Promise<VideoResult>;
}

export type ProviderRole = 'text' | 'image' | 'speech' | 'music' | 'video';

export interface ProviderSet {
  text: TextProvider;
  image: ImageProvider;
  speech: SpeechProvider;
  music: MusicProvider;
  video: VideoProvider;
}

/** Escolha de modelo por papel, no formato "provedor:modelo". */
export type ModelChoice = Partial<Record<ProviderRole, string>>;
