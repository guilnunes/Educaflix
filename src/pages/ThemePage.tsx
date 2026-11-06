import { STAGE_LABELS, STAGE_ORDER, type Stage, type StageKind } from '../../shared/types';
import { StageCard } from '../components/StageCard';
import { Badge, Empty } from '../components/ui';
import { useDb } from '../data';
import { dateTime } from '../format';
import { Link } from '../router';
import { themeStages, themeSummary } from '../status';

export function ThemePage({ id }: { id: string }) {
  const db = useDb();
  const theme = db.themes.find((t) => t.id === id);
  if (!theme) {
    return (
      <Empty>
        Tema não encontrado. Talvez a lista de temas tenha sido gerada de novo. <Link to="/">Voltar para o conteúdo</Link>
      </Empty>
    );
  }
  const topic = db.topics.find((t) => t.id === theme.topic_id);
  const course = db.courses.find((c) => c.id === topic?.course_id);
  const subject = db.subjects.find((s) => s.id === course?.subject_id);
  const grade = db.grades.find((g) => g.id === course?.grade_id);
  const st = themeStages(db, theme.id);
  const summary = themeSummary(db, theme);

  return (
    <div style={{ ['--accent' as string]: subject?.color }}>
      <nav className="crumbs">
        <Link to={`/?materia=${subject?.id}&serie=${grade?.id}`}>
          {subject?.name} · {grade?.name}
        </Link>
        <span>›</span>
        <span>{topic?.title}</span>
      </nav>

      <div className="page-head theme-head">
        <h1>{theme.title}</h1>
        <p className="lead">{theme.summary}</p>
        <dl className="meta-grid">
          <div>
            <dt>Objetivo de aprendizagem</dt>
            <dd>{theme.learning_goal}</dd>
          </div>
          <div>
            <dt>BNCC</dt>
            <dd>{theme.bncc_codes.join(', ') || '—'}</dd>
          </div>
          <div>
            <dt>Personagens</dt>
            <dd>
              {subject?.character_name} (mascote)
              {theme.people.map((p) => `, ${p}`).join('')}
            </dd>
          </div>
          <div>
            <dt>Situação</dt>
            <dd>
              <Badge tone={summary.tone}>{summary.label}</Badge>
              {theme.published_at && <span className="muted small"> desde {dateTime(theme.published_at)}</span>}
            </dd>
          </div>
        </dl>
      </div>

      <Stepper stages={st} published={!!theme.published_at} />

      {STAGE_ORDER.map((k) => {
        const s = st[k];
        return s ? <StageCard key={s.id} stage={s} /> : null;
      })}
    </div>
  );
}

function Stepper({ stages, published }: { stages: Record<StageKind, Stage | undefined>; published: boolean }) {
  const steps = [
    ...STAGE_ORDER.map((k) => ({
      key: k,
      label: STAGE_LABELS[k],
      done: stages[k]?.status === 'approved' && !stages[k]?.outdated,
      active: ['awaiting_approval', 'generating', 'ready', 'failed'].includes(stages[k]?.status ?? '') || !!stages[k]?.outdated,
    })),
    { key: 'published', label: 'Publicado', done: published, active: false },
  ];
  return (
    <ol className="stepper">
      {steps.map((s, i) => (
        <li key={s.key} className={`${s.done ? 'done' : ''} ${s.active ? 'active' : ''}`}>
          <button
            type="button"
            onClick={() => document.getElementById(`etapa-${s.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <span className="step-num">{s.done ? '✓' : i + 1}</span>
            <span>{s.label}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
