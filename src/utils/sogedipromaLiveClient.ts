import { SogedipromaStateData, SogedipromaSyncModuleKey } from './sogedipromaSync';

export const PAIRED_SOGEDIPROMA_URL = 'https://win-rmt226g06rg.taild86fee.ts.net';
export const SOG_SERVER_URL_KEY = 'sogediproma_server_url';
export const LAST_SYNC_META_KEY = 'sogediproma_last_sync_v1';
export const SOG_AUTO_POLL_KEY = 'sogediproma_auto_poll_v1';
export const SOG_POLL_INTERVAL_MS = 30000;

const SOG_SESSION_CREDS_KEY = 'sogediproma_session_creds_v1';
const SOG_LOCAL_CREDS_KEY = 'sogediproma_remember_creds_v1';
const SOG_STATUS_EVENT = 'sogediproma-sync-status-updated';
const DIRECT_FETCH_TIMEOUT_MS = 7500;

export type SogTransportMode = 'proxy' | 'direct';

export type SogSyncErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_FAILED'
  | 'NEEDS_SETUP'
  | 'TAILSCALE_TIMEOUT'
  | 'TAILSCALE_UNREACHABLE'
  | 'TAILSCALE_OR_CORS_BLOCKED'
  | 'STATIC_NO_PROXY_CORS'
  | 'PRIVATE_LAN'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_UNREACHABLE'
  | 'HTTP_ERROR'
  | 'EMPTY_RESPONSE'
  | 'UNKNOWN';

export type SogLiveSyncPhase =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'auth_required'
  | 'unreachable'
  | 'error';

export interface SogLiveSyncStatus {
  phase: SogLiveSyncPhase;
  transport: SogTransportMode | null;
  lastSyncedAt: string | null;
  revision: number | null;
  errorCode: SogSyncErrorCode | null;
  message: string | null;
  hint: string | null;
  backendProxyAvailable: boolean;
  autoPollEnabled: boolean;
  consecutiveFailures: number;
}

export interface ServerConfigStatus {
  hasDefaultUrl: boolean;
  defaultUrl: string;
  pairedUrl?: string;
  isDefaultUrlPrivateLan?: boolean;
  hasDefaultCredentials: boolean;
  defaultUsername: string;
}

export interface LastSogedipromaSyncMeta {
  at: string;
  revision?: number;
  summary: string;
  url: string;
  transport?: SogTransportMode;
}

export interface SogSavedCredentials {
  username: string;
  password: string;
  rememberInBrowser: boolean;
}

export class SogSyncError extends Error {
  code: SogSyncErrorCode;
  hint?: string;
  proxyUnavailable?: boolean;

  constructor(
    message: string,
    code: SogSyncErrorCode,
    hint?: string,
    proxyUnavailable = false
  ) {
    super(message);
    this.name = 'SogSyncError';
    this.code = code;
    this.hint = hint;
    this.proxyUnavailable = proxyUnavailable;
  }
}

export function isPrivateLanUrl(urlStr: string): boolean {
  try {
    const h = new URL(urlStr.trim()).hostname.toLowerCase();
    if (h === 'localhost' || h === '::1' || h.endsWith('.local')) return true;
    if (h.startsWith('127.') || h.startsWith('10.') || h.startsWith('192.168.')) return true;
    const m = /^172\.(\d+)\./.exec(h);
    if (m) {
      const n = Number(m[1]);
      return n >= 16 && n <= 31;
    }
    return false;
  } catch {
    return false;
  }
}

export function isTailscaleUrl(urlStr: string): boolean {
  try {
    return new URL(urlStr.trim()).hostname.toLowerCase().endsWith('.ts.net');
  } catch {
    return false;
  }
}

export function isCloudHostedRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  return h !== 'localhost' && h !== '127.0.0.1';
}

export function normalizeCleanUrl(rawUrl: string): string {
  return String(rawUrl || '').trim().replace(/\/+$/, '');
}

