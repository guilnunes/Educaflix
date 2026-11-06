import { useState } from 'react';
import type { Generation, ModelCall } from '../../shared/types';
import { IS_LOCAL, useData, useDb, type ModelChoice, type Role } from '../data';
import { dateTime, duration, usd } from '../format';
import { ActionButton, Badge } from './ui';

export const ROLE_LABELS: Record<Role, string> = {
  text: 'Texto',
  image: 'Imagem',
  speech: 'Voz',
  music: 'Música',
  video: 'Vídeo',
};

/**
 * Botão "Gerar" / "Gerar de novo" que abre um formulário com a observação
 * opcional (vai para o prompt) e a escolha de modelo por tipo.
 */
export function GenerateForm({
  label,
  roles,
  onGenerate,
  disabled,
  disabledReason,
  primary,
}: {
  label: string;
  roles: Role[];
  onGenerate: (note: string | null, models: ModelChoice) => Promise<unknown>;
  disabled?: boolean;
  disabledReason?: string;
  primary?: boolean;
}) {
  const { run, models: list } = useData();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [choice, setChoice] = useState<ModelChoice>({});
  const [busy, setBusy] = useState(false);

  if (!open || !IS_LOCAL) {
    return (
      <ActionButton variant={primary ? 'primary' : 'secondary'} onClick={() => setOpen(true)} disabled={disabled} title={disabledReason}>
        {label}
      </ActionButton>
    );
  }

  const submit = async () => {
    setBusy(true);
    const ok = await run(() => onGenerate(note.trim() || null, choice), 'Geração iniciada.');
    setBusy(false);
    if (ok) {
      setOpen(false);
      setNote('');
    }
  };

  return (
    <div className="gen-form">
      <label className="field">
        <span>Observação para a IA (opcional)</span>
        <textarea
          rows={3}
          value={note}
          placeholder="Ex.: deixe a música mais curta e use frutas brasileiras."
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      {list && (
        <div className="model-picks">
          {roles.map((role) => (
            <label key={role} className="field inline">
              <span>{ROLE_LABELS[role]}</span>
              <select value={choice[role] ?? list.defaults[role]} onChange={(e) => setChoice({ ...choice, [role]: e.target.value })}>
                {list.options[role].map((o) => (
                  <option key={o.id} value={o.id} disabled={!o.available}>
                    {o.label} · {o.billing}
                    {o.available ? '' : ` (falta ${o.missing.join(', ')})`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? 'Enviando…' : 'Gerar'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function callsOf(calls: ModelCall[], gen: Generation) {
  return calls.filter((c) => c.generation_id === gen.id);
}

/** Modelos distintos usados numa geração, ex.: "Texto: mock/mock-texto-v1". */
export function modelsUsed(calls: ModelCall[]) {
  const seen = new Map<string, string>();
  for (const c of calls) seen.set(`${c.role}|${c.provider}/${c.model}`, `${ROLE_LABELS[c.role]}: ${c.provider}/${c.model}`);
  return [...seen.values()];
}

/** Metadados de uma versão: modelos, custo, tempo, data, skill e prompts enviados. */
export function GenerationMeta({ gen }: { gen: Generation }) {
  const db = useDb();
  const calls = callsOf(db.model_calls, gen);
  return (
    <div className="gen-meta">
      <dl className="meta-grid">
        <div>
          <dt>Versão</dt>
          <dd>v{gen.version}</dd>
        </div>
        <div>
          <dt>Modelos</dt>
          <dd>{modelsUsed(calls).join(' · ') || '—'}</dd>
        </div>
        <div>
          <dt>Custo estimado</dt>
          <dd>{usd(gen.cost_usd)}</dd>
        </div>
        <div>
          <dt>Tempo de geração</dt>
          <dd>{gen.status === 'running' ? '…' : duration(gen.duration_ms)}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{dateTime(gen.created_at)}</dd>
        </div>
        <div>
          <dt>Skill</dt>
          <dd>
            v{gen.skill_version} <code>{gen.skill_hash}</code>
          </dd>
        </div>
      </dl>
      {gen.note && (
        <p className="note">
          <strong>Observação desta versão:</strong> {gen.note}
        </p>
      )}
      {calls.length > 0 && (
        <details className="prompts">
          <summary>Ver os prompts enviados ({calls.length} {calls.length === 1 ? 'chamada' : 'chamadas'})</summary>
          {calls.map((c) => (
            <div key={c.id} className="prompt">
              <div className="prompt-head">
                <strong>{c.purpose}</strong>
                <span>
                  {ROLE_LABELS[c.role]} · {c.provider}/{c.model} · {usd(c.cost_usd)}
                  {c.cost_is_estimate ? ' (estimado)' : ''} · {duration(c.duration_ms)}
                </span>
              </div>
              <pre>{c.prompt}</pre>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

/** Histórico de versões de um alvo (curso, assunto ou etapa). */
export function VersionHistory({
  gens,
  selectedId,
  approvedId,
  onSelect,
}: {
  gens: Generation[];
  selectedId?: string | null;
  approvedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const db = useDb();
  if (gens.length === 0) return null;
  return (
    <details className="history" open={gens.length > 1}>
      <summary>Histórico de versões ({gens.length})</summary>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Versão</th>
              <th>Data</th>
              <th>Modelos</th>
              <th className="num">Custo</th>
              <th className="num">Tempo</th>
              <th>Observação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {gens.map((g) => (
              <tr
                key={g.id}
                className={`${g.id === selectedId ? 'selected' : ''} ${onSelect ? 'clickable' : ''}`}
                onClick={() => onSelect?.(g.id)}
              >
                <td>
                  v{g.version}{' '}
                  {g.id === approvedId && <Badge tone="ok">aprovada</Badge>}
                  {g.status === 'running' && <Badge tone="info">gerando</Badge>}
                  {g.status === 'failed' && <Badge tone="danger">falhou</Badge>}
                </td>
                <td>{dateTime(g.created_at)}</td>
                <td className="small">{modelsUsed(callsOf(db.model_calls, g)).join(', ') || '—'}</td>
                <td className="num">{usd(g.cost_usd)}</td>
                <td className="num">{g.status === 'running' ? '…' : duration(g.duration_ms)}</td>
                <td className="small">{g.note ?? '—'}</td>
                <td>{onSelect && g.id !== selectedId && <span className="link">ver</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
