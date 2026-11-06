import type { ScriptOutput, ThemesOutput, TopicsOutput } from '../../../shared/types';
import type { TextContext, TextProvider, TextRequest, TextResult } from '../types';
import {
  MATH_GRADE1,
  genericThemes,
  genericTopics,
  scriptAddition,
  scriptCountingByTens,
} from './catalog';

/**
 * Provedor de texto de exemplo. Não chama nenhuma IA: devolve conteúdo pronto
 * (Matemática do 1º ano) ou montado a partir do contexto. Serve para o fluxo
 * funcionar de ponta a ponta sem chave de API.
 */
export class MockTextProvider implements TextProvider {
  readonly provider = 'mock';
  constructor(readonly model = 'mock-texto-v1') {}

  async generateJson<T>(req: TextRequest): Promise<TextResult<T>> {
    const data = build(req.context, req.task);
    return {
      data: data as T,
      cost_usd: 0,
      cost_is_estimate: true,
      usage: {
        input_tokens: estimateTokens(req.system + req.prompt),
        output_tokens: estimateTokens(JSON.stringify(data)),
      },
    };
  }
}

function build(ctx: TextContext, task: TextRequest['task']): TopicsOutput | ThemesOutput | ScriptOutput {
  const isMathGrade1 = ctx.subject.id === 'matematica' && ctx.grade.id === 'ef-1';
  const notes_applied = ctx.note ?? null;

  if (task === 'topics') {
    const topics = isMathGrade1
      ? MATH_GRADE1.map(({ title, description, bncc_unit }) => ({ title, description, bncc_unit }))
      : genericTopics(ctx.subject.name);
    return { topics, notes_applied };
  }

  if (task === 'themes') {
    const topic = ctx.topic!;
    const seed = isMathGrade1 ? MATH_GRADE1.find((t) => t.title === topic.title) : undefined;
    return { themes: seed ? seed.themes : genericThemes(topic.title), notes_applied };
  }

  const theme = ctx.theme!;
  const variant = ctx.version - 1;
  let script: ScriptOutput;
  if (theme.title === 'Juntar e acrescentar: a adição') script = scriptAddition(variant);
  else if (theme.title === 'Contando até 100 de 10 em 10') script = scriptCountingByTens(variant);
  else script = genericScript(ctx, variant);
  return { ...script, notes_applied };
}

