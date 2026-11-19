import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initialCahierData } from './data/initialData';
import { CahierSuiviData } from './types/it-tracker';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { GeneralInfoSection } from './components/sections/GeneralInfoSection';
import { AnnualPlanSection } from './components/sections/AnnualPlanSection';
import { DailyLogSection } from './components/sections/DailyLogSection';
import { InterventionsSection } from './components/sections/InterventionsSection';
import { MaintenanceSection } from './components/sections/MaintenanceSection';
import { NetworkSection } from './components/sections/NetworkSection';
import { InventorySection } from './components/sections/InventorySection';
import { SoftwareLicensesSection } from './components/sections/SoftwareLicensesSection';
import { BackupSecuritySection } from './components/sections/BackupSecuritySection';
import { ConsumablesSection } from './components/sections/ConsumablesSection';
import { MonthlyReportsSection } from './components/sections/MonthlyReportsSection';
import { QuarterlyAnnualSection } from './components/sections/QuarterlyAnnualSection';
import { PrintBooklet } from './components/PrintBooklet';
import { DataManagementModal } from './components/DataManagementModal';
import { CloudConflictModal, CloudConflictState } from './components/CloudConflictModal';
import { AlertTriangle, Cloud, X, RotateCcw } from 'lucide-react';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';
import { CloudWorkbookSnapshot } from './firebase/firestoreService';
import {
  normalizeWorkbookData,
  mergeWorkbookData,
  estimateWorkbookSizeBytes,
} from './utils/backupService';
import { Modal } from './components/ui/Modal';
import { Toast } from './components/ui/Toast';
import { dangerButtonClass, secondaryButtonClass } from './components/ui/formStyles';
import {
  SogedipromaStateData,
  SogedipromaSyncModuleKey,
  applySogedipromaMerge,
  mapSogedipromaToWorkbookDelta,
} from './utils/sogedipromaSync';

const STORAGE_KEY = 'cahier_suivi_technicien_it_v2_prod';
const SYNC_META_KEY = 'cahier_suivi_sync_meta_v1';

interface SyncMeta {
  localDirty: boolean;
  lastLocalModifiedAt: string | null;
  lastSyncedHash: string | null;
}

function readSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        localDirty: Boolean(parsed.localDirty),
        lastLocalModifiedAt: parsed.lastLocalModifiedAt || null,
        lastSyncedHash: parsed.lastSyncedHash || null,
      };
    }
  } catch {
    // Ignorer erreur lecture meta
  }
  return {
    localDirty: false,
    lastLocalModifiedAt: null,
    lastSyncedHash: null,
  };
}

function writeSyncMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch {
    // Ignorer erreur écriture meta
  }
}

