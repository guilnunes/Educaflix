import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createContext, loadEnv } from './context';
import { FlowError, type Started } from './pipeline';
import { listModels } from './providers/registry';
import type { ModelChoice } from './providers/types';

// Servidor local do admin. Chama os modelos, grava em content/ e registra aprovações.
// Escuta só em 127.0.0.1: não fica exposto na rede.

loadEnv();
const PORT = Number(process.env.API_PORT ?? 8787);
const { store, pipeline } = await createContext();

const interrupted = await pipeline.recoverInterrupted();
if (interrupted) console.log(`${interrupted} geração(ões) interrompida(s) marcadas como falha.`);

type Handler = (params: string[], body: Record<string, unknown>) => Promise<unknown>;
const routes: { method: string; pattern: RegExp; handler: Handler }[] = [];
const route = (method: string, pattern: RegExp, handler: Handler) => routes.push({ method, pattern, handler });

const opts = (body: Record<string, unknown>) => ({
  note: typeof body.note === 'string' ? body.note : null,
  models: (body.models ?? {}) as ModelChoice,
});

/** Começa a geração e responde na hora; o resultado aparece no banco quando terminar. */
const background = (started: Started) => {
  started.done.catch((e) => console.error('Erro na geração:', e));
  return { generation: started.generation };
};

route('GET', /^\/api\/health$/, async () => ({ ok: true, mode: 'local' }));
route('GET', /^\/api\/db$/, async () => store.read());
route('GET', /^\/api\/models$/, async () => listModels());
route('POST', /^\/api\/courses$/, async (_, b) => pipeline.ensureCourse(String(b.subject_id), String(b.grade_id)));
route('POST', /^\/api\/courses\/([\w-]+)\/topics$/, async ([id], b) => background(await pipeline.generateTopics(id, opts(b))));
route('POST', /^\/api\/topics\/([\w-]+)\/themes$/, async ([id], b) => background(await pipeline.generateThemes(id, opts(b))));
route('POST', /^\/api\/stages\/([\w-]+)\/generate$/, async ([id], b) => background(await pipeline.generateStage(id, opts(b))));
route('POST', /^\/api\/generations\/([\w-]+)\/approve$/, async ([id], b) => ({
  approval: await pipeline.approve(id, { note: typeof b.note === 'string' ? b.note : null }),
}));

const MIME: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
};

async function serveContent(urlPath: string, res: http.ServerResponse) {
  const rel = decodeURIComponent(urlPath.replace(/^\/content\//, ''));
  const abs = path.resolve(store.contentDir, rel);
  if (!abs.startsWith(path.resolve(store.contentDir) + path.sep)) return send(res, 403, { error: 'Caminho inválido.' });
  try {
    const data = await fs.readFile(abs);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    send(res, 404, { error: 'Arquivo não encontrado.' });
  }
}

function send(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname.startsWith('/content/')) return await serveContent(url.pathname, res);
    for (const r of routes) {
      const m = req.method === r.method && url.pathname.match(r.pattern);
      if (m) return send(res, 200, await r.handler(m.slice(1), req.method === 'POST' ? await readBody(req) : {}));
    }
    send(res, 404, { error: 'Rota não encontrada.' });
  } catch (e) {
    const status = e instanceof FlowError ? e.status : 500;
    const message = e instanceof Error ? e.message : String(e);
    if (status >= 500) console.error(e);
    send(res, status, { error: message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`API local da Educaflix em http://localhost:${PORT} (conteúdo em ${store.contentDir})`);
});
