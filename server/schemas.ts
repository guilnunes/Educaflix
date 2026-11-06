// JSON Schemas das respostas de texto. Usados como "saída estruturada" pelos
// provedores que aceitam (Claude API e Claude Code). Sem campos nulos: texto vazio
// significa "não tem" e o fluxo converte para null.

const str = { type: 'string' } as const;
const strArr = { type: 'array', items: str } as const;

function obj(properties: Record<string, unknown>) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

export const TOPICS_SCHEMA = obj({
  topics: {
    type: 'array',
    items: obj({ title: str, description: str, bncc_unit: str }),
  },
});

export const THEMES_SCHEMA = obj({
  themes: {
    type: 'array',
    items: obj({ title: str, summary: str, learning_goal: str, bncc_codes: strArr, people: strArr }),
  },
});

export const SCRIPT_SCHEMA = obj({
  title: str,
  logline: str,
  characters: {
    type: 'array',
    items: obj({ name: str, role: { type: 'string', enum: ['mascote', 'pessoa citada', 'apoio'] }, description: str }),
  },
  scenes: {
    type: 'array',
    items: obj({
      number: { type: 'integer' },
      title: str,
      narration: str,
      visual: str,
      on_screen_text: str,
      duration_sec: { type: 'integer' },
      is_song: { type: 'boolean' },
    }),
  },
  song: obj({
    title: str,
    style: str,
    hook: str,
    parts: { type: 'array', items: obj({ label: str, lines: strArr }) },
  }),
  quiz: {
    type: 'array',
    items: obj({ question: str, options: strArr, answer_index: { type: 'integer' }, explanation: str }),
  },
  review: strArr,
});

export const SCHEMAS = { topics: TOPICS_SCHEMA, themes: THEMES_SCHEMA, script: SCRIPT_SCHEMA } as const;
