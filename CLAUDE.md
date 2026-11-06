# CLAUDE.md

Guia para as próximas sessões do Claude Code neste repositório.

## Contexto

- Educaflix (nome temporário): vídeos educativos curtos para crianças, baseados na BNCC/MEC.
- Fonte de verdade do produto: página "Educaflix" no Notion
  (https://app.notion.com/p/410fa617db4f8153bc17dd8db05be8e3). Leia antes de mudar o escopo.
- Fase atual: demo do admin (fluxo de geração com aprovação). Fora de escopo: interface do
  aluno, do pai, login, pagamentos, gestão de usuários, analytics, marca definitiva.
- Diretiva: começar com modelos locais ou baratos. Antes de implementar um provedor real,
  mostrar opções (custo, qualidade, roda local?) e esperar a escolha do usuário.
  Lista atual: `docs/opcoes-de-modelos.md`.

## Idioma

- Interface, documentação, mensagens de commit, comentários e mensagens de erro: português do Brasil.
- Nomes no código (variáveis, funções, tipos): inglês.
- Campos do banco: `snake_case` em inglês.

## Arquitetura

- `src/`: admin em React (Vite + TypeScript). `IS_LOCAL = import.meta.env.DEV`.
  - Modo local: lê `/api/db` e grava pela API.
  - Modo publicado: lê `content/db/*.json` e não grava. Todo botão de ação usa
    `ActionButton` ou `GenerateForm`, que ficam desabilitados fora do modo local.
- `server/`: API local em Node (`node:http`, sem framework), só em `127.0.0.1:8787`.
  - `pipeline.ts`: o fluxo e as regras de estado. Toda geração passa por `Pipeline.start()`,
    que cria a versão, registra cada chamada de modelo e grava o resultado.
  - `store.ts`: `JsonStore`. Toda escrita passa por `transact()` (fila + escrita atômica).
    Para migrar ao Supabase, troque esta classe mantendo `read()` e `transact()`.
  - `skills.ts`: lê `skills/` a cada geração e monta os prompts.
  - `providers/`: uma interface por papel (texto, imagem, voz, música, vídeo), o registro
    (`registry.ts`) e o provedor `mock`.
- `shared/types.ts`: modelo de dados e tipos de saída. Fonte de verdade das tabelas.
- `skills/`: regras e prompts em Markdown, para professores. Não coloque texto de prompt
  ou regra de conteúdo no código; use `{{campos}}` nos arquivos de prompt.
- `content/`: dados e mídias gerados. É versionado e é o que o Pages mostra.

## Regras do fluxo

- Etapas de um tema: `script` → `storyboard` → `video`. Aprovar o vídeo publica o tema.
- Gerar de novo nunca apaga: cria a versão `n + 1`. A aprovada continua até outra ser aprovada.
- Storyboard e vídeo guardam em `generations.inputs` as versões aprovadas que usaram. Se a
  etapa anterior mudar de versão aprovada, a seguinte fica `outdated`.
- Cada chamada de modelo vira uma linha em `model_calls` com provedor, modelo, prompt,
  custo estimado e tempo. A tela de comparação depende disso: provedores novos precisam
  devolver `cost_usd` e `cost_is_estimate`.
- Mídias: `content/media/themes/<theme_id>/<etapa>-v<versão>/`.

## Segredos

- Chaves de API só no `.env` local (no `.gitignore`). Nunca commitar. Toda variável nova
  vai documentada no `.env.example`.
- Nunca chamar API de modelo pelo navegador; só pelo servidor local.

## Comandos

- `npm run dev`: admin (5173) + API local (8787).
- `npm run check`: tipos + testes. Rode antes de todo push.
- `npm run build` e `npm run preview`: build estático em `/Educaflix/`.
- `npm run seed:demo -- --reset`: refaz o conteúdo de demonstração em `content/`.

## Git e deploy

- Commits pequenos e descritivos, em português. Push direto na `main` (pedido do usuário).
- Cada push na `main` publica no GitHub Pages pelo workflow `deploy.yml`.
- O Pages precisa estar com a origem "GitHub Actions" (Settings → Pages).

## Fim de cada sessão

Atualize a página do Notion: Status, Last surface = Code, Last worked, Next step e
Blocker, e a seção "Status do desenvolvimento" com o que foi feito e o link da demo
(https://guilnunes.github.io/Educaflix/).