export function resolvePreferredSogUrl(cfg?: Partial<ServerConfigStatus> | null): string {
  const pairedDefault = cfg?.pairedUrl || cfg?.defaultUrl || PAIRED_SOGEDIPROMA_URL;
  try {
    const stored = (localStorage.getItem(SOG_SERVER_URL_KEY) || '').trim();
    const isCloud = isCloudHostedRuntime();
    if (
      stored &&
      !stored.includes('pc-informatique.taild86fee.ts.net') &&
      !(isCloud && !cfg?.isDefaultUrlPrivateLan && isPrivateLanUrl(stored))
    ) {
      return normalizeCleanUrl(stored);
    }
    if (stored.includes('pc-informatique.taild86fee.ts.net')) {
      localStorage.setItem(SOG_SERVER_URL_KEY, pairedDefault);
    }
  } catch {
    // Ignorer erreur localStorage
  }
  return normalizeCleanUrl(pairedDefault);
}

export function persistSogServerUrl(val: string): void {
  try {
    localStorage.setItem(SOG_SERVER_URL_KEY, val);
  } catch {
    // Ignorer erreur localStorage
  }
}

export function loadSavedSogCredentials(): SogSavedCredentials {
  try {
    const rawSession = sessionStorage.getItem(SOG_SESSION_CREDS_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession) as Partial<SogSavedCredentials>;
      if (parsed.username || parsed.password) {
        return {
          username: String(parsed.username || ''),
          password: String(parsed.password || ''),
          rememberInBrowser: Boolean(parsed.rememberInBrowser),
        };
      }
    }
    const rawLocal = localStorage.getItem(SOG_LOCAL_CREDS_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as Partial<SogSavedCredentials>;
      return {
        username: String(parsed.username || ''),
        password: String(parsed.password || ''),
        rememberInBrowser: true,
      };
    }
  } catch {
    // Ignorer erreur storage
  }
  return { username: '', password: '', rememberInBrowser: false };
}

export function saveSogCredentials(creds: SogSavedCredentials): void {
  const clean: SogSavedCredentials = {
    username: creds.username.trim(),
    password: creds.password,
    rememberInBrowser: creds.rememberInBrowser,
  };

  try {
    if (clean.username || clean.password) {
      sessionStorage.setItem(SOG_SESSION_CREDS_KEY, JSON.stringify(clean));
    } else {
      sessionStorage.removeItem(SOG_SESSION_CREDS_KEY);
    }
  } catch {
    // Ignorer erreur sessionStorage
  }

  try {
    if (clean.rememberInBrowser && (clean.username || clean.password)) {
      localStorage.setItem(SOG_LOCAL_CREDS_KEY, JSON.stringify(clean));
    } else {
      localStorage.removeItem(SOG_LOCAL_CREDS_KEY);
    }
  } catch {
    // Ignorer erreur localStorage
  }
}

export function clearSavedSogCredentials(): void {
  try {
    sessionStorage.removeItem(SOG_SESSION_CREDS_KEY);
  } catch {
    // Ignorer
  }
  try {
    localStorage.removeItem(SOG_LOCAL_CREDS_KEY);
  } catch {
    // Ignorer
  }
}

export function loadAutoPollEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SOG_AUTO_POLL_KEY);
    if (raw === 'false' || raw === '0') return false;
  } catch {
    // Ignorer
  }
  return true;
}

export function saveAutoPollEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOG_AUTO_POLL_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignorer
  }
}

export function loadLastSogSyncMeta(): LastSogedipromaSyncMeta | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_META_KEY);
    return raw ? (JSON.parse(raw) as LastSogedipromaSyncMeta) : null;
  } catch {
    return null;
  }
}

export function saveLastSogSyncMeta(meta: LastSogedipromaSyncMeta): void {
  try {
    localStorage.setItem(LAST_SYNC_META_KEY, JSON.stringify(meta));
  } catch {
    // Ignorer
  }
}

export function emitSogSyncStatusEvent(status: Partial<SogLiveSyncStatus>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SOG_STATUS_EVENT, { detail: status }));
}

