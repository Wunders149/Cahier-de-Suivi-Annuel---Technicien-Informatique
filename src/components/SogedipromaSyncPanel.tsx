import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CahierSuiviData } from '../types/it-tracker';
import {
  SOGEDIPROMA_ENDPOINTS,
  SogedipromaMappedDelta,
  SogedipromaStateData,
  SogedipromaSyncModuleKey,
  applySogedipromaMerge,
  mapSogedipromaToWorkbookDelta,
  parseSogedipromaJsonPayload,
} from '../utils/sogedipromaSync';
import {
  Server,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Package,
  ShoppingCart,
  Laptop,
  Network,
  Wrench,
  ListTodo,
  KeyRound,
  CheckSquare,
  PlugZap,
  FileJson,
  X,
  Copy,
  Zap,
  ExternalLink,
  Target,
  Calendar,
} from 'lucide-react';
import {
  emeraldButtonClass,
  fieldInputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui/formStyles';

interface SogedipromaSyncPanelProps {
  currentData: CahierSuiviData;
  onApplySyncedData: (nextData: CahierSuiviData, summaryMsg: string) => void;
}

interface ServerConfigStatus {
  hasDefaultUrl: boolean;
  defaultUrl: string;
  pairedUrl?: string;
  isDefaultUrlPrivateLan?: boolean;
  hasDefaultCredentials: boolean;
  defaultUsername: string;
}

const PAIRED_SOGEDIPROMA_URL = 'https://win-rmt226g06rg.taild86fee.ts.net';
const LAST_SYNC_META_KEY = 'sogediproma_last_sync_v1';

interface LastSogedipromaSyncMeta {
  at: string;
  revision?: number;
  summary: string;
  url: string;
}

function isPrivateLanUrl(urlStr: string): boolean {
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

const MODULE_LABELS: Array<{
  key: SogedipromaSyncModuleKey;
  label: string;
  sourceCollection: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: 'consommables',
    label: 'Consommables & Stocks',
    sourceCollection: 'inventory',
    icon: Package,
  },
  {
    key: 'demandesAchat',
    label: 'Achats & Commandes',
    sourceCollection: 'purchases',
    icon: ShoppingCart,
  },
  {
    key: 'parcEquipements',
    label: 'Matériels & Équipements (CMDB)',
    sourceCollection: 'assets',
    icon: Laptop,
  },
  {
    key: 'reseauEquipements',
    label: 'Équipements Réseau',
    sourceCollection: 'assets (catégorie Réseau)',
    icon: Network,
  },
  {
    key: 'interventions',
    label: 'Tickets → Interventions IT',
    sourceCollection: 'tickets',
    icon: Wrench,
  },
  {
    key: 'journalTaches',
    label: 'Suivi travail → Journal',
    sourceCollection: 'workLogs',
    icon: ListTodo,
  },
  {
    key: 'maintenances',
    label: 'Maintenances matériels',
    sourceCollection: 'maintenance',
    icon: CheckSquare,
  },
  {
    key: 'logicielsLicences',
    label: 'Logiciels, Licences & Accès RBAC',
    sourceCollection: 'subscriptions + softwareAssignment + accesses',
    icon: KeyRound,
  },
  {
    key: 'objectifsAnnuels',
    label: 'Budgets IT → Objectifs Annuels',
    sourceCollection: 'budgets',
    icon: Target,
  },
  {
    key: 'jalonsCalendrier',
    label: 'Campagnes → Jalons Calendrier',
    sourceCollection: 'itTracking (inventaire annuel)',
    icon: Calendar,
  },
];

const DEFAULT_SELECTED_MODULES: Record<SogedipromaSyncModuleKey, boolean> = {
  consommables: true,
  demandesAchat: true,
  parcEquipements: true,
  reseauEquipements: true,
  maintenances: true,
  interventions: true,
  journalTaches: true,
  logicielsLicences: true,
  objectifsAnnuels: true,
  jalonsCalendrier: true,
};

export const SogedipromaSyncPanel: React.FC<SogedipromaSyncPanelProps> = ({
  currentData,
  onApplySyncedData,
}) => {
  const [serverConfig, setServerConfig] = useState<ServerConfigStatus>({
    hasDefaultUrl: true,
    defaultUrl: PAIRED_SOGEDIPROMA_URL,
    pairedUrl: PAIRED_SOGEDIPROMA_URL,
    isDefaultUrlPrivateLan: false,
    hasDefaultCredentials: false,
    defaultUsername: '',
  });
  const [backendProxyAvailable, setBackendProxyAvailable] = useState<boolean>(true);
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('sogediproma_server_url') || '';
      const isCloudHost =
        typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';
      if (
        !stored.trim() ||
        stored.includes('pc-informatique.taild86fee.ts.net') ||
        (isCloudHost && isPrivateLanUrl(stored))
      ) {
        return PAIRED_SOGEDIPROMA_URL;
      }
      return stored;
    } catch {
      return PAIRED_SOGEDIPROMA_URL;
    }
  });
  const [lastSyncMeta, setLastSyncMeta] = useState<LastSogedipromaSyncMeta | null>(() => {
    try {
      const raw = localStorage.getItem(LAST_SYNC_META_KEY);
      return raw ? (JSON.parse(raw) as LastSogedipromaSyncMeta) : null;
    } catch {
      return null;
    }
  });
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<'full' | 'assets-18' | 'inventory-18' | null>(null);
  const [copiedTunnelCmd, setCopiedTunnelCmd] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [sourceRevision, setSourceRevision] = useState<number | null>(null);
  const [sourceOriginLabel, setSourceOriginLabel] = useState<string>('');
  const [pendingDelta, setPendingDelta] = useState<SogedipromaMappedDelta | null>(null);
  const [selectedModules, setSelectedModules] =
    useState<Record<SogedipromaSyncModuleKey, boolean>>(DEFAULT_SELECTED_MODULES);
  const [mergeMode, setMergeMode] = useState<'merge' | 'replace-sog'>('replace-sog');
  const [showEndpoints, setShowEndpoints] = useState(false);

  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/sogediproma/config')
      .then(async (r) => {
        if (r.status === 404 || r.status === 405) {
          setBackendProxyAvailable(false);
          return null;
        }
        if (!r.ok) return null;
        setBackendProxyAvailable(true);
        return (await r.json()) as ServerConfigStatus;
      })
      .then((cfg: ServerConfigStatus | null) => {
        if (!cfg) return;
        setServerConfig(cfg);
        const resolvedDefault = cfg.pairedUrl || cfg.defaultUrl || PAIRED_SOGEDIPROMA_URL;
        const isCloudHost =
          typeof window !== 'undefined' &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1';
        if (resolvedDefault) {
          if (
            !baseUrl ||
            baseUrl.includes('pc-informatique.taild86fee.ts.net') ||
            (isCloudHost && !cfg.isDefaultUrlPrivateLan && isPrivateLanUrl(baseUrl))
          ) {
            persistServerUrl(resolvedDefault);
          }
        }
        if (!username && cfg.defaultUsername) {
          setUsername(cfg.defaultUsername);
        }
      })
      .catch(() => {
        setBackendProxyAvailable(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistServerUrl = (val: string) => {
    setBaseUrl(val);
    try {
      localStorage.setItem('sogediproma_server_url', val);
    } catch {
      // Ignorer
    }
  };

  const saveLastSyncMeta = (meta: LastSogedipromaSyncMeta) => {
    setLastSyncMeta(meta);
    try {
      localStorage.setItem(LAST_SYNC_META_KEY, JSON.stringify(meta));
    } catch {
      // Ignorer
    }
  };

  const safeParseJson = async <T,>(res: Response): Promise<T | null> => {
    try {
      const txt = await res.text();
      return txt ? (JSON.parse(txt) as T) : null;
    } catch {
      return null;
    }
  };

  const tryDirectBrowserFetch = async (
    targetBaseUrl: string,
    mode: 'test' | 'sync'
  ): Promise<{
    reachable?: boolean;
    authenticated?: boolean;
    settings?: { company?: string };
    revision?: number;
    data?: SogedipromaStateData;
  }> => {
    const cleanUrl = targetBaseUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      throw new Error(
        "Cet hébergement statique n'exécute pas le serveur proxy (/api/*). Ouvrez l'application via son URL serveur (ais-dev / localhost) ou saisissez l'URL complète https://... ci-dessus."
      );
    }

    try {
      const statusRes = await fetch(`${cleanUrl}/api/status`, {
        method: 'GET',
        credentials: 'include',
      });
      const statusData = await safeParseJson<{
        authenticated?: boolean;
        settings?: { company?: string };
      }>(statusRes);
      if (!statusRes.ok) {
        throw new Error(`HTTP ${statusRes.status} sur ${cleanUrl}/api/status`);
      }

      let authenticated = Boolean(statusData?.authenticated);
      let loginPayload: { revision?: number; data?: SogedipromaStateData } | null = null;

      if (username.trim() && password) {
        const loginRes = await fetch(`${cleanUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username: username.trim(), password }),
        });
        if (!loginRes.ok) {
          throw new Error('Identifiants SOGEDIPROMA refusés par le serveur distant.');
        }
        authenticated = true;
        loginPayload = await safeParseJson<{ revision?: number; data?: SogedipromaStateData }>(loginRes);
      }

      if (mode === 'test') {
        return {
          reachable: true,
          authenticated,
          settings: statusData?.settings,
        };
      }

      if (loginPayload?.data) {
        return {
          revision: loginPayload.revision,
          data: loginPayload.data,
        };
      }

      const stateRes = await fetch(`${cleanUrl}/api/state`, {
        method: 'GET',
        credentials: 'include',
      });
      const stateJson = await safeParseJson<{ revision?: number; data?: SogedipromaStateData }>(
        stateRes
      );
      if (!stateRes.ok || !stateJson?.data) {
        throw new Error(`Impossible de lire /api/state (HTTP ${stateRes.status}).`);
      }
      return {
        revision: stateJson.revision,
        data: stateJson.data,
      };
    } catch (directErr) {
      const msg = directErr instanceof Error ? directErr.message : '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || !msg) {
        throw new Error(
          "Hébergement statique (sans serveur Express /api/sogediproma/*) et blocage CORS par le serveur distant. Solution immédiate : utilisez l'URL complète avec serveur Express actif (ais-dev-... ou exécution locale), ou l'Option B (export JSON)."
        );
      }
      throw directErr;
    }
  };

  const handleTestConnection = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      setIsTesting(true);
      const res = await fetch('/api/sogediproma/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim() || undefined,
          username: username.trim() || undefined,
          password: password || undefined,
        }),
      });

      if (res.status === 404 || res.status === 405) {
        setBackendProxyAvailable(false);
        const direct = await tryDirectBrowserFetch(baseUrl || serverConfig.defaultUrl, 'test');
        const companyName = direct.settings?.company || 'SOGEDIPROMA';
        setStatusNotice(
          direct.authenticated
            ? `Connexion directe réussie au serveur ${companyName}.`
            : `Serveur ${companyName} joignable (/api/status OK).`
        );
        return;
      }

      const payload = await safeParseJson<{
        error?: string;
        reachable?: boolean;
        authenticated?: boolean;
        needsSetup?: boolean;
        settings?: { company?: string };
      }>(res);
      if (!res.ok) {
        throw new Error(payload?.error || `Erreur HTTP ${res.status}`);
      }
      const companyName = payload?.settings?.company || 'SOGEDIPROMA';
      setStatusNotice(
        payload?.authenticated
          ? `Connexion authentifiée réussie au serveur ${companyName}.`
          : `Serveur ${companyName} joignable (/api/status OK).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Impossible de joindre le serveur SOGEDIPROMA.'
      );
    } finally {
      setIsTesting(false);
    }
  };

  const buildPopulatedSelection = (
    mapped: SogedipromaMappedDelta
  ): Record<SogedipromaSyncModuleKey, boolean> => ({
    consommables: mapped.consommables.length > 0,
    demandesAchat: mapped.demandesAchat.length > 0,
    parcEquipements: mapped.parcEquipements.length > 0,
    reseauEquipements: mapped.reseauEquipements.length > 0,
    maintenances: mapped.maintenances.length > 0,
    interventions: mapped.interventions.length > 0,
    journalTaches: mapped.journalTaches.length > 0,
    logicielsLicences: mapped.logicielsLicences.length > 0,
    objectifsAnnuels: mapped.objectifsAnnuels.length > 0,
    jalonsCalendrier: mapped.jalonsCalendrier.length > 0,
  });

  const selectPopulatedModules = (mapped: SogedipromaMappedDelta) => {
    setSelectedModules(buildPopulatedSelection(mapped));
  };

  const executeLiveFetch = async (applyImmediately: boolean) => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      setIsSyncing(true);
      let payload: { error?: string; revision?: number; data?: SogedipromaStateData } | null = null;

      const res = await fetch('/api/sogediproma/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim() || undefined,
          username: username.trim() || undefined,
          password: password || undefined,
        }),
      });

      if (res.status === 404 || res.status === 405) {
        setBackendProxyAvailable(false);
        payload = await tryDirectBrowserFetch(baseUrl || serverConfig.defaultUrl, 'sync');
      } else {
        payload = await safeParseJson<{
          error?: string;
          revision?: number;
          data?: SogedipromaStateData;
        }>(res);
        if (!res.ok || !payload?.data) {
          throw new Error(payload?.error || `Erreur HTTP ${res.status} sur /api/sogediproma/sync`);
        }
      }

      if (!payload?.data) {
        throw new Error('Réponse vide reçue depuis SOGEDIPROMA.');
      }

      const mapped = mapSogedipromaToWorkbookDelta(payload.data);
      const populatedSel = buildPopulatedSelection(mapped);
      const revLabel = payload.revision ?? '—';

      if (applyImmediately) {
        const result = applySogedipromaMerge(currentData, mapped, populatedSel, mergeMode);
        if (result.estimatedBytes >= 950 * 1024) {
          setPendingDelta(mapped);
          setSelectedModules(populatedSel);
          setSourceRevision(typeof payload.revision === 'number' ? payload.revision : null);
          setSourceOriginLabel(`Serveur live (${baseUrl || serverConfig.defaultUrl || 'env'})`);
          setErrorMsg(
            `Taille Firestore élevée (${Math.round(result.estimatedBytes / 1024)} Ko / 1 024 Ko). Sélectionnez manuellement les modules ci-dessous avant d'appliquer.`
          );
          return;
        }

        const counts: string[] = [];
        if (mapped.parcEquipements.length) counts.push(`${mapped.parcEquipements.length} mat.`);
        if (mapped.consommables.length) counts.push(`${mapped.consommables.length} art.`);
        if (mapped.demandesAchat.length) counts.push(`${mapped.demandesAchat.length} achats`);
        if (mapped.reseauEquipements.length) counts.push(`${mapped.reseauEquipements.length} réseau`);
        if (mapped.logicielsLicences.length) counts.push(`${mapped.logicielsLicences.length} licences`);
        if (mapped.objectifsAnnuels.length) counts.push(`${mapped.objectifsAnnuels.length} budgets`);
        if (mapped.jalonsCalendrier.length) counts.push(`${mapped.jalonsCalendrier.length} jalon(s)`);
        const summary = counts.length
          ? `Sync directe SOGEDIPROMA (rév. ${revLabel}) appliquée : ${counts.join(', ')}.`
          : `Sync directe SOGEDIPROMA (rév. ${revLabel}) appliquée.`;

        setPendingDelta(null);
        setStatusNotice(summary);
        saveLastSyncMeta({
          at: new Date().toISOString(),
          revision: typeof payload.revision === 'number' ? payload.revision : undefined,
          summary,
          url: baseUrl.trim() || serverConfig.defaultUrl || PAIRED_SOGEDIPROMA_URL,
        });
        onApplySyncedData(result.nextData, summary);
        return;
      }

      setPendingDelta(mapped);
      setSelectedModules(populatedSel);
      setSourceRevision(typeof payload.revision === 'number' ? payload.revision : null);
      setSourceOriginLabel(`Serveur live (${baseUrl || serverConfig.defaultUrl || 'env'})`);
      setStatusNotice(
        `Snapshot GET /api/state récupéré (révision ${revLabel}). Sélectionnez les modules à importer ci-dessous.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Échec de la récupération depuis /api/state.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFetchLiveState = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLiveFetch(false);
  };

  const handleUploadSogedipromaJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setStatusNotice(null);

    try {
      const text = await file.text();
      const parsed = parseSogedipromaJsonPayload(text);
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || 'Fichier JSON SOGEDIPROMA invalide.');
      }
      const mapped = mapSogedipromaToWorkbookDelta(parsed.data);
      setPendingDelta(mapped);
      selectPopulatedModules(mapped);
      setSourceRevision(parsed.revision ?? null);
      setSourceOriginLabel(`Fichier JSON (${file.name})`);
      setStatusNotice(`Export SOGEDIPROMA « ${file.name} » analysé avec succès.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lecture fichier JSON.');
    } finally {
      if (jsonInputRef.current) {
        jsonInputRef.current.value = '';
      }
    }
  };

  const handleLoadAssets18Json = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      setLoadingPreset('assets-18');
      const res = await fetch('./assets/aistudio/sogediproma-assets-2026-11-18_2_c7f15279.json');
      if (!res.ok) {
        throw new Error(`Impossible de charger l'export matériels (HTTP ${res.status}).`);
      }
      const text = await res.text();
      const parsed = parseSogedipromaJsonPayload(text);
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || 'Format export matériels invalide.');
      }
      const mapped = mapSogedipromaToWorkbookDelta(parsed.data);
      setPendingDelta(mapped);
      selectPopulatedModules(mapped);
      setSourceRevision(null);
      setSourceOriginLabel('Export Matériels & Caméras (2026-11-18)');
      setStatusNotice(
        `Export 2026-11-18 analysé : ${mapped.parcEquipements.length} matériels (dont ${mapped.reseauEquipements.length} équipements réseau/caméras IP) prêts à fusionner.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur chargement export matériels.');
    } finally {
      setLoadingPreset(null);
    }
  };

  const handleLoadInventory18Json = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      setLoadingPreset('inventory-18');
      const res = await fetch('./assets/aistudio/gemini-code-1795008003938_f0c8c1ed.json');
      if (!res.ok) {
        throw new Error(`Impossible de charger l'export consommables (HTTP ${res.status}).`);
      }
      const text = await res.text();
      const parsed = parseSogedipromaJsonPayload(text);
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || 'Format export consommables invalide.');
      }
      const mapped = mapSogedipromaToWorkbookDelta(parsed.data);
      setPendingDelta(mapped);
      selectPopulatedModules(mapped);
      setSourceRevision(null);
      setSourceOriginLabel('Export Consommables SOGEDIPROMA (2026-11-18)');
      setStatusNotice(
        `Export consommables analysé : ${mapped.consommables.length} articles prêts à synchroniser.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur chargement export consommables.');
    } finally {
      setLoadingPreset(null);
    }
  };

  const handleLoadFullCombinedAndLatestAssets = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      setLoadingPreset('full');
      const [assetsRes, inventoryRes, combinedRes] = await Promise.all([
        fetch('./assets/aistudio/sogediproma-assets-2026-11-18_2_c7f15279.json'),
        fetch('./assets/aistudio/gemini-code-1795008003938_f0c8c1ed.json'),
        fetch('./assets/aistudio/sogediproma-combined-2026-11-17_b74504df.json'),
      ]);
      if (!assetsRes.ok || !inventoryRes.ok || !combinedRes.ok) {
        throw new Error(
          `Impossible de charger les exports joints (HTTP ${assetsRes.status} / ${inventoryRes.status} / ${combinedRes.status}).`
        );
      }
      const [assetsText, inventoryText, combinedText] = await Promise.all([
        assetsRes.text(),
        inventoryRes.text(),
        combinedRes.text(),
      ]);
      const parsedAssets = parseSogedipromaJsonPayload(assetsText);
      const parsedInventory = parseSogedipromaJsonPayload(inventoryText);
      const parsedCombined = parseSogedipromaJsonPayload(combinedText);
      if (
        !parsedAssets.success ||
        !parsedAssets.data ||
        !parsedInventory.success ||
        !parsedInventory.data ||
        !parsedCombined.success ||
        !parsedCombined.data
      ) {
        throw new Error(
          parsedAssets.error || parsedInventory.error || parsedCombined.error || 'Format JSON invalide.'
        );
      }

      const mergedState: SogedipromaStateData = {
        ...parsedCombined.data,
        assets: parsedAssets.data.assets,
        inventory: parsedInventory.data.inventory,
        exportDate: '2026-11-18',
      };
      const mapped = mapSogedipromaToWorkbookDelta(mergedState);
      setPendingDelta(mapped);
      selectPopulatedModules(mapped);
      setSourceRevision(null);
      setSourceOriginLabel('Pack complet (Actifs & Consommables 2026-11-18 + Achats 2026-11-17)');
      setStatusNotice(
        `Pack complet analysé : ${mapped.parcEquipements.length} matériels, ${mapped.reseauEquipements.length} équipements réseau/caméras IP, ${mapped.consommables.length} consommables et ${mapped.demandesAchat.length} achats prêts à synchroniser.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur chargement pack combiné.');
    } finally {
      setLoadingPreset(null);
    }
  };

  const previewMergeResult = useMemo(() => {
    if (!pendingDelta) return null;
    return applySogedipromaMerge(currentData, pendingDelta, selectedModules, mergeMode);
  }, [currentData, pendingDelta, selectedModules, mergeMode]);

  const handleConfirmApply = () => {
    if (!pendingDelta || !previewMergeResult) return;

    const counts: string[] = [];
    if (selectedModules.consommables && pendingDelta.consommables.length > 0) {
      counts.push(`${pendingDelta.consommables.length} consommables`);
    }
    if (selectedModules.demandesAchat && pendingDelta.demandesAchat.length > 0) {
      counts.push(`${pendingDelta.demandesAchat.length} achats`);
    }
    if (selectedModules.parcEquipements && pendingDelta.parcEquipements.length > 0) {
      counts.push(`${pendingDelta.parcEquipements.length} matériels`);
    }
    if (selectedModules.reseauEquipements && pendingDelta.reseauEquipements.length > 0) {
      counts.push(`${pendingDelta.reseauEquipements.length} équipements réseau`);
    }
    if (selectedModules.interventions && pendingDelta.interventions.length > 0) {
      counts.push(`${pendingDelta.interventions.length} tickets`);
    }
    if (selectedModules.journalTaches && pendingDelta.journalTaches.length > 0) {
      counts.push(`${pendingDelta.journalTaches.length} tâches`);
    }
    if (selectedModules.maintenances && pendingDelta.maintenances.length > 0) {
      counts.push(`${pendingDelta.maintenances.length} maintenances`);
    }
    if (selectedModules.logicielsLicences && pendingDelta.logicielsLicences.length > 0) {
      counts.push(`${pendingDelta.logicielsLicences.length} licences/accès`);
    }
    if (selectedModules.objectifsAnnuels && pendingDelta.objectifsAnnuels.length > 0) {
      counts.push(`${pendingDelta.objectifsAnnuels.length} budgets/objectifs`);
    }
    if (selectedModules.jalonsCalendrier && pendingDelta.jalonsCalendrier.length > 0) {
      counts.push(`${pendingDelta.jalonsCalendrier.length} jalon(s)`);
    }

    const summary = counts.length
      ? `Synchronisation SOGEDIPROMA appliquée (${counts.join(', ')}).`
      : 'Synchronisation SOGEDIPROMA appliquée.';

    saveLastSyncMeta({
      at: new Date().toISOString(),
      revision: sourceRevision ?? undefined,
      summary,
      url: baseUrl.trim() || serverConfig.defaultUrl || PAIRED_SOGEDIPROMA_URL,
    });
    onApplySyncedData(previewMergeResult.nextData, summary);
  };

  const toggleModule = (key: SogedipromaSyncModuleKey) => {
    setSelectedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const previewSizeKo = previewMergeResult
    ? Math.max(1, Math.round(previewMergeResult.estimatedBytes / 1024))
    : 0;
  const isOverFirestoreLimit = previewMergeResult
    ? previewMergeResult.estimatedBytes >= 950 * 1024
    : false;

  return (
    <div className="space-y-5">
      {/* Bandeau d'appairage permanent */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlugZap className="w-4 h-4 text-blue-600 shrink-0" />
            <h4 className="font-bold text-slate-900 text-[13px]">
              Connecteur API SOGEDIPROMA · Appairage Actif
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {serverConfig.defaultUrl || PAIRED_SOGEDIPROMA_URL}
            </span>
            <a
              href={baseUrl.trim() || serverConfig.defaultUrl || PAIRED_SOGEDIPROMA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 transition"
            >
              <span>Ouvrir SOGEDIPROMA</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Ce cahier fonctionne en paire directe avec votre instance SOGEDIPROMA (<code className="font-mono text-[11px]">GET /api/state</code>) pour synchroniser{' '}
          <strong className="font-semibold text-slate-800">consommables &amp; achats</strong>,{' '}
          <strong className="font-semibold text-slate-800">matériels &amp; équipements</strong>,{' '}
          tickets, suivis du travail, maintenances et abonnements.
        </p>
        {lastSyncMeta && (
          <div className="text-[11px] text-slate-600 bg-white/80 border border-blue-200/80 rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
            <span>
              Dernière synchro appliquée le{' '}
              <strong className="text-slate-800">
                {new Date(lastSyncMeta.at).toLocaleString('fr-FR')}
              </strong>
              {lastSyncMeta.revision !== undefined ? ` · Rév. #${lastSyncMeta.revision}` : ''}
            </span>
            <span className="font-mono text-[10px] text-slate-500 truncate max-w-xs">
              {lastSyncMeta.summary}
            </span>
          </div>
        )}
      </div>

      {/* Alertes erreur / succès */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start justify-between gap-2 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-500 hover:text-red-700 p-0.5"
            aria-label="Fermer l'erreur"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {statusNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Méthode A : Connexion Serveur Directe via Proxy Backend */}
      <form
        onSubmit={handleFetchLiveState}
        className="p-4 rounded-xl bg-white border border-slate-200 space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-700" />
            <span className="font-bold text-slate-900 text-xs">
              Option A · Connexion Live au serveur SOGEDIPROMA
            </span>
          </div>
          {serverConfig.hasDefaultUrl && (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              URL préconfigurée ({serverConfig.defaultUrl})
            </span>
          )}
        </div>

        {!backendProxyAvailable && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Vous utilisez actuellement l&apos;hébergement <strong>statique</strong> (le proxy backend <code className="font-mono">/api/sogediproma/*</code> renvoie HTTP 404/405). Pour synchroniser en direct avec <code className="font-mono">https://win-rmt226g06rg.taild86fee.ts.net</code> sans erreur CORS, ouvrez l&apos;application via son <strong>URL serveur active (ais-dev)</strong> ou autorisez les requêtes CORS sur votre serveur SOGEDIPROMA.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-[11px] font-semibold text-slate-700">
                URL du serveur SOGEDIPROMA
              </label>
              {serverConfig.hasDefaultUrl && baseUrl.trim() !== serverConfig.defaultUrl && (
                <button
                  type="button"
                  onClick={() => persistServerUrl(serverConfig.defaultUrl)}
                  className="text-[11px] font-semibold text-blue-700 hover:underline"
                >
                  Rétablir URL serveur ({serverConfig.defaultUrl})
                </button>
              )}
            </div>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => persistServerUrl(e.target.value)}
              placeholder={
                serverConfig.defaultUrl || 'https://it-sogediproma.exemple.com ou http://192.168.100.3:8080'
              }
              required={!serverConfig.hasDefaultUrl}
              className={`${fieldInputClass} font-mono text-xs`}
            />
            {(() => {
              const targetUrl = baseUrl.trim() || serverConfig.defaultUrl;
              const isLocalRuntime =
                typeof window !== 'undefined' &&
                (window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1');
              const tunnelCmd = `cloudflared tunnel --url ${targetUrl || 'http://192.168.100.3:8080'}`;

              if (!isPrivateLanUrl(targetUrl)) return null;

              if (isLocalRuntime) {
                return (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Mode exécution locale détecté (<code className="font-mono font-semibold">{window.location.hostname}</code>) : connexion directe prête vers <code className="font-mono font-semibold">{targetUrl}</code> sans tunnel.
                    </span>
                  </div>
                );
              }

              return (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Depuis l&apos;application en ligne (Cloud), l&apos;IP locale <code className="font-mono font-semibold">{targetUrl}</code> nécessite un tunnel HTTPS actif sur un PC du bureau. Lancez cette commande puis collez l&apos;URL <code className="font-mono font-semibold">https://...</code> obtenue ci-dessus :
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-amber-200 rounded-md px-2.5 py-1.5">
                    <code className="font-mono text-[11px] text-slate-800 select-all break-all">
                      {tunnelCmd}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(tunnelCmd).then(() => {
                          setCopiedTunnelCmd(true);
                          setTimeout(() => setCopiedTunnelCmd(false), 2000);
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-[10px] shrink-0 transition"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedTunnelCmd ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Identifiant SOGEDIPROMA
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={serverConfig.defaultUsername || 'Ex. admin'}
              required={!serverConfig.hasDefaultCredentials}
              autoComplete="username"
              className={fieldInputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Mot de passe session
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                serverConfig.hasDefaultCredentials
                  ? 'Préconfiguré côté serveur (laisser vide ou saisir pour remplacer)'
                  : 'Mot de passe utilisateur SOGEDIPROMA'
              }
              required={!serverConfig.hasDefaultCredentials}
              autoComplete="current-password"
              className={fieldInputClass}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isSyncing || isTesting}
            onClick={(e) => {
              if (e.currentTarget.form && !e.currentTarget.form.reportValidity()) return;
              executeLiveFetch(true);
            }}
            className={emeraldButtonClass}
          >
            <Zap className={`w-3.5 h-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
            <span>
              {isSyncing
                ? 'Synchronisation en cours...'
                : 'Sync directe (Live → Cloud)'}
            </span>
          </button>

          <button
            type="submit"
            disabled={isSyncing || isTesting}
            className={primaryButtonClass}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Prévisualiser (/api/state)</span>
          </button>

          <button
            type="button"
            disabled={isSyncing || isTesting}
            onClick={handleTestConnection}
            className={secondaryButtonClass}
          >
            <span>{isTesting ? 'Test en cours...' : 'Tester (/api/status)'}</span>
          </button>
        </div>
      </form>

      {/* Méthode B : Import direct JSON /api/backup, /api/state, export combiné ou export matériels */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="space-y-0.5">
          <strong className="text-xs font-bold text-slate-900 block">
            Option B · Importer un snapshot ou export JSON SOGEDIPROMA
          </strong>
          <span className="text-[11px] text-slate-500 block">
            Compatible avec <code className="font-mono">/api/backup</code>, <code className="font-mono">/api/state</code>, <code className="font-mono">sogediproma-combined-*.json</code> et les exports matériels (<code className="font-mono">sogediproma-assets-*.json</code>).
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loadingPreset !== null}
            onClick={handleLoadFullCombinedAndLatestAssets}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-semibold text-xs transition-colors whitespace-nowrap"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>
              {loadingPreset === 'full'
                ? 'Chargement...'
                : 'Sync complète (355 mat. · 29 art. · 20 achats)'}
            </span>
          </button>

          <button
            type="button"
            disabled={loadingPreset !== null}
            onClick={handleLoadInventory18Json}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 disabled:opacity-60 font-semibold text-xs transition-colors whitespace-nowrap"
          >
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {loadingPreset === 'inventory-18'
                ? 'Chargement...'
                : 'Consommables seuls (18/11 · 29 art.)'}
            </span>
          </button>

          <button
            type="button"
            disabled={loadingPreset !== null}
            onClick={handleLoadAssets18Json}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 disabled:opacity-60 font-semibold text-xs transition-colors whitespace-nowrap"
          >
            <Laptop className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {loadingPreset === 'assets-18'
                ? 'Chargement...'
                : 'Matériels & Caméras seuls (18/11 · 355)'}
            </span>
          </button>

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs transition-colors whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>Charger autre fichier (.json)</span>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleUploadSogedipromaJson}
            />
          </label>
        </div>
      </div>

      {/* Aperçu & Sélection avant fusion */}
      {pendingDelta && previewMergeResult && (
        <div className="p-4 rounded-xl border-2 border-blue-300 bg-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <h4 className="text-[13px] font-bold text-slate-900">
                Aperçu des données extraites · {pendingDelta.companyMeta.company}
              </h4>
              <p className="text-[11px] text-slate-500">
                Source : {sourceOriginLabel}
                {pendingDelta.companyMeta.exportDate ? ` · Export du ${pendingDelta.companyMeta.exportDate}` : ''}
                {sourceRevision !== null ? ` · Révision #${sourceRevision}` : ''} ·{' '}
                {pendingDelta.companyMeta.employeesCount} collaborateurs ·{' '}
                {pendingDelta.companyMeta.departmentsCount} départements ·{' '}
                {pendingDelta.companyMeta.suppliersCount} fournisseurs résolus
              </p>
            </div>
            <span
              className={`text-[11px] font-mono tabular-nums font-bold px-2 py-0.5 rounded border ${
                isOverFirestoreLimit
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Taille Firestore résultante : {previewSizeKo} / 1 024 Ko
            </span>
          </div>

          {/* Grille de sélection des modules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODULE_LABELS.map((mod) => {
              const Icon = mod.icon;
              const count = pendingDelta[mod.key].length;
              const checked = selectedModules[mod.key];
              return (
                <label
                  key={mod.key}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                    checked
                      ? 'bg-blue-50/70 border-blue-300 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleModule(mod.key)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate">{mod.label}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        data.{mod.sourceCollection}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 shrink-0">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Stratégie de fusion */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                <input
                  type="radio"
                  name="sogMergeMode"
                  checked={mergeMode === 'merge'}
                  onChange={() => setMergeMode('merge')}
                  className="text-blue-600"
                />
                <span>Fusionner &amp; mettre à jour (sans doublons)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                <input
                  type="radio"
                  name="sogMergeMode"
                  checked={mergeMode === 'replace-sog'}
                  onChange={() => setMergeMode('replace-sog')}
                  className="text-blue-600"
                />
                <span>Remplacer d&apos;abord les anciennes entrées SOGEDIPROMA</span>
              </label>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPendingDelta(null)}
                className={secondaryButtonClass}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                className={emeraldButtonClass}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Appliquer la synchronisation</span>
              </button>
            </div>
          </div>

          {isOverFirestoreLimit && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Attention : la taille combinée approche la limite de 1 Mo de Firestore. Décochez certains modules secondaires si nécessaire.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Accordéon : Référentiel complet des Endpoints SOGEDIPROMA */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowEndpoints((prev) => !prev)}
          className="w-full px-4 py-3 flex items-center justify-between text-left bg-slate-50 hover:bg-slate-100 transition"
        >
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Référentiel complet des Endpoints API SOGEDIPROMA ({SOGEDIPROMA_ENDPOINTS.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Liste technique extraite de l&apos;application SOGEDIPROMA (Consommables, Achats, Matériels, Backup, Audit)
            </span>
          </div>
          {showEndpoints ? (
            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>

        {showEndpoints && (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
            {SOGEDIPROMA_ENDPOINTS.map((ep, i) => (
              <div key={`${ep.method}-${ep.path}-${i}`} className="p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      ep.method === 'GET'
                        ? 'bg-blue-100 text-blue-800'
                        : ep.method === 'POST'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ep.method === 'PUT'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <code className="font-mono text-[11px] font-semibold text-slate-900">
                    {ep.path}
                  </code>
                  <span className="text-[10px] font-medium text-slate-500 ml-auto">
                    {ep.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">{ep.description}</p>
                {ep.payloadHint && (
                  <p className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    {ep.payloadHint}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
