import os from 'node:os';
import type { TextProvider, TextRequest, TextResult } from '../types';
import { run } from '../../media-tools';
import { parseJsonText } from '../util';

/**
 * Claude pela assinatura (Pro/Max), usando o Claude Code instalado no computador
 * (`claude -p`). Não precisa de chave de API nem de cartão: consome a cota da
 * assinatura de quem está logado no Claude Code.
 *
 * Uso pessoal: a política da Anthropic permite a assinatura para uso comum do
 * próprio assinante. Se este servidor um dia atender outras pessoas, troque para
 * o provedor "anthropic" com chave de API.
 */
export class ClaudeCliTextProvider implements TextProvider {
  readonly provider = 'claude-assinatura';

  constructor(
    readonly model = 'sonnet',
    private readonly bin = process.env.CLAUDE_CLI_PATH || 'claude',
  ) {}

  async generateJson<T>(req: TextRequest): Promise<TextResult<T>> {
    // Sem ANTHROPIC_API_KEY o Claude Code usa o login da assinatura.
    const childEnv = { ...process.env };
    delete childEnv.ANTHROPIC_API_KEY;
    const args = [
      '-p',
      'Responda ao pedido recebido pela entrada padrão.',
      '--model', this.model,
      '--output-format', 'json',
      '--json-schema', JSON.stringify(req.schema),
      '--system-prompt', req.system,
      '--tools', '',
      '--max-turns', '3',
      '--no-session-persistence',
      '--setting-sources', 'user',
    ];
    let res;
    try {
      // Roda fora do repositório para não carregar o CLAUDE.md do projeto.
      res = await run(this.bin, args, { input: req.prompt, cwd: os.tmpdir(), env: childEnv, timeoutMs: 10 * 60 * 1000 });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Claude Code não encontrado. Instale e faça login com "claude" (assinatura Pro ou Max).');
      }
      throw e;
    }
    let out: {
      is_error?: boolean;
      subtype?: string;
      result?: string;
      structured_output?: unknown;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    try {
      out = JSON.parse(res.stdout);
    } catch {
      throw new Error(`O Claude Code não devolveu JSON (código ${res.code}). ${res.stderr.trim().slice(-300)}`);
    }
    if (out.is_error || (out.subtype && out.subtype !== 'success')) {
      throw new Error(`O Claude Code falhou: ${out.result ?? out.subtype ?? 'erro desconhecido'}`);
    }
    const data = (out.structured_output ?? parseJsonText<T>(out.result ?? '')) as T;
    return {
      data,
      // Incluído na assinatura: sem custo por uso.
      cost_usd: 0,
      cost_is_estimate: true,
      usage: { input_tokens: out.usage?.input_tokens, output_tokens: out.usage?.output_tokens },
    };
  }
}