export function subscribeSogSyncStatusEvent(
  handler: (status: Partial<SogLiveSyncStatus>) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const custom = e as CustomEvent<Partial<SogLiveSyncStatus>>;
    if (custom.detail) handler(custom.detail);
  };
  window.addEventListener(SOG_STATUS_EVENT, listener);
  return () => window.removeEventListener(SOG_STATUS_EVENT, listener);
}

/**
 * Construit la sélection de modules autoritaire à partir d'une réponse complète /api/state
 * afin que mode 'replace-sog' répercute aussi les suppressions ou vidages côté SOGEDIPROMA.
 */
export function buildFullStateModuleSelection(
  raw: SogedipromaStateData
): Record<SogedipromaSyncModuleKey, boolean> {
  const hasInv = Array.isArray(raw.inventory);
  const hasPur = Array.isArray(raw.purchases);
  const hasAssets = Array.isArray(raw.assets);
  const hasTickets = Array.isArray(raw.tickets);
  const hasWorkLogs = Array.isArray(raw.workLogs);
  const hasMaint = Array.isArray(raw.maintenance);
  const hasSubs = Array.isArray(raw.subscriptions);
  const hasTrack = Array.isArray(raw.itTracking);
  const hasAccess = Array.isArray(raw.accesses);
  const hasBudgets = Array.isArray(raw.budgets);

  return {
    consommables: hasInv,
    demandesAchat: hasPur,
    parcEquipements: hasAssets,
    reseauEquipements: hasAssets,
    maintenances: hasMaint || hasTrack,
    interventions: hasTickets,
    journalTaches: hasWorkLogs || hasMaint || hasTrack,
    logicielsLicences: hasSubs || hasAccess || hasTrack,
    objectifsAnnuels: hasBudgets,
    jalonsCalendrier: hasTrack,
  };
}

