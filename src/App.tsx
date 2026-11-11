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
import { generateDocx } from './utils/docxGenerator';
import { generateDirectPdf, triggerPrintToPdf } from './utils/pdfGenerator';
import { CheckCircle2, AlertTriangle, Cloud, X } from 'lucide-react';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';

const STORAGE_KEY = 'cahier_suivi_technicien_it_v1';

function CahierContent({
  data,
  setData,
  showToast,
  isGeneratingDocx,
  handleDownloadDocx,
  handleDownloadPdf,
  handlePrintPreview,
  handleResetData,
}: {
  data: CahierSuiviData;
  setData: React.Dispatch<React.SetStateAction<CahierSuiviData>>;
  showToast: (msg: string) => void;
  isGeneratingDocx: boolean;
  handleDownloadDocx: () => Promise<void>;
  handleDownloadPdf: () => void;
  handlePrintPreview: () => void;
  handleResetData: () => void;
}) {
  const [activeTab, setActiveTab] = useState<string>('general');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const {
    user,
    isAdmin,
    errorMessage,
    dismissError,
    saveDataToCloud
  } = useFirebase();

  // Débouncing de la sauvegarde Cloud automatique
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!user) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveDataToCloud(data).catch(() => {
        // Erreur gérée par le contexte
      });
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, user, saveDataToCloud]);

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

      {/* Vue Livret Complet Imprimable A4 */}
      {activeTab === 'livret' ? (
        <PrintBooklet
          data={data}
          onBack={() => setActiveTab('general')}
          onPrint={triggerPrintToPdf}
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
                  info={data.generalInfo}
                  onUpdate={(info) => setData({ ...data, generalInfo: info })}
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
                  rapports={data.rapportsMensuels}
                  onUpdateRapports={(rapportsMensuels) => setData({ ...data, rapportsMensuels })}
                />
              )}

              {activeTab === 'bilans' && (
                <QuarterlyAnnualSection
                  bilansTrimestriels={data.bilansTrimestriels}
                  bilanAnnuel={data.bilanAnnuel}
                  onUpdateTrimestriels={(bilansTrimestriels) => setData({ ...data, bilansTrimestriels })}
                  onUpdateBilanAnnuel={(bilanAnnuel) => setData({ ...data, bilanAnnuel })}
                />
              )}
            </main>

            {/* Pied de page */}
            <footer className="border-t border-slate-200 bg-white text-slate-500 text-xs py-4 px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 no-print">
              <div>
                <strong className="text-slate-800 font-semibold">{data.generalInfo.entreprise}</strong> · Direction des Systèmes d'Information
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
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erreur lecture localStorage', e);
    }
    return initialCahierData;
  });

  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronisation continue avec localStorage (mode hors ligne et cache local)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erreur sauvegarde localStorage', e);
    }
  }, [data]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleCloudDataReceived = useCallback((cloudData: CahierSuiviData) => {
    setData(cloudData);
    showToast('Données synchronisées depuis le Cloud Firestore.');
  }, []);

  const handleDownloadDocx = async () => {
    try {
      setIsGeneratingDocx(true);
      showToast('Génération du document Word (.docx) complet en cours...');
      await generateDocx(data);
      showToast('Document Word (.docx) téléchargé avec succès !');
    } catch (error) {
      console.error('Erreur export DOCX', error);
      showToast('Erreur lors de la génération du fichier DOCX.');
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const handleDownloadPdf = () => {
    try {
      showToast('Génération et téléchargement du document PDF (.pdf) en cours...');
      generateDirectPdf(data);
      showToast('Fichier PDF téléchargé avec succès !');
    } catch (error) {
      console.error('Erreur export PDF', error);
      showToast('Erreur lors de la génération du PDF.');
    }
  };

  const handlePrintPreview = () => {
    triggerPrintToPdf();
  };

  const handleResetData = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes les données aux valeurs d\'exemple par défaut ?')) {
      setData(initialCahierData);
      localStorage.removeItem(STORAGE_KEY);
      showToast('Données réinitialisées avec succès.');
    }
  };

  return (
    <FirebaseProvider
      onCloudDataReceived={handleCloudDataReceived}
      currentLocalData={data}
    >
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
      />
    </FirebaseProvider>
  );
}
