import type { ButtonHTMLAttributes } from 'react';
import { useT } from '../../lib/i18n-react';

export function GrimoireAddButton({
  busy = false,
  modName,
  disabled,
  className = '',
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  busy?: boolean;
  modName: string;
}) {
  const t = useT();
  return (
    <button
      {...props}
      type="button"
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      aria-label={
        busy ? t('Adding {name}…', { name: modName }) : t('Add {name}', { name: modName })
      }
      className={`grimoire-add-button ${className}`}
    >
      <span className="grimoire-add-label">{busy ? t('Adding…') : t('add')}</span>
      <svg viewBox="0 0 100 52" fill="none" aria-hidden="true" className="grimoire-add-circle">
        <path
          pathLength="1"
          d="M80 9C61 1 22 4 9 19C-5 36 19 49 50 47C81 46 102 32 91 17C88 12 82 8 74 7"
        />
        <path pathLength="1" d="M16 39C31 50 70 49 89 35C101 24 85 8 65 6" />
      </svg>
    </button>
  );
}
