import { AnthropicTextProvider } from './anthropic/text';
import { ClaudeCliTextProvider } from './claude-cli/text';
import { ElevenLabsMusicProvider } from './elevenlabs/music';
import { ElevenLabsSpeechProvider } from './elevenlabs/speech';
import { FalFluxImageProvider } from './fal/image';
import { KlingAnimator } from './fal/kling';
import { FfmpegVideoProvider } from './ffmpeg/video';
import { GeminiImageProvider } from './gemini/image';
import { LyriaMusicProvider } from './gemini/music';
import { MockMusicProvider, MockSpeechProvider } from './mock/audio';
import { MockImageProvider } from './mock/image';
import { MockTextProvider } from './mock/text';
import { MockVideoProvider } from './mock/video';
import { PiperSpeechProvider, piperBin } from './piper/speech';
import type { ModelChoice, ProviderRole, ProviderSet } from './types';
import { FFMPEG, FFPROBE, hasCommand } from '../media-tools';

// Registro de provedores por papel (texto, imagem, voz, música, vídeo).
//
// Para adicionar um provedor:
//   1. crie a classe em server/providers/<nome>/ implementando a interface do papel;
//   2. registre aqui, com os modelos aceitos, as chaves (env) e os programas (bins) que exige;
//   3. escolha o padrão no .env (ex.: TEXT_PROVIDER=<nome> e TEXT_MODEL=<modelo>).

export type Billing = 'gratuito' | 'assinatura' | 'por uso';

interface ProviderEntry<T> {
  label: string;
  models: string[];
  /** Variáveis de ambiente obrigatórias (chaves de API). */
  env: string[];
  /** Programas que precisam estar instalados, com os argumentos para testar. */
  bins?: { cmd: string; args?: string[] }[];
  /** Roda na máquina, sem serviço externo. */
  local: boolean;
  billing: Billing;
  create: (model: string) => T;
}

type Registry = { [R in ProviderRole]: Record<string, ProviderEntry<ProviderSet[R]>> };

const FFMPEG_BINS = [{ cmd: FFMPEG }, { cmd: FFPROBE }];

export const REGISTRY: Registry = {
  text: {
    mock: { label: 'Mock (exemplo)', models: ['mock-texto-v1'], env: [], local: true, billing: 'gratuito', create: (m) => new MockTextProvider(m) },
    'claude-assinatura': {
      label: 'Claude pela assinatura (Claude Code)',
      models: ['sonnet', 'haiku', 'opus'],
      env: [],
      bins: [{ cmd: process.env.CLAUDE_CLI_PATH || 'claude', args: ['--version'] }],
      local: false,
      billing: 'assinatura',
      create: (m) => new ClaudeCliTextProvider(m),
    },
    anthropic: {
      label: 'Claude pela API',
      models: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'],
      env: ['ANTHROPIC_API_KEY'],
      local: false,
      billing: 'por uso',
      create: (m) => new AnthropicTextProvider(m),
    },
  },
  image: {
    mock: { label: 'Mock (SVG)', models: ['mock-svg-v1'], env: [], local: true, billing: 'gratuito', create: (m) => new MockImageProvider(m) },
    google: {
      label: 'Gemini Flash Image',
      models: ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'],
      env: ['GOOGLE_API_KEY'],
      local: false,
      billing: 'por uso',
      create: (m) => new GeminiImageProvider(m),
    },
    fal: {
      label: 'FLUX.2 Klein (fal.ai)',
      models: ['fal-ai/flux-2/klein/4b', 'fal-ai/flux-2/klein/9b'],
      env: ['FAL_KEY'],
      local: false,
      billing: 'por uso',
      create: (m) => new FalFluxImageProvider(m),
    },
  },
  speech: {
    mock: {
      label: 'Mock (voz do navegador)',
      models: ['mock-voz-navegador'],
      env: [],
      local: true,
      billing: 'gratuito',
      create: (m) => new MockSpeechProvider(m),
    },
    piper: {
      label: 'Piper (voz local)',
      models: ['pt_BR-faber-medium'],
      env: [],
      bins: [{ cmd: piperBin(), args: ['--help'] }],
      local: true,
      billing: 'gratuito',
      create: (m) => new PiperSpeechProvider(m),
    },
    elevenlabs: {
      label: 'ElevenLabs',
      models: ['eleven_v4', 'eleven_flash_v2_5', 'eleven_multilingual_v2'],
      env: ['ELEVENLABS_API_KEY'],
      local: false,
      billing: 'assinatura',
      create: (m) => new ElevenLabsSpeechProvider(m),
    },
  },
  music: {
    mock: { label: 'Mock (jingle WAV)', models: ['mock-jingle-v1'], env: [], local: true, billing: 'gratuito', create: (m) => new MockMusicProvider(m) },
    google: {
      label: 'Lyria (Google)',
      models: ['lyria-3-clip-preview', 'lyria-3-pro-preview', 'lyria-3.5'],
      env: ['GOOGLE_API_KEY'],
      local: false,
      billing: 'por uso',
      create: (m) => new LyriaMusicProvider(m),
    },
    elevenlabs: {
      label: 'ElevenLabs Music',
      models: ['music_v2_5', 'music_v2'],
      env: ['ELEVENLABS_API_KEY'],
      local: false,
      billing: 'assinatura',
      create: (m) => new ElevenLabsMusicProvider(m as 'music_v2_5'),
    },
  },
  video: {
    mock: {
      label: 'Mock (animatic)',
      models: ['mock-animatic-v1'],
      env: [],
      local: true,
      billing: 'gratuito',
      create: (m) => new MockVideoProvider(m),
    },
    ffmpeg: {
      label: 'Montagem local (ffmpeg)',
      models: ['montagem-local-v1'],
      env: [],
      bins: FFMPEG_BINS,
      local: true,
      billing: 'gratuito',
      create: (m) => new FfmpegVideoProvider(m),
    },
    'fal-kling': {
      label: 'Montagem local + cenas animadas com Kling (fal.ai)',
      models: ['kling-3-standard'],
      env: ['FAL_KEY'],
      bins: FFMPEG_BINS,
      local: false,
      billing: 'por uso',
      create: (m) => new FfmpegVideoProvider(m, new KlingAnimator(), 'fal-kling'),
    },
  },
};