function CahierContent({
  data,
  setData,
  showToast,
  isGeneratingDocx,
  handleDownloadDocx,
  handleDownloadPdf,
  handlePrintPreview,
  handleResetData,
  lastCloudSnapshotRef,
  conflict,
  onResolveMerge,
  onResolveKeepLocal,
  onResolveLoadCloud,
}: {
  data: CahierSuiviData;
  setData: React.Dispatch<React.SetStateAction<CahierSuiviData>>;
  showToast: (msg: string) => void;
  isGeneratingDocx: boolean;
  handleDownloadDocx: () => Promise<void>;
  handleDownloadPdf: () => void;
  handlePrintPreview: () => void;
  handleResetData: () => void;
  lastCloudSnapshotRef: React.MutableRefObject<string | null>;
  conflict: CloudConflictState | null;
  onResolveMerge: (saveFn: (d: CahierSuiviData) => Promise<void>) => void;
  onResolveKeepLocal: (saveFn: (d: CahierSuiviData) => Promise<void>) => void;
  onResolveLoadCloud: () => void;
}) {
  const [activeTab, setActiveTab] = useState<string>('general');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [dataModalTab, setDataModalTab] = useState<'backup' | 'sogediproma'>('backup');

  const openDataModal = useCallback((tab: 'backup' | 'sogediproma' = 'backup') => {
    setDataModalTab(tab);
    setDataModalOpen(true);
  }, []);

  const { user, isAdmin, errorMessage, dismissError, saveDataToCloud } = useFirebase();

  // Raccourci clavier global Cmd+K / Ctrl+K pour ouvrir la palette de recherche
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Débouncing de la sauvegarde Cloud automatique (suspendu tant qu'un conflit est actif)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.uid || null;
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      return;
    }

    if (!user || conflict) return;

    const serialized = JSON.stringify(data);
    if (lastCloudSnapshotRef.current === serialized) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      lastCloudSnapshotRef.current = serialized;
      saveDataToCloud(data).catch(() => {
        // Erreur gérée par le contexte
      });
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, user, conflict, saveDataToCloud, lastCloudSnapshotRef]);

  // Badges calculés
  const pendingTasks = data.journalTaches.filter(
    (t) => t.statut === 'En cours' || t.statut === 'À faire'
  ).length;
  const activeInterventions = data.interventions.filter(
    (i) => i.resultat !== 'Résolu'
  ).length;
  const lowStock = data.consommables.filter(
    (c) => c.stockActuel <= c.stockMinimumAlerte
  ).length;
  const sizeKo = Math.max(1, Math.round(estimateWorkbookSizeBytes(data) / 1024));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Alerte erreur Cloud éventuelle */}
      {errorMessage && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs flex items-center justify-between shadow-sm z-50 sticky top-0 no-print">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={dismissError}
            className="p-1 hover:bg-red-700 rounded transition"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modale de résolution de conflit Cloud */}
      <CloudConflictModal
        conflict={conflict}
        onResolveMerge={() => onResolveMerge(saveDataToCloud)}
        onResolveKeepLocal={() => onResolveKeepLocal(saveDataToCloud)}
        onResolveLoadCloud={onResolveLoadCloud}
        onShowToast={showToast}
      />

      {/* Palette de commande rapide (Cmd+K) */}
      <CommandPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        data={data}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setSearchOpen(false);
        }}
      />

      {/* Centre de gestion des données, sauvegarde & bascule production */}
      <DataManagementModal
        isOpen={dataModalOpen}
        onClose={() => setDataModalOpen(false)}
        initialTab={dataModalTab}
        data={data}
        onUpdateData={(newData) => setData(newData)}
        onShowToast={showToast}
      />

      {/* Vue Livret Complet Imprimable A4 */}
      {activeTab === 'livret' ? (
        <PrintBooklet
          data={data}
          onBack={() => setActiveTab('general')}
          onPrint={handlePrintPreview}
          onDownloadPdf={handleDownloadPdf}
          onDownloadDocx={handleDownloadDocx}
        />
      ) : (
        <div className="flex flex-1">
          {/* Barre latérale (Sidebar) */}
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            generalInfo={data.generalInfo}
            badgeCounts={{ pendingTasks, activeInterventions, lowStock }}
            onResetData={handleResetData}
            onOpenDataModal={() => openDataModal('backup')}
          />

          {/* Contenu principal */}
          <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
            {/* Barre d'en-tête */}
            <Header
              data={data}
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              onOpenSidebar={() => setSidebarOpen(true)}
              onOpenSearch={() => setSearchOpen(true)}
              onDownloadDocx={handleDownloadDocx}
              onDownloadPdf={handleDownloadPdf}
              onPrintPreview={handlePrintPreview}
              isGeneratingDocx={isGeneratingDocx}
              onOpenSogedipromaSync={() => openDataModal('sogediproma')}
            />

            {/* Notification persistante discrète si connecté (Thème Clair unifié) */}
            {user && (
              <div className="bg-blue-50/80 border-b border-blue-200/80 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-blue-950 no-print">
                <div className="flex items-center gap-2">
                  <Cloud className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    Synchronisation active sur Firestore Cloud ({user.email})
                  </span>
                  <span className="text-slate-400" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-600">
                    {sizeKo} / 1 024 Ko
                  </span>
                  {isAdmin && (
                    <span className="font-semibold text-amber-700">
                      · Privilèges Administrateur DSI
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    saveDataToCloud(data)
                      .then(() =>
                        showToast('Cahier synchronisé avec succès dans Firestore !')
                      )
                      .catch(() => {});
                  }}
                  className="font-semibold hover:underline text-blue-700 whitespace-nowrap shrink-0"
                >
                  Forcer la synchronisation
                </button>
              </div>
            )}

            {/* Contenu de la section active */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              {activeTab === 'general' && (
                <GeneralInfoSection
                  data={data}
                  info={data.generalInfo}
                  onUpdate={(info) => setData({ ...data, generalInfo: info })}
                  onNavigateTab={setActiveTab}
                  onDownloadDocx={handleDownloadDocx}
                  onDownloadPdf={handleDownloadPdf}
                />
              )}

              {activeTab === 'plan' && (
                <AnnualPlanSection
                  objectifs={data.objectifsAnnuels}
                  jalons={data.jalonsCalendrier}
                  onUpdateObjectifs={(objectifs) =>
                    setData({ ...data, objectifsAnnuels: objectifs })
                  }
                  onUpdateJalons={(jalons) =>
                    setData({ ...data, jalonsCalendrier: jalons })
                  }
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'journal' && (
                <DailyLogSection
                  taches={data.journalTaches}
                  onUpdateTaches={(taches) =>
                    setData({ ...data, journalTaches: taches })
                  }
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'interventions' && (
                <InterventionsSection
                  interventions={data.interventions}
                  onUpdateInterventions={(interventions) =>
                    setData({ ...data, interventions })
                  }
                  generalInfo={data.generalInfo}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'maintenance' && (
                <MaintenanceSection
                  maintenances={data.maintenances}
                  onUpdateMaintenances={(maintenances) =>
                    setData({ ...data, maintenances })
                  }
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'reseau' && (
                <NetworkSection
                  equipements={data.reseauEquipements}
                  incidents={data.reseauIncidents}
                  testsDebit={data.reseauTestsDebit}
                  onUpdateEquipements={(reseauEquipements) =>
                    setData({ ...data, reseauEquipements })
                  }
                  onUpdateIncidents={(reseauIncidents) =>
                    setData({ ...data, reseauIncidents })
                  }
                  onUpdateTestsDebit={(reseauTestsDebit) =>
                    setData({ ...data, reseauTestsDebit })
                  }
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'parc' && (
                <InventorySection
                  parc={data.parcEquipements}
                  onUpdateParc={(parcEquipements) =>
                    setData({ ...data, parcEquipements })
                  }
                  onShowToast={showToast}
                  onOpenSogedipromaSync={() => openDataModal('sogediproma')}
                />
              )}

              {activeTab === 'logiciels' && (
                <SoftwareLicensesSection
                  licences={data.logicielsLicences}
                  onUpdateLicences={(logicielsLicences) =>
                    setData({ ...data, logicielsLicences })
                  }
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'securite' && (
                <BackupSecuritySection
                  sauvegardes={data.sauvegardes}
                  incidentsSecurite={data.incidentsSecurite}
                  onUpdateSauvegardes={(sauvegardes) =>
                    setData({ ...data, sauvegardes })
                  }
                  onUpdateIncidentsSecurite={(incidentsSecurite) =>
                    setData({ ...data, incidentsSecurite })
                  }
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'consommables' && (
                <ConsumablesSection
                  consommables={data.consommables}
                  demandesAchat={data.demandesAchat}
                  onUpdateConsommables={(consommables) =>
                    setData({ ...data, consommables })
                  }
                  onUpdateDemandesAchat={(demandesAchat) =>
                    setData({ ...data, demandesAchat })
                  }
                  onShowToast={showToast}
                  onOpenSogedipromaSync={() => openDataModal('sogediproma')}
                />
              )}

              {activeTab === 'rapports' && (
                <MonthlyReportsSection
                  data={data}
                  rapports={data.rapportsMensuels}
                  onUpdateRapports={(rapportsMensuels) =>
                    setData({ ...data, rapportsMensuels })
                  }
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'bilans' && (
                <QuarterlyAnnualSection
                  data={data}
                  bilansTrimestriels={data.bilansTrimestriels}
                  bilanAnnuel={data.bilanAnnuel}
                  generalInfo={data.generalInfo}
                  onUpdateTrimestriels={(bilansTrimestriels) =>
                    setData({ ...data, bilansTrimestriels })
                  }
                  onUpdateBilanAnnuel={(bilanAnnuel) =>
                    setData({ ...data, bilanAnnuel })
                  }
                  onShowToast={showToast}
                />
              )}
            </main>

            {/* Pied de page */}
            <footer className="border-t border-slate-200 bg-white text-slate-500 text-xs py-4 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 no-print">
              <div>
                <strong className="text-slate-800 font-semibold">
                  {data.generalInfo.entreprise || 'Cahier de Suivi IT'}
                </strong>{' '}
                · Direction des Systèmes d&apos;Information
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                <button
                  type="button"
                  onClick={handleDownloadDocx}
                  disabled={isGeneratingDocx}
                  className="hover:text-blue-600 transition"
                >
                  Télécharger Word (.docx)
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="hover:text-emerald-600 transition"
                >
                  Télécharger PDF (.pdf)
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={handlePrintPreview}
                  className="hover:text-slate-900 transition"
                >
                  Imprimer A4
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const hasLocalStorageAtBootRef = useRef<boolean>((() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  })());
  const initialBaselineSerializedRef = useRef<string>(JSON.stringify(initialCahierData));
  const [data, setData] = useState<CahierSuiviData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return normalizeWorkbookData(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Erreur lecture localStorage', e);
    }
    return initialCahierData;
  });

  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [conflict, setConflict] = useState<CloudConflictState | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCloudSnapshotRef = useRef<string | null>(null);
  const syncMetaRef = useRef<SyncMeta>(readSyncMeta());
  const dataRef = useRef<CahierSuiviData>(data);
  dataRef.current = data;

  const isApplyingCloudRef = useRef(false);
  const isAutoSyncRef = useRef(false);
  const hasAutoSyncedRef = useRef(false);
  const didRunStartupAutoSyncRef = useRef(false);

  // Synchronisation continue avec localStorage + suivi des modifications locales non synchronisées
  useEffect(() => {
    const serialized = JSON.stringify(data);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      console.error('Erreur sauvegarde localStorage', e);
    }

    if (isApplyingCloudRef.current) {
      isApplyingCloudRef.current = false;
      return;
    }

    if (isAutoSyncRef.current) {
      isAutoSyncRef.current = false;
      return;
    }

    // Au tout premier démarrage sans historique local ni cloud, ne pas marquer comme modifié manuellement
    if (
      !hasLocalStorageAtBootRef.current &&
      !syncMetaRef.current.lastSyncedHash &&
      serialized === initialBaselineSerializedRef.current
    ) {
      return;
    }

    if (
      syncMetaRef.current.lastSyncedHash &&
      syncMetaRef.current.lastSyncedHash === serialized
    ) {
      return;
    }

    // Marquer le cahier comme modifié localement s'il diffère de la dernière synchro connue
    const nextMeta: SyncMeta = {
      localDirty: true,
      lastLocalModifiedAt: new Date().toISOString(),
      lastSyncedHash: syncMetaRef.current.lastSyncedHash,
    };
    syncMetaRef.current = nextMeta;
    writeSyncMeta(nextMeta);
  }, [data]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastMessage(null);
  }, []);

  const pauseToastTimer = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  const resumeToastTimer = useCallback(() => {
    if (!toastMessage) return;
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2500);
  }, [toastMessage]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 4500);
  }, []);

  const markSynced = useCallback((syncedData: CahierSuiviData) => {
    const serialized = JSON.stringify(syncedData);
    lastCloudSnapshotRef.current = serialized;
    const nextMeta: SyncMeta = {
      localDirty: false,
      lastLocalModifiedAt: new Date().toISOString(),
      lastSyncedHash: serialized,
    };
    syncMetaRef.current = nextMeta;
    writeSyncMeta(nextMeta);
  }, []);

  // Synchronisation automatique et non bloquante depuis SOGEDIPROMA à l'ouverture
  useEffect(() => {
    if (didRunStartupAutoSyncRef.current) return;
    didRunStartupAutoSyncRef.current = true;

    let cancelled = false;
    const runStartupAutoSync = async () => {
      try {
        const cfgRes = await fetch('/api/sogediproma/config');
        if (!cfgRes.ok) return;
        const cfg = (await cfgRes.json()) as {
          hasDefaultUrl?: boolean;
          defaultUrl?: string;
          pairedUrl?: string;
          hasDefaultCredentials?: boolean;
        };
        if (!cfg?.hasDefaultUrl && !cfg?.hasDefaultCredentials) return;

        const syncRes = await fetch('/api/sogediproma/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!syncRes.ok || cancelled) return;

        const payload = (await syncRes.json()) as {
          revision?: number;
          data?: SogedipromaStateData;
        };
        if (!payload?.data || cancelled) return;

        const mapped = mapSogedipromaToWorkbookDelta(payload.data);
        const populatedSel: Record<SogedipromaSyncModuleKey, boolean> = {
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
        };

        const result = applySogedipromaMerge(
          dataRef.current,
          mapped,
          populatedSel,
          'merge'
        );
        if (result.estimatedBytes >= 950 * 1024) return;

        const revLabel = payload.revision ?? '—';
        const counts: string[] = [];
        if (mapped.parcEquipements.length) counts.push(`${mapped.parcEquipements.length} mat.`);
        if (mapped.consommables.length) counts.push(`${mapped.consommables.length} art.`);
        if (mapped.demandesAchat.length) counts.push(`${mapped.demandesAchat.length} achats`);
        if (mapped.logicielsLicences.length) counts.push(`${mapped.logicielsLicences.length} licences`);
        if (mapped.objectifsAnnuels.length) counts.push(`${mapped.objectifsAnnuels.length} budgets`);

        const summary = counts.length
          ? `Synchro auto SOGEDIPROMA (rév. #${revLabel}) : ${counts.join(', ')}.`
          : `Synchro auto SOGEDIPROMA (rév. #${revLabel}) à jour.`;

        try {
          localStorage.setItem(
            'sogediproma_last_sync_v1',
            JSON.stringify({
              at: new Date().toISOString(),
              revision: typeof payload.revision === 'number' ? payload.revision : undefined,
              summary,
              url: cfg.pairedUrl || cfg.defaultUrl || 'https://pc-informatique.taild86fee.ts.net',
            })
          );
        } catch {
          // Ignorer erreur localStorage
        }

        const prevSerialized = JSON.stringify(dataRef.current);
        const nextSerialized = JSON.stringify(result.nextData);
        hasAutoSyncedRef.current = true;

        if (nextSerialized !== prevSerialized && !cancelled) {
          isAutoSyncRef.current = true;
          setData(result.nextData);
          showToast(summary);
        }
      } catch {
        // Silencieux si proxy/tunnel indisponible à l'ouverture
      }
    };

    const timer = setTimeout(() => {
      void runStartupAutoSync();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showToast]);

  const handleCloudSnapshotReceived = useCallback(
    (snapshot: CloudWorkbookSnapshot, isInitialLoad: boolean) => {
      const normalizedCloud = normalizeWorkbookData(snapshot.data);
      const cloudSerialized = JSON.stringify(normalizedCloud);
      const localSerialized = JSON.stringify(dataRef.current);

      if (cloudSerialized === localSerialized) {
        markSynced(normalizedCloud);
        return;
      }

      // Vérifier s'il y a des modifications manuelles locales non synchronisées
      const meta = syncMetaRef.current;
      const hasUnsyncedLocalEdits =
        meta.localDirty &&
        meta.lastSyncedHash !== localSerialized;

      if (hasUnsyncedLocalEdits) {
        setConflict({
          localData: dataRef.current,
          cloudData: normalizedCloud,
          localUpdatedAt: meta.lastLocalModifiedAt,
          cloudUpdatedAt: snapshot.updatedAt,
        });
        return;
      }

      // Si l'auto-sync SOGEDIPROMA a déjà enrichi les données live avant l'arrivée du snapshot initial Firestore,
      // fusionner sans conflit pour préserver à la fois les données Cloud manuelles et les données live SOGEDIPROMA.
      if (hasAutoSyncedRef.current && localSerialized !== initialBaselineSerializedRef.current) {
        const merged = mergeWorkbookData(dataRef.current, normalizedCloud);
        isApplyingCloudRef.current = true;
        lastCloudSnapshotRef.current = cloudSerialized;
        const nextMeta: SyncMeta = {
          localDirty: false,
          lastLocalModifiedAt: new Date().toISOString(),
          lastSyncedHash: JSON.stringify(merged),
        };
        syncMetaRef.current = nextMeta;
        writeSyncMeta(nextMeta);
        setData(merged);
        if (isInitialLoad) {
          showToast('Données Cloud et SOGEDIPROMA fusionnées automatiquement.');
        }
        return;
      }

      // Pas de modification locale en conflit -> mise à jour transparente depuis le Cloud
      isApplyingCloudRef.current = true;
      markSynced(normalizedCloud);
      setData(normalizedCloud);
      if (isInitialLoad) {
        showToast('Données synchronisées depuis le Cloud Firestore.');
      }
    },
    [markSynced, showToast]
  );

  const handleResolveMerge = useCallback(
    async (saveFn: (d: CahierSuiviData) => Promise<void>) => {
      if (!conflict) return;
      const merged = mergeWorkbookData(conflict.localData, conflict.cloudData);
      setConflict(null);
      isApplyingCloudRef.current = true;
      setData(merged);
      try {
        await saveFn(merged);
        markSynced(merged);
        showToast('Versions locale et Cloud fusionnées et synchronisées.');
      } catch {
        showToast('Fusion appliquée localement. Nouvelle tentative Cloud requise.');
      }
    },
    [conflict, markSynced, showToast]
  );

  const handleResolveKeepLocal = useCallback(
    async (saveFn: (d: CahierSuiviData) => Promise<void>) => {
      if (!conflict) return;
      const localVersion = conflict.localData;
      setConflict(null);
      try {
        await saveFn(localVersion);
        markSynced(localVersion);
        showToast('Version locale conservée et envoyée vers Firestore.');
      } catch {
        showToast('Version locale conservée. Échec de l’envoi vers Firestore.');
      }
    },
    [conflict, markSynced, showToast]
  );

  const handleResolveLoadCloud = useCallback(() => {
    if (!conflict) return;
    const cloudVersion = normalizeWorkbookData(conflict.cloudData);
    setConflict(null);
    isApplyingCloudRef.current = true;
    markSynced(cloudVersion);
    setData(cloudVersion);
    showToast('Version Cloud chargée dans votre cahier.');
  }, [conflict, markSynced, showToast]);

  const handleDownloadDocx = async () => {
    try {
      setIsGeneratingDocx(true);
      showToast('Génération du document Word (.docx) complet en cours...');
      const { generateDocx } = await import('./utils/docxGenerator');
      await generateDocx(data);
      showToast('Document Word (.docx) téléchargé avec succès !');
    } catch (error) {
      console.error('Erreur export DOCX', error);
      showToast('Erreur lors de la génération du fichier DOCX.');
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      showToast('Génération et téléchargement du document PDF (.pdf) en cours...');
      const { generateDirectPdf } = await import('./utils/pdfGenerator');
      generateDirectPdf(data);
      showToast('Fichier PDF téléchargé avec succès !');
    } catch (error) {
      console.error('Erreur export PDF', error);
      showToast('Erreur lors de la génération du PDF.');
    }
  };

  const handlePrintPreview = () => {
    window.print();
  };

  const handleResetData = () => {
    setResetConfirmOpen(true);
  };

  const confirmResetData = () => {
    setData(initialCahierData);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_META_KEY);
    syncMetaRef.current = {
      localDirty: false,
      lastLocalModifiedAt: null,
      lastSyncedHash: null,
    };
    setResetConfirmOpen(false);
    showToast('Cahier réinitialisé sur la base vierge de production.');
  };

  return (
    <FirebaseProvider
      onCloudSnapshotReceived={handleCloudSnapshotReceived}
      onCloudSynced={markSynced}
      currentLocalData={data}
    >
      {/* Modal de confirmation de réinitialisation */}
      <Modal
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        title="Réinitialiser le cahier sur la base vierge ?"
        subtitle="Action irréversible sur les données locales non sauvegardées."
        icon={<RotateCcw className="w-4 h-4" />}
        tone="danger"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setResetConfirmOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmResetData}
              className={dangerButtonClass}
            >
              Confirmer la réinitialisation
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs leading-relaxed text-slate-600">
          <p>
            Toutes les saisies locales actuelles seront effacées pour repartir d&apos;un cahier de production vierge.
          </p>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
            Pensez à exporter une sauvegarde JSON depuis <strong className="font-semibold">Données &amp; Sauvegarde</strong> si vous souhaitez archiver vos données avant réinitialisation.
          </div>
        </div>
      </Modal>

      {/* Toast de notification global */}
      <Toast
        message={toastMessage}
        onDismiss={dismissToast}
        onPause={pauseToastTimer}
        onResume={resumeToastTimer}
      />

      <CahierContent
        data={data}
        setData={setData}
        showToast={showToast}
        isGeneratingDocx={isGeneratingDocx}
        handleDownloadDocx={handleDownloadDocx}
        handleDownloadPdf={handleDownloadPdf}
        handlePrintPreview={handlePrintPreview}
        handleResetData={handleResetData}
        lastCloudSnapshotRef={lastCloudSnapshotRef}
        conflict={conflict}
        onResolveMerge={handleResolveMerge}
        onResolveKeepLocal={handleResolveKeepLocal}
        onResolveLoadCloud={handleResolveLoadCloud}
      />
    </FirebaseProvider>
  );
}