async function safeParseJson<T>(res: Response): Promise<T | null> {
  try {
    const txt = await res.text();
    return txt ? (JSON.parse(txt) as T) : null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = DIRECT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSogConfigSafe(): Promise<{
  proxyAvailable: boolean;
  config: ServerConfigStatus;
}> {
  const fallback: ServerConfigStatus = {
    hasDefaultUrl: true,
    defaultUrl: PAIRED_SOGEDIPROMA_URL,
    pairedUrl: PAIRED_SOGEDIPROMA_URL,
    isDefaultUrlPrivateLan: false,
    hasDefaultCredentials: false,
    defaultUsername: '',
  };

  try {
    const res = await fetchWithTimeout('/api/sogediproma/config', { method: 'GET' }, 5000);
    if (res.status === 404 || res.status === 405) {
      return { proxyAvailable: false, config: fallback };
    }
    if (!res.ok) {
      return { proxyAvailable: false, config: fallback };
    }
    const data = await safeParseJson<ServerConfigStatus>(res);
    return {
      proxyAvailable: true,
      config: data ? { ...fallback, ...data } : fallback,
    };
  } catch {
    return { proxyAvailable: false, config: fallback };
  }
}

function shouldAttemptDirectFallback(
  status: number,
  errorCode?: string
): { fallback: boolean; proxyUnavailable: boolean } {
  if (status === 404 || status === 405) {
    return { fallback: true, proxyUnavailable: true };
  }
  if (status === 502 || status === 504) {
    return { fallback: true, proxyUnavailable: false };
  }
  if (
    errorCode &&
    [
      'TAILSCALE_TIMEOUT',
      'TAILSCALE_UNREACHABLE',
      'UPSTREAM_TIMEOUT',
      'UPSTREAM_UNREACHABLE',
      'PRIVATE_LAN',
    ].includes(errorCode)
  ) {
    return { fallback: true, proxyUnavailable: false };
  }
  return { fallback: false, proxyUnavailable: false };
}

async function tryDirectBrowserFetch(
  targetBaseUrl: string,
  mode: 'test' | 'sync',
  creds: { username?: string; password?: string; knownRevision?: number },
  proxyContext?: {
    proxyTimedOut?: boolean;
    proxyStatic?: boolean;
    proxyMessage?: string;
    proxyHint?: string;
  }
): Promise<{
  reachable?: boolean;
  authenticated?: boolean;
  needsSetup?: boolean;
  settings?: { company?: string };
  revision?: number;
  unchanged?: boolean;
  data?: SogedipromaStateData;
  transport: SogTransportMode;
}> {
  const cleanUrl = normalizeCleanUrl(targetBaseUrl);
  if (!cleanUrl) {
    throw new SogSyncError(
      'Aucune URL SOGEDIPROMA valide configurée.',
      'HTTP_ERROR',
      undefined,
      Boolean(proxyContext?.proxyStatic)
    );
  }

  try {
    const statusRes = await fetchWithTimeout(
      `${cleanUrl}/api/status`,
      {
        method: 'GET',
        credentials: 'include',
      },
      DIRECT_FETCH_TIMEOUT_MS
    );
    const statusData = await safeParseJson<{
      authenticated?: boolean;
      needsSetup?: boolean;
      revision?: number;
      settings?: { company?: string };
      error?: string;
    }>(statusRes);

    if (!statusRes.ok) {
      throw new SogSyncError(
        statusData?.error || `HTTP ${statusRes.status} sur ${cleanUrl}/api/status`,
        'HTTP_ERROR',
        undefined,
        Boolean(proxyContext?.proxyStatic)
      );
    }

    if (
      mode === 'sync' &&
      creds.knownRevision !== undefined &&
      typeof statusData?.revision === 'number' &&
      statusData.revision === creds.knownRevision
    ) {
      return {
        unchanged: true,
        revision: creds.knownRevision,
        settings: statusData?.settings,
        transport: 'direct',
      };
    }

    let authenticated = Boolean(statusData?.authenticated);
    let loginPayload: { revision?: number; data?: SogedipromaStateData } | null = null;

    if (!authenticated && creds.username?.trim() && creds.password) {
      const loginRes = await fetchWithTimeout(
        `${cleanUrl}/api/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: creds.username.trim(),
            password: creds.password,
          }),
        },
        DIRECT_FETCH_TIMEOUT_MS
      );
      if (!loginRes.ok) {
        throw new SogSyncError(
          'Identifiants SOGEDIPROMA refusés par le serveur distant.',
          'AUTH_FAILED',
          undefined,
          Boolean(proxyContext?.proxyStatic)
        );
      }
      authenticated = true;
      loginPayload = await safeParseJson<{ revision?: number; data?: SogedipromaStateData }>(
        loginRes
      );
    }

    if (mode === 'test') {
      return {
        reachable: true,
        authenticated,
        needsSetup: Boolean(statusData?.needsSetup),
        revision: typeof statusData?.revision === 'number' ? statusData.revision : undefined,
        settings: statusData?.settings,
        transport: 'direct',
      };
    }

    if (loginPayload?.data) {
      const rev = typeof loginPayload.revision === 'number' ? loginPayload.revision : undefined;
      if (creds.knownRevision !== undefined && rev !== undefined && rev === creds.knownRevision) {
        return {
          unchanged: true,
          revision: rev,
          transport: 'direct',
        };
      }
      return {
        revision: rev,
        data: loginPayload.data,
        transport: 'direct',
      };
    }

    const stateRes = await fetchWithTimeout(
      `${cleanUrl}/api/state`,
      {
        method: 'GET',
        credentials: 'include',
      },
      10000
    );

    if (stateRes.status === 401 || stateRes.status === 403) {
      throw new SogSyncError(
        'Session SOGEDIPROMA non authentifiée : saisissez vos identifiants dans le connecteur ou ouvrez et connectez-vous d’abord à SOGEDIPROMA dans un onglet.',
        'AUTH_REQUIRED',
        'Renseignez l’identifiant et le mot de passe SOGEDIPROMA dans le panneau Connecteur (et cochez « Mémoriser » pour la synchro automatique).',
        Boolean(proxyContext?.proxyStatic)
      );
    }

    const stateJson = await safeParseJson<{
      revision?: number;
      data?: SogedipromaStateData;
      error?: string;
    }>(stateRes);

    if (!stateRes.ok || !stateJson?.data) {
      throw new SogSyncError(
        stateJson?.error || `Impossible de lire /api/state (HTTP ${stateRes.status}).`,
        'HTTP_ERROR',
        undefined,
        Boolean(proxyContext?.proxyStatic)
      );
    }

    const rev = typeof stateJson.revision === 'number' ? stateJson.revision : undefined;
    if (creds.knownRevision !== undefined && rev !== undefined && rev === creds.knownRevision) {
      return {
        unchanged: true,
        revision: rev,
        transport: 'direct',
      };
    }

    return {
      revision: rev,
      data: stateJson.data,
      transport: 'direct',
    };
  } catch (directErr) {
    if (directErr instanceof SogSyncError) {
      throw directErr;
    }

    const isTailscale = isTailscaleUrl(cleanUrl);
    if (proxyContext?.proxyTimedOut && isTailscale) {
      throw new SogSyncError(
        proxyContext.proxyMessage ||
          `Connexion impossible vers ${cleanUrl} : le serveur Cloud a expiré (Tailscale Funnel inactif) et l'accès direct navigateur est bloqué par CORS ou VPN.`,
        'TAILSCALE_OR_CORS_BLOCKED',
        proxyContext.proxyHint ||
          'Sur la machine Windows WIN-RMT226G06RG, lancez « tailscale funnel --bg <PORT> » pour ouvrir l’accès au Cloud, ou activez CORS sur SOGEDIPROMA si votre navigateur est déjà connecté au VPN Tailscale.',
        false
      );
    }

    if (proxyContext?.proxyStatic) {
      throw new SogSyncError(
        "Hébergement statique (sans serveur Express /api/*) et requête directe bloquée par CORS côté SOGEDIPROMA.",
        'STATIC_NO_PROXY_CORS',
        "Ouvrez le cahier depuis l'URL serveur active (ais-dev / localhost) ou autorisez l'origine CORS sur votre serveur SOGEDIPROMA.",
        true
      );
    }

    const msg = directErr instanceof Error ? directErr.message : String(directErr || '');
    throw new SogSyncError(
      proxyContext?.proxyMessage || msg || `Serveur ${cleanUrl} inaccessible.`,
      isTailscale ? 'TAILSCALE_TIMEOUT' : 'UPSTREAM_UNREACHABLE',
      proxyContext?.proxyHint
    );
  }
}

export async function testSogConnectionSmart(params: {
  baseUrl?: string;
  username?: string;
  password?: string;
}): Promise<{
  reachable: boolean;
  authenticated: boolean;
  needsSetup?: boolean;
  revision?: number;
  settings?: { company?: string };
  transport: SogTransportMode;
  proxyUnavailable: boolean;
}> {
  const effectiveUrl = normalizeCleanUrl(params.baseUrl || resolvePreferredSogUrl());
  const savedCreds = loadSavedSogCredentials();
  const username = (params.username ?? savedCreds.username ?? '').trim();
  const password = params.password ?? savedCreds.password ?? '';

  let proxyRes: Response | null = null;
  let proxyPayload: {
    error?: string;
    errorCode?: SogSyncErrorCode;
    hint?: string;
    reachable?: boolean;
    authenticated?: boolean;
    needsSetup?: boolean;
    revision?: number;
    settings?: { company?: string };
  } | null = null;

  try {
    proxyRes = await fetchWithTimeout(
      '/api/sogediproma/test',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: effectiveUrl || undefined,
          username: username || undefined,
          password: password || undefined,
        }),
      },
      9000
    );
    proxyPayload = await safeParseJson(proxyRes);
  } catch {
    proxyRes = null;
  }

  if (proxyRes && proxyRes.ok && proxyPayload) {
    return {
      reachable: Boolean(proxyPayload.reachable ?? true),
      authenticated: Boolean(proxyPayload.authenticated),
      needsSetup: Boolean(proxyPayload.needsSetup),
      revision: typeof proxyPayload.revision === 'number' ? proxyPayload.revision : undefined,
      settings: proxyPayload.settings,
      transport: 'proxy',
      proxyUnavailable: false,
    };
  }

  const status = proxyRes?.status ?? 0;
  const errCode = proxyPayload?.errorCode;
  const fb =
    !proxyRes
      ? { fallback: true, proxyUnavailable: true }
      : shouldAttemptDirectFallback(status, errCode);

  if (fb.fallback) {
    const direct = await tryDirectBrowserFetch(
      effectiveUrl,
      'test',
      { username, password },
      {
        proxyTimedOut: status === 504 || status === 502 || errCode === 'TAILSCALE_TIMEOUT',
        proxyStatic: fb.proxyUnavailable,
        proxyMessage: proxyPayload?.error,
        proxyHint: proxyPayload?.hint,
      }
    );
    return {
      reachable: Boolean(direct.reachable ?? true),
      authenticated: Boolean(direct.authenticated),
      needsSetup: direct.needsSetup,
      revision: direct.revision,
      settings: direct.settings,
      transport: 'direct',
      proxyUnavailable: fb.proxyUnavailable,
    };
  }

  throw new SogSyncError(
    proxyPayload?.error || `Erreur HTTP ${status || 'réseau'} lors du test.`,
    errCode || (status === 401 ? 'AUTH_FAILED' : 'HTTP_ERROR'),
    proxyPayload?.hint,
    false
  );
}

