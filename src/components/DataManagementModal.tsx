import React, { useState, useRef } from 'react';
import { CahierSuiviData } from '../types/it-tracker';
import { initialCahierData, demoCahierData } from '../data/initialData';
import { exportFullBackupJson, parseBackupFile, createCleanProductionWorkbook } from '../utils/backupService';
import {
  ShieldAlert,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  FileJson,
  Sparkles,
  Database,
  Lock,
  Layers
} from 'lucide-react';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CahierSuiviData;
  onUpdateData: (newData: CahierSuiviData) => void;
  onShowToast: (msg: string) => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  data,
  onUpdateData,
  onShowToast,
}) => {
  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false);
  const [confirmDemoOpen, setConfirmDemoOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<CahierSuiviData | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setConfirmCleanOpen(false);
      setConfirmDemoOpen(false);
      setPendingImportData(null);
      setImportError(null);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calcul du volume de données actuel
  const stats = {
    tasksCount: data.journalTaches?.length || 0,
    interventionsCount: data.interventions?.length || 0,
    equipmentCount: data.parcEquipements?.length || 0,
    softwareCount: data.logicielsLicences?.length || 0,
    consumablesCount: data.consommables?.length || 0,
    roiProjectsCount: data.bilanAnnuel?.projetsRoi?.length || 0,
  };

  const handleExportBackup = () => {
    exportFullBackupJson(data);
    onShowToast('Sauvegarde complète JSON téléchargée avec succès.');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const res = await parseBackupFile(file);
    if (res.success && res.data) {
      setPendingImportData(res.data);
      setImportFileName(file.name);
    } else {
      setPendingImportData(null);
      setImportError(res.error || 'Fichier JSON invalide.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImportData) return;
    onUpdateData(pendingImportData);
    setPendingImportData(null);
    setImportFileName('');
    onShowToast('Restauration des données effectuée avec succès.');
    onClose();
  };

  const handleApplyCleanWorkbook = () => {
    // Créer un cahier de production vierge en conservant les infos d'entreprise et technicien si existantes
    const cleanWorkbook = createCleanProductionWorkbook(
      data.generalInfo.anneeReference,
      data.generalInfo.nomTechnicien === 'DUBOIS' ? '' : data.generalInfo.nomTechnicien,
      data.generalInfo.prenomTechnicien === 'Alexandre' ? '' : data.generalInfo.prenomTechnicien,
      data.generalInfo.entreprise === 'GROUPE NEXUS TECHNOLOGIES & SERVICES' ? '' : data.generalInfo.entreprise,
      data.generalInfo.responsableHierarchique === 'M. Marc LEFEBVRE' ? '' : data.generalInfo.responsableHierarchique
    );

    onUpdateData(cleanWorkbook);
    onShowToast('Cahier de suivi réinitialisé en mode Production Vierge.');
    setConfirmCleanOpen(false);
    onClose();
  };

  const handleConfirmReloadDemo = () => {
    onUpdateData(demoCahierData);
    setConfirmDemoOpen(false);
    onShowToast('Jeu de données de démonstration rechargé.');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 overflow-hidden text-xs max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Centre de Gestion des Données & Préparation Production
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sauvegarde certifiée, bascule en mode production vierge et restauration sécurisée.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Étape 1 : Protection obligatoire - Sauvegarde préalable */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-bold text-blue-950 dark:text-blue-200 text-xs uppercase tracking-wide">
                  1. Sauvegarde Complète Préalable (Recommandée)
                </span>
              </div>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded-full">
                Format JSON Intégral
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Téléchargez une archive complète certifiée de votre cahier avant toute opération de nettoyage ou de mise en production. Vous pourrez réimporter ce fichier à tout instant.
            </p>
            <button
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger la Sauvegarde Complète (.json)</span>
            </button>
          </div>

          {/* Étape 2 : État des données actuelles */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              2. Volume & Données Actuellement Enregistrées
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 text-[10px] block">Tâches journalières</span>
                <strong className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {stats.tasksCount}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 text-[10px] block">Interventions IT</span>
                <strong className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {stats.interventionsCount}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 text-[10px] block">Actifs Parc (CMDB)</span>
                <strong className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {stats.equipmentCount}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 text-[10px] block">Logiciels & Licences</span>
                <strong className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {stats.softwareCount}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 text-[10px] block">Articles Consommables</span>
                <strong className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {stats.consumablesCount}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 text-[10px] block">Projets Analyse ROI</span>
                <strong className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {stats.roiProjectsCount}
                </strong>
              </div>
            </div>
          </div>

          {/* Étape 3 : Nettoyage & Bascule vers la Production */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              3. Opérations de Nettoyage Pré-Déploiement
            </span>

            {/* Option A : Passer au mode Production Vierge */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <strong className="text-xs text-slate-900 dark:text-white font-bold">
                    Bascule en Mode Production Vierge
                  </strong>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Recommandé pour débuter
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Supprime toutes les données fictives d'exemple (tickets d'essai, ordinateurs factices, logs de démonstration) tout en conservant la structure officielle, les 12 rapports mensuels, les 4 bilans trimestriels et les règles de conformité.
              </p>

              {!confirmCleanOpen ? (
                <button
                  onClick={() => setConfirmCleanOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                >
                  <span>Initialiser le Cahier Vierge de Production</span>
                </button>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-700 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Confirmation requise : Vider les données d'essai ?</span>
                  </div>
                  <p className="text-[10px] text-amber-800 dark:text-amber-300">
                    Cette action réinitialisera les tables à zéro pour accueillir vos vraies données d'entreprise. Pensez à exporter votre sauvegarde avant de valider.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleApplyCleanWorkbook}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition"
                    >
                      Confirmer le nettoyage complet
                    </button>
                    <button
                      onClick={() => setConfirmCleanOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Option B : Recharger le jeu de démonstration */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <strong className="block text-slate-800 dark:text-slate-200">
                    Jeu de Données de Démonstration & Formation
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    Restaure les exemples complets pour évaluer les fonctionnalités et les graphiques.
                  </span>
                </div>
                {!confirmDemoOpen && (
                  <button
                    type="button"
                    onClick={() => setConfirmDemoOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition shrink-0"
                  >
                    Recharger Démo
                  </button>
                )}
              </div>
              {confirmDemoOpen && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-2 text-amber-900">
                  <span className="text-[11px] font-medium">
                    Remplacer les données actuelles par le jeu de démonstration ?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmReloadDemo}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDemoOpen(false)}
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Option C : Importer une archive de sauvegarde */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <strong className="block text-slate-800 dark:text-slate-200">
                    Restaurer depuis un Fichier de Sauvegarde (.json)
                  </strong>
                  <span className="text-[10px] text-slate-500">
                    Restaure un cahier complet précédemment sauvegardé sur votre ordinateur.
                  </span>
                </div>
                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 font-semibold transition shrink-0">
                  <Upload className="w-3.5 h-3.5 inline mr-1" />
                  <span>Importer JSON</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImportFile}
                  />
                </label>
              </div>

              {importError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center justify-between gap-2 text-[11px]">
                  <span>Erreur de restauration : {importError}</span>
                  <button
                    type="button"
                    onClick={() => setImportError(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {pendingImportData && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span>
                    Restaurer <strong>{importFileName}</strong> ({pendingImportData.interventions.length} interventions, {pendingImportData.journalTaches.length} tâches) ? Les données actuelles seront remplacées.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      Confirmer la restauration
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingImportData(null);
                        setImportFileName('');
                      }}
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-semibold hover:opacity-90 transition text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
