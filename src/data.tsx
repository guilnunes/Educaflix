import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { TABLES, type Database, type Generation } from '../shared/types';

/**
 * Modo local (npm run dev): lê e grava pela API do servidor Node.
 * Modo publicado (GitHub Pages): lê os JSON de content/ e não grava nada.
 */
export const IS_LOCAL = import.meta.env.DEV;
const BASE = import.meta.env.BASE_URL;

export const LOCAL_ONLY_HINT = 'Só funciona no modo local (npm run dev).';

export const mediaUrl = (contentPath: string) => `${BASE}content/${contentPath}`;

async function loadDb(): Promise<Database> {
  if (IS_LOCAL) return request<Database>('GET', '/api/db');
  const entries = await Promise.all(
    TABLES.map(async (t) => {
      const res = await fetch(`${BASE}content/db/${t}.json`, { cache: 'no-store' });
      return [t, res.ok ? await res.json() : []] as const;
    }),
  );
  return Object.fromEntries(entries) as unknown as Database;
}

async function request<T>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Não consegui falar com o servidor local. Ele está rodando (npm run dev)?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Erro ${res.status} no servidor local.`);
  return data as T;
}

export type ModelChoice = Partial<Record<Role, string>>;
export type Role = 'text' | 'image' | 'speech' | 'music' | 'video';

export interface ModelOption {
  id: string;
  provider: string;
  model: string;
  label: string;
  local: boolean;
  billing: 'gratuito' | 'assinatura' | 'por uso';
  available: boolean;
  missing: string[];
}

export interface ModelList {
  defaults: Record<Role, string>;
  options: Record<Role, ModelOption[]>;
}

export const api = {
  ensureCourse: (subject_id: string, grade_id: string) => request<{ id: string }>('POST', '/api/courses', { subject_id, grade_id }),
  generateTopics: (courseId: string, note: string | null, models: ModelChoice) =>
    request<{ generation: Generation }>('POST', `/api/courses/${courseId}/topics`, { note, models }),
  generateThemes: (topicId: string, note: string | null, models: ModelChoice) =>
    request<{ generation: Generation }>('POST', `/api/topics/${topicId}/themes`, { note, models }),
  generateStage: (stageId: string, note: string | null, models: ModelChoice) =>
    request<{ generation: Generation }>('POST', `/api/stages/${stageId}/generate`, { note, models }),
  approve: (generationId: string, note: string | null) =>
    request<unknown>('POST', `/api/generations/${generationId}/approve`, { note }),
  models: () => request<ModelList>('GET', '/api/models'),
};

interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'error';
}

interface DataState {
  db: Database | null;
  error: string | null;
  refresh: () => Promise<void>;
  /** Executa uma ação, mostra erro se falhar e recarrega os dados. */
  run: (fn: () => Promise<unknown>, success?: string) => Promise<boolean>;
  toasts: Toast[];
  models: ModelList | null;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [models, setModels] = useState<ModelList | null>(null);
  const toastId = useRef(0);

  const refresh = useCallback(async () => {
    try {
      setDb(await loadDb());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const toast = useCallback((text: string, tone: Toast['tone']) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<unknown>, success?: string) => {
      try {
        await fn();
        if (success) toast(success, 'ok');
        await refresh();
        return true;
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), 'error');
        await refresh();
        return false;
      }
    },
    [refresh, toast],
  );

  useEffect(() => {
    void refresh();
    if (IS_LOCAL) api.models().then(setModels).catch(() => setModels(null));
  }, [refresh]);

  // Enquanto houver geração rodando, atualiza a cada segundo.
  const running = db?.generations.some((g) => g.status === 'running') ?? false;
  useEffect(() => {
    if (!IS_LOCAL || !running) return;
    const t = setInterval(() => void refresh(), 1000);
    return () => clearInterval(t);
  }, [running, refresh]);

  const value = useMemo(() => ({ db, error, refresh, run, toasts, models }), [db, error, refresh, run, toasts, models]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData fora do DataProvider');
  return ctx;
}

export function useDb(): Database {
  const { db } = useData();
  if (!db) throw new Error('Banco ainda não carregado');
  return db;
}
