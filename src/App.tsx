import React, { useState, useEffect } from 'react';
import { initialCahierData } from './data/initialData';
import { CahierSuiviData } from './types/it-tracker';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
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
import { CheckCircle2, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'cahier_suivi_technicien_it_v1';

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

  const [activeTab, setActiveTab] = useState<string>('general');
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronisation avec localStorage
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
    setActiveTab('livret');
    setTimeout(() => {
      triggerPrintToPdf();
    }, 300);
  };

  const handleResetData = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes les données aux valeurs d\'exemple par défaut ?')) {
      setData(initialCahierData);
      localStorage.removeItem(STORAGE_KEY);
      showToast('Données réinitialisées avec succès.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Toast de notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-fade-in no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Si l'onglet est le livret complet A4 */}
      {activeTab === 'livret' ? (
        <PrintBooklet
          data={data}
          onBack={() => setActiveTab('general')}
          onPrint={triggerPrintToPdf}
          onDownloadPdf={handleDownloadPdf}
          onDownloadDocx={handleDownloadDocx}
        />
      ) : (
        <>
          {/* En-tête de l'application */}
          <Header
            data={data}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onDownloadDocx={handleDownloadDocx}
            onDownloadPdf={handleDownloadPdf}
            onPrintPreview={handlePrintPreview}
            onResetData={handleResetData}
            isGeneratingDocx={isGeneratingDocx}
          />

          {/* Navigation par onglets des 12 modules */}
          <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />

          {/* Corps principal */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="transition-all duration-200">
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
            </div>
          </main>

          {/* Pied de page */}
          <footer className="bg-slate-900 text-slate-400 text-xs py-5 border-t border-slate-800 no-print">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <strong className="text-white">Cahier de Suivi Annuel du Technicien Informatique</strong> • Exercice {data.generalInfo.anneeReference}
              </div>
              <div className="text-slate-400">
                Direction des Systèmes d'Information • {data.generalInfo.entreprise}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadDocx}
                  disabled={isGeneratingDocx}
                  className="hover:text-blue-300 underline underline-offset-2"
                >
                  Télécharger .docx
                </button>
                <span>•</span>
                <button
                  onClick={handleDownloadPdf}
                  className="hover:text-emerald-300 underline underline-offset-2"
                >
                  Télécharger .pdf
                </button>
                <span>•</span>
                <button
                  onClick={handlePrintPreview}
                  className="hover:text-white underline underline-offset-2"
                >
                  Imprimer A4
                </button>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
