import { useState } from 'react';
import { KIND_LABELS, MEDIA_LABELS, type Database, type MediaType, type ModelCall } from '../../shared/types';
import { ROLE_LABELS } from '../components/generation';
import { Empty } from '../components/ui';
import { IS_LOCAL, useData, useDb } from '../data';
import { dateTime, duration, percent, usd } from '../format';
import { Link } from '../router';

const STAGE_KINDS = new Set(['script', 'storyboard', 'video']);

interface Row {
  key: string;
  media: MediaType;
  role: ModelCall['role'];
  model: string;
  kind?: string;
  calls: number;
  cost: number;
  ms: number;
  gens: Set<string>;
  stageGens: Set<string>;
  approved: Set<string>;
  last: string;
}

function aggregate(db: Database, calls: ModelCall[], withKind: boolean): Row[] {
  const approved = new Set(db.approvals.map((a) => a.generation_id));
  const genKind = new Map(db.generations.map((g) => [g.id, g.kind]));
  const rows = new Map<string, Row>();
  for (const c of calls) {
    const kind = genKind.get(c.generation_id) ?? '?';
    const model = `${c.provider}/${c.model}`;
    const key = `${c.media_type}|${c.role}|${model}${withKind ? `|${kind}` : ''}`;
    let r = rows.get(key);
    if (!r) {
      r = { key, media: c.media_type, role: c.role, model, kind: withKind ? kind : undefined, calls: 0, cost: 0, ms: 0, gens: new Set(), stageGens: new Set(), approved: new Set(), last: c.created_at };
      rows.set(key, r);
    }
    r.calls++;
    r.cost += c.cost_usd;
    r.ms += c.duration_ms;
    r.gens.add(c.generation_id);
    if (STAGE_KINDS.has(kind)) {
      r.stageGens.add(c.generation_id);
      if (approved.has(c.generation_id)) r.approved.add(c.generation_id);
    }
    if (c.created_at > r.last) r.last = c.created_at;
  }
  return [...rows.values()].sort((a, b) => a.media.localeCompare(b.media) || a.role.localeCompare(b.role) || b.calls - a.calls);
}

