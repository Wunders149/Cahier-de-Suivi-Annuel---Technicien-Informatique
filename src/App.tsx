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
import { CheckCircle2, AlertTriangle, Cloud, X, RotateCcw } from 'lucide-react';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';
import { normalizeWorkbookData } from './utils/backupService';

const STORAGE_KEY = 'cahier_suivi_technicien_it_v2_prod';

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
}) {
  const [activeTab, setActiveTab] = useState<string>('general');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);

  const {
    user,
    isAdmin,
    errorMessage,
    dismissError,
    saveDataToCloud
  } = useFirebase();

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

  // Débouncing de la sauvegarde Cloud automatique (sans boucle sur réception Cloud)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.uid || null;
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      return;
    }

    if (!user) return;

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
  }, [data, user, saveDataToCloud, lastCloudSnapshotRef]);

  // Badges calculés
  const pendingTasks = data.journalTaches.filter((t) => t.statut === 'En cours' || t.statut === 'À faire').length;
  const activeInterventions = data.interventions.filter((i) => i.resultat !== 'Résolu').length;
  const lowStock = data.consommables.filter((c) => c.stockActuel <= c.stockMinimumAlerte).length;

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
            onClick={dismissError}
            className="p-1 hover:bg-red-700 rounded transition"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
            onOpenDataModal={() => setDataModalOpen(true)}
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
            />

            {/* Notification persistante discrète si connecté */}
            {user && (
              <div className="bg-blue-50/70 dark:bg-slate-900 border-b border-blue-100 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between text-[11px] text-blue-900 dark:text-blue-300 no-print">
                <div className="flex items-center gap-2">
                  <Cloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>
                    Synchronisation automatique active sur Firestore Cloud ({user.email})
                  </span>
                  {isAdmin && (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      · Privilèges Administrateur DSI
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    saveDataToCloud(data).then(() => showToast('Cahier synchronisé avec succès dans Firestore !'));
                  }}
                  className="font-medium hover:underline text-blue-700 dark:text-blue-300"
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
                  onUpdateObjectifs={(objectifs) => setData({ ...data, objectifsAnnuels: objectifs })}
                  onUpdateJalons={(jalons) => setData({ ...data, jalonsCalendrier: jalons })}
                />
              )}

              {activeTab === 'journal' && (
                <DailyLogSection
                  taches={data.journalTaches}
                  onUpdateTaches={(taches) => setData({ ...data, journalTaches: taches })}
                />
              )}

              {activeTab === 'interventions' && (
                <InterventionsSection
                  interventions={data.interventions}
                  onUpdateInterventions={(interventions) => setData({ ...data, interventions })}
                  generalInfo={data.generalInfo}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'maintenance' && (
                <MaintenanceSection
                  maintenances={data.maintenances}
                  onUpdateMaintenances={(maintenances) => setData({ ...data, maintenances })}
                />
              )}

              {activeTab === 'reseau' && (
                <NetworkSection
                  equipements={data.reseauEquipements}
                  incidents={data.reseauIncidents}
                  testsDebit={data.reseauTestsDebit}
                  onUpdateEquipements={(reseauEquipements) => setData({ ...data, reseauEquipements })}
                  onUpdateIncidents={(reseauIncidents) => setData({ ...data, reseauIncidents })}
                  onUpdateTestsDebit={(reseauTestsDebit) => setData({ ...data, reseauTestsDebit })}
                />
              )}

              {activeTab === 'parc' && (
                <InventorySection
                  parc={data.parcEquipements}
                  onUpdateParc={(parcEquipements) => setData({ ...data, parcEquipements })}
                />
              )}

              {activeTab === 'logiciels' && (
                <SoftwareLicensesSection
                  licences={data.logicielsLicences}
                  onUpdateLicences={(logicielsLicences) => setData({ ...data, logicielsLicences })}
                />
              )}

              {activeTab === 'securite' && (
                <BackupSecuritySection
                  sauvegardes={data.sauvegardes}
                  incidentsSecurite={data.incidentsSecurite}
                  onUpdateSauvegardes={(sauvegardes) => setData({ ...data, sauvegardes })}
                  onUpdateIncidentsSecurite={(incidentsSecurite) => setData({ ...data, incidentsSecurite })}
                />
              )}

              {activeTab === 'consommables' && (
                <ConsumablesSection
                  consommables={data.consommables}
                  demandesAchat={data.demandesAchat}
                  onUpdateConsommables={(consommables) => setData({ ...data, consommables })}
                  onUpdateDemandesAchat={(demandesAchat) => setData({ ...data, demandesAchat })}
                />
              )}

              {activeTab === 'rapports' && (
                <MonthlyReportsSection
                  data={data}
                  rapports={data.rapportsMensuels}
                  onUpdateRapports={(rapportsMensuels) => setData({ ...data, rapportsMensuels })}
                  onShowToast={showToast}
                />
              )}

              {activeTab === 'bilans' && (
                <QuarterlyAnnualSection
                  bilansTrimestriels={data.bilansTrimestriels}
                  bilanAnnuel={data.bilanAnnuel}
                  generalInfo={data.generalInfo}
                  onUpdateTrimestriels={(bilansTrimestriels) => setData({ ...data, bilansTrimestriels })}
                  onUpdateBilanAnnuel={(bilanAnnuel) => setData({ ...data, bilanAnnuel })}
                />
              )}
            </main>

            {/* Pied de page */}
            <footer className="border-t border-slate-200 bg-white text-slate-500 text-xs py-4 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 no-print">
              <div>
                <strong className="text-slate-800 font-semibold">
                  {data.generalInfo.entreprise || 'Cahier de Suivi IT'}
                </strong>{' '}
                · Direction des Systèmes d'Information
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                <button
                  onClick={handleDownloadDocx}
                  disabled={isGeneratingDocx}
                  className="hover:text-blue-600 transition"
                >
                  Télécharger Word (.docx)
                </button>
                <span>·</span>
                <button
                  onClick={handleDownloadPdf}
                  className="hover:text-emerald-600 transition"
                >
                  Télécharger PDF (.pdf)
                </button>
                <span>·</span>
                <button
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
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCloudSnapshotRef = useRef<string | null>(null);

  // Synchronisation continue avec localStorage (mode hors ligne et cache local)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erreur sauvegarde localStorage', e);
    }
  }, [data]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  const handleCloudDataReceived = useCallback((cloudData: CahierSuiviData) => {
    const normalized = normalizeWorkbookData(cloudData);
    lastCloudSnapshotRef.current = JSON.stringify(normalized);
    setData(normalized);
    showToast('Données synchronisées depuis le Cloud Firestore.');
  }, [showToast]);

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
    setResetConfirmOpen(false);
    showToast('Cahier réinitialisé sur la base vierge de production.');
  };

  return (
    <FirebaseProvider
      onCloudDataReceived={handleCloudDataReceived}
      currentLocalData={data}
    >
      {/* Modal de confirmation de réinitialisation (sans window.confirm) */}
      {resetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print"
          onClick={() => setResetConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 p-6 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Réinitialiser le cahier sur la base vierge ?
                </h3>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Toutes les saisies locales actuelles seront effacées pour repartir d'un cahier de production vierge. Pensez à exporter une sauvegarde JSON préalable si nécessaire.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition"
              >
                Confirmer la réinitialisation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de notification global */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-fade-in no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

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
      />
    </FirebaseProvider>
  );
}
