import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

function inferVariant(message: string): ToastVariant {
  const lower = message.toLowerCase();
  if (lower.includes('erreur') || lower.includes('échec') || lower.includes('invalide')) {
    return 'error';
  }
  if (lower.includes('en cours')) {
    return 'info';
  }
  return 'success';
}

export const Toast: React.FC<ToastProps> = ({
  message,
  onDismiss,
  onPause,
  onResume,
}) => {
  if (!message) return null;

  const variant = inferVariant(message);

  const icon =
    variant === 'error' ? (
      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
    ) : variant === 'info' ? (
      <Info className="w-4 h-4 text-sky-400 shrink-0" />
    ) : (
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    );

  const borderTone =
    variant === 'error'
      ? 'border-rose-500/40'
      : variant === 'info'
      ? 'border-sky-500/30'
      : 'border-slate-700';

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-slate-900 text-white pl-4 pr-2.5 py-3 rounded-xl shadow-2xl border ${borderTone} flex items-center justify-between gap-3 text-xs font-medium animate-toast-in no-print`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <span className="leading-snug">{message}</span>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fermer la notification"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
