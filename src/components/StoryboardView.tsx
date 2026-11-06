import type { StoryboardOutput } from '../../shared/types';
import { mediaUrl } from '../data';

export function StoryboardView({ storyboard }: { storyboard: StoryboardOutput }) {
  return (
    <div>
      <p className="muted small">Estilo: {storyboard.style}</p>
      <div className="frames">
        {storyboard.frames.map((f) => (
          <figure key={f.scene_number} className="frame">
            <a href={mediaUrl(f.image_path)} target="_blank" rel="noreferrer">
              <img src={mediaUrl(f.image_path)} alt={`Cena ${f.scene_number}`} loading="lazy" />
            </a>
            <figcaption>
              <strong>Cena {f.scene_number}</strong> {f.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
