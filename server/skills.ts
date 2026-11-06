import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Grade, Subject } from '../shared/types';

/** Arquivos de prompt por etapa, em skills/video/prompts/. */
export const PROMPT_FILES = {
  topics: 'video/prompts/assuntos.md',
  themes: 'video/prompts/temas.md',
  script: 'video/prompts/roteiro.md',
  storyboard: 'video/prompts/storyboard-cena.md',
  speech: 'video/prompts/narracao.md',
  music: 'video/prompts/musica.md',
  video: 'video/prompts/video.md',
} as const;

export type PromptKey = keyof typeof PROMPT_FILES;

export interface SkillBundle {
  /** Instruções fixas: skill + matéria + faixa etária. */
  system: string;
  version: string;
  hash: string;
  files: string[];
  visualStyle: string;
  characterDescription: string;
  ageLabel: string;
  gradeLabel: string;
}

/**
 * Lê os arquivos da skill (pasta skills/) e monta os prompts.
 * Os arquivos são lidos a cada geração, então editar um arquivo vale na hora.
 */
export class Skills {
  constructor(readonly dir: string) {}

  async bundle(subject: Subject, grade: Grade, promptKeys: PromptKey[]): Promise<SkillBundle> {
    const skillRaw = (await this.read('video/SKILL.md')) ?? '';
    const { meta, body } = frontMatter(skillRaw);
    const ageFile = `faixas-etarias/${grade.age_min}-${grade.age_max}-anos.md`;
    const subjectMd = await this.read(subject.skill_file);
    const ageMd = await this.read(ageFile);
    const ageLabel = `${grade.age_min} a ${grade.age_max} anos`;

    const system = [
      body.trim(),
      '---',
      subjectMd?.trim() ??
        `# ${subject.name}\n\nAinda não há guia de estilo para ${subject.name}. Personagem: ${subject.character_name}, ${subject.character_summary} Use um estilo simples, claro e colorido.`,
      '---',
      ageMd?.trim() ?? `# Faixa etária: ${ageLabel}\n\nUse linguagem adequada para crianças de ${ageLabel}.`,
    ].join('\n\n');

    const templates = await Promise.all(promptKeys.map((k) => this.read(PROMPT_FILES[k])));
    const files = ['video/SKILL.md', subjectMd ? subject.skill_file : null, ageMd ? ageFile : null, ...promptKeys.map((k) => PROMPT_FILES[k])].filter(
      (f): f is string => !!f,
    );
    const hash = createHash('sha256')
      .update([skillRaw, subjectMd ?? '', ageMd ?? '', ...templates.map((t) => t ?? '')].join('\u0000'))
      .digest('hex')
      .slice(0, 10);

    return {
      system,
      version: meta.versao ?? '0',
      hash,
      files,
      visualStyle: section(subjectMd ?? '', 'Estilo visual') || 'Desenho animado 2D, cores vivas, fundo claro.',
      characterDescription: section(subjectMd ?? '', 'Personagem') || `${subject.character_name}: ${subject.character_summary}`,
      ageLabel,
      gradeLabel: grade.former_name ? `${grade.name} (${grade.former_name})` : grade.name,
    };
  }

  async template(key: PromptKey): Promise<string> {
    const t = await this.read(PROMPT_FILES[key]);
    if (t == null) throw new Error(`Arquivo de prompt não encontrado: skills/${PROMPT_FILES[key]}`);
    return t;
  }

  /** Troca {{campo}} pelos valores. `observacao` vira um bloco de instrução quando existe. */
  async render(key: PromptKey, vars: Record<string, string | null | undefined>, note: string | null): Promise<string> {
    const tpl = await this.template(key);
    const all: Record<string, string> = {
      ...Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v ?? ''])),
      observacao: note ? `Observação do revisor para esta nova versão (siga com prioridade): ${note}` : '',
    };
    return tpl
      .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => all[name] ?? '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private async read(rel: string): Promise<string | null> {
    try {
      return await fs.readFile(path.join(this.dir, rel), 'utf8');
    } catch {
      return null;
    }
  }
}

function frontMatter(md: string): { meta: Record<string, string>; body: string } {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: md };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: md.slice(m[0].length) };
}

/** Texto de uma seção "## Título" de um Markdown, sem o título. */
function section(md: string, heading: string): string {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return '';
  const out: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (/^#{1,2}\s/.test(l)) break;
    out.push(l);
  }
  return out.join(' ').replace(/\s+/g, ' ').replace(/\*\*/g, '').trim();
}
