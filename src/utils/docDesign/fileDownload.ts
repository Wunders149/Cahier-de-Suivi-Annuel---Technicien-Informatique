/**
 * Utilitaires de téléchargement, partage et aperçu PDF multi-plateformes
 * (Ordinateur : Chrome, Firefox, Edge, Safari, Iframes ;
 *  Mobile : iOS Safari, iPadOS, Android Chrome, WebViews et PWA installées).
 */

export interface DownloadEnvironment {
  isIos: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isStandalonePwa: boolean;
  isIframe: boolean;
}

export interface PdfReadyPayload {
  id: string;
  filename: string;
  title: string;
  pageCount: number;
  fileSizeBytes: number;
  blob: Blob;
  file: File | null;
  blobUrl: string;
  canWebShare: boolean;
  environment: DownloadEnvironment;
  autoDownloadAttempted: boolean;
  createdAt: number;
}

export type PdfReadyListener = (payload: PdfReadyPayload) => void;

const listeners = new Set<PdfReadyListener>();
const activeUrls = new Map<string, number>();

export function detectDownloadEnvironment(): DownloadEnvironment {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isIos: false,
      isAndroid: false,
      isMobile: false,
      isStandalonePwa: false,
      isIframe: false,
    };
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const isIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (/Macintosh/i.test(platform) && maxTouchPoints > 1) ||
    (/MacIntel/i.test(platform) && maxTouchPoints > 1);

  const isAndroid = /Android/i.test(ua);

  const isCoarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  const isNarrowViewport = window.innerWidth > 0 && window.innerWidth < 768;

  const isMobile =
    isIos ||
    isAndroid ||
    /Mobi|Mobile|Tablet|Silk|Kindle|Opera Mini|IEMobile/i.test(ua) ||
    (isCoarsePointer && isNarrowViewport);

  const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const isStandalonePwa = navStandalone || displayStandalone;

  let isIframe = false;
  try {
    isIframe = window.self !== window.top;
  } catch {
    isIframe = true;
  }

  return {
    isIos,
    isAndroid,
    isMobile,
    isStandalonePwa,
    isIframe,
  };
}

/**
 * Normalise un nom de fichier PDF pour garantir la compatibilité sur tous les systèmes
 * (Windows, macOS, Linux, iOS Fichiers, Android Téléchargements).
 */
export function normalizePdfFilename(rawFilename: string): string {
  const withoutExt = (rawFilename || 'document')
    .replace(/\.pdf$/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);

  return `${withoutExt || 'document'}.pdf`;
}

export function formatPdfSizeLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Ko';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

export function canSharePdfFile(file: File | null): boolean {
  if (!file || typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare === 'function') {
    try {
      return navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Déclenche un téléchargement fiable par balise <a> attachée au DOM
 * sans révocation prématurée du Blob URL.
 */
export function triggerBlobAnchorDownload(blobUrl: string, filename: string): boolean {
  if (typeof document === 'undefined' || !blobUrl) return false;
  const safeName = normalizePdfFilename(filename);

  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeName;
    link.rel = 'noopener noreferrer';
    link.style.position = 'fixed';
    link.style.left = '-9999px';
    link.style.top = '0';
    link.style.opacity = '0';
    link.setAttribute('aria-hidden', 'true');

    document.body.appendChild(link);
    link.click();

    window.setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      } catch {
        // Ignorer si déjà retiré
      }
    }, 250);

    return true;
  } catch {
    return false;
  }
}

/**
 * Solution de repli Data URI pour les WebViews mobiles restrictives (ex. Android WebView)
 * qui bloquent parfois le téléchargement direct des URL blob:. Limitée à 4 Mo.
 */