export async function syncSogStateSmart(params: {
  baseUrl?: string;
  username?: string;
  password?: string;
  knownRevision?: number;
  includeAudit?: boolean;
}): Promise<{
  unchanged?: boolean;
  revision?: number;
  data?: SogedipromaStateData;
  transport: SogTransportMode;
  proxyUnavailable: boolean;
  usedUrl: string;
}> {
  const effectiveUrl = normalizeCleanUrl(params.baseUrl || resolvePreferredSogUrl());
  const savedCreds = loadSavedSogCredentials();
  const username = (params.username ?? savedCreds.username ?? '').trim();
  const password = params.password ?? savedCreds.password ?? '';

  let proxyRes: Response | null = null;
  let proxyPayload: {
    error?: string;
    errorCode?: SogSyncErrorCode;
    hint?: string;
    unchanged?: boolean;
    revision?: number;
    data?: SogedipromaStateData;
  } | null = null;

  try {
    proxyRes = await fetchWithTimeout(
      '/api/sogediproma/sync',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: effectiveUrl || undefined,
          username: username || undefined,
          password: password || undefined,
          knownRevision: params.knownRevision,
          includeAudit: params.includeAudit,
        }),
      },
      14000
    );
    proxyPayload = await safeParseJson(proxyRes);
  } catch {
    proxyRes = null;
  }

  if (proxyRes && proxyRes.ok && proxyPayload) {
    if (proxyPayload.unchanged) {
      return {
        unchanged: true,
        revision: proxyPayload.revision,
        transport: 'proxy',
        proxyUnavailable: false,
        usedUrl: effectiveUrl,
      };
    }
    if (!proxyPayload.data) {
      throw new SogSyncError(
        'Réponse vide reçue depuis SOGEDIPROMA (/api/state).',
        'EMPTY_RESPONSE'
      );
    }
    return {
      revision: proxyPayload.revision,
      data: proxyPayload.data,
      transport: 'proxy',
      proxyUnavailable: false,
      usedUrl: effectiveUrl,
    };
  }

  const status = proxyRes?.status ?? 0;
  const errCode = proxyPayload?.errorCode;
  const fb =
    !proxyRes
      ? { fallback: true, proxyUnavailable: true }
      : shouldAttemptDirectFallback(status, errCode);

  if (fb.fallback) {
    const direct = await tryDirectBrowserFetch(
      effectiveUrl,
      'sync',
      {
        username,
        password,
        knownRevision: params.knownRevision,
      },
      {
        proxyTimedOut:
          status === 504 ||
          status === 502 ||
          errCode === 'TAILSCALE_TIMEOUT' ||
          errCode === 'TAILSCALE_UNREACHABLE',
        proxyStatic: fb.proxyUnavailable,
        proxyMessage: proxyPayload?.error,
        proxyHint: proxyPayload?.hint,
      }
    );

    if (direct.unchanged) {
      return {
        unchanged: true,
        revision: direct.revision,
        transport: 'direct',
        proxyUnavailable: fb.proxyUnavailable,
        usedUrl: effectiveUrl,
      };
    }
    if (!direct.data) {
      throw new SogSyncError(
        'Réponse vide reçue depuis SOGEDIPROMA en accès direct.',
        'EMPTY_RESPONSE',
        undefined,
        fb.proxyUnavailable
      );
    }
    return {
      revision: direct.revision,
      data: direct.data,
      transport: 'direct',
      proxyUnavailable: fb.proxyUnavailable,
      usedUrl: effectiveUrl,
    };
  }

  const mappedCode: SogSyncErrorCode =
    errCode ||
    (status === 401
      ? proxyPayload?.error?.toLowerCase().includes('requis')
        ? 'AUTH_REQUIRED'
        : 'AUTH_FAILED'
      : status === 409
      ? 'NEEDS_SETUP'
      : 'HTTP_ERROR');

  throw new SogSyncError(
    proxyPayload?.error || `Erreur HTTP ${status || 'réseau'} sur /api/sogediproma/sync.`,
    mappedCode,
    proxyPayload?.hint,
    false
  );
}

