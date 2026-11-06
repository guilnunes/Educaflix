import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { TABLES, type Database, type TableName } from '../shared/types';
import { GRADES, SUBJECTS } from './seed-data';

export const newId = () => randomUUID();
export const nowIso = () => new Date().toISOString();

/**
 * Armazenamento em arquivos JSON: uma tabela por arquivo em <content>/db.
 * Mídias ficam em <content>/media. Todas as escritas passam por uma fila,
 * então duas gerações nunca gravam ao mesmo tempo.
 *
 * Para migrar para um banco (ex.: Supabase), basta trocar esta classe por outra
 * com os mesmos métodos read() e transact().
 */
export class JsonStore {
  readonly dbDir: string;
  readonly mediaDir: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(readonly contentDir: string) {
    this.dbDir = path.join(contentDir, 'db');
    this.mediaDir = path.join(contentDir, 'media');
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dbDir, { recursive: true });
    await fs.mkdir(this.mediaDir, { recursive: true });
    for (const table of TABLES) {
      const file = this.tableFile(table);
      if (await exists(file)) continue;
      const rows = table === 'subjects' ? SUBJECTS : table === 'grades' ? GRADES : [];
      await writeJsonAtomic(file, rows);
    }
  }

  /** Lê uma cópia de todas as tabelas. */
  async read(): Promise<Database> {
    await this.queue.catch(() => undefined);
    return this.readAll();
  }

  /**
   * Lê o banco, executa `fn` (que pode alterar as tabelas) e grava só as tabelas
   * que mudaram. As transações rodam uma de cada vez.
   */
  transact<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
    const run = async () => {
      const db = await this.readAll();
      const before = new Map(TABLES.map((t) => [t, JSON.stringify(db[t])]));
      const result = await fn(db);
      for (const table of TABLES) {
        if (JSON.stringify(db[table]) !== before.get(table)) {
          await writeJsonAtomic(this.tableFile(table), db[table]);
        }
      }
      return result;
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  /** Grava um arquivo de mídia e devolve o caminho relativo a content/ (ex.: "media/..."). */
  async writeMedia(relativeToMedia: string, data: Buffer | string): Promise<string> {
    const abs = path.join(this.mediaDir, relativeToMedia);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, data);
    return path.posix.join('media', relativeToMedia.split(path.sep).join('/'));
  }

  /** Caminho absoluto de um arquivo a partir do caminho relativo a content/. */
  resolve(contentRelative: string): string {
    return path.join(this.contentDir, contentRelative);
  }

  private tableFile(table: TableName) {
    return path.join(this.dbDir, `${table}.json`);
  }

  private async readAll(): Promise<Database> {
    const entries = await Promise.all(
      TABLES.map(async (table) => {
        const file = this.tableFile(table);
        const rows = (await exists(file)) ? JSON.parse(await fs.readFile(file, 'utf8')) : [];
        return [table, rows] as const;
      }),
    );
    return Object.fromEntries(entries) as unknown as Database;
  }
}

async function exists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function writeJsonAtomic(file: string, data: unknown) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fs.rename(tmp, file);
}
