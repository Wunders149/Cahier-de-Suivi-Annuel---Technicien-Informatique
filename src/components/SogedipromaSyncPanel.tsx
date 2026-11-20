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
  saveSogedipromaLiveSnapshot,
  useSogedipromaLiveSnapshot,
} from '../utils/sogedipromaLiveStore';
import {
  PAIRED_SOGEDIPROMA_URL,
  LastSogedipromaSyncMeta,
  ServerConfigStatus,
  SogSyncError,
  SogSyncErrorCode,
  SogTransportMode,
  buildFullStateModuleSelection,
  clearSavedSogCredentials,
  emitSogSyncStatusEvent,
  fetchSogConfigSafe,
  isPrivateLanUrl,
  isTailscaleUrl,
  loadAutoPollEnabled,
  loadLastSogSyncMeta,
  loadSavedSogCredentials,
  persistSogServerUrl as persistSharedServerUrl,
  resolvePreferredSogUrl,
  saveAutoPollEnabled,
  saveLastSogSyncMeta as saveSharedLastSyncMeta,
  saveSogCredentials,
  syncSogStateSmart,
  testSogConnectionSmart,
} from '../utils/sogedipromaLiveClient';
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
  Download,
  Shield,
  Mail,
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
  const initialCreds = loadSavedSogCredentials();
  const [serverConfig, setServerConfig] = useState<ServerConfigStatus>({
    hasDefaultUrl: true,
    defaultUrl: PAIRED_SOGEDIPROMA_URL,
    pairedUrl: PAIRED_SOGEDIPROMA_URL,
    isDefaultUrlPrivateLan: false,
    hasDefaultCredentials: false,
    defaultUsername: '',
  });
  const [backendProxyAvailable, setBackendProxyAvailable] = useState<boolean>(true);
  const [baseUrl, setBaseUrl] = useState<string>(() => resolvePreferredSogUrl());
  const [lastSyncMeta, setLastSyncMeta] = useState<LastSogedipromaSyncMeta | null>(() =>
    loadLastSogSyncMeta()
  );
  const [username, setUsername] = useState<string>(initialCreds.username);
  const [password, setPassword] = useState<string>(initialCreds.password);
  const [rememberCreds, setRememberCreds] = useState<boolean>(initialCreds.rememberInBrowser);
  const [autoPollEnabled, setAutoPollEnabled] = useState<boolean>(() => loadAutoPollEnabled());
  const [lastTransport, setLastTransport] = useState<SogTransportMode | null>(
    () => loadLastSogSyncMeta()?.transport ?? null
  );
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<'full' | 'assets-18' | 'inventory-18' | null>(null);
  const [copiedTunnelCmd, setCopiedTunnelCmd] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<SogSyncErrorCode | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [showTailscaleGuide, setShowTailscaleGuide] = useState(false);

  const [sourceRevision, setSourceRevision] = useState<number | null>(null);
  const [sourceOriginLabel, setSourceOriginLabel] = useState<string>('');
  const [pendingDelta, setPendingDelta] = useState<SogedipromaMappedDelta | null>(null);
  const [selectedModules, setSelectedModules] =
    useState<Record<SogedipromaSyncModuleKey, boolean>>(DEFAULT_SELECTED_MODULES);
  const [mergeMode, setMergeMode] = useState<'merge' | 'replace-sog'>('replace-sog');
  const [showEndpoints, setShowEndpoints] = useState(false);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isTestingMail, setIsTestingMail] = useState(false);
  const [auditEntries, setAuditEntries] = useState<Array<Record<string, unknown>>>([]);
  const [showAuditViewer, setShowAuditViewer] = useState(false);

  const liveSnapshot = useSogedipromaLiveSnapshot();
  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSogConfigSafe().then(({ proxyAvailable, config }) => {
      setBackendProxyAvailable(proxyAvailable);
      setServerConfig(config);
      const resolvedUrl = resolvePreferredSogUrl(config);
      if (resolvedUrl && resolvedUrl !== baseUrl) {
        setBaseUrl(resolvedUrl);
      }
      if (!username && config.defaultUsername) {
        setUsername(config.defaultUsername);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistServerUrl = (val: string) => {
    setBaseUrl(val);
    persistSharedServerUrl(val);
  };

  const saveLastSyncMeta = (meta: LastSogedipromaSyncMeta) => {
    setLastSyncMeta(meta);
    saveSharedLastSyncMeta(meta);
  };

  const persistCredsIfPresent = (userVal: string, passVal: string, rememberVal: boolean) => {
    if (userVal.trim() || passVal) {
      saveSogCredentials({
        username: userVal,
        password: passVal,
        rememberInBrowser: rememberVal,
      });
    }
  };

  const copyCommand = (cmd: string, key: string) => {
    navigator.clipboard?.writeText(cmd).then(() => {
      setCopiedTunnelCmd(key);
      setTimeout(() => setCopiedTunnelCmd(null), 2000);
    });
  };

  const safeParseJson = async <T,>(res: Response): Promise<T | null> => {
    try {
      const txt = await res.text();
      return txt ? (JSON.parse(txt) as T) : null;
    } catch {
      return null;
    }
  };

  const handleTestConnection = async () => {
    setErrorMsg(null);
    setErrorHint(null);
    setErrorCode(null);
    setStatusNotice(null);
    persistCredsIfPresent(username, password, rememberCreds);

    try {
      setIsTesting(true);
      const result = await testSogConnectionSmart({
        baseUrl: baseUrl.trim() || serverConfig.defaultUrl,
        username: username.trim() || undefined,
        password: password || undefined,
      });
      setBackendProxyAvailable(!result.proxyUnavailable);
      setLastTransport(result.transport);
      const companyName = result.settings?.company || 'SOGEDIPROMA';
      const via =
        result.transport === 'direct'
          ? 'Lien Direct Navigateur (Tailscale)'
          : 'Proxy Serveur Express';
      const revTxt = result.revision !== undefined ? ` · Rév. #${result.revision}` : '';
      setStatusNotice(
        result.authenticated
          ? `Connexion authentifiée réussie au serveur ${companyName} via ${via}${revTxt}.`
          : `Serveur ${companyName} joignable via ${via} (/api/status OK${revTxt}).`
      );
    } catch (err) {
      if (err instanceof SogSyncError) {
        setErrorMsg(err.message);
        setErrorHint(err.hint || null);
        setErrorCode(err.code);
        if (err.proxyUnavailable) setBackendProxyAvailable(false);
        if (
          err.code === 'TAILSCALE_TIMEOUT' ||
          err.code === 'TAILSCALE_OR_CORS_BLOCKED' ||
          err.code === 'TAILSCALE_UNREACHABLE'
        ) {
          setShowTailscaleGuide(true);
        }
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Impossible de joindre le serveur SOGEDIPROMA.'
        );
      }
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
    setErrorHint(null);
    setErrorCode(null);
    setStatusNotice(null);
    persistCredsIfPresent(username, password, rememberCreds);

    try {
      setIsSyncing(true);
      emitSogSyncStatusEvent({ phase: 'syncing' });

      const syncRes = await syncSogStateSmart({
        baseUrl: baseUrl.trim() || serverConfig.defaultUrl,
        username: username.trim() || undefined,
        password: password || undefined,
      });

      setBackendProxyAvailable(!syncRes.proxyUnavailable);
      setLastTransport(syncRes.transport);

      if (!syncRes.data) {
        throw new Error('Réponse vide reçue depuis SOGEDIPROMA.');
      }

      saveSogedipromaLiveSnapshot(syncRes.data, syncRes.revision);
      const mapped = mapSogedipromaToWorkbookDelta(syncRes.data);
      const fullSel = buildFullStateModuleSelection(syncRes.data);
      const revLabel = syncRes.revision ?? '—';
      const via = syncRes.transport === 'direct' ? 'Lien direct' : 'Proxy serveur';

      if (applyImmediately) {
        const result = applySogedipromaMerge(currentData, mapped, fullSel, mergeMode);
        if (result.estimatedBytes >= 950 * 1024) {
          setPendingDelta(mapped);
          setSelectedModules(fullSel);
          setSourceRevision(typeof syncRes.revision === 'number' ? syncRes.revision : null);
          setSourceOriginLabel(`Serveur live (${syncRes.usedUrl})`);
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
          ? `Sync directe SOGEDIPROMA (rév. #${revLabel} · ${via}) : ${counts.join(', ')}.`
          : `Sync directe SOGEDIPROMA (rév. #${revLabel} · ${via}) appliquée.`;

        const nowIso = new Date().toISOString();
        setPendingDelta(null);
        setStatusNotice(summary);
        saveLastSyncMeta({
          at: nowIso,
          revision: typeof syncRes.revision === 'number' ? syncRes.revision : undefined,
          summary,
          url: syncRes.usedUrl,
          transport: syncRes.transport,
        });
        emitSogSyncStatusEvent({
          phase: 'synced',
          transport: syncRes.transport,
          lastSyncedAt: nowIso,
          revision: typeof syncRes.revision === 'number' ? syncRes.revision : null,
          errorCode: null,
          message: summary,
          hint: null,
          backendProxyAvailable: !syncRes.proxyUnavailable,
          consecutiveFailures: 0,
        });
        onApplySyncedData(result.nextData, summary);
        return;
      }

      setPendingDelta(mapped);
      setSelectedModules(fullSel);
      setSourceRevision(typeof syncRes.revision === 'number' ? syncRes.revision : null);
      setSourceOriginLabel(`Serveur live (${syncRes.usedUrl} · ${via})`);
      setStatusNotice(
        `Snapshot GET /api/state récupéré (rév. #${revLabel} via ${via}). Sélectionnez les modules à importer ci-dessous.`
      );
    } catch (err) {
      if (err instanceof SogSyncError) {
        setErrorMsg(err.message);
        setErrorHint(err.hint || null);
        setErrorCode(err.code);
        if (err.proxyUnavailable) setBackendProxyAvailable(false);
        if (
          err.code === 'TAILSCALE_TIMEOUT' ||
          err.code === 'TAILSCALE_OR_CORS_BLOCKED' ||
          err.code === 'TAILSCALE_UNREACHABLE'
        ) {
          setShowTailscaleGuide(true);
        }
        emitSogSyncStatusEvent({
          phase:
            err.code === 'AUTH_REQUIRED' || err.code === 'AUTH_FAILED'
              ? 'auth_required'
              : 'unreachable',
          errorCode: err.code,
          message: err.message,
          hint: err.hint || null,
        });
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Échec de la récupération depuis /api/state.'
        );
      }
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
      saveSogedipromaLiveSnapshot(parsed.data, parsed.revision);
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
      saveSogedipromaLiveSnapshot(mergedState);
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

  const handleDownloadNativeBackup = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      setIsDownloadingBackup(true);
      const res = await fetch('/api/sogediproma/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim() || undefined,
          username: username.trim() || undefined,
          password: password || undefined,
        }),
      });
      const payload = await safeParseJson<{
        error?: string;
        backup?: unknown;
        filename?: string;
      }>(res);
      if (!res.ok || !payload?.backup) {
        throw new Error(payload?.error || `HTTP ${res.status} sur /api/backup`);
      }
      const blob = new Blob([JSON.stringify(payload.backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = payload.filename || `sogediproma-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatusNotice(`Backup natif SOGEDIPROMA téléchargé (${link.download}).`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur téléchargement backup SOGEDIPROMA.');
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleLoadServerAudit = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      setIsLoadingAudit(true);
      const res = await fetch('/api/sogediproma/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim() || undefined,
          username: username.trim() || undefined,
          password: password || undefined,
        }),
      });
      const payload = await safeParseJson<{
        error?: string;
        entries?: Array<Record<string, unknown>>;
      }>(res);
      if (!res.ok) {
        throw new Error(payload?.error || `HTTP ${res.status} sur /api/audit`);
      }
      const list = Array.isArray(payload?.entries) ? payload.entries : [];
      setAuditEntries(list);
      setShowAuditViewer(true);
      setStatusNotice(
        list.length > 0
          ? `${list.length} entrée(s) du journal d'audit récupérées depuis SOGEDIPROMA.`
          : 'Journal d’audit consulté (0 entrée visible avec ce niveau de permission ou historique vide).'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lecture journal d'audit SOGEDIPROMA.");
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleTestSmtpMail = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      setIsTestingMail(true);
      const res = await fetch('/api/sogediproma/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim() || undefined,
          username: username.trim() || undefined,
          password: password || undefined,
        }),
      });
      const payload = await safeParseJson<{
        error?: string;
        ok?: boolean;
        mailConfigured?: boolean;
      }>(res);
      if (!res.ok) {
        throw new Error(payload?.error || `HTTP ${res.status} sur /api/notifications/test`);
      }
      setStatusNotice('Test d’envoi e-mail SMTP SOGEDIPROMA exécuté avec succès.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur test notification SMTP SOGEDIPROMA.');
    } finally {
      setIsTestingMail(false);
    }
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
              Connecteur API SOGEDIPROMA · Synchro Fluide
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {serverConfig.defaultUrl || PAIRED_SOGEDIPROMA_URL}
            </span>
            {lastTransport && (
              <span className="text-[10px] font-semibold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                {lastTransport === 'direct' ? 'Mode : Direct Navigateur' : 'Mode : Proxy Cloud'}
              </span>
            )}
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
          Synchronisation automatique au démarrage, au retour d&apos;onglet et toutes les 30 secondes (<code className="font-mono text-[11px]">GET /api/state</code>) avec bascule automatique entre <strong className="font-semibold text-slate-800">Proxy Cloud Express</strong> et <strong className="font-semibold text-slate-800">Lien Direct Navigateur Tailscale</strong>.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] font-medium text-slate-800">
            <input
              type="checkbox"
              checked={autoPollEnabled}
              onChange={(e) => {
                const next = e.target.checked;
                setAutoPollEnabled(next);
                saveAutoPollEnabled(next);
                emitSogSyncStatusEvent({ autoPollEnabled: next });
              }}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Synchronisation auto continue (toutes les 30 s + au retour sur cet onglet)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowTailscaleGuide((v) => !v)}
            className="text-[11px] font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
          >
            <span>Guide Tailscale HTTPS (Serve vs Funnel &amp; CORS)</span>
            {showTailscaleGuide ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

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

      {/* Guide de diagnostic & configuration Tailscale pour synchro fluide */}
      {(showTailscaleGuide ||
        errorCode === 'TAILSCALE_TIMEOUT' ||
        errorCode === 'TAILSCALE_OR_CORS_BLOCKED' ||
        errorCode === 'TAILSCALE_UNREACHABLE') && (
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-3 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <h5 className="font-bold text-amber-950">
                Pourquoi un lien <code className="font-mono">*.ts.net</code> ne se synchronise pas encore depuis le Cloud ?
              </h5>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Par défaut, <code className="font-mono font-semibold">tailscale serve</code> expose votre application <strong>uniquement sur votre VPN privé Tailscale</strong> : votre navigateur y accède, mais le serveur Cloud du cahier expire en délai dépassé (timeout). Pour une synchronisation 100 % fluide en continu, utilisez <strong>l&apos;une des deux méthodes</strong> sur la machine Windows <code className="font-mono font-semibold">WIN-RMT226G06RG</code> :
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTailscaleGuide(false)}
              className="text-amber-700 hover:text-amber-950 p-1"
              aria-label="Fermer le guide Tailscale"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 bg-white border border-amber-200 rounded-lg p-3">
            <div className="font-semibold text-[11px] text-slate-900">
              Méthode 1 (Recommandée · Marche partout &amp; auto-sync permanente) — Activer Tailscale Funnel :
            </div>
            <p className="text-[11px] text-slate-600">
              Dans PowerShell (Administrateur) sur <code className="font-mono">WIN-RMT226G06RG</code>, remplacez <code className="font-mono">3001</code> par le port local de SOGEDIPROMA (ex. 3000, 3001 ou 8080) :
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
              <code className="font-mono text-[11px] text-slate-900 select-all">
                tailscale funnel --bg 3001
              </code>
              <button
                type="button"
                onClick={() => copyCommand('tailscale funnel --bg 3001', 'funnel')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold text-[10px] shrink-0 transition"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedTunnelCmd === 'funnel' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
              <code className="font-mono text-[11px] text-slate-900 select-all">
                tailscale funnel status
              </code>
              <button
                type="button"
                onClick={() => copyCommand('tailscale funnel status', 'status')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold text-[10px] shrink-0 transition"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedTunnelCmd === 'status' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 bg-white border border-amber-200 rounded-lg p-3">
            <div className="font-semibold text-[11px] text-slate-900">
              Méthode 2 (Sans Funnel · Réseau privé VPN uniquement) — Autoriser CORS sur SOGEDIPROMA :
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Si vous souhaitez garder Tailscale privé (sans Funnel public), votre navigateur connecté au VPN Tailscale peut synchroniser <strong>directement</strong> à condition que le serveur SOGEDIPROMA réponde aux en-têtes <code className="font-mono">Access-Control-Allow-Origin</code> (avec l&apos;origine de ce cahier) et <code className="font-mono">Access-Control-Allow-Credentials: true</code>.
            </p>
          </div>
        </div>
      )}

      {/* Alertes erreur / succès */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start justify-between gap-2 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="block font-medium">{errorMsg}</span>
              {errorHint && (
                <span className="block text-[11px] text-red-700 leading-relaxed">
                  {errorHint}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setErrorHint(null);
            }}
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

      {/* Méthode A : Connexion Serveur Directe via Proxy Backend ou Direct Navigateur */}
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
              Vous utilisez actuellement l&apos;hébergement <strong>statique</strong> (le proxy backend <code className="font-mono">/api/sogediproma/*</code> renvoie HTTP 404/405). L&apos;application bascule automatiquement en mode <strong>Lien Direct Navigateur</strong> (CORS requis sur SOGEDIPROMA), ou ouvrez l&apos;URL serveur active (<strong>ais-dev</strong>).
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
                serverConfig.defaultUrl || 'https://win-rmt226g06rg.taild86fee.ts.net'
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

              if (isTailscaleUrl(targetUrl)) {
                return (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>
                      Nœud Tailscale détecté (<code className="font-mono">{new URL(targetUrl).hostname}</code>) : bascule automatique Proxy Cloud (si Funnel actif) ↔ Direct Navigateur (si VPN Tailscale + CORS).
                    </span>
                  </div>
                );
              }

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
                      onClick={() => copyCommand(tunnelCmd, 'lan')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-[10px] shrink-0 transition"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedTunnelCmd === 'lan' ? 'Copié !' : 'Copier'}</span>
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

          <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
              <input
                type="checkbox"
                checked={rememberCreds}
                onChange={(e) => {
                  const next = e.target.checked;
                  setRememberCreds(next);
                  saveSogCredentials({
                    username,
                    password,
                    rememberInBrowser: next,
                  });
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Mémoriser ces identifiants sur ce navigateur pour la synchro automatique continue
              </span>
            </label>
            {(username || password) && (
              <button
                type="button"
                onClick={() => {
                  setUsername('');
                  setPassword('');
                  setRememberCreds(false);
                  clearSavedSogCredentials();
                  setStatusNotice('Identifiants locaux effacés de ce navigateur.');
                }}
                className="text-[11px] text-slate-500 hover:text-red-600 underline"
              >
                Effacer identifiants locaux
              </button>
            )}
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

        {/* Barre d'outils API SOGEDIPROMA complémentaires */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-600">
            Outils serveur SOGEDIPROMA :
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isDownloadingBackup || !backendProxyAvailable}
              onClick={handleDownloadNativeBackup}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-800 disabled:opacity-50 transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>{isDownloadingBackup ? 'Export...' : 'Backup Natif (/api/backup)'}</span>
            </button>
            <button
              type="button"
              disabled={isLoadingAudit || !backendProxyAvailable}
              onClick={handleLoadServerAudit}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-800 disabled:opacity-50 transition"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>{isLoadingAudit ? 'Chargement...' : 'Journal Audit (/api/audit)'}</span>
            </button>
            <button
              type="button"
              disabled={isTestingMail || !backendProxyAvailable}
              onClick={handleTestSmtpMail}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-800 disabled:opacity-50 transition"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isTestingMail ? 'Envoi...' : 'Tester SMTP (/api/notifications/test)'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Couverture intégrale des données live SOGEDIPROMA */}
      {liveSnapshot && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Couverture Intégrale SOGEDIPROMA ({liveSnapshot.company})
              </h4>
              <p className="text-[11px] text-slate-500">
                Toutes les collections live extraites et exploitées dans les sections dédiées du cahier.
              </p>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-500">
              {liveSnapshot.revision !== undefined ? `Rév. #${liveSnapshot.revision} · ` : ''}
              {new Date(liveSnapshot.syncedAt).toLocaleString('fr-FR')}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {[
              { label: 'Actifs & QR', val: `${liveSnapshot.counts.assets} (${liveSnapshot.counts.assetsWithQr} QR)` },
              { label: 'Mouvements Stock', val: `${liveSnapshot.counts.stockMovements} (${liveSnapshot.counts.inventoryItems} art.)` },
              { label: 'Agents & Flotte', val: `${liveSnapshot.counts.employees} (${liveSnapshot.counts.fleetPhones} GSM)` },
              { label: 'Chartes IT signées', val: `${liveSnapshot.counts.chartersSigned} / ${liveSnapshot.counts.employees}` },
              { label: 'Habilitations RBAC', val: `${liveSnapshot.counts.accesses} (${liveSnapshot.counts.softwareAssignments} log.)` },
              { label: 'Campagne 2026 & Caméras', val: `${liveSnapshot.counts.campaignChecked}/${liveSnapshot.counts.campaignTotal} · ${liveSnapshot.counts.cameraChecks} ctrl` },
            ].map((stat) => (
              <div key={stat.label} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block truncate">{stat.label}</span>
                <strong className="font-mono tabular-nums text-slate-900 text-xs">{stat.val}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visionneuse Journal d'Audit SOGEDIPROMA */}
      {showAuditViewer && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900">
              Journal d&apos;Audit Serveur SOGEDIPROMA ({auditEntries.length})
            </h4>
            <button
              type="button"
              onClick={() => setShowAuditViewer(false)}
              className="text-slate-500 hover:text-slate-800 p-1"
              aria-label="Fermer l'audit"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {auditEntries.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aucune entrée d&apos;audit retournée (l&apos;endpoint <code className="font-mono">/api/audit</code> peut être réservé au compte administrateur SOGEDIPROMA).
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-[11px]">
              {auditEntries.map((entry, idx) => (
                <div key={String(entry.id || idx)} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">
                      {String(entry.action || entry.type || 'Événement')} — {String(entry.target || entry.entity || '')}
                    </div>
                    <div className="text-slate-500 font-mono text-[10px]">
                      {String(entry.user || entry.actor || 'Système')} · {String(entry.details || entry.summary || '')}
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-[10px] text-slate-500 shrink-0">
                    {String(entry.timestamp || entry.createdAt || entry.date || '')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
