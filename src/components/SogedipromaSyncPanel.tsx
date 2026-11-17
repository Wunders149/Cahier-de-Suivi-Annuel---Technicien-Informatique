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
  isDefaultUrlPrivateLan?: boolean;
  hasDefaultCredentials: boolean;
  defaultUsername: string;
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
    label: 'Abonnements & Logiciels',
    sourceCollection: 'subscriptions + itTracking',
    icon: KeyRound,
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
};

export const SogedipromaSyncPanel: React.FC<SogedipromaSyncPanelProps> = ({
  currentData,
  onApplySyncedData,
}) => {
  const [serverConfig, setServerConfig] = useState<ServerConfigStatus>({
    hasDefaultUrl: false,
    defaultUrl: '',
    hasDefaultCredentials: false,
    defaultUsername: '',
  });
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('sogediproma_server_url') || '';
    } catch {
      return '';
    }
  });
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingAttached, setIsLoadingAttached] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [sourceRevision, setSourceRevision] = useState<number | null>(null);
  const [sourceOriginLabel, setSourceOriginLabel] = useState<string>('');
  const [pendingDelta, setPendingDelta] = useState<SogedipromaMappedDelta | null>(null);
  const [selectedModules, setSelectedModules] =
    useState<Record<SogedipromaSyncModuleKey, boolean>>(DEFAULT_SELECTED_MODULES);
  const [mergeMode, setMergeMode] = useState<'merge' | 'replace-sog'>('merge');
  const [showEndpoints, setShowEndpoints] = useState(false);

  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/sogediproma/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: ServerConfigStatus | null) => {
        if (!cfg) return;
        setServerConfig(cfg);
        if (!baseUrl && cfg.defaultUrl) {
          setBaseUrl(cfg.defaultUrl);
        }
        if (!username && cfg.defaultUsername) {
          setUsername(cfg.defaultUsername);
        }
      })
      .catch(() => {
        // Ignorer si backend non joignable en preview statique
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
      const payload = (await res.json()) as {
        error?: string;
        reachable?: boolean;
        authenticated?: boolean;
        needsSetup?: boolean;
        settings?: { company?: string };
      };
      if (!res.ok) {
        throw new Error(payload.error || `Erreur HTTP ${res.status}`);
      }
      const companyName = payload.settings?.company || 'SOGEDIPROMA';
      setStatusNotice(
        payload.authenticated
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

  const handleFetchLiveState = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      setIsSyncing(true);
      const res = await fetch('/api/sogediproma/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: baseUrl.trim() || undefined,
          username: username.trim() || undefined,
          password: password || undefined,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        revision?: number;
        data?: SogedipromaStateData;
      };
      if (!res.ok || !payload.data) {
        throw new Error(payload.error || `Erreur HTTP ${res.status} sur /api/sogediproma/sync`);
      }

      const mapped = mapSogedipromaToWorkbookDelta(payload.data);
      setPendingDelta(mapped);
      setSourceRevision(typeof payload.revision === 'number' ? payload.revision : null);
      setSourceOriginLabel(`Serveur live (${baseUrl || serverConfig.defaultUrl || 'env'})`);
      setStatusNotice(
        `Snapshot GET /api/state récupéré (révision ${payload.revision ?? '—'}). Sélectionnez les modules à importer ci-dessous.`
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

  const handleLoadAttachedJson = async () => {
    setErrorMsg(null);
    setStatusNotice(null);
    try {
      setIsLoadingAttached(true);
      const res = await fetch('./assets/aistudio/sogediproma-combined-2026-11-17_b74504df.json');
      if (!res.ok) {
        throw new Error(`Impossible de charger l'export joint (HTTP ${res.status}).`);
      }
      const text = await res.text();
      const parsed = parseSogedipromaJsonPayload(text);
      if (!parsed.success || !parsed.data) {
        throw new Error(parsed.error || 'Format export combiné invalide.');
      }
      const mapped = mapSogedipromaToWorkbookDelta(parsed.data);
      setPendingDelta(mapped);
      setSourceRevision(parsed.revision ?? null);
      setSourceOriginLabel('Export combiné SOGEDIPROMA (2026-11-17)');
      setStatusNotice(
        `Export combiné analysé : ${mapped.parcEquipements.length} matériels, ${mapped.consommables.length} consommables et ${mapped.demandesAchat.length} achats prêts à fusionner.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur chargement export JSON joint.');
    } finally {
      setIsLoadingAttached(false);
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

    const summary = counts.length
      ? `Synchronisation SOGEDIPROMA appliquée (${counts.join(', ')}).`
      : 'Synchronisation SOGEDIPROMA appliquée.';

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
      {/* Bandeau d'explication */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlugZap className="w-4 h-4 text-blue-600 shrink-0" />
            <h4 className="font-bold text-slate-900 text-[13px]">
              Connecteur API SOGEDIPROMA · Gestion informatique
            </h4>
          </div>
          <span className="text-[11px] font-mono font-semibold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
            GET /api/state · Proxy Express
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Récupérez en une requête sécurisée côté serveur vos{' '}
          <strong className="font-semibold text-slate-800">consommables &amp; achats</strong>,{' '}
          <strong className="font-semibold text-slate-800">matériels &amp; équipements</strong>,{' '}
          tickets, suivis du travail, maintenances et abonnements depuis votre instance SOGEDIPROMA, ou importez un fichier d&apos;export{' '}
          <span className="font-mono text-[11px]">/api/backup</span>.
        </p>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3 space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-700">
              URL du serveur SOGEDIPROMA
            </label>
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
            {(isPrivateLanUrl(baseUrl || serverConfig.defaultUrl) || serverConfig.isDefaultUrlPrivateLan) && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  L&apos;adresse <code className="font-mono font-semibold">{baseUrl || serverConfig.defaultUrl}</code> est une IP privée locale (LAN). Un navigateur ou serveur hébergé dans le Cloud ne peut pas l&apos;atteindre sans tunnel HTTPS (ex. Cloudflare Tunnel) ou exécution locale sur le même réseau. En alternative immédiate, utilisez l&apos;<strong>Option B</strong> ci-dessous avec un export JSON <code className="font-mono">/api/backup</code>.
                </span>
              </div>
            )}
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
            type="submit"
            disabled={isSyncing || isTesting}
            className={primaryButtonClass}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? 'Interrogation /api/state...'
                : 'Récupérer les données (/api/state)'}
            </span>
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

      {/* Méthode B : Import direct JSON /api/backup, /api/state ou export combiné */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <strong className="text-xs font-bold text-slate-900 block">
            Option B · Importer un snapshot ou export combiné JSON SOGEDIPROMA
          </strong>
          <span className="text-[11px] text-slate-500 block">
            Compatible avec <code className="font-mono">/api/backup</code>, <code className="font-mono">/api/state</code> et les exports combinés (<code className="font-mono">sogediproma-combined-*.json</code>).
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isLoadingAttached}
            onClick={handleLoadAttachedJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 font-semibold text-xs transition-colors whitespace-nowrap"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>
              {isLoadingAttached
                ? 'Chargement...'
                : "Charger l'export joint (272 mat. · 25 art. · 20 achats)"}
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
