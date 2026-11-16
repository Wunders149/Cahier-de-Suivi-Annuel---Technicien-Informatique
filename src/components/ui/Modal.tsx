import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type ModalTone = 'default' | 'danger' | 'emerald' | 'amber';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: ModalTone;
  size?: ModalSize;
  footer?: React.ReactNode;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
};

const ICON_TONE_CLASSES: Record<ModalTone, string> = {
  default: 'bg-blue-50 text-blue-700 border-blue-200/80',
  danger: 'bg-red-50 text-red-700 border-red-200/80',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
};

let openModalCount = 0;
let savedBodyOverflow = '';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  tone = 'default',
  size = 'lg',
  footer,
  onSubmit,
  closeOnBackdrop = true,
  children,
}) => {
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    if (openModalCount === 0) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openModalCount += 1;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Focus initial interactive field inside modal when opened
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const autoFocusEl = panel.querySelector<HTMLElement>(
        '[data-autofocus], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      if (autoFocusEl) {
        autoFocusEl.focus({ preventScroll: true });
      } else {
        panel.focus({ preventScroll: true });
      }
    }, 10);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = savedBodyOverflow;
      }
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === 'function' &&
        document.contains(previousFocusRef.current)
      ) {
        previousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const contentBody = (
    <>
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 text-xs text-slate-700">
        {children}
      </div>
      {footer && (
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-modal-backdrop no-print"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={`bg-white w-full ${SIZE_CLASSES[size]} rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200/90 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-900 focus:outline-none animate-modal-panel`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${ICON_TONE_CLASSES[tone]}`}
                aria-hidden="true"
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3
                id={titleId}
                className="text-[15px] font-bold text-slate-900 leading-snug tracking-tight"
              >
                {title}
              </h3>
              {subtitle && (
                <p
                  id={subtitleId}
                  className="text-[12px] text-slate-500 mt-0.5 leading-snug"
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body + Sticky Footer */}
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
            {contentBody}
          </form>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">{contentBody}</div>
        )}
      </div>
    </div>
  );
};
