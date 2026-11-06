import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { FFMPEG, hasCommand, runOk } from '../server/media-tools';
import { AnthropicTextProvider } from '../server/providers/anthropic/text';
import { ClaudeCliTextProvider } from '../server/providers/claude-cli/text';
import { ElevenLabsMusicProvider } from '../server/providers/elevenlabs/music';
import { ElevenLabsSpeechProvider } from '../server/providers/elevenlabs/speech';
import { FalFluxImageProvider } from '../server/providers/fal/image';
import { KlingAnimator } from '../server/providers/fal/kling';
import { GeminiImageProvider } from '../server/providers/gemini/image';
import { LyriaMusicProvider } from '../server/providers/gemini/music';
import { PiperSpeechProvider, piperBin } from '../server/providers/piper/speech';
import { listModels, resolveProviders } from '../server/providers/registry';
import type { ImageRequest, MusicRequest, TextRequest } from '../server/providers/types';
import { parseJsonText } from '../server/providers/util';
import { SCHEMAS } from '../server/schemas';

// Testes dos provedores reais com clientes falsos: conferem o pedido enviado e a
// leitura da resposta, sem gastar crédito. O Piper (gratuito) roda de verdade
// quando está instalado.

const hasFfmpeg = await hasCommand('ffmpeg');
let mp3: Buffer;

beforeAll(async () => {
  if (!hasFfmpeg) return;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'educaflix-mp3-'));
  const file = path.join(dir, 'tom.mp3');
  await runOk(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:a', 'libmp3lame', file]);
  mp3 = await fs.readFile(file);
  await fs.rm(dir, { recursive: true, force: true });
});

const textReq: TextRequest = {
  task: 'topics',
  system: 'regras',
  prompt: 'pedido',
  schema: SCHEMAS.topics,
  context: {} as TextRequest['context'],
};

const streamOf = (b: Buffer) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new Uint8Array(b));
      c.close();
    },
  });