export function triggerDataUriDownload(blob: Blob, filename: string): Promise<boolean> {
  if (
    typeof document === 'undefined' ||
    typeof FileReader === 'undefined' ||
    !blob ||
    blob.size > 4 * 1024 * 1024
  ) {
    return Promise.resolve(false);
  }

  const safeName = normalizePdfFilename(filename);

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          resolve(false);
          return;
        }
        try {
          const link = document.createElement('a');
          link.href = result;
          link.download = safeName;
          link.rel = 'noopener noreferrer';
          link.style.position = 'fixed';
          link.style.left = '-9999px';
          link.style.opacity = '0';
          document.body.appendChild(link);
          link.click();
          window.setTimeout(() => {
            if (link.parentNode) {
              link.parentNode.removeChild(link);
            }
          }, 300);
          resolve(true);
        } catch {
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(blob);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Ouvre la feuille de partage native iOS/Android (« Enregistrer dans Fichiers », Mail, Drive, etc.).
 * Doit idéalement être appelé depuis un événement clic direct utilisateur.
 */
export async function sharePdfArtifact(
  payload: Pick<PdfReadyPayload, 'file' | 'title' | 'filename'>
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!payload.file || !canSharePdfFile(payload.file)) {
    return 'unsupported';
  }
  try {
    await navigator.share({
      title: payload.title || payload.filename,
      text: `Document PDF : ${payload.filename}`,
      files: [payload.file],
    });
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unsupported';
  }
}

export function scheduleBlobUrlRevoke(blobUrl: string, delayMs = 180_000): void {
  if (typeof window === 'undefined' || !blobUrl) return;
  const existing = activeUrls.get(blobUrl);
  if (existing !== undefined) {
    window.clearTimeout(existing);
  }
  const timer = window.setTimeout(() => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Ignorer
    }
    activeUrls.delete(blobUrl);
  }, delayMs);
  activeUrls.set(blobUrl, timer);
}

export function revokeBlobUrlNow(blobUrl: string): void {
  if (typeof window === 'undefined' || !blobUrl) return;
  const existing = activeUrls.get(blobUrl);
  if (existing !== undefined) {
    window.clearTimeout(existing);
    activeUrls.delete(blobUrl);
  }
  // Laisser 500 ms de marge si un clic de téléchargement vient tout juste de démarrer
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Ignorer
    }
  }, 500);
}

export function subscribePdfReady(listener: PdfReadyListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Point d'entrée universel de téléchargement PDF pour Desktop et Mobile.
 * - Sur ordinateur : téléchargement immédiat via Blob URL + barre discrète Aperçu / Re-télécharger.
 * - Sur Android : téléchargement immédiat + feuille tactile avec Partager / Ouvrir / Re-télécharger.
 * - Sur iOS / iPadOS / PWA : feuille tactile directe afin que chaque action utilise un geste natif synchrone.
 */
export function dispatchPdfDownload(options: {
  buffer: ArrayBuffer;
  filename: string;
  title?: string;
  pageCount: number;
  fileSizeBytes?: number;
}): { filename: string; environment: DownloadEnvironment } {
  const safeFilename = normalizePdfFilename(options.filename);
  const environment = detectDownloadEnvironment();

  if (typeof window === 'undefined' || typeof Blob === 'undefined') {
    return { filename: safeFilename, environment };
  }

  const blob = new Blob([options.buffer], { type: 'application/pdf' });
  let file: File | null = null;
  try {
    file = new File([blob], safeFilename, {
      type: 'application/pdf',
      lastModified: Date.now(),
    });
  } catch {
    file = null;
  }

  const blobUrl = URL.createObjectURL(blob);
  scheduleBlobUrlRevoke(blobUrl, 300_000);

  // Sur iOS/iPadOS ou PWA standalone iOS, éviter le clic programmatique post-async
  // qui peut être ignoré ou naviguer hors de l'application ; la feuille tactile dédiée prend le relais.
  let autoDownloadAttempted = false;
  if (!environment.isIos) {
    autoDownloadAttempted = triggerBlobAnchorDownload(blobUrl, safeFilename);
  }

  const payload: PdfReadyPayload = {
    id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    filename: safeFilename,
    title: options.title || safeFilename,
    pageCount: options.pageCount,
    fileSizeBytes: options.fileSizeBytes ?? blob.size,
    blob,
    file,
    blobUrl,
    canWebShare: canSharePdfFile(file),
    environment,
    autoDownloadAttempted,
    createdAt: Date.now(),
  };

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.error('Erreur listener PdfReady:', err);
    }
  });

  return { filename: safeFilename, environment };
}
