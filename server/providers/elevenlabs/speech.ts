import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { AudioResult, SpeechProvider, SpeechRequest } from '../types';
import { audioDuration } from '../../media-tools';
import { env, round6, streamToBuffer } from '../util';

/** Preço por mil caracteres na API (novembro de 2026). Na assinatura, sai dos créditos do plano. */
const PER_1K: Record<string, number> = {
  eleven_v4: 0.08,
  eleven_v3: 0.08,
  eleven_multilingual_v2: 0.08,
  eleven_flash_v2_5: 0.04,
};

type Client = Pick<ElevenLabsClient, 'textToSpeech'>;

/**
 * Narração com a ElevenLabs (chave ELEVENLABS_API_KEY). A chave de qualquer plano,
 * inclusive o gratuito, usa os créditos da assinatura.
 * A voz vem de ELEVENLABS_VOICE_ID (escolha uma voz no site da ElevenLabs).
 */
export class ElevenLabsSpeechProvider implements SpeechProvider {
  readonly provider = 'elevenlabs';
  private client?: Client;

  constructor(
    readonly model = 'eleven_v4',
    client?: Client,
    private readonly voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
  ) {
    this.client = client;
  }

  async speak(req: SpeechRequest): Promise<AudioResult> {
    const client = (this.client ??= new ElevenLabsClient({ apiKey: env('ELEVENLABS_API_KEY') }));
    const stream = await client.textToSpeech.convert(this.voiceId, {
      text: req.text,
      modelId: this.model,
      // O multilingual_v2 não aceita language_code.
      languageCode: this.model === 'eleven_multilingual_v2' ? undefined : 'pt',
      outputFormat: 'mp3_44100_128',
    });
    const data = await streamToBuffer(stream);
    return {
      data,
      ext: 'mp3',
      duration_sec: Math.round((await audioDuration(data, 'mp3')) * 100) / 100,
      cost_usd: round6((req.text.length / 1000) * (PER_1K[this.model] ?? 0.08)),
      cost_is_estimate: true,
      usage: { characters: req.text.length },
    };
  }
}
