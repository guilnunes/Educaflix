import Anthropic from '@anthropic-ai/sdk';
import type { TextProvider, TextRequest, TextResult } from '../types';
import { parseJsonText, round6 } from '../util';

/** Preço por milhão de tokens (entrada, saída), tabela oficial de outubro de 2026. */
const PRICES: Record<string, [number, number]> = {
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
};

type MessagesClient = Pick<Anthropic, 'beta'>;

/**
 * Claude pela API da Anthropic (cobrança por uso, chave ANTHROPIC_API_KEY).
 * Usa saída estruturada (JSON Schema) para receber exatamente o formato pedido.
 * Em Sonnet e Opus liga o modo de reserva automático da Anthropic: se o modelo
 * recusar o pedido, a própria API tenta outro modelo na mesma chamada.
 */
export class AnthropicTextProvider implements TextProvider {
  readonly provider = 'anthropic';
  private client?: MessagesClient;

  constructor(
    readonly model = 'claude-haiku-5-5',
    client?: MessagesClient,
  ) {
    this.client = client;
  }

  async generateJson<T>(req: TextRequest): Promise<TextResult<T>> {
    const client = (this.client ??= new Anthropic());
    const withFallback = !this.model.includes('haiku');
    const res = await client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: req.system,
      messages: [{ role: 'user', content: req.prompt }],
      output_config: { format: { type: 'json_schema', schema: req.schema } },
      ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    });
    if (res.stop_reason === 'refusal') {
      throw new Error(`O modelo recusou o pedido${res.stop_details?.explanation ? `: ${res.stop_details.explanation}` : '.'}`);
    }
    if (res.stop_reason === 'max_tokens') throw new Error('A resposta passou do limite de tamanho e veio cortada.');
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const [pin, pout] = PRICES[this.model] ?? [0, 0];
    const usage = res.usage;
    return {
      data: parseJsonText<T>(text),
      cost_usd: round6((usage.input_tokens * pin + usage.output_tokens * pout) / 1e6),
      cost_is_estimate: !(this.model in PRICES),
      usage: { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens },
    };
  }
}