describe('texto', () => {
  it('Claude API: manda o schema, lê o JSON e calcula o custo', async () => {
    let sent: Record<string, unknown> = {};
    const fake = {
      beta: {
        messages: {
          create: async (body: Record<string, unknown>) => {
            sent = body;
            return {
              stop_reason: 'end_turn',
              content: [{ type: 'text', text: '{"topics":[{"title":"Números","description":"d","bncc_unit":"Números"}]}' }],
              usage: { input_tokens: 1000, output_tokens: 2000 },
            };
          },
        },
      },
    };
    const p = new AnthropicTextProvider('claude-sonnet-5-5', fake as never);
    const res = await p.generateJson<{ topics: unknown[] }>(textReq);
    expect(res.data.topics).toHaveLength(1);
    expect(sent.output_config).toEqual({ format: { type: 'json_schema', schema: SCHEMAS.topics } });
    expect(sent.fallbacks).toBe('default');
    expect(res.cost_usd).toBeCloseTo((1000 * 2 + 2000 * 10) / 1e6, 8);
  });

  it('Claude API: recusa vira erro claro', async () => {
    const fake = { beta: { messages: { create: async () => ({ stop_reason: 'refusal', content: [], usage: {} }) } } };
    await expect(new AnthropicTextProvider('claude-haiku-5-5', fake as never).generateJson(textReq)).rejects.toThrow(/recusou/);
  });

  it('Claude pela assinatura: chama o Claude Code e lê structured_output', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'educaflix-cli-'));
    const bin = path.join(dir, 'claude');
    await fs.writeFile(
      bin,
      `#!/usr/bin/env node
const args = process.argv.slice(2);
let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  const ok = args.includes('--json-schema') && args.includes('--tools') && !process.env.ANTHROPIC_API_KEY && input === 'pedido';
  console.log(JSON.stringify(ok
    ? { type: 'result', subtype: 'success', is_error: false, result: '', structured_output: { topics: [{ title: 'ok' }] }, usage: { input_tokens: 5, output_tokens: 7 } }
    : { type: 'result', subtype: 'error', is_error: true, result: 'argumentos errados: ' + args.join(' ') }));
});
`,
      { mode: 0o755 },
    );
    process.env.ANTHROPIC_API_KEY = 'nao-deve-ir-para-o-cli';
    try {
      const res = await new ClaudeCliTextProvider('sonnet', bin).generateJson<{ topics: { title: string }[] }>(textReq);
      expect(res.data.topics[0].title).toBe('ok');
      expect(res.cost_usd).toBe(0);
    } finally {
      delete process.env.ANTHROPIC_API_KEY;
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('lê JSON dentro de cerca de código', () => {
    expect(parseJsonText<{ a: number }>('Aqui:\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });
});

const imgReq = {
  prompt: 'cena',
  width: 1280,
  height: 720,
  scene: {} as ImageRequest['scene'],
  script: {} as ImageRequest['script'],
  subject: {} as ImageRequest['subject'],
  version: 1,
  references: [{ data: Buffer.from('ref'), mime: 'image/png' }],
} satisfies ImageRequest;

describe('imagem', () => {
  it('Gemini: pede 16:9, manda a referência e lê a imagem', async () => {
    let sent: { contents: { parts: unknown[] }[]; config: unknown } | undefined;
    const fake = {
      models: {
        generateContent: async (body: never) => {
          sent = body;
          return { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: Buffer.from('png').toString('base64') } }] } }] };
        },
      },
    };
    const res = await new GeminiImageProvider('gemini-3.1-flash-image', fake as never).generateImage(imgReq);
    expect(res.data.toString()).toBe('png');
    expect(res.ext).toBe('png');
    expect(sent!.config).toEqual({ responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } });
    expect(sent!.contents[0].parts).toHaveLength(2);
  });

  it('FLUX no fal: pede paisagem 16:9 e baixa a imagem', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(Buffer.from('png'))) as typeof fetch;
    try {
      let input: Record<string, unknown> = {};
      const fake = {
        subscribe: async (_id: string, o: { input: Record<string, unknown> }) => {
          input = o.input;
          return { data: { images: [{ url: 'https://x/img.png' }] }, requestId: '1' };
        },
      };
      const res = await new FalFluxImageProvider('fal-ai/flux-2/klein/4b', fake as never).generateImage(imgReq);
      expect(input.image_size).toBe('landscape_16_9');
      expect(res.data.toString()).toBe('png');
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

const musicReq: MusicRequest = {
  prompt: 'música',
  title: 'Junta, junta!',
  style: 'Marchinha alegre, 120 bpm',
  lyrics: ['Junta, junta', 'é só somar'],
  parts: [
    { label: 'Refrão', lines: ['Junta, junta', 'é só somar'] },
    { label: 'Verso', lines: ['Duas bananas', 'mais três'] },
  ],
  duration_sec: 30,
};

describe.skipIf(!hasFfmpeg)('áudio', () => {
  it('ElevenLabs voz: português, MP3, duração real', async () => {
    let args: unknown[] = [];
    const fake = { textToSpeech: { convert: async (...a: unknown[]) => ((args = a), streamOf(mp3)) } };
    const res = await new ElevenLabsSpeechProvider('eleven_v4', fake as never, 'voz-123').speak({ text: 'Olá', prompt: '', language: 'pt-BR' });
    expect(args[0]).toBe('voz-123');
    expect(args[1]).toMatchObject({ modelId: 'eleven_v4', languageCode: 'pt' });
    expect(res.ext).toBe('mp3');
    expect(res.duration_sec).toBeGreaterThan(1.5);
  });

  it('ElevenLabs música: um trecho do plano por parte da letra', async () => {
    let body: { compositionPlan: { chunks: { text: string; positiveStyles: string[] }[] }; modelId: string } | undefined;
    const fake = { music: { compose: async (b: never) => ((body = b), streamOf(mp3)) } };
    const res = await new ElevenLabsMusicProvider('music_v2_5', fake as never).compose(musicReq);
    expect(body!.modelId).toBe('music_v2_5');
    expect(body!.compositionPlan.chunks).toHaveLength(2);
    expect(body!.compositionPlan.chunks[0].text).toContain('[Refrão]');
    expect(body!.compositionPlan.chunks[0].positiveStyles).toContain('120 bpm');
    expect(res.cost_usd).toBeGreaterThan(0);
  });

  it('Lyria: lê o áudio da resposta', async () => {
    const fake = {
      models: {
        generateContent: async () => ({
          candidates: [{ content: { parts: [{ text: 'letra' }, { inlineData: { mimeType: 'audio/mpeg', data: mp3.toString('base64') } }] } }],
        }),
      },
    };
    const res = await new LyriaMusicProvider('lyria-3-clip-preview', fake as never).compose(musicReq);
    expect(res.ext).toBe('mp3');
    expect(res.cost_usd).toBe(0.04);
  });
});

describe('vídeo', () => {
  it('Kling anima a abertura e cenas espalhadas, nunca a da música', () => {
    const scenes = Array.from({ length: 8 }, (_, i) => ({ is_song: i === 6 }) as never);
    const picked = new KlingAnimator('modelo', 3).pick(scenes);
    expect(picked).toHaveLength(3);
    expect(picked).toContain(0);
    expect(picked).not.toContain(6);
  });
});

const piperVoice = path.join(process.env.PIPER_DATA_DIR || '.cache/piper', 'pt_BR-faber-medium.onnx');
const hasPiper = (await fs.stat(piperVoice).then(() => true, () => false)) && (await hasCommand(piperBin(), ['--help']));

describe.skipIf(!hasPiper)('Piper (gratuito, de verdade)', () => {
  it('fala em português e devolve WAV com duração', { timeout: 60_000 }, async () => {
    const res = await new PiperSpeechProvider().speak({ text: 'Dois mais três é igual a cinco!', prompt: '', language: 'pt-BR' });
    expect(['mp3', 'wav']).toContain(res.ext);
    expect(res.duration_sec).toBeGreaterThan(1);
    expect(res.cost_usd).toBe(0);
  });
});

describe('registro', () => {
  it('cria só o papel usado e avisa a chave que falta', () => {
    delete process.env.ANTHROPIC_API_KEY;
    const set = resolveProviders({ text: 'anthropic:claude-haiku-5-5', image: 'mock:mock-svg-v1' });
    expect(set.image.provider).toBe('mock');
    expect(() => set.text).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('lista os modelos com o tipo de cobrança e o que falta', async () => {
    const list = await listModels();
    const eleven = list.options.speech.find((o) => o.provider === 'elevenlabs')!;
    expect(eleven.billing).toBe('assinatura');
    expect(list.options.video.some((o) => o.provider === 'ffmpeg')).toBe(true);
  });
});