export const ROLES: ProviderRole[] = ['text', 'image', 'speech', 'music', 'video'];

const ENV_PREFIX: Record<ProviderRole, string> = {
  text: 'TEXT',
  image: 'IMAGE',
  speech: 'SPEECH',
  music: 'MUSIC',
  video: 'VIDEO',
};

const ROLE_LABEL: Record<ProviderRole, string> = {
  text: 'texto',
  image: 'imagem',
  speech: 'voz',
  music: 'música',
  video: 'vídeo',
};

/** Modelo padrão de um papel, lido do .env. Formato "provedor:modelo". */
export function defaultChoice(role: ProviderRole, env = process.env): string {
  const provider = env[`${ENV_PREFIX[role]}_PROVIDER`] || 'mock';
  const entry = REGISTRY[role][provider];
  const model = env[`${ENV_PREFIX[role]}_MODEL`] || entry?.models[0] || '';
  return `${provider}:${model}`;
}

function create(role: ProviderRole, choice: string) {
  const i = choice.indexOf(':');
  const provider = i < 0 ? choice : choice.slice(0, i);
  const model = i < 0 ? '' : choice.slice(i + 1);
  const entry = REGISTRY[role][provider] as ProviderEntry<unknown> | undefined;
  if (!entry) throw new Error(`Provedor de ${ROLE_LABEL[role]} desconhecido: "${provider}". Veja server/providers/registry.ts.`);
  const missing = entry.env.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`O provedor de ${ROLE_LABEL[role]} "${provider}" precisa de ${missing.join(', ')} no .env.`);
  return entry.create(model || entry.models[0]);
}

/**
 * Monta o conjunto de provedores para uma geração. `choice` sobrepõe o padrão do .env.
 * Cada papel só é criado quando é usado, então uma etapa de imagem não exige a chave de texto.
 */
export function resolveProviders(choice: ModelChoice = {}): ProviderSet {
  const cache: Partial<ProviderSet> = {};
  const get = <R extends ProviderRole>(role: R): ProviderSet[R] =>
    (cache[role] ??= create(role, choice[role] ?? defaultChoice(role)) as ProviderSet[R]);
  return {
    get text() {
      return get('text');
    },
    get image() {
      return get('image');
    },
    get speech() {
      return get('speech');
    },
    get music() {
      return get('music');
    },
    get video() {
      return get('video');
    },
  };
}

export interface ModelOption {
  id: string;
  provider: string;
  model: string;
  label: string;
  local: boolean;
  billing: Billing;
  available: boolean;
  /** O que falta para usar: chaves do .env ou programas a instalar. */
  missing: string[];
}

const binCache = new Map<string, { ok: boolean; at: number }>();
async function binOk(cmd: string, args?: string[]) {
  const key = `${cmd} ${args?.join(' ') ?? ''}`;
  const hit = binCache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.ok;
  const ok = await hasCommand(cmd, args);
  binCache.set(key, { ok, at: Date.now() });
  return ok;
}

/** Lista de modelos por papel, para a interface (sem expor chaves). */
export async function listModels(): Promise<{ defaults: Record<ProviderRole, string>; options: Record<ProviderRole, ModelOption[]> }> {
  const options = {} as Record<ProviderRole, ModelOption[]>;
  const defaults = {} as Record<ProviderRole, string>;
  for (const role of ROLES) {
    defaults[role] = defaultChoice(role);
    options[role] = [];
    for (const [provider, entry] of Object.entries(REGISTRY[role] as Record<string, ProviderEntry<unknown>>)) {
      const missing = entry.env.filter((k) => !process.env[k]);
      for (const b of entry.bins ?? []) if (!(await binOk(b.cmd, b.args))) missing.push(`programa ${b.cmd}`);
      for (const model of entry.models) {
        options[role].push({
          id: `${provider}:${model}`,
          provider,
          model,
          label: `${entry.label} · ${model}`,
          local: entry.local,
          billing: entry.billing,
          available: missing.length === 0,
          missing,
        });
      }
    }
  }
  return { defaults, options };
}
