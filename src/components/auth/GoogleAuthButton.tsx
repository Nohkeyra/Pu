import type { ButtonHTMLAttributes } from 'react';
import './google-auth.css';

interface GoogleAuthButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> {
  label: string;
  compact?: boolean;
  busy?: boolean;
}

/** Google's four-colour G on a neutral, high-contrast button. */
export function GoogleAuthButton({ label, compact = false, busy = false, className = '', disabled, ...props }: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      className={`google-auth-button${compact ? ' google-auth-button--compact' : ''} ${className}`.trim()}
      disabled={disabled || busy}
      aria-busy={busy}
      {...props}
    >
      <svg className="google-auth-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="#4285F4" d="M21.35 12.25c0-.71-.06-1.38-.18-2.03H12v3.84h5.24a4.47 4.47 0 0 1-1.94 2.94v2.44h3.15c1.84-1.69 2.9-4.18 2.9-7.19Z" />
        <path fill="#34A853" d="M12 21.75c2.63 0 4.83-.87 6.45-2.36L15.3 16.95c-.87.59-1.98.94-3.3.94a5.84 5.84 0 0 1-5.49-4.05H3.27v2.5A9.75 9.75 0 0 0 12 21.75Z" />
        <path fill="#FBBC05" d="M6.51 13.84a5.86 5.86 0 0 1 0-3.68v-2.5H3.27a9.76 9.76 0 0 0 0 8.68l3.24-2.5Z" />
        <path fill="#EA4335" d="M12 6.11c1.43 0 2.71.49 3.72 1.45l2.79-2.79A9.32 9.32 0 0 0 12 2.25a9.75 9.75 0 0 0-8.73 5.41l3.24 2.5A5.84 5.84 0 0 1 12 6.11Z" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
