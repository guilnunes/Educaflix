// Gera o conteúdo de demonstração (Matemática do 1º ano) com os provedores
// configurados no .env (por padrão, o mock) e grava em content/.
//
//   npm run seed:demo           # adiciona ao conteúdo que já existe
//   npm run seed:demo -- --reset  # apaga content/ e começa do zero
//
// Deixa temas em estados diferentes, para a demo mostrar o fluxo inteiro.

import fs from 'node:fs/promises';
import path from 'node:path';
import { createContext, loadEnv, ROOT } from '../server/context';

loadEnv();
const contentDir = path.join(ROOT, 'content');
if (process.argv.includes('--reset')) {
  await fs.rm(path.join(contentDir, 'db'), { recursive: true, force: true });
  await fs.rm(path.join(contentDir, 'media'), { recursive: true, force: true });
}

const { store, pipeline } = await createContext(contentDir);

const ok = async (p: Promise<{ done: Promise<{ status: string; error: string | null; id: string }> }>) => {
  const gen = await (await p).done;
  if (gen.status !== 'succeeded') throw new Error(`Geração falhou: ${gen.error}`);
  return gen;
};

const course = await pipeline.ensureCourse('matematica', 'ef-1');
await ok(pipeline.generateTopics(course.id));

let db = await store.read();
const topicByTitle = (t: string) => db.topics.find((x) => x.course_id === course.id && x.title === t)!;
await ok(pipeline.generateThemes(topicByTitle('Adição e subtração').id));
await ok(pipeline.generateThemes(topicByTitle('Números e contagem').id));
await ok(pipeline.generateThemes(topicByTitle('Formas e espaço').id));

db = await store.read();
const stage = (themeTitle: string, kind: string) => {
  const theme = db.themes.find((t) => t.title === themeTitle)!;
  return db.stages.find((s) => s.theme_id === theme.id && s.kind === kind)!;
};

// 1. Adição: as três etapas aprovadas e publicado, com uma segunda versão do roteiro.
{
  const t = 'Juntar e acrescentar: a adição';
  await ok(pipeline.generateStage(stage(t, 'script').id));
  const s2 = await ok(
    pipeline.generateStage(stage(t, 'script').id, { note: 'Troque as bananas por mangas e deixe a música mais curta.' }),
  );
  await pipeline.approve(s2.id);
  const b1 = await ok(pipeline.generateStage(stage(t, 'storyboard').id));
  await pipeline.approve(b1.id);
  const v1 = await ok(pipeline.generateStage(stage(t, 'video').id));
  await pipeline.approve(v1.id, { note: 'Aprovado para a demo.' });
}

// 2. Contagem de 10 em 10 (com o Gaussinho): roteiro aprovado, storyboard esperando aprovação.
{
  const t = 'Contando até 100 de 10 em 10';
  const s1 = await ok(pipeline.generateStage(stage(t, 'script').id));
  await pipeline.approve(s1.id);
  await ok(pipeline.generateStage(stage(t, 'storyboard').id));
}

// 3. Subtração: roteiro esperando aprovação.
await ok(pipeline.generateStage(stage('Separar e retirar: a subtração', 'script').id));

// 4. Formas (com a Tarsila do Amaral): roteiro esperando aprovação.
await ok(pipeline.generateStage(stage('Círculo, quadrado, triângulo e retângulo', 'script').id));

db = await store.read();
console.log(
  `Pronto: ${db.topics.length} assuntos, ${db.themes.length} temas, ${db.generations.length} versões, ${db.model_calls.length} chamadas de modelo.`,
);
