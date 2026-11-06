# Etapa 1: roteiro, quiz e letra da música

Matéria: {{materia}}
Série: {{serie}} (crianças de {{faixa_etaria}})
Assunto: {{assunto}}
Tema: {{tema}}
Resumo: {{tema_resumo}}
Objetivo de aprendizagem: {{objetivo}}
Habilidades da BNCC: {{bncc}}
Pessoas citadas (viram personagens): {{pessoas}}
Personagem da matéria: {{personagem}}

Escreva o roteiro do vídeo seguindo todas as regras da skill.

- 6 a 10 cenas. Em cada cena: título, narração (que também é a legenda), descrição
  visual detalhada do que aparece na tela, texto curto na tela (ou null) e duração.
- Uma das cenas é a "Hora da música", com `is_song: true`.
- A penúltima ou última cena é a revisão.
- A música tem título, estilo (ritmo e andamento em bpm), um gancho (`hook`) e
  partes (refrão e versos).
- O quiz tem 3 perguntas de múltipla escolha com 3 opções, a resposta certa e uma
  explicação curta e gentil.
- A revisão tem 2 a 4 frases curtas.

{{observacao}}

Responda com JSON neste formato:

```json
{
  "title": "string",
  "logline": "string",
  "characters": [{ "name": "string", "role": "mascote | pessoa citada | apoio", "description": "string" }],
  "scenes": [{
    "number": 1,
    "title": "string",
    "narration": "string",
    "visual": "string",
    "on_screen_text": "string ou null",
    "duration_sec": 12,
    "is_song": false
  }],
  "song": { "title": "string", "style": "string", "hook": "string", "parts": [{ "label": "Refrão", "lines": ["string"] }] },
  "quiz": [{ "question": "string", "options": ["string"], "answer_index": 0, "explanation": "string" }],
  "review": ["string"]
}
```
