import type { ReactNode } from 'react';
import { IS_LOCAL, LOCAL_ONLY_HINT } from '../data';
import type { Tone } from '../status';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/** Botão de ação que só funciona no modo local. No modo publicado aparece desabilitado. */
export function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'secondary',
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
  title?: string;
}) {
  const off = !IS_LOCAL || disabled;
  return (
    <button
      type="button"
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={off}
      title={!IS_LOCAL ? LOCAL_ONLY_HINT : title}
    >
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="spinner" aria-label="carregando" />;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
