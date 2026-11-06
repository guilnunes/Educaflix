import { STAGE_LABELS, STAGE_ORDER, STATUS_LABELS, type Database, type Stage, type StageKind, type Theme } from '../shared/types';

export type Tone = 'neutral' | 'info' | 'warn' | 'ok' | 'danger' | 'muted';

export const STATUS_TONE: Record<Stage['status'], Tone> = {
  locked: 'muted',
  ready: 'neutral',
  generating: 'info',
  awaiting_approval: 'warn',
  approved: 'ok',
  failed: 'danger',
};

export function themeStages(db: Database, themeId: string): Record<StageKind, Stage | undefined> {
  const out = {} as Record<StageKind, Stage | undefined>;
  for (const k of STAGE_ORDER) out[k] = db.stages.find((s) => s.theme_id === themeId && s.kind === k);
  return out;
}

/** Resumo do andamento de um tema: a primeira etapa que ainda pede atenção. */
export function themeSummary(db: Database, theme: Theme): { label: string; tone: Tone } {
  const st = themeStages(db, theme.id);
  const anyOutdated = STAGE_ORDER.some((k) => st[k]?.outdated);
  if (theme.published_at && !anyOutdated) return { label: 'Publicado', tone: 'ok' };
  for (const k of STAGE_ORDER) {
    const s = st[k];
    if (!s) continue;
    if (s.status !== 'approved' || s.outdated) {
      const status = s.outdated ? 'desatualizado' : STATUS_LABELS[s.status].toLowerCase();
      return { label: `${STAGE_LABELS[k]}: ${status}`, tone: s.outdated ? 'warn' : STATUS_TONE[s.status] };
    }
  }
  return { label: 'Pronto', tone: 'ok' };
}
