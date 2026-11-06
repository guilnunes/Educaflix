# Educaflix (nome temporário)

Plataforma de vídeos educativos curtos para crianças e adolescentes, baseada no
material oficial do MEC (BNCC), com interface no estilo Netflix.

Esta é a **primeira demo da plataforma admin**: o fluxo de geração de conteúdo por IA
com aprovação humana em cada etapa. A matéria da demo é Matemática do 1º ano do Ensino
Fundamental (antiga 1ª série do 1º grau), para crianças de 6 a 7 anos. A interface do
aluno vem na próxima fase.

- Demo publicada (somente leitura): https://guilnunes.github.io/Educaflix/
- Documentação do produto: página "Educaflix" no Notion

## O fluxo

1. Escolher a **Matéria** e a **Série**.
2. A IA lista os **Assuntos** da matéria.
3. A IA lista os **Temas** de um assunto. Cada tema vira um vídeo.
4. **Etapa 1:** a IA escreve o roteiro, o quiz e a letra da música. Espera aprovação.
5. **Etapa 2:** a IA desenha o storyboard (uma imagem por cena). Espera aprovação.
6. **Etapa 3:** a IA gera o vídeo (narração, música e montagem). Aprovar publica o tema.

Em qualquer etapa o admin pode **gerar de novo**, com uma observação opcional que entra
no prompt. Cada geração vira uma versão no histórico, com modelo usado, prompt enviado,
custo estimado, tempo de geração e data. A tela do tema mostra as três etapas juntas, e
a tela **Comparar modelos** monta a comparação a partir desses dados.