export function ComparePage() {
  const db = useDb();
  const { models } = useData();
  const [media, setMedia] = useState<MediaType | 'all'>('all');
  const calls = db.model_calls.filter((c) => media === 'all' || c.media_type === media);
  const byModel = aggregate(db, calls, false);
  const byStage = aggregate(db, calls, true);
  // Mais novas primeiro; no empate de horário, mantém a ordem em que foram feitas.
  const recent = [...calls].reverse().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30);
  const totalCost = calls.reduce((s, c) => s + c.cost_usd, 0);
  const totalMs = calls.reduce((s, c) => s + c.duration_ms, 0);
  const genById = new Map(db.generations.map((g) => [g.id, g]));
  const themeById = new Map(db.themes.map((t) => [t.id, t]));

  return (
    <>
      <div className="page-head">
        <h1>Comparar modelos</h1>
        <p className="muted">
          Montada a partir dos metadados de cada geração: modelo, custo estimado, tempo e se a versão foi aprovada. Para
          comparar dois modelos, gere a mesma etapa de novo escolhendo outro modelo no botão “Gerar de novo”.
        </p>
      </div>

      <div className="tabs" role="tablist">
        {(['all', 'text', 'image', 'audio', 'video'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={media === m} className={media === m ? 'active' : ''} onClick={() => setMedia(m)}>
            {m === 'all' ? 'Todos' : MEDIA_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="stats">
        <div className="stat">
          <span>Chamadas</span>
          <strong>{calls.length}</strong>
        </div>
        <div className="stat">
          <span>Custo estimado</span>
          <strong>{usd(totalCost)}</strong>
        </div>
        <div className="stat">
          <span>Tempo de geração</span>
          <strong>{duration(totalMs)}</strong>
        </div>
        <div className="stat">
          <span>Modelos usados</span>
          <strong>{new Set(byModel.map((r) => `${r.role}|${r.model}`)).size}</strong>
        </div>
      </div>

      {calls.length === 0 ? (
        <Empty>Nenhuma chamada de modelo registrada para este tipo ainda.</Empty>
      ) : (
        <>
          <section className="card">
            <h3>Por modelo</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Papel</th>
                    <th>Modelo</th>
                    <th className="num">Chamadas</th>
                    <th className="num">Versões</th>
                    <th className="num">Aprovação</th>
                    <th className="num">Custo total</th>
                    <th className="num">Custo médio</th>
                    <th className="num">Tempo médio</th>
                    <th>Último uso</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.map((r) => (
                    <tr key={r.key}>
                      <td>{MEDIA_LABELS[r.media]}</td>
                      <td>{ROLE_LABELS[r.role]}</td>
                      <td>
                        <code>{r.model}</code>
                      </td>
                      <td className="num">{r.calls}</td>
                      <td className="num">{r.gens.size}</td>
                      <td className="num">
                        {r.stageGens.size ? `${r.approved.size}/${r.stageGens.size} (${percent(r.approved.size / r.stageGens.size)})` : '—'}
                      </td>
                      <td className="num">{usd(r.cost)}</td>
                      <td className="num">{usd(r.cost / r.calls)}</td>
                      <td className="num">{duration(r.ms / r.calls)}</td>
                      <td>{dateTime(r.last)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">
              Aprovação: versões aprovadas sobre versões geradas nas etapas de roteiro, storyboard e vídeo. Custo e tempo médios são
              por chamada.
            </p>
          </section>

          <section className="card">
            <h3>Por etapa</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Papel</th>
                    <th>Modelo</th>
                    <th className="num">Chamadas</th>
                    <th className="num">Custo médio por versão</th>
                    <th className="num">Tempo médio por chamada</th>
                  </tr>
                </thead>
                <tbody>
                  {byStage.map((r) => (
                    <tr key={r.key}>
                      <td>{KIND_LABELS[r.kind as keyof typeof KIND_LABELS] ?? r.kind}</td>
                      <td>{ROLE_LABELS[r.role]}</td>
                      <td>
                        <code>{r.model}</code>
                      </td>
                      <td className="num">{r.calls}</td>
                      <td className="num">{usd(r.cost / r.gens.size)}</td>
                      <td className="num">{duration(r.ms / r.calls)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h3>Chamadas recentes</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Etapa</th>
                    <th>Tema</th>
                    <th>Para quê</th>
                    <th>Modelo</th>
                    <th className="num">Custo</th>
                    <th className="num">Tempo</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((c) => {
                    const g = genById.get(c.generation_id);
                    const theme = g?.theme_id ? themeById.get(g.theme_id) : undefined;
                    return (
                      <tr key={c.id}>
                        <td>{dateTime(c.created_at)}</td>
                        <td>
                          {g ? KIND_LABELS[g.kind] : '—'} {g && <span className="muted">v{g.version}</span>}
                        </td>
                        <td>{theme ? <Link to={`/tema/${theme.id}`}>{theme.title}</Link> : '—'}</td>
                        <td>{c.purpose}</td>
                        <td>
                          <code>
                            {c.provider}/{c.model}
                          </code>
                        </td>
                        <td className="num">{usd(c.cost_usd)}</td>
                        <td className="num">{duration(c.duration_ms)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {IS_LOCAL && models && (
        <section className="card">
          <h3>Modelos configurados no .env</h3>
          <ul className="plain">
            {(Object.keys(models.defaults) as (keyof typeof models.defaults)[]).map((role) => (
              <li key={role}>
                <strong>{ROLE_LABELS[role]}:</strong> <code>{models.defaults[role]}</code>{' '}
                <span className="muted small">({models.options[role].length} opção{models.options[role].length === 1 ? '' : 'ões'} registrada{models.options[role].length === 1 ? '' : 's'})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
