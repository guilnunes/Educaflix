// Utilidades comuns dos provedores reais.

/** Lê JSON de uma resposta de texto, tolerando cercas de código (```json). */
export function parseJsonText<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : trimmed;
  const start = body.search(/[[{]/);
  if (start < 0) throw new Error('A resposta do modelo não trouxe JSON.');
  try {
    return JSON.parse(body.slice(start)) as T;
  } catch {
    const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
    try {
      return JSON.parse(body.slice(start, end + 1)) as T;
    } catch {
      throw new Error('A resposta do modelo não é um JSON válido.');
    }
  }
}

/** Junta um ReadableStream (web) num Buffer. */
export async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Baixa um arquivo gerado (ex.: URL devolvida pelo fal). */
export async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Não consegui baixar o arquivo gerado (HTTP ${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

/** Lê uma variável obrigatória do ambiente. */
export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name} no .env.`);
  return v;
}

export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