Sem configuração nenhuma, tudo roda com modelos **mock** (conteúdo de exemplo, sem chave).
Os modelos reais escolhidos já estão ligados e entram pelo `.env`: veja
[Modelos de IA](#modelos-de-ia) e [`docs/opcoes-de-modelos.md`](docs/opcoes-de-modelos.md).

## Dois modos

| | Modo local (`npm run dev`) | Modo publicado (GitHub Pages) |
| --- | --- | --- |
| Onde roda | Na sua máquina | `guilnunes.github.io/Educaflix` |
| Gera e aprova | Sim, pelo servidor Node local | Não: botões desabilitados com aviso |
| Lê o conteúdo de | API local, que lê e grava `content/` | Arquivos de `content/` copiados no build |
| Chaves de API | No `.env` local, usadas só pelo servidor | Nenhuma |

O GitHub Pages só serve arquivos estáticos e não pode guardar chaves. Por isso a geração
acontece no modo local, o resultado é commitado em `content/` e o Pages mostra tudo.

## Como rodar no modo local

Precisa do Node.js 22.12 ou mais novo. Para o vídeo final, do **ffmpeg** (`brew install ffmpeg`,
`sudo apt install ffmpeg` ou `winget install ffmpeg`).

```bash
npm install
npm run setup:piper    # voz local gratuita em português (precisa de Python 3)
cp .env.example .env   # perfil gratuito + assinaturas; ajuste se quiser
npm run dev
```

Sem `.env`, tudo roda com os exemplos (mock).

Abra http://localhost:5173. O comando sobe duas coisas:

- o **admin** (Vite, porta 5173);
- a **API local** (Node, porta 8787, só em `127.0.0.1`), que chama os modelos, grava em
  `content/` e registra as aprovações. O Vite repassa `/api` e `/content` para ela.

Para publicar o que você gerou: faça commit de `content/` e dê push na `main`.

### Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Modo local (admin + API). |
| `npm run build` | Build estático em `dist/`, com `content/` dentro. |
| `npm run preview` | Abre o build estático em http://localhost:4173/Educaflix/. |
| `npm run check` | Checa os tipos e roda os testes. |
| `npm run seed:demo -- --reset` | Apaga `content/` e gera de novo o conteúdo de demonstração. |

## Como funciona o deploy

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda a cada
push na `main` (e manualmente em Actions): instala, checa tipos e testes, faz o build
estático e publica no GitHub Pages.

- O caminho do site (`/Educaflix/`) vem do `actions/configure-pages` e entra no Vite pela
  variável `BASE_PATH` ([`vite.config.ts`](vite.config.ts)).
- As rotas usam `#` (ex.: `#/tema/...`), que funciona no Pages sem configuração extra.
- O Pages precisa estar com a origem **GitHub Actions** (Settings → Pages → Build and
  deployment → Source). Com a origem "Deploy from a branch", o GitHub publica a `main`
  crua e o deploy do workflow falha.

## Modelos de IA

| Tipo | Provedor (`<TIPO>_PROVIDER`) | Modelos | Cobrança | Precisa de |
| --- | --- | --- | --- | --- |
| Texto | `claude-assinatura` | `sonnet`, `haiku`, `opus` | Assinatura Claude Pro/Max | Claude Code instalado e logado |
| Texto | `anthropic` | `claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5` | Por uso | `ANTHROPIC_API_KEY` |
| Imagem | `google` | `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image` | Por uso | `GOOGLE_API_KEY` com cobrança ativa |
| Imagem | `fal` | `fal-ai/flux-2/klein/4b`, `.../9b` | Por uso | `FAL_KEY` |
| Voz | `piper` | `pt_BR-faber-medium` | Gratuito, local | `npm run setup:piper` |
| Voz | `elevenlabs` | `eleven_v4`, `eleven_flash_v2_5`, `eleven_multilingual_v2` | Créditos da assinatura | `ELEVENLABS_API_KEY` |
| Música | `google` | `lyria-3-clip-preview`, `lyria-3-pro-preview`, `lyria-3.5` | Por uso | `GOOGLE_API_KEY` com cobrança ativa |
| Música | `elevenlabs` | `music_v2_5`, `music_v2` | Créditos de plano pago | `ELEVENLABS_API_KEY` |
| Vídeo | `ffmpeg` | `montagem-local-v1` | Gratuito, local | ffmpeg instalado |
| Vídeo | `fal-kling` | `kling-3-standard` | Por uso (anima 3 cenas) | ffmpeg e `FAL_KEY` |

Todos têm também o `mock`. O admin mostra, no botão "Gerar de novo", quais modelos estão
prontos e o que falta para os outros.

- **Claude pela assinatura:** usa o `claude -p` do Claude Code, com o login da assinatura
  (sem `ANTHROPIC_API_KEY`). A Anthropic permite isso para uso pessoal do assinante; se o
  servidor um dia atender outras pessoas, use o provedor `anthropic` com chave de API.
- **ElevenLabs:** a chave de API de qualquer plano usa os créditos da assinatura. A música
  por API exige plano pago. Escolha a voz em `ELEVENLABS_VOICE_ID`.
- **Google (Gemini e Lyria):** a assinatura Google AI Pro não dá créditos de API, e imagem e
  música não têm camada gratuita na API; é preciso ativar a cobrança no AI Studio.
- **Vídeo:** o `ffmpeg` monta o MP4 na máquina: cada imagem vira uma cena com movimento suave
  de câmera, com narração, música na cena da música e legenda em português (arquivo `.vtt` e
  embutida no MP4). O `fal-kling` faz o mesmo e anima até 3 cenas com o Kling.

Testados de verdade: `mock`, `piper`, `ffmpeg` e `elevenlabs` (voz e música, com a
assinatura). Os outros têm testes com respostas simuladas e ainda precisam de um primeiro
teste com chave real.

## Como trocar os provedores de modelo

O fluxo só conhece interfaces, uma por papel, em
[`server/providers/types.ts`](server/providers/types.ts):

| Papel | Interface | Tipo na comparação |
| --- | --- | --- |
| Texto | `TextProvider.generateJson()` | Texto |
| Imagem | `ImageProvider.generateImage()` | Imagem |
| Voz | `SpeechProvider.speak()` | Áudio |
| Música | `MusicProvider.compose()` | Áudio |
| Vídeo | `VideoProvider.render()` | Vídeo |

Para adicionar um provedor:

1. Crie a classe em `server/providers/<nome>/`, implementando a interface. Devolva o
   resultado e o custo estimado (`cost_usd`).
2. Registre em [`server/providers/registry.ts`](server/providers/registry.ts), com os
   modelos aceitos e as variáveis de ambiente que ele exige (ex.: `ANTHROPIC_API_KEY`).
3. No `.env`, escolha o padrão: `TEXT_PROVIDER=<nome>` e `TEXT_MODEL=<modelo>` (o mesmo
   vale para `IMAGE_`, `SPEECH_`, `MUSIC_` e `VIDEO_`).

Nada no fluxo muda. No admin, o botão "Gerar de novo" também deixa escolher o modelo de
cada papel para uma geração, o que alimenta a tela de comparação.

## Regras de criação de conteúdo (skills)

As regras que a IA segue ficam em [`skills/`](skills/), em Markdown, separadas do código,
para professores editarem: regras gerais da skill de vídeo, estilo e personagem de cada
matéria, linguagem por faixa etária e o prompt de cada etapa. Veja
[`skills/README.md`](skills/README.md).

## Estrutura

```
.github/workflows/  deploy no GitHub Pages
content/            dados (db/*.json) e mídias (media/) gerados; versionados
docs/               modelo de dados e opções de modelos
scripts/            build estático e conteúdo de demonstração
server/             API local, fluxo (pipeline.ts), armazenamento e provedores
shared/             tipos e modelo de dados usados pelo servidor e pelo admin
skills/             regras e prompts da IA, editáveis por professores
src/                admin em React
tests/              testes do fluxo
```

O modelo de dados está em [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md), com um
esboço em SQL para a migração futura para o Supabase.

## Segurança

- Chaves de API só no `.env` local, que está no `.gitignore`. Documente toda variável
  nova no [`.env.example`](.env.example).
- O servidor local escuta só em `127.0.0.1`.
- O build publicado não tem servidor nem chaves.
