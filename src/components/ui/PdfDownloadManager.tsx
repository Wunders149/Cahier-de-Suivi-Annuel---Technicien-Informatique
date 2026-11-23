import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Printer,
  Share2,
  Smartphone,
  X,
} from 'lucide-react';
import {
  PdfReadyPayload,
  formatPdfSizeLabel,
  revokeBlobUrlNow,
  sharePdfArtifact,
  subscribePdfReady,
  triggerBlobAnchorDownload,
  triggerDataUriDownload,
} from '../../utils/docDesign/fileDownload';
import { Modal } from './Modal';
import { primaryButtonClass, secondaryButtonClass } from './formStyles';

type PdfViewMode = 'none' | 'mobile_sheet' | 'desktop_bar' | 'preview_modal';

interface PdfDownloadManagerProps {
  onNotify?: (message: string) => void;
}

const DESKTOP_AUTO_HIDE_MS = 15_000;

export const PdfDownloadManager: React.FC<PdfDownloadManagerProps> = ({ onNotify }) => {
  const [activePdf, setActivePdf] = useState<PdfReadyPayload | null>(null);
  const [viewMode, setViewMode] = useState<PdfViewMode>('none');
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isFallbackRunning, setIsFallbackRunning] = useState(false);
  const [isDesktopBarPaused, setIsDesktopBarPaused] = useState(false);

  const activeUrlRef = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const autoHideTimerRef = useRef<number | null>(null);

  const clearAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current !== null) {
      window.clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  const dismissAll = useCallback(() => {
    clearAutoHideTimer();
    setViewMode('none');
    setDownloadFeedback(null);
    const currentUrl = activeUrlRef.current;
    if (currentUrl) {
      revokeBlobUrlNow(currentUrl);
      activeUrlRef.current = null;
    }
    setActivePdf(null);
  }, [clearAutoHideTimer]);

  useEffect(() => {
    const unsubscribe = subscribePdfReady((payload) => {
      // Libérer proprement l'éventuel Blob précédent remplacé
      if (activeUrlRef.current && activeUrlRef.current !== payload.blobUrl) {
        revokeBlobUrlNow(activeUrlRef.current);
      }
      activeUrlRef.current = payload.blobUrl;
      setActivePdf(payload);
      setDownloadFeedback(null);
      setIsDesktopBarPaused(false);

      const useMobileSheet =
        payload.environment.isMobile ||
        payload.environment.isIos ||
        payload.environment.isStandalonePwa;

      setViewMode(useMobileSheet ? 'mobile_sheet' : 'desktop_bar');
    });

    return () => {
      unsubscribe();
      clearAutoHideTimer();
      if (activeUrlRef.current) {
        revokeBlobUrlNow(activeUrlRef.current);
        activeUrlRef.current = null;
      }
    };
  }, [clearAutoHideTimer]);

  // Fermeture automatique discrète de la barre Desktop (sauf si survolée ou aperçu ouvert)
  useEffect(() => {
    clearAutoHideTimer();
    if (viewMode !== 'desktop_bar' || isDesktopBarPaused) {
      return;
    }
    autoHideTimerRef.current = window.setTimeout(() => {
      dismissAll();
    }, DESKTOP_AUTO_HIDE_MS);

    return clearAutoHideTimer;
  }, [viewMode, isDesktopBarPaused, activePdf?.id, clearAutoHideTimer, dismissAll]);

  // Fermeture Escape sur la feuille mobile ou la barre desktop
  useEffect(() => {
    if (viewMode !== 'mobile_sheet' && viewMode !== 'desktop_bar') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissAll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, dismissAll]);

  const handleManualDownload = (pdf: PdfReadyPayload) => {
    const ok = triggerBlobAnchorDownload(pdf.blobUrl, pdf.filename);
    if (ok) {
      setDownloadFeedback('Téléchargement lancé.');
      onNotify?.(`Téléchargement du fichier ${pdf.filename} lancé.`);
    } else {
      setDownloadFeedback('Utilisez « Ouvrir le lecteur PDF » ou « Partager ».');
    }
  };

  const handleShare = async (pdf: PdfReadyPayload) => {
    setIsSharing(true);
    try {
      const outcome = await sharePdfArtifact(pdf);
      if (outcome === 'shared') {
        setDownloadFeedback('Document partagé / enregistré.');
        onNotify?.(`Document ${pdf.filename} partagé avec succès.`);
      } else if (outcome === 'unsupported') {
        setDownloadFeedback('Partage natif indisponible : utilisez Télécharger ou Ouvrir.');
        onNotify?.('Partage système non disponible sur ce navigateur.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleWebViewFallback = async (pdf: PdfReadyPayload) => {
    setIsFallbackRunning(true);
    try {
      const ok = await triggerDataUriDownload(pdf.blob, pdf.filename);
      if (ok) {
        setDownloadFeedback('Téléchargement alternatif déclenché.');
        onNotify?.(`Téléchargement alternatif lancé pour ${pdf.filename}.`);
      } else {
        setDownloadFeedback('Ouvrez le PDF dans le lecteur intégré pour l’enregistrer.');
      }
    } finally {
      setIsFallbackRunning(false);
    }
  };

  const handlePrintFromIframe = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      try {
        win.focus();
        win.print();
        return;
      } catch {
        // Secours sur fenêtre parente si l'iframe PDF bloque print()
      }
    }
    window.print();
  };

  if (!activePdf || viewMode === 'none') return null;

  const sizeLabel = formatPdfSizeLabel(activePdf.fileSizeBytes);
  const pageLabel = `${activePdf.pageCount} page${activePdf.pageCount > 1 ? 's' : ''}`;

  // 1. FEUILLE TACTILE MOBILE (iOS Safari / iPadOS / Android Chrome / WebView / PWA)
  if (viewMode === 'mobile_sheet') {
    const iosDevice = activePdf.environment.isIos;
    return (
      <div
        className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 no-print animate-modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) dismissAll();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-mobile-sheet-title"
          className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-modal-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* En-tête document */}
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  <span>Document PDF prêt</span>
                </div>
                <h3
                  id="pdf-mobile-sheet-title"
                  className="text-sm font-bold text-slate-900 truncate mt-0.5"
                  title={activePdf.filename}
                >
                  {activePdf.filename}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {pageLabel} · {sizeLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissAll}
              aria-label="Fermer les options PDF"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions tactiles synchrones (geste utilisateur natif) */}
          <div className="p-5 space-y-2.5">
            {activePdf.canWebShare && (
              <button
                type="button"
                onClick={() => void handleShare(activePdf)}
                disabled={isSharing}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-60"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>
                  {iosDevice
                    ? 'Enregistrer dans Fichiers / Partager'
                    : 'Partager ou enregistrer le PDF'}
                </span>
              </button>
            )}

            <a
              href={activePdf.blobUrl}
              download={activePdf.filename}
              onClick={() => {
                setDownloadFeedback('Téléchargement du fichier lancé.');
                onNotify?.(`Téléchargement de ${activePdf.filename} lancé.`);
              }}
              className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${
                activePdf.canWebShare
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs'
              }`}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Télécharger le fichier (.pdf)</span>
            </a>

            <a
              href={activePdf.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <ExternalLink className="w-4 h-4 shrink-0 text-slate-600" />
              <span>Ouvrir dans le lecteur PDF</span>
            </a>

            {downloadFeedback && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{downloadFeedback}</span>
              </div>
            )}

            <div className="pt-1 text-[11px] leading-relaxed text-slate-500">
              {iosDevice ? (
                <p>
                  Sur iPhone et iPad, <strong className="font-semibold text-slate-700">Enregistrer dans Fichiers</strong> ou{' '}
                  <strong className="font-semibold text-slate-700">Ouvrir dans le lecteur PDF</strong> conserve votre page de travail ouverte en arrière-plan.
                </p>
              ) : (
                <p>
                  {activePdf.autoDownloadAttempted
                    ? 'Le téléchargement automatique a été lancé. En cas de blocage par votre navigateur intégré, utilisez les options ci-dessus.'
                    : 'Appuyez sur Télécharger le fichier ou Partager pour sauvegarder ce PDF sur votre appareil.'}
                </p>
              )}
            </div>

            {activePdf.fileSizeBytes <= 4 * 1024 * 1024 && (
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => void handleWebViewFallback(activePdf)}
                  disabled={isFallbackRunning}
                  className="text-[11px] font-medium text-slate-500 hover:text-blue-700 underline underline-offset-2 py-1 disabled:opacity-50"
                >
                  {isFallbackRunning
                    ? 'Préparation du lien alternatif...'
                    : 'Lien alternatif (si navigateur intégré)'}
                </button>
                <button
                  type="button"
                  onClick={dismissAll}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. MODAL D'APERÇU PLEIN ÉCRAN (Desktop / Tablette)
  if (viewMode === 'preview_modal') {
    return (
      <Modal
        isOpen
        onClose={dismissAll}
        title={`Aperçu PDF — ${activePdf.filename}`}
        subtitle={`${pageLabel} · ${sizeLabel} · Texte sélectionnable et prêt à imprimer`}
        icon={<FileText className="w-4 h-4" />}
        tone="emerald"
        size="2xl"
        footer={
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={activePdf.blobUrl}
                download={activePdf.filename}
                onClick={() => onNotify?.(`Téléchargement de ${activePdf.filename} lancé.`)}
                className={`${primaryButtonClass} inline-flex items-center gap-1.5`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger (.pdf)</span>
              </a>

              <button
                type="button"
                onClick={handlePrintFromIframe}
                className={`${secondaryButtonClass} inline-flex items-center gap-1.5`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>

              <a
                href={activePdf.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${secondaryButtonClass} inline-flex items-center gap-1.5`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir dans un onglet</span>
              </a>

              {activePdf.canWebShare && (
                <button
                  type="button"
                  onClick={() => void handleShare(activePdf)}
                  disabled={isSharing}
                  className={`${secondaryButtonClass} inline-flex items-center gap-1.5`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Partager</span>
                </button>
              )}
            </div>

            <button type="button" onClick={dismissAll} className={secondaryButtonClass}>
              Fermer
            </button>
          </div>
        }
      >
        <div className="w-full h-[68vh] min-h-[420px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
          <iframe
            ref={iframeRef}
            src={activePdf.blobUrl}
            title={activePdf.filename}
            className="w-full h-full border-0 bg-slate-100"
          />
        </div>
      </Modal>
    );
  }

  // 3. BARRE DISCRÈTE DESKTOP (coin inférieur gauche — évite la zone Toast en bas à droite)
  return (
    <div
      role="region"
      aria-label="Actions rapides document PDF"
      onMouseEnter={() => setIsDesktopBarPaused(true)}
      onMouseLeave={() => setIsDesktopBarPaused(false)}
      className="fixed bottom-4 left-4 z-50 w-[min(calc(100vw-2rem),410px)] bg-white rounded-xl shadow-2xl border border-slate-200/95 p-3.5 text-slate-900 no-print animate-toast-in"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate" title={activePdf.filename}>
              {activePdf.filename}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {pageLabel} · {sizeLabel}
              {activePdf.environment.isIframe
                ? ' · Cliquez Télécharger si bloqué par l’aperçu'
                : ' · Prêt'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissAll}
          aria-label="Fermer la barre PDF"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <a
          href={activePdf.blobUrl}
          download={activePdf.filename}
          onClick={() => {
            setDownloadFeedback('Téléchargement relancé.');
            onNotify?.(`Téléchargement de ${activePdf.filename} relancé.`);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Re-télécharger</span>
        </a>

        <button
          type="button"
          onClick={() => {
            clearAutoHideTimer();
            setViewMode('preview_modal');
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition shadow-2xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Aperçu PDF</span>
        </button>

        <a
          href={activePdf.blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-medium transition"
          title="Ouvrir le PDF dans un nouvel onglet du navigateur"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Ouvrir</span>
        </a>

        {activePdf.canWebShare && (
          <button
            type="button"
            onClick={() => void handleShare(activePdf)}
            disabled={isSharing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-medium transition disabled:opacity-60"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Partager</span>
          </button>
        )}

        {!activePdf.autoDownloadAttempted && (
          <button
            type="button"
            onClick={() => handleManualDownload(activePdf)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-blue-700 hover:bg-blue-50 transition"
          >
            Forcer
          </button>
        )}
      </div>

      {downloadFeedback && (
        <p className="mt-2 text-[11px] text-emerald-700 font-medium">{downloadFeedback}</p>
      )}
    </div>
  );
};
