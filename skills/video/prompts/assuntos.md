# Etapa: listar os assuntos

Liste os assuntos de {{materia}} para o {{serie}} (crianças de {{faixa_etaria}}),
seguindo a BNCC e o material oficial do MEC.

- Agrupe as habilidades da BNCC em 4 a 8 assuntos amplos.
- Use títulos curtos e claros para o professor.
- Na descrição, diga em uma frase o que o assunto cobre.
- Indique a unidade temática da BNCC de cada assunto.

{{observacao}}

Responda com JSON neste formato:

```json
{
  "topics": [
    { "title": "string", "description": "string", "bncc_unit": "string ou null" }
  ]
}
```