export async function postSogInventoryMovementSmart(params: {
  baseUrl?: string;
  movement: {
    id: string;
    itemId: string;
    type: 'Entrée' | 'Sortie';
    quantity: number;
    date: string;
    reason?: string;
    reference?: string;
    assignedEmployeeId?: string;
    departmentId?: string;
  };
}): Promise<{ ok: boolean; transport: SogTransportMode }> {
  const effectiveUrl = normalizeCleanUrl(params.baseUrl || resolvePreferredSogUrl());
  const savedCreds = loadSavedSogCredentials();

  const proxyRes = await fetch('/api/sogediproma/inventory/movements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseUrl: effectiveUrl || undefined,
      username: savedCreds.username || undefined,
      password: savedCreds.password || undefined,
      movement: params.movement,
    }),
  }).catch(() => null);

  if (proxyRes && proxyRes.ok) {
    return { ok: true, transport: 'proxy' };
  }

  const status = proxyRes?.status ?? 0;
  const payload = proxyRes
    ? await safeParseJson<{ error?: string; errorCode?: SogSyncErrorCode; hint?: string }>(proxyRes)
    : null;
  const fb = !proxyRes
    ? { fallback: true }
    : shouldAttemptDirectFallback(status, payload?.errorCode);

  if (!fb.fallback) {
    throw new Error(payload?.error || `HTTP ${status}`);
  }

  // Fallback direct navigateur si le navigateur est sur Tailscale avec CORS actif
  if (savedCreds.username && savedCreds.password) {
    const loginRes = await fetchWithTimeout(`${effectiveUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: savedCreds.username,
        password: savedCreds.password,
      }),
    });
    if (!loginRes.ok) {
      throw new Error('Identifiants SOGEDIPROMA refusés en connexion directe.');
    }
  }

  const directMovRes = await fetchWithTimeout(`${effectiveUrl}/api/inventory/movements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params.movement),
  });
  const movPayload = await safeParseJson<{ error?: string }>(directMovRes);
  if (!directMovRes.ok) {
    throw new Error(
      movPayload?.error ||
        payload?.error ||
        `HTTP ${directMovRes.status} sur ${effectiveUrl}/api/inventory/movements`
    );
  }
  return { ok: true, transport: 'direct' };
}
