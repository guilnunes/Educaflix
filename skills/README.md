# Skills de criação de conteúdo

Esta pasta guarda as regras que a IA segue para criar os vídeos. Ela fica separada
do código para que professores possam editar sem mexer em programação.

Toda geração registra a versão da skill (`versao` no topo do `video/SKILL.md`) e uma
impressão digital (hash) dos arquivos usados. Assim dá para saber com quais regras
cada versão de conteúdo foi criada.

## Arquivos

| Arquivo | O que define |
| --- | --- |
| `video/SKILL.md` | Regras gerais da skill de vídeo, para todas as matérias. |
| `materias/<matéria>.md` | Estilo visual e personagem de cada matéria. |
| `faixas-etarias/<idade>.md` | Linguagem e ritmo para cada faixa etária (ex.: `6-7-anos.md`). |
| `video/prompts/*.md` | O pedido de cada etapa (assuntos, temas, roteiro, storyboard, narração, música, vídeo). |

## Como editar

1. Edite o arquivo em Markdown, em português, normalmente.
2. Se a mudança for importante, aumente o número de `versao` no topo do `video/SKILL.md`.
3. Faça o commit. As próximas gerações já usam as regras novas. As antigas continuam
   no histórico com a versão com que foram criadas.

## Campos que os prompts aceitam

Os arquivos em `video/prompts/` podem usar estes campos entre chaves duplas. O servidor
troca cada um pelo valor da geração:

| Campo | Valor |
| --- | --- |
| `{{materia}}` | Nome da matéria |
| `{{serie}}` | Série/ano, ex.: "1º ano do Ensino Fundamental (antiga 1ª série do 1º grau)" |
| `{{faixa_etaria}}` | Ex.: "6 a 7 anos" |
| `{{personagem}}` | Nome do personagem da matéria |
| `{{assunto}}`, `{{assunto_descricao}}` | Assunto escolhido |
| `{{tema}}`, `{{tema_resumo}}`, `{{objetivo}}`, `{{bncc}}`, `{{pessoas}}` | Tema escolhido |
| `{{roteiro}}` | Roteiro aprovado (JSON), nas etapas de storyboard e vídeo |
| `{{cena_numero}}`, `{{cena_titulo}}`, `{{cena_visual}}`, `{{cena_texto_na_tela}}`, `{{personagens_da_cena}}` | Cena do storyboard |
| `{{estilo_visual}}`, `{{personagem_descricao}}` | Trechos do arquivo da matéria |
| `{{texto}}` | Texto da narração |
| `{{musica_titulo}}`, `{{musica_estilo}}`, `{{letra}}` | Música aprovada |
| `{{cenas}}` | Lista de cenas com imagem e duração, na etapa de vídeo |
| `{{observacao}}` | Observação do admin para a nova versão (vazio se não houver) |
