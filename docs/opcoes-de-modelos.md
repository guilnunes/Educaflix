# Opções de modelos (aguardando escolha)

Lista curta para escolher os primeiros provedores reais. Diretiva do projeto: começar
com modelos locais ou baratos. Preços pesquisados em novembro de 2026; mudam com
frequência e várias fontes são de terceiros, então confira na página do provedor antes
de fechar orçamento.

Base de cálculo de um vídeo: 1 roteiro (~3 mil tokens de entrada e ~4 mil de saída),
8 imagens, ~1.200 caracteres de narração, 1 música de 30 a 60 s e ~2 min de vídeo.

## Texto (assuntos, temas, roteiro, quiz e letra)

| Opção | Custo por roteiro | Qualidade | Roda local? |
| --- | --- | --- | --- |
| Qwen3 8B via Ollama | US$ 0 | Média. Português ok, criatividade e JSON menos confiáveis | Sim (~8 GB de VRAM ou Mac M) |
| Claude Haiku 5.5 | ~US$ 0,002 (US$ 0,10 / 0,50 por milhão de tokens) | Boa | Não |
| Claude Sonnet 5.5 | ~US$ 0,05 (US$ 2 / 10 por milhão de tokens) | Muito boa, melhor em música e humor | Não |

## Imagem (uma por cena do storyboard)

| Opção | Custo por vídeo (8 imagens) | Qualidade | Roda local? |
| --- | --- | --- | --- |
| FLUX.2 Klein / FLUX schnell (pesos abertos) | US$ 0 local, ~US$ 0,03 por API | Média. O personagem muda entre cenas | Sim (GPU ~8 a 12 GB) |
| Gemini 3.1 Flash Image | ~US$ 0,30 a 0,55 (US$ 0,034 a 0,067 por imagem) | Alta. Aceita imagem de referência e mantém o Nico igual | Não |
| GPT Image (qualidade média) | ~US$ 0,25 a 0,45 | Alta | Não |

## Voz (narração em português)

| Opção | Custo por vídeo | Qualidade | Roda local? |
| --- | --- | --- | --- |
| Kokoro ou Piper (vozes pt-BR) | US$ 0 | Média, um pouco robótica | Sim (CPU) |
| Google Chirp 3 HD | ~US$ 0,04 (US$ 30 por milhão de caracteres, 1 milhão grátis por mês) | Boa | Não |
| ElevenLabs | ~US$ 0,05 a 0,10 (US$ 40 a 80 por milhão de caracteres) | A melhor, voz expressiva | Não |

## Música (com letra e vocal)

| Opção | Custo por música | Qualidade | Roda local? |
| --- | --- | --- | --- |
| ACE-Step (licença MIT) | US$ 0 | Média. Vocal em português instável | Sim (GPU a partir de ~4 GB) |
| Google Lyria 3 | ~US$ 0,04 a 0,08 | Boa | Não |
| ElevenLabs Music | ~US$ 0,15 por minuto | Alta, licença comercial clara | Não |

Suno não tem API oficial aberta; não recomendado.

## Vídeo (montagem final)

| Opção | Custo por vídeo de ~2 min | Qualidade | Roda local? |
| --- | --- | --- | --- |
| Montagem com ffmpeg (cenas com movimento suave, narração, música e legenda) | US$ 0 | Animatic: imagens paradas com movimento. Bom para validar | Sim (CPU) |
| Kling 3.0 (imagem para vídeo), só nas cenas principais | ~US$ 2 a 3 animando 3 ou 4 cenas (US$ 0,084 por segundo) | Alta | Não |
| Veo 3.1 Fast | ~US$ 12 a 15 animando tudo (US$ 0,10 a 0,12 por segundo) | Alta | Não |

## Recomendação para começar

| Tipo | Padrão | Para comparar |
| --- | --- | --- |
| Texto | Claude Haiku 5.5 | Claude Sonnet 5.5 no roteiro |
| Imagem | Gemini 3.1 Flash Image (personagem consistente) | FLUX.2 Klein |
| Voz | ElevenLabs | Kokoro local (custo zero) |
| Música | Google Lyria 3 | ElevenLabs Music |
| Vídeo | Montagem local com ffmpeg | Kling 3.0 só nas cenas principais |

Custo estimado com o padrão: menos de US$ 1 por vídeo. Animar cenas com Kling soma de
US$ 2 a 3.

Chaves necessárias (só no `.env` local): `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`,
`ELEVENLABS_API_KEY` e, se usar Kling ou FLUX por API, `FAL_KEY`.

## Fontes

- Preços do Claude: tabela oficial de modelos da Anthropic (outubro de 2026).
- [Gemini API image generation pricing (2026)](https://www.developersdigest.tech/models/image-generation/google-gemini-api)
- [Cheapest Image Generation API in 2026](https://aireiter.com/blog/cheapest-image-generation-api)
- [Best Image Generation APIs in 2026](https://developer.puter.com/blog/best-image-generation-apis/)
- [ElevenLabs API Pricing](https://elevenlabs.io/pricing/api)
- [TTS API Pricing in 2026](https://dev.to/leanvox/tts-api-pricing-in-2026-i-went-through-every-provider-so-you-dont-have-to-bem)
- [Google Cloud Text-to-Speech Pricing 2026](https://diyai.io/ai-tools/audio-generation/google-cloud-text-to-speech-pricing/)
- [10 Best Text-to-Music APIs in 2026 (fal)](https://fal.ai/learn/tools/best-text-to-music-apis-2026)
- [Best AI Music Generators (Sept 2026)](https://www.teamday.ai/blog/best-ai-music-models-2026)
- [Kling AI Pricing (Nov 2026)](https://costgoat.com/pricing/kling)
- [Best AI Video Models Sept 2026](https://www.teamday.ai/blog/best-ai-video-models-2026)
- [Best local LLMs for Portuguese 2026](https://www.promptquorum.com/local-llms/best-local-llms-portuguese-language-2026)
