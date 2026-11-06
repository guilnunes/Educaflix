import { useState } from 'react';
import { STAGE_LABELS, STAGE_ORDER, STATUS_LABELS, type Database, type Generation, type Theme, type Topic } from '../../shared/types';
import { GenerateForm, GenerationMeta, VersionHistory } from '../components/generation';
import { Badge, Empty, Spinner } from '../components/ui';
import { api, IS_LOCAL, useDb } from '../data';
import { plural } from '../format';
import { Link, navigate } from '../router';
import { themeStages, themeSummary } from '../status';

function gensFor(db: Database, targetType: Generation['target_type'], targetId: string) {
  return db.generations.filter((g) => g.target_type === targetType && g.target_id === targetId).sort((a, b) => b.version - a.version);
}

export function CatalogPage({ query }: { query: URLSearchParams }) {
  const db = useDb();
  const subjectId = query.get('materia') ?? 'matematica';
  const gradeId = query.get('serie') ?? 'ef-1';
  const subject = db.subjects.find((s) => s.id === subjectId) ?? db.subjects[0];
  const grade = db.grades.find((g) => g.id === gradeId) ?? db.grades[0];
  const course = db.courses.find((c) => c.subject_id === subject.id && c.grade_id === grade.id);
  const topics = course ? db.topics.filter((t) => t.course_id === course.id).sort((a, b) => a.sort_order - b.sort_order) : [];
  const gens = course ? gensFor(db, 'course', course.id) : [];
  const running = gens.some((g) => g.status === 'running');

  const select = (m: string, s: string) => navigate(`/?materia=${m}&serie=${s}`);

  return (
    <>
      <div className="page-head">
        <h1>Conteúdo</h1>
        <p className="muted">
          Escolha a matéria e a série. A IA lista os assuntos e depois os temas de cada assunto. Cada tema vira um vídeo, com
          aprovação humana em cada etapa.
        </p>
      </div>

      <div className="card selectors" style={{ ['--accent' as string]: subject.color }}>
        <label className="field">
          <span>Matéria</span>
          <select value={subject.id} onChange={(e) => select(e.target.value, grade.id)}>
            {[...db.subjects].sort((a, b) => a.sort_order - b.sort_order).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Série</span>
          <select value={grade.id} onChange={(e) => select(subject.id, e.target.value)}>
            {[...db.grades].sort((a, b) => a.sort_order - b.sort_order).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <div className="selector-info">
          <div>
            <span className="muted small">Faixa etária</span>
            <strong>
              {grade.age_min} a {grade.age_max} anos
            </strong>
          </div>
          <div>
            <span className="muted small">Personagem</span>
            <strong>{subject.character_name}</strong>
          </div>
          {grade.former_name && <div className="muted small">{grade.former_name}</div>}
        </div>
      </div>

      <section>
        <div className="section-head">
          <h2>Assuntos {topics.length > 0 && <span className="muted">({topics.length})</span>}</h2>
          <GenerateForm
            label={topics.length ? 'Gerar assuntos de novo' : 'Gerar assuntos com IA'}
            primary={topics.length === 0}
            roles={['text']}
            disabled={running}
            onGenerate={async (note, models) => {
              const c = course ?? (await api.ensureCourse(subject.id, grade.id));
              await api.generateTopics(c.id, note, models);
            }}
          />
        </div>
        {running && (
          <p className="generating">
            <Spinner /> Gerando assuntos…
          </p>
        )}
        <ListGenerations gens={gens} what="assuntos" />
        {topics.length === 0 && !running && (
          <Empty>
            Ainda não há assuntos para {subject.name} · {grade.name}.{' '}
            {IS_LOCAL ? 'Clique em "Gerar assuntos com IA".' : 'Gere no modo local para aparecerem aqui.'}
          </Empty>
        )}
        <div className="topics">
          {topics.map((t) => (
            <TopicCard key={t.id} topic={t} />
          ))}
        </div>
      </section>
    </>
  );
}

function ListGenerations({ gens, what }: { gens: Generation[]; what: string }) {
  const latest = gens.find((g) => g.status !== 'running') ?? gens[0];
  if (!latest) return null;
  return (
    <details className="list-gen">
      <summary>
        Lista de {what}: versão {latest.version}
        {latest.status === 'failed' && ' (falhou)'} · detalhes da geração
      </summary>
      {latest.status === 'failed' && <p className="callout danger">A última geração falhou: {latest.error}</p>}
      <GenerationMeta gen={latest} />
      <VersionHistory gens={gens} />
    </details>
  );
}

function TopicCard({ topic }: { topic: Topic }) {
  const db = useDb();
  const themes = db.themes.filter((t) => t.topic_id === topic.id).sort((a, b) => a.sort_order - b.sort_order);
  const gens = gensFor(db, 'topic', topic.id);
  const running = gens.some((g) => g.status === 'running');
  const [open, setOpen] = useState(themes.length > 0);
  const published = themes.filter((t) => t.published_at).length;

  return (
    <div className="card topic">
      <button type="button" className="topic-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div>
          <h3>{topic.title}</h3>
          <p className="muted">{topic.description}</p>
        </div>
        <div className="topic-side">
          {topic.bncc_unit && <Badge>{topic.bncc_unit}</Badge>}
          <span className="muted small">
            {themes.length ? `${plural(themes.length, 'tema', 'temas')} · ${published} publicado${published === 1 ? '' : 's'}` : 'sem temas'}
          </span>
          <span className="chev">{open ? '▾' : '▸'}</span>
        </div>
      </button>
      {open && (
        <div className="topic-body">
          <div className="section-head">
            <h4>Temas</h4>
            <GenerateForm
              label={themes.length ? 'Gerar temas de novo' : 'Gerar temas com IA'}
              primary={themes.length === 0}
              roles={['text']}
              disabled={running}
              onGenerate={(note, models) => api.generateThemes(topic.id, note, models)}
            />
          </div>
          {running && (
            <p className="generating">
              <Spinner /> Gerando temas…
            </p>
          )}
          {themes.length === 0 && !running && <Empty>Nenhum tema ainda.</Empty>}
          <ul className="theme-list">
            {themes.map((th) => (
              <ThemeRow key={th.id} theme={th} />
            ))}
          </ul>
          <ListGenerations gens={gens} what="temas" />
        </div>
      )}
    </div>
  );
}

const STAGE_ICON = {
  locked: '–',
  ready: '○',
  generating: '◌',
  awaiting_approval: '●',
  approved: '✓',
  failed: '✕',
} as const;

function ThemeRow({ theme }: { theme: Theme }) {
  const db = useDb();
  const st = themeStages(db, theme.id);
  const summary = themeSummary(db, theme);
  return (
    <li className="theme-row">
      <Link to={`/tema/${theme.id}`} className="theme-link">
        <div className="theme-main">
          <strong>{theme.title}</strong>
          <span className="muted small">{theme.summary}</span>
          <span className="chips">
            {theme.bncc_codes.map((c) => (
              <span key={c} className="chip">
                {c}
              </span>
            ))}
            {theme.people.map((p) => (
              <span key={p} className="chip chip-person" title="Pessoa citada que vira personagem">
                {p}
              </span>
            ))}
          </span>
        </div>
        <div className="theme-side">
          <div className="pills">
            {STAGE_ORDER.map((k) => {
              const s = st[k];
              if (!s) return null;
              return (
                <span key={k} className={`pill pill-${s.outdated ? 'outdated' : s.status}`} title={`${STAGE_LABELS[k]}: ${STATUS_LABELS[s.status]}${s.outdated ? ' (desatualizada)' : ''}`}>
                  {STAGE_ICON[s.status]} {STAGE_LABELS[k].split(',')[0]}
                </span>
              );
            })}
          </div>
          <Badge tone={summary.tone}>{summary.label}</Badge>
        </div>
      </Link>
    </li>
  );
}
