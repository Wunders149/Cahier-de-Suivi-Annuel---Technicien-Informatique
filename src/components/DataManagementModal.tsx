import React, { useState, useRef, useEffect } from 'react';
import { CahierSuiviData } from '../types/it-tracker';
import { demoCahierData } from '../data/initialData';
import {
  exportFullBackupJson,
  parseBackupFile,
  createCleanProductionWorkbook,
} from '../utils/backupService';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  FileJson,
  Database,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import {
  dangerButtonClass,
  emeraldButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui/formStyles';

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
  const [pendingImportData, setPendingImportData] =
    useState<CahierSuiviData | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirmCleanOpen(false);
      setConfirmDemoOpen(false);
      setPendingImportData(null);
      setImportError(null);
    }
  }, [isOpen]);

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
    const cleanWorkbook = createCleanProductionWorkbook(
      data.generalInfo.anneeReference,
      data.generalInfo.nomTechnicien === 'DUBOIS'
        ? ''
        : data.generalInfo.nomTechnicien,
      data.generalInfo.prenomTechnicien === 'Alexandre'
        ? ''
        : data.generalInfo.prenomTechnicien,
      data.generalInfo.entreprise === 'GROUPE NEXUS TECHNOLOGIES & SERVICES'
        ? ''
        : data.generalInfo.entreprise,
      data.generalInfo.responsableHierarchique === 'M. Marc LEFEBVRE'
        ? ''
        : data.generalInfo.responsableHierarchique
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Centre de Gestion des Données & Sauvegarde"
      subtitle="Export JSON intégral, bascule en mode production vierge et restauration sécurisée."
      icon={<Database className="w-4 h-4" />}
      size="xl"
      footer={
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Fermer
        </button>
      }
    >
      <div className="space-y-6">
        {/* Étape 1 : Sauvegarde préalable */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-900 text-[13px]">
                1. Sauvegarde complète préalable
              </span>
            </div>
            <span className="text-[11px] font-medium text-blue-700">
              Archive JSON intégrale · Recommandée
            </span>
          </div>
          <p className="text-slate-600 text-xs leading-relaxed">
            Téléchargez une archive complète de votre cahier avant toute opération de nettoyage ou de mise en production. Vous pourrez réimporter ce fichier à tout instant.
          </p>
          <button
            type="button"
            onClick={handleExportBackup}
            className={primaryButtonClass}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger la sauvegarde (.json)</span>
          </button>
        </div>

        {/* Étape 2 : État des données actuelles */}
        <div className="space-y-2.5">
          <h4 className="text-[13px] font-bold text-slate-900">
            2. Volume des données actuellement enregistrées
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block">
                Tâches journalières
              </span>
              <strong className="text-base font-bold font-mono tabular-nums text-slate-900">
                {stats.tasksCount}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block">
                Interventions IT
              </span>
              <strong className="text-base font-bold font-mono tabular-nums text-slate-900">
                {stats.interventionsCount}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block">
                Actifs Parc (CMDB)
              </span>
              <strong className="text-base font-bold font-mono tabular-nums text-slate-900">
                {stats.equipmentCount}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block">
                Logiciels &amp; Licences
              </span>
              <strong className="text-base font-bold font-mono tabular-nums text-slate-900">
                {stats.softwareCount}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block">
                Articles Consommables
              </span>
              <strong className="text-base font-bold font-mono tabular-nums text-slate-900">
                {stats.consumablesCount}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 text-[11px] block">
                Projets Analyse ROI
              </span>
              <strong className="text-base font-bold font-mono tabular-nums text-slate-900">
                {stats.roiProjectsCount}
              </strong>
            </div>
          </div>
        </div>

        {/* Étape 3 : Nettoyage & Restauration */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h4 className="text-[13px] font-bold text-slate-900">
            3. Opérations de nettoyage &amp; restauration
          </h4>

          {/* Option A : Mode Production Vierge */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <strong className="text-xs text-slate-900 font-bold">
                  Bascule en mode Production Vierge
                </strong>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700">
                Recommandé pour débuter
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Supprime les données d'exemple tout en conservant la structure officielle, les 12 rapports mensuels, les 4 bilans trimestriels et vos informations de garde.
            </p>

            {!confirmCleanOpen ? (
              <button
                type="button"
                onClick={() => setConfirmCleanOpen(true)}
                className={emeraldButtonClass}
              >
                <span>Initialiser le cahier vierge de production</span>
              </button>
            ) : (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Confirmation requise : vider les données actuelles ?</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Cette action réinitialisera les tables à zéro pour accueillir vos données d'entreprise.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleApplyCleanWorkbook}
                    className={dangerButtonClass}
                  >
                    Confirmer le nettoyage
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCleanOpen(false)}
                    className={secondaryButtonClass}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option B : Recharger Démo */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong className="block text-slate-900 font-semibold">
                  Jeu de données de démonstration
                </strong>
                <span className="text-[11px] text-slate-500">
                  Restaure des exemples complets pour évaluer les tableaux et graphiques.
                </span>
              </div>
              {!confirmDemoOpen && (
                <button
                  type="button"
                  onClick={() => setConfirmDemoOpen(true)}
                  className={secondaryButtonClass}
                >
                  Recharger Démo
                </button>
              )}
            </div>
            {confirmDemoOpen && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-2 text-amber-900">
                <span className="text-[11px] font-medium">
                  Remplacer les données actuelles par le jeu de démonstration ?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmReloadDemo}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs whitespace-nowrap shrink-0 transition-colors"
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDemoOpen(false)}
                    className={secondaryButtonClass}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option C : Importer JSON */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong className="block text-slate-900 font-semibold">
                  Restaurer depuis un fichier (.json)
                </strong>
                <span className="text-[11px] text-slate-500">
                  Restaure un cahier complet précédemment sauvegardé.
                </span>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs transition-colors whitespace-nowrap shrink-0">
                <Upload className="w-3.5 h-3.5" />
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
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between gap-2 text-[11px]">
                <span>Erreur de restauration : {importError}</span>
                <button
                  type="button"
                  onClick={() => setImportError(null)}
                  aria-label="Fermer l'erreur"
                  className="text-red-500 hover:text-red-700 p-1 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {pendingImportData && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <span>
                  Restaurer <strong>{importFileName}</strong> (
                  {pendingImportData.interventions.length} interventions,{' '}
                  {pendingImportData.journalTaches.length} tâches) ? Les données actuelles seront remplacées.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className={primaryButtonClass}
                  >
                    Confirmer la restauration
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingImportData(null);
                      setImportFileName('');
                    }}
                    className={secondaryButtonClass}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
