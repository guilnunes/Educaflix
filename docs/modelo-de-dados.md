# Modelo de dados

Hoje cada tabela é um arquivo JSON em `content/db/<tabela>.json` (um array de linhas).
Os tipos estão em [`shared/types.ts`](../shared/types.ts), a fonte de verdade.

O modelo já foi pensado para migrar para Postgres/Supabase sem conversão:

- nomes de tabelas e campos em `snake_case`;
- ids `uuid`, exceto as tabelas de referência (`subjects`, `grades`), que usam slug;
- datas em ISO 8601 (`timestamptz`);
- campos estruturados (`output`, `inputs`, listas) em JSON (`jsonb`);
- mídias referenciadas por caminho relativo a `content/` (no Supabase viram chaves do Storage).

## Tabelas

```
subjects ─┐
grades ───┴─ courses ── topics ── themes ── stages
                │          │                  │
                └──────────┴──── generations ─┴── approvals
                                     │
                                 model_calls
```

| Tabela | O que guarda |
| --- | --- |
| `subjects` | Matérias, com cor, personagem e arquivo de skill. |
| `grades` | Séries/anos, com faixa etária. |
| `courses` | Uma combinação Matéria + Série. Ponto de partida do fluxo. |
| `topics` | Assuntos de um curso, gerados pela IA. |
| `themes` | Temas de um assunto, gerados pela IA. Cada tema vira um vídeo. |
| `stages` | As três etapas de cada tema: `script`, `storyboard`, `video`. |
| `generations` | Cada versão gerada (de assuntos, temas ou de uma etapa), com resultado, observação, versão da skill, custo e tempo. |
| `model_calls` | Cada chamada a um modelo dentro de uma geração: tipo, provedor, modelo, prompt, custo, tempo, arquivo gerado. Base da tela de comparação. |
| `approvals` | Registro de cada aprovação (quem, quando, observação). |

## Regras de estado das etapas

| Status | Quando |
| --- | --- |
| `locked` | A etapa anterior ainda não tem versão aprovada. |
| `ready` | Pode gerar. |
| `generating` | A IA está gerando. |
| `awaiting_approval` | A versão mais nova espera aprovação. |
| `approved` | A versão aprovada é a mais nova. |
| `failed` | A última geração falhou. |

- Gerar de novo não apaga nada: cria a versão `n + 1` e mantém a aprovada até outra ser aprovada.
- Qualquer versão do histórico pode ser aprovada.
- Cada geração de storyboard e de vídeo guarda em `inputs` quais versões aprovadas usou.
  Se a etapa anterior passar a ter outra versão aprovada, a etapa seguinte fica com
  `outdated = true` e a versão antiga não pode mais ser aprovada.
- Aprovar o vídeo publica o tema (`themes.published_at`).
- Gerar a lista de assuntos ou de temas de novo preserva os itens que já têm trabalho.

## Esboço em SQL (Supabase)

```sql
create table subjects (
  id text primary key,
  name text not null,
  color text not null,
  character_name text not null,
  character_summary text not null,
  skill_file text not null,
  sort_order int not null
);

create table grades (
  id text primary key,
  name text not null,
  former_name text,
  level text not null check (level in ('fundamental', 'medio')),
  year int not null,
  age_min int not null,
  age_max int not null,
  sort_order int not null
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  subject_id text not null references subjects,
  grade_id text not null references grades,
  created_at timestamptz not null default now(),
  unique (subject_id, grade_id)
);

create table generations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('topics', 'themes', 'script', 'storyboard', 'video')),
  target_type text not null check (target_type in ('course', 'topic', 'stage')),
  target_id uuid not null,
  theme_id uuid,
  version int not null,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  note text,
  skill_version text not null,
  skill_hash text not null,
  inputs jsonb not null default '{}',
  output jsonb,
  error text,
  cost_usd numeric(12, 6) not null default 0,
  duration_ms int not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (kind, target_id, version)
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  title text not null,
  description text not null,
  bncc_unit text,
  sort_order int not null,
  generation_id uuid not null references generations,
  created_at timestamptz not null default now()
);

create table themes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics on delete cascade,
  title text not null,
  summary text not null,
  learning_goal text not null,
  bncc_codes text[] not null default '{}',
  people text[] not null default '{}',
  sort_order int not null,
  generation_id uuid not null references generations,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table stages (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references themes on delete cascade,
  kind text not null check (kind in ('script', 'storyboard', 'video')),
  status text not null,
  current_generation_id uuid references generations,
  approved_generation_id uuid references generations,
  outdated boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (theme_id, kind)
);

create table model_calls (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references generations on delete cascade,
  media_type text not null check (media_type in ('text', 'image', 'audio', 'video')),
  role text not null check (role in ('text', 'image', 'speech', 'music', 'video')),
  provider text not null,
  model text not null,
  purpose text not null,
  prompt text not null,
  output_path text,
  cost_usd numeric(12, 6) not null default 0,
  cost_is_estimate boolean not null default true,
  duration_ms int not null,
  created_at timestamptz not null default now()
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references generations,
  stage_id uuid not null references stages on delete cascade,
  theme_id uuid not null references themes on delete cascade,
  decision text not null check (decision = 'approved'),
  note text,
  decided_by text not null,
  created_at timestamptz not null default now()
);
```

Quando houver login, `approvals.decided_by` passa a referenciar o usuário (`auth.users`).