/** Roteiro genérico montado a partir do tema, para os temas sem roteiro escrito à mão. */
function genericScript(ctx: TextContext, variant: number): ScriptOutput {
  const theme = ctx.theme!;
  const subject = ctx.subject;
  const mascot = subject.character_name;
  const guest = theme.people[0];

  const song = {
    title: variant % 2 === 0 ? `Aprendi com o ${mascot}` : `Vem cantar, ${mascot}!`,
    style: variant % 2 === 0 ? 'Marchinha alegre, 115 bpm, palmas.' : 'Pop infantil, 105 bpm, batida leve e assobio.',
    hook: `Olha, olha, aprendi, o ${mascot} me ensinou!`,
    parts: [
      {
        label: 'Refrão',
        lines: ['Olha, olha, aprendi,', `o ${mascot} me ensinou!`, 'Conta, pensa, brinca e diz:', `${subject.name.toLowerCase()} chegou!`],
      },
      {
        label: 'Verso',
        lines: [`Hoje o tema é especial:`, `${theme.title.toLowerCase()},`, 'vem cantar e aprender,', 'fica fácil de entender!'],
      },
    ],
  };
  const lyrics = song.parts.flatMap((p) => p.lines);

  const scenes: ScriptOutput['scenes'] = [
    {
      number: 1,
      title: `Oi, eu sou o ${mascot}!`,
      narration: `Oi! Eu sou o ${mascot}. Hoje a gente vai descobrir uma coisa nova: ${theme.title.toLowerCase()}!`,
      visual: `${mascot} entra pulando e ${subject.id === 'matematica' ? 'se transforma em vários números' : 'acena para a câmera'}. O título do episódio aparece com letras coloridas.`,
      on_screen_text: theme.title,
      duration_sec: 11,
      is_song: false,
    },
    {
      number: 2,
      title: 'Uma pergunta do dia a dia',
      narration: `${theme.summary} Você já tinha percebido isso?`,
      visual: `Uma cena do dia a dia de uma criança, em casa, na escola ou no parquinho, que mostra a ideia: ${theme.summary}`,
      on_screen_text: null,
      duration_sec: 13,
      is_song: false,
    },
    {
      number: 3,
      title: 'Vamos ver com desenhos',
      narration: 'Vamos ver isso com desenhos? Olha só o que acontece na tela, bem devagar, um passo de cada vez.',
      visual: `Explicação visual passo a passo: ${theme.learning_goal} Objetos grandes e coloridos, um de cada vez, com ${mascot} apontando.`,
      on_screen_text: null,
      duration_sec: 14,
      is_song: false,
    },
    guest
      ? {
          number: 4,
          title: `Olha quem chegou: ${guest}!`,
          narration: `Olha quem veio visitar a gente: ${guest}! Vamos ver como essa pessoa usava essa ideia de um jeito bem legal.`,
          visual: `${guest} aparece em versão desenho animado, simpática, e mostra um exemplo do tema ao lado de ${mascot}.`,
          on_screen_text: guest,
          duration_sec: 14,
          is_song: false,
        }
      : {
          number: 4,
          title: 'Agora é sua vez',
          narration: `Agora é sua vez! Olhe a tela e pense na resposta antes do ${mascot}. Pensou? Muito bem!`,
          visual: `Um desafio simples aparece na tela. ${mascot} espera com cara de curioso, batendo o pé.`,
          on_screen_text: 'Sua vez!',
          duration_sec: 13,
          is_song: false,
        },
    {
      number: 5,
      title: 'Hora da música!',
      narration: `Canta comigo! ${lyrics.join(' ')}`,
      visual: `${mascot} dança no centro da tela com objetos do tema pulando no ritmo. A letra aparece embaixo.`,
      on_screen_text: song.hook,
      duration_sec: 16,
      is_song: true,
    },
    {
      number: 6,
      title: 'Revisão',
      narration: `Lembrou? ${theme.summary}`,
      visual: `Cartões de revisão aparecem um de cada vez, com ${mascot} apontando cada um.`,
      on_screen_text: 'Revisão',
      duration_sec: 11,
      is_song: false,
    },
  ];

  const characters: ScriptOutput['characters'] = [
    { name: mascot, role: 'mascote', description: subject.character_summary },
    ...theme.people.map((p) => ({
      name: p,
      role: 'pessoa citada' as const,
      description: `Versão em desenho animado de ${p}, simpática e simples, para crianças.`,
    })),
  ];

  return {
    title: theme.title,
    logline: `${mascot} mostra, com desenhos e uma música, que ${lowerFirst(theme.summary)}`,
    characters,
    scenes,
    song,
    quiz: [
      rotate(
        {
          question: 'Qual era o assunto do vídeo de hoje?',
          options: [theme.title, 'As cores do arco-íris', 'Os animais da fazenda'],
          answer_index: 0,
          explanation: `Hoje a gente aprendeu: ${theme.title.toLowerCase()}.`,
        },
        variant + 1,
      ),
      rotate(
        {
          question: `Como se chama o mascote de ${subject.name}?`,
          options: [mascot, 'Um dinossauro', 'Um astronauta'],
          answer_index: 0,
          explanation: `É o ${mascot}, o mascote de ${subject.name}!`,
        },
        variant + 2,
      ),
    ],
    review: [theme.summary, 'Na dúvida, desenhe e conte com os dedos!'],
  };
}

function rotate<T extends { options: string[]; answer_index: number }>(q: T, by: number): T {
  const n = q.options.length;
  const shift = ((by % n) + n) % n;
  const options = q.options.map((_, i) => q.options[(i - shift + n) % n]);
  return { ...q, options, answer_index: (q.answer_index + shift) % n };
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}
