import fs from 'node:fs';
import path from 'node:path';
import { Pipeline } from './pipeline';
import { Skills } from './skills';
import { JsonStore } from './store';

export const ROOT = path.resolve(import.meta.dirname, '..');

/** Carrega o .env (se existir). As chaves ficam só no processo do servidor. */
export function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

export async function createContext(contentDir = process.env.CONTENT_DIR ?? path.join(ROOT, 'content')) {
  const store = new JsonStore(contentDir);
  await store.init();
  const skills = new Skills(path.join(ROOT, 'skills'));
  const pipeline = new Pipeline({ store, skills });
  return { store, skills, pipeline };
}
