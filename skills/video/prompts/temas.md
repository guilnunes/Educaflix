# Etapa: listar os temas de um assunto

Matéria: {{materia}}
Série: {{serie}} (crianças de {{faixa_etaria}})
Assunto: {{assunto}}, {{assunto_descricao}}

Liste os temas deste assunto. Cada tema vira um vídeo curto, então cada tema deve
caber em 1,5 a 3 minutos e ensinar uma ideia só.

- `title`: título curto e atraente para criança.
- `summary`: uma frase na linguagem da criança, que resume o tema.
- `learning_goal`: objetivo de aprendizagem na linguagem do professor.
- `bncc_codes`: códigos das habilidades da BNCC cobertas (ex.: EF01MA06).
- `people`: pessoas reais ligadas ao tema que podem virar personagens (pode ser vazio).

{{observacao}}

Responda com JSON neste formato:

```json
{
  "themes": [
    {
      "title": "string",
      "summary": "string",
      "learning_goal": "string",
      "bncc_codes": ["string"],
      "people": ["string"]
    }
  ]
}
```
