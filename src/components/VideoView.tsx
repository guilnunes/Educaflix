import { useEffect, useRef, useState } from 'react';
import type { AnimaticManifest, VideoOutput } from '../../shared/types';
import { mediaUrl } from '../data';

export function VideoView({ video }: { video: VideoOutput }) {
  const [manifest, setManifest] = useState<AnimaticManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (video.format !== 'animatic') return;
    fetch(mediaUrl(video.path), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Erro ${r.status}`))))
      .then(setManifest)
      .catch((e) => setError(String(e)));
  }, [video.format, video.path]);

  if (video.format === 'mp4') {
    return <video className="player-video" src={mediaUrl(video.path)} controls />;
  }
  if (error) return <p className="error">Não consegui abrir o vídeo: {error}</p>;
  if (!manifest) return <p className="muted">Carregando vídeo…</p>;
  return <AnimaticPlayer manifest={manifest} />;
}

type Phase = 'scenes' | 'review' | 'quiz' | 'end';

/**
 * Toca o vídeo em forma de animatic: imagem de cada cena com movimento suave,
 * legenda, narração (arquivo de áudio ou voz do navegador) e música. No fim,
 * revisão e quiz. O resultado do quiz não bloqueia nada.
 */
function AnimaticPlayer({ manifest }: { manifest: AnimaticManifest }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('scenes');
  const [playing, setPlaying] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const musicRef = useRef<HTMLAudioElement>(null);
  const narrationRef = useRef<HTMLAudioElement>(null);
  const scenes = manifest.scenes;
  const scene = scenes[index];
  const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const goNext = () => {
    if (index < scenes.length - 1) setIndex(index + 1);
    else {
      setPhase('review');
      setPlaying(false);
    }
  };

  useEffect(() => {
    if (!playing || phase !== 'scenes' || !scene) return;
    let cancelled = false;
    let timerDone = false;
    let mediaDone = false;
    const next = () => {
      if (!cancelled && timerDone && mediaDone) goNext();
    };
    const finishMedia = () => {
      mediaDone = true;
      next();
    };

    let minMs = scene.duration_sec * 1000;
    const music = musicRef.current;
    const narration = narrationRef.current;

    if (scene.is_song && manifest.music_path && music) {
      minMs = 3000;
      music.currentTime = 0;
      music.onended = finishMedia;
      music.play().catch(finishMedia);
    } else if (voiceOn && scene.narration_audio_path && narration) {
      minMs = 2500;
      narration.src = mediaUrl(scene.narration_audio_path);
      narration.onended = finishMedia;
      narration.play().catch(finishMedia);
    } else if (voiceOn && hasSpeech) {
      minMs = 2500;
      const u = new SpeechSynthesisUtterance(scene.subtitle);
      u.lang = 'pt-BR';
      u.rate = 0.95;
      const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt'));
      if (voice) u.voice = voice;
      u.onend = finishMedia;
      u.onerror = finishMedia;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } else {
      mediaDone = true;
    }

    const t = setTimeout(() => {
      timerDone = true;
      next();
    }, minMs);
    // Segurança: se o áudio nunca avisar que acabou, segue em frente.
    const safety = setTimeout(() => {
      timerDone = true;
      mediaDone = true;
      next();
    }, scene.duration_sec * 1000 + 20000);

    return () => {
      cancelled = true;
      clearTimeout(t);
      clearTimeout(safety);
      if (hasSpeech) speechSynthesis.cancel();
      music?.pause();
      narration?.pause();
    };
  }, [index, playing, phase, voiceOn]);

  useEffect(() => () => {
    if (hasSpeech) speechSynthesis.cancel();
  }, [hasSpeech]);

  const restart = () => {
    setPhase('scenes');
    setIndex(0);
    setPlaying(true);
  };

  return (
    <div className="player">
      {manifest.music_path && <audio ref={musicRef} src={mediaUrl(manifest.music_path)} preload="auto" />}
      <audio ref={narrationRef} preload="none" />

      <div className="screen">
        {phase === 'scenes' && scene && (
          <>
            <img
              key={index}
              src={mediaUrl(scene.image_path)}
              alt={scene.title}
              className={`kenburns ${playing ? '' : 'paused'}`}
              style={{ animationDuration: `${Math.max(scene.duration_sec, 8)}s` }}
            />
            <div className="scene-counter">
              Cena {index + 1}/{scenes.length}
            </div>
            {scene.is_song ? (
              <div className="subtitle lyrics">
                {scene.lyrics.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            ) : (
              <div className="subtitle">{scene.subtitle}</div>
            )}
            {!playing && (
              <button type="button" className="big-play" onClick={() => setPlaying(true)} aria-label="Tocar">
                ▶
              </button>
            )}
          </>
        )}
        {phase === 'review' && (
          <div className="card-screen">
            <h3>Revisão</h3>
            <ul>
              {manifest.review.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <button type="button" className="btn btn-primary" onClick={() => setPhase(manifest.quiz.length ? 'quiz' : 'end')}>
              {manifest.quiz.length ? 'Ir para o quiz' : 'Terminar'}
            </button>
          </div>
        )}
        {phase === 'quiz' && <Quiz manifest={manifest} onDone={() => setPhase('end')} />}
        {phase === 'end' && (
          <div className="card-screen">
            <h3>Fim! 🎉</h3>
            <p>O quiz é só para praticar: o resultado não bloqueia o próximo vídeo.</p>
            <button type="button" className="btn btn-secondary" onClick={restart}>
              Ver de novo
            </button>
          </div>
        )}
      </div>

      <div className="player-controls">
        <div className="progress">
          {scenes.map((s, i) => (
            <button
              key={s.scene_number}
              type="button"
              className={`dot ${phase === 'scenes' && i === index ? 'active' : ''} ${phase !== 'scenes' || i < index ? 'done' : ''}`}
              onClick={() => {
                setPhase('scenes');
                setIndex(i);
              }}
              title={`Cena ${s.scene_number}: ${s.title}`}
            />
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={() => setIndex(Math.max(0, index - 1))} disabled={phase !== 'scenes' || index === 0}>
            ⏮
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => (phase === 'scenes' ? setPlaying(!playing) : restart())}>
            {phase !== 'scenes' ? 'Recomeçar' : playing ? '⏸ Pausar' : '▶ Tocar'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={goNext} disabled={phase !== 'scenes'}>
            ⏭
          </button>
          <label className="toggle">
            <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} /> Narração
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setPlaying(false);
              setPhase('review');
            }}
          >
            Pular para revisão e quiz
          </button>
        </div>
        {!manifest.scenes.some((s) => s.narration_audio_path) && (
          <p className="muted small">Narração de exemplo com a voz do navegador. A voz real entra quando escolhermos o modelo de voz.</p>
        )}
      </div>
    </div>
  );
}

function Quiz({ manifest, onDone }: { manifest: AnimaticManifest; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = manifest.quiz[i];
  if (!q) return null;
  const last = i === manifest.quiz.length - 1;
  return (
    <div className="card-screen quiz-screen">
      <div className="muted small">
        Pergunta {i + 1} de {manifest.quiz.length}
      </div>
      <h3>{q.question}</h3>
      <div className="quiz-options">
        {q.options.map((o, j) => (
          <button
            key={j}
            type="button"
            className={`quiz-option ${picked === null ? '' : j === q.answer_index ? 'right' : j === picked ? 'wrong' : ''}`}
            onClick={() => picked === null && setPicked(j)}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <>
          <p>{picked === q.answer_index ? 'Isso mesmo! ' : 'Quase! '}{q.explanation}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setPicked(null);
              if (last) onDone();
              else setI(i + 1);
            }}
          >
            {last ? 'Terminar' : 'Próxima'}
          </button>
        </>
      )}
    </div>
  );
}
