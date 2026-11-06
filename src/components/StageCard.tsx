import { useState } from 'react';
import {
  STAGE_LABELS,
  STATUS_LABELS,
  type ScriptOutput,
  type Stage,
  type StoryboardOutput,
  type VideoOutput,
} from '../../shared/types';
import { api, IS_LOCAL, useData, useDb, type Role } from '../data';
import { STATUS_TONE } from '../status';
import { GenerateForm, GenerationMeta, VersionHistory } from './generation';
import { ScriptView } from './ScriptView';
import { StoryboardView } from './StoryboardView';
import { ActionButton, Badge, Spinner } from './ui';
import { VideoView } from './VideoView';

const STEP: Record<Stage['kind'], number> = { script: 1, storyboard: 2, video: 3 };

const ROLES: Record<Stage['kind'], Role[]> = {
  script: ['text'],
  storyboard: ['image'],
  video: ['speech', 'music', 'video'],
};

const LOCKED_HINT: Record<Stage['kind'], string> = {
  script: '',
  storyboard: 'Aprove o roteiro para liberar o storyboard.',
  video: 'Aprove o storyboard para liberar o vídeo.',
};

export function StageCard({ stage }: { stage: Stage }) {
  const db = useDb();
  const { run } = useData();
  const [picked, setPicked] = useState<string | null>(null);

  const gens = db.generations
    .filter((g) => g.target_type === 'stage' && g.target_id === stage.id)
    .sort((a, b) => b.version - a.version);
  const selected = gens.find((g) => g.id === (picked ?? stage.current_generation_id)) ?? gens[0];
  const isApproved = selected && selected.id === stage.approved_generation_id;
  const canApprove = selected?.status === 'succeeded' && !isApproved && stage.status !== 'generating';
  const approvedGen = gens.find((g) => g.id === stage.approved_generation_id);
  const locked = stage.status === 'locked';
  const generating = stage.status === 'generating';

  return (
    <section className={`card stage stage-${stage.status}`} id={`etapa-${stage.kind}`}>
      <header className="stage-head">
        <div>
          <div className="eyebrow">Etapa {STEP[stage.kind]}</div>
          <h3>{STAGE_LABELS[stage.kind]}</h3>
        </div>
        <div className="badges">
          <Badge tone={STATUS_TONE[stage.status]}>{STATUS_LABELS[stage.status]}</Badge>
          {approvedGen && approvedGen.id !== stage.current_generation_id && <Badge tone="ok">aprovada: v{approvedGen.version}</Badge>}
          {stage.outdated && <Badge tone="warn">desatualizada</Badge>}
        </div>
      </header>

      {stage.outdated && (
        <p className="callout warn">
          A etapa anterior teve outra versão aprovada depois desta. Gere esta etapa de novo para usar a versão nova.
        </p>
      )}

      {locked ? (
        <p className="muted">{LOCKED_HINT[stage.kind]}</p>
      ) : (
        <div className="actions">
          <GenerateForm
            label={gens.length ? 'Gerar de novo' : 'Gerar com IA'}
            primary={gens.length === 0}
            roles={ROLES[stage.kind]}
            disabled={generating}
            disabledReason={generating ? 'Espere a geração terminar.' : undefined}
            onGenerate={async (note, models) => {
              const res = await api.generateStage(stage.id, note, models);
              setPicked(res.generation.id);
            }}
          />
          {selected && canApprove && (
            <ActionButton
              variant="success"
              onClick={() => run(() => api.approve(selected.id, null), stage.kind === 'video' ? 'Vídeo aprovado e publicado.' : 'Etapa aprovada.')}
            >
              {stage.kind === 'video' ? `Aprovar e publicar v${selected.version}` : `Aprovar v${selected.version}`}
            </ActionButton>
          )}
          {!IS_LOCAL && <span className="muted small">Gerar e aprovar só funcionam no modo local.</span>}
        </div>
      )}

      {selected && (
        <div className="version">
          <div className="version-title">
            <strong>Versão {selected.version}</strong>
            {isApproved && <Badge tone="ok">aprovada</Badge>}
            {selected.id !== stage.current_generation_id && <span className="muted small">(versão antiga)</span>}
          </div>

          {selected.status === 'running' && (
            <p className="generating">
              <Spinner /> A IA está gerando esta versão…
            </p>
          )}
          {selected.status === 'failed' && <p className="callout danger">A geração falhou: {selected.error}</p>}
          {selected.status === 'succeeded' && (
            <>
              {stage.kind === 'script' && <ScriptView script={selected.output as ScriptOutput} />}
              {stage.kind === 'storyboard' && <StoryboardView storyboard={selected.output as StoryboardOutput} />}
              {stage.kind === 'video' && <VideoView video={selected.output as VideoOutput} />}
            </>
          )}
          <GenerationMeta gen={selected} />
        </div>
      )}

      <VersionHistory gens={gens} selectedId={selected?.id} approvedId={stage.approved_generation_id} onSelect={setPicked} />
    </section>
  );
}
