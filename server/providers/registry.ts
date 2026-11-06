import { MockMusicProvider, MockSpeechProvider } from './mock/audio';
import { MockImageProvider } from './mock/image';
import { MockTextProvider } from './mock/text';
import { MockVideoProvider } from './mock/video';
import type { ModelChoice, ProviderRole, ProviderSet } from './types';

// Registro de provedores por papel (texto, imagem, voz, música, vídeo).
//
// Para adicionar um provedor real:
//   1. crie a classe em server/providers/<nome>/ implementando a interface do papel;
//   2. registre aqui, com os modelos aceitos e as variáveis de ambiente que exige;
//   3. escolha o padrão no .env (ex.: TEXT_PROVIDER=<nome> e TEXT_MODEL=<modelo>).

interface ProviderEntry<T> {
  label: string;
  models: string[];
  /** Variáveis de ambiente obrigatórias (chaves de API). */
  env: string[];
  /** Roda na máquina, sem serviço externo. */
  local: boolean;
  create: (model: string) => T;
}

type Registry = { [R in ProviderRole]: Record<string, ProviderEntry<ProviderSet[R]>> };

export const REGISTRY: Registry = {
  text: {
    mock: { label: 'Mock (exemplo)', models: ['mock-texto-v1'], env: [], local: true, create: (m) => new MockTextProvider(m) },
  },
  image: {
    mock: { label: 'Mock (SVG)', models: ['mock-svg-v1'], env: [], local: true, create: (m) => new MockImageProvider(m) },
  },
  speech: {
    mock: { label: 'Mock (voz do navegador)', models: ['mock-voz-navegador'], env: [], local: true, create: (m) => new MockSpeechProvider(m) },
  },
  music: {
    mock: { label: 'Mock (jingle WAV)', models: ['mock-jingle-v1'], env: [], local: true, create: (m) => new MockMusicProvider(m) },
  },
  video: {
    mock: { label: 'Mock (animatic)', models: ['mock-animatic-v1'], env: [], local: true, create: (m) => new MockVideoProvider(m) },
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

/** Modelo padrão de um papel, lido do .env. Formato "provedor:modelo". */
export function defaultChoice(role: ProviderRole, env = process.env): string {
  const provider = env[`${ENV_PREFIX[role]}_PROVIDER`] || 'mock';
  const entry = REGISTRY[role][provider];
  const model = env[`${ENV_PREFIX[role]}_MODEL`] || entry?.models[0] || '';
  return `${provider}:${model}`;
}

function parseChoice(role: ProviderRole, choice: string) {
  const [provider, ...rest] = choice.split(':');
  const model = rest.join(':');
  const entry = REGISTRY[role][provider];
  if (!entry) throw new Error(`Provedor de ${role} desconhecido: "${provider}". Veja server/providers/registry.ts.`);
  const missing = entry.env.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`O provedor "${provider}" precisa de ${missing.join(', ')} no .env.`);
  return entry.create(model || entry.models[0]);
}

/** Monta o conjunto de provedores para uma geração. `choice` sobrepõe o padrão do .env. */
export function resolveProviders(choice: ModelChoice = {}): ProviderSet {
  return {
    text: parseChoice('text', choice.text ?? defaultChoice('text')) as ProviderSet['text'],
    image: parseChoice('image', choice.image ?? defaultChoice('image')) as ProviderSet['image'],
    speech: parseChoice('speech', choice.speech ?? defaultChoice('speech')) as ProviderSet['speech'],
    music: parseChoice('music', choice.music ?? defaultChoice('music')) as ProviderSet['music'],
    video: parseChoice('video', choice.video ?? defaultChoice('video')) as ProviderSet['video'],
  };
}

export interface ModelOption {
  id: string;
  provider: string;
  model: string;
  label: string;
  local: boolean;
  available: boolean;
  missing_env: string[];
}

/** Lista de modelos por papel, para a interface (sem expor chaves). */
export function listModels(): { defaults: Record<ProviderRole, string>; options: Record<ProviderRole, ModelOption[]> } {
  const options = {} as Record<ProviderRole, ModelOption[]>;
  const defaults = {} as Record<ProviderRole, string>;
  for (const role of ROLES) {
    defaults[role] = defaultChoice(role);
    options[role] = Object.entries(REGISTRY[role] as Record<string, ProviderEntry<unknown>>).flatMap(([provider, entry]) => {
      const missing = entry.env.filter((k) => !process.env[k]);
      return entry.models.map((model) => ({
        id: `${provider}:${model}`,
        provider,
        model,
        label: `${entry.label} · ${model}`,
        local: entry.local,
        available: missing.length === 0,
        missing_env: missing,
      }));
    });
  }
  return { defaults, options };
}
