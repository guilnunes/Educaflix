import type { ScriptOutput } from '../../shared/types';

export function ScriptView({ script }: { script: ScriptOutput }) {
  const total = script.scenes.reduce((s, c) => s + c.duration_sec, 0);
  return (
    <div className="script">
      <p className="logline">{script.logline}</p>

      <div className="chips">
        {script.characters.map((c) => (
          <span key={c.name} className={`chip chip-${c.role === 'mascote' ? 'mascot' : c.role === 'pessoa citada' ? 'person' : 'support'}`} title={c.description}>
            {c.name} <small>· {c.role}</small>
          </span>
        ))}
      </div>

      <h4>
        Roteiro <small className="muted">({script.scenes.length} cenas, cerca de {Math.round(total / 6) / 10} min)</small>
      </h4>
      <ol className="scenes">
        {script.scenes.map((s) => (
          <li key={s.number} className={s.is_song ? 'song-scene' : ''}>
            <div className="scene-head">
              <strong>
                Cena {s.number} · {s.title}
              </strong>
              <span className="muted small">{s.duration_sec} s{s.is_song ? ' · música' : ''}</span>
            </div>
            <p className="narration">“{s.narration}”</p>
            <p className="visual">
              <span className="label">Na tela:</span> {s.visual}
            </p>
            {s.on_screen_text && (
              <p className="visual">
                <span className="label">Texto na tela:</span> <code>{s.on_screen_text}</code>
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="two-cols">
        <section className="song">
          <h4>🎵 Música: {script.song.title}</h4>
          <p className="muted small">{script.song.style}</p>
          <p className="hook">“{script.song.hook}”</p>
          {script.song.parts.map((p, i) => (
            <div key={i} className="song-part">
              <span className="label">{p.label}</span>
              {p.lines.map((l, j) => (
                <div key={j}>{l}</div>
              ))}
            </div>
          ))}
        </section>

        <section>
          <h4>Revisão</h4>
          <ul className="review">
            {script.review.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <h4>Quiz</h4>
          <ol className="quiz">
            {script.quiz.map((q, i) => (
              <li key={i}>
                <div>{q.question}</div>
                <ul>
                  {q.options.map((o, j) => (
                    <li key={j} className={j === q.answer_index ? 'correct' : ''}>
                      {j === q.answer_index ? '✓ ' : ''}
                      {o}
                    </li>
                  ))}
                </ul>
                <div className="muted small">{q.explanation}</div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
