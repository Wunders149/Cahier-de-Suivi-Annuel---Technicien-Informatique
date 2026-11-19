import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CahierSuiviData } from '../types/it-tracker';
import { demoCahierData } from '../data/initialData';
import {
  exportFullBackupJson,
  parseBackupFile,
  createCleanProductionWorkbook,
  createNextYearWorkbook,
  estimateWorkbookSizeBytes,
} from '../utils/backupService';
import {
  archiveWorkbookYearToFirestore,
  fetchWorkbookArchivesFromFirestore,
  deleteWorkbookArchiveFromFirestore,
  WorkbookArchiveRecord,
} from '../firebase/firestoreService';
import { useFirebase } from '../context/FirebaseContext';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  FileJson,
  Database,
  Archive,
  CalendarPlus,
  Trash2,
  RotateCcw,
  Cloud,
  PlugZap,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { SogedipromaSyncPanel } from './SogedipromaSyncPanel';
import {
  dangerButtonClass,
  emeraldButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui/formStyles';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'backup' | 'sogediproma';
  data: CahierSuiviData;
  onUpdateData: (newData: CahierSuiviData) => void;
  onApplySogedipromaData?: (newData: CahierSuiviData) => void;
  onShowToast: (msg: string) => void;
}

const FIRESTORE_MAX_BYTES = 1024 * 1024; // 1 Mo

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'backup',
  data,
  onUpdateData,
  onApplySogedipromaData,
  onShowToast,
}) => {
  const { user, saveDataToCloud } = useFirebase();
  const [activeTab, setActiveTab] = useState<'backup' | 'sogediproma'>(initialTab);

  const [confirmCleanOpen, setConfirmCleanOpen] = useState(false);
  const [confirmDemoOpen, setConfirmDemoOpen] = useState(false);
  const [pendingImportData, setPendingImportData] =
    useState<CahierSuiviData | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États Multi-année & Archives Cloud
  const [targetNextYear, setTargetNextYear] = useState<number>(
    (data.generalInfo?.anneeReference || new Date().getFullYear()) + 1
  );
  const [carryOverAssets, setCarryOverAssets] = useState<boolean>(true);
  const [confirmNextYearOpen, setConfirmNextYearOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archives, setArchives] = useState<WorkbookArchiveRecord[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [confirmRestoreArchiveId, setConfirmRestoreArchiveId] = useState<string | null>(null);
  const [confirmDeleteArchiveId, setConfirmDeleteArchiveId] = useState<string | null>(null);

  const loadArchives = useCallback(async () => {
    if (!user) {
      setArchives([]);
      return;
    }
    try {
      setLoadingArchives(true);
      const list = await fetchWorkbookArchivesFromFirestore(user.uid);
      setArchives(list);
    } catch (err) {
      console.error('Erreur chargement archives Cloud:', err);
    } finally {
      setLoadingArchives(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmCleanOpen(false);
      setConfirmDemoOpen(false);
      setPendingImportData(null);
      setImportError(null);
      setConfirmNextYearOpen(false);
      setConfirmRestoreArchiveId(null);
      setConfirmDeleteArchiveId(null);
    } else {
      setActiveTab(initialTab);
      setTargetNextYear(
        (data.generalInfo?.anneeReference || new Date().getFullYear()) + 1
      );
      loadArchives();
    }
  }, [isOpen, initialTab, data.generalInfo?.anneeReference, loadArchives]);

  const stats = {
    tasksCount: data.journalTaches?.length || 0,
    interventionsCount: data.interventions?.length || 0,
    equipmentCount: data.parcEquipements?.length || 0,
    softwareCount: data.logicielsLicences?.length || 0,
    consumablesCount: data.consommables?.length || 0,
    roiProjectsCount: data.bilanAnnuel?.projetsRoi?.length || 0,
  };

  const sizeBytes = estimateWorkbookSizeBytes(data);
  const sizeKo = Math.max(1, Math.round(sizeBytes / 1024));
  const capacityPct = Math.min(
    100,
    Math.round((sizeBytes / FIRESTORE_MAX_BYTES) * 100)
  );
  const isNearLimit = capacityPct >= 75;

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
      data.generalInfo.nomTechnicien === 'DUBOIS' || !data.generalInfo.nomTechnicien?.trim()
        ? 'RAZAFIMAHEFA'
        : data.generalInfo.nomTechnicien,
      data.generalInfo.prenomTechnicien === 'Alexandre' || !data.generalInfo.prenomTechnicien?.trim()
        ? 'Philibert'
        : data.generalInfo.prenomTechnicien,
      data.generalInfo.entreprise === 'GROUPE NEXUS TECHNOLOGIES & SERVICES' ||
        !data.generalInfo.entreprise?.trim()
        ? 'SOGEDIPROMA'
        : data.generalInfo.entreprise,
      data.generalInfo.responsableHierarchique === 'M. Marc LEFEBVRE'
        ? ''
        : data.generalInfo.responsableHierarchique
    );

    onUpdateData(cleanWorkbook);
    onShowToast('Cahier de suivi réinitialisé sur le profil de production SOGEDIPROMA.');
    setConfirmCleanOpen(false);
    onClose();
  };

  const handleConfirmReloadDemo = () => {
    onUpdateData(demoCahierData);
    setConfirmDemoOpen(false);
    onShowToast('Jeu de données de démonstration rechargé.');
    onClose();
  };

  const handleArchiveCurrentYearOnly = async () => {
    const annee = data.generalInfo?.anneeReference || new Date().getFullYear();
    exportFullBackupJson(data);
    if (user) {
      try {
        setIsArchiving(true);
        await archiveWorkbookYearToFirestore(
          user.uid,
          user.email || '',
          data,
          annee
        );
        await loadArchives();
        onShowToast(
          `Exercice ${annee} archivé dans Firestore Cloud et sauvegardé en JSON.`
        );
      } catch (err) {
        console.error('Erreur archivage Cloud:', err);
        onShowToast(
          `Sauvegarde JSON effectuée, mais l'archivage Cloud a échoué.`
        );
      } finally {
        setIsArchiving(false);
      }
    } else {
      onShowToast(
        `Archive JSON de l'exercice ${annee} téléchargée (mode hors ligne).`
      );
    }
  };

  const handleTransitionToNextYear = async () => {
    const currentYear = data.generalInfo?.anneeReference || new Date().getFullYear();
    try {
      setIsArchiving(true);
      exportFullBackupJson(data);
      if (user) {
        await archiveWorkbookYearToFirestore(
          user.uid,
          user.email || '',
          data,
          currentYear
        );
      }
      const nextData = createNextYearWorkbook(
        data,
        targetNextYear,
        carryOverAssets
      );
      onUpdateData(nextData);
      if (user) {
        await saveDataToCloud(nextData);
        await loadArchives();
      }
      setConfirmNextYearOpen(false);
      onShowToast(
        `Exercice ${currentYear} archivé. Passage réussi à l'année ${targetNextYear}.`
      );
      onClose();
    } catch (err) {
      console.error('Erreur bascule multi-année:', err);
      onShowToast('Erreur lors du passage à l’année suivante.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreCloudArchive = (archive: WorkbookArchiveRecord) => {
    onUpdateData(archive.data);
    setConfirmRestoreArchiveId(null);
    onShowToast(`Archive ${archive.annee} restaurée dans l'espace actif.`);
    onClose();
  };

  const handleDeleteCloudArchive = async (archiveId: string) => {
    if (!user) return;
    try {
      await deleteWorkbookArchiveFromFirestore(user.uid, archiveId);
      setArchives((prev) => prev.filter((a) => a.id !== archiveId));
      setConfirmDeleteArchiveId(null);
      onShowToast(`Archive Cloud ${archiveId} supprimée.`);
    } catch (err) {
      console.error('Erreur suppression archive Cloud:', err);
      onShowToast("Impossible de supprimer l'archive Cloud.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Centre de Gestion des Données, Sauvegarde & Multi-Année"
      subtitle="Export JSON, capacité Firestore, archivage annuel et restauration sécurisée."
      icon={<Database className="w-4 h-4" />}
      size="xl"
      footer={
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Fermer
        </button>
      }
    >
      <div className="space-y-6">
        {/* Sélecteur d'onglet */}
        <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'backup'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Sauvegarde, Cloud &amp; Multi-Année</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sogediproma')}
            className={`flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'sogediproma'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlugZap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Connecteur API SOGEDIPROMA</span>
          </button>
        </div>

        {activeTab === 'sogediproma' ? (
          <SogedipromaSyncPanel
            currentData={data}
            onApplySyncedData={(nextData, summaryMsg) => {
              if (onApplySogedipromaData) {
                onApplySogedipromaData(nextData);
              } else {
                onUpdateData(nextData);
              }
              onShowToast(summaryMsg);
              onClose();
            }}
          />
        ) : (
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
            Téléchargez une archive complète de votre cahier avant toute opération de nettoyage, clôture ou bascule annuelle.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className={primaryButtonClass}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger la sauvegarde (.json)</span>
            </button>
            {user && (
              <button
                type="button"
                onClick={handleArchiveCurrentYearOnly}
                disabled={isArchiving}
                className={secondaryButtonClass}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>
                  {isArchiving
                    ? 'Archivage en cours...'
                    : `Archiver ${data.generalInfo.anneeReference} dans le Cloud`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Étape 2 : État des données actuelles & Jauge capacité Cloud */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[13px] font-bold text-slate-900">
              2. Volume des données & Capacité Firestore
            </h4>
            <span
              className={`text-[11px] font-mono tabular-nums font-semibold ${
                isNearLimit ? 'text-amber-700' : 'text-slate-600'
              }`}
            >
              {sizeKo} Ko / 1 024 Ko ({capacityPct}%)
            </span>
          </div>

          {/* Barre de jauge capacité Firestore */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isNearLimit ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.max(2, capacityPct)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              {isNearLimit
                ? 'Attention : le cahier actif approche de la limite de 1 Mo par document Firestore. Pensez à clôturer et archiver l’exercice en fin d’année.'
                : 'Charge documentaire optimale pour la synchronisation temps réel Firestore.'}
            </p>
          </div>

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

        {/* Étape 3 : Clôture & Passage à l'année suivante (Multi-année) */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[13px] font-bold text-slate-900 flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-blue-600" />
              <span>3. Clôture annuelle &amp; Passage multi-année</span>
            </h4>
            <span className="text-[11px] font-mono tabular-nums text-slate-500">
              Exercice actif : {data.generalInfo.anneeReference}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Archivez l&apos;exercice {data.generalInfo.anneeReference} (JSON + sous-collection Cloud si connecté) et initialisez l&apos;exercice suivant en reconduisant vos référentiels durables.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 font-medium text-slate-700">
                <span>Nouvel exercice :</span>
                <input
                  type="number"
                  min={2020}
                  max={2100}
                  value={targetNextYear}
                  onChange={(e) =>
                    setTargetNextYear(parseInt(e.target.value, 10) || new Date().getFullYear() + 1)
                  }
                  className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono tabular-nums text-xs"
                />
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700">
                <input
                  type="checkbox"
                  checked={carryOverAssets}
                  onChange={(e) => setCarryOverAssets(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  Reconduire le socle actif (Parc CMDB, Licences, Réseau, Plan de Maintenance, Stocks)
                </span>
              </label>
            </div>

            {!confirmNextYearOpen ? (
              <button
                type="button"
                onClick={() => setConfirmNextYearOpen(true)}
                className={primaryButtonClass}
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Clôturer {data.generalInfo.anneeReference} et démarrer {targetNextYear}</span>
              </button>
            ) : (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Confirmer la clôture de {data.generalInfo.anneeReference} vers {targetNextYear} ?
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Une sauvegarde JSON complète sera téléchargée {user ? 'et archivée dans Firestore ' : ''}avant de réinitialiser le journal, les interventions et les rapports mensuels pour {targetNextYear}.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isArchiving}
                    onClick={handleTransitionToNextYear}
                    className={emeraldButtonClass}
                  >
                    {isArchiving ? 'Traitement...' : `Confirmer le passage à ${targetNextYear}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmNextYearOpen(false)}
                    className={secondaryButtonClass}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Liste des archives Cloud existantes */}
          {user && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span>Archives annuelles enregistrées dans Firestore</span>
                </div>
                {loadingArchives && (
                  <span className="text-[11px] text-slate-500">Chargement...</span>
                )}
              </div>

              {archives.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  Aucune archive annuelle Cloud pour l&apos;instant. Utilisez le bouton d&apos;archivage ci-dessus en fin d&apos;année.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {archives.map((arch) => (
                    <div
                      key={arch.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 font-mono tabular-nums">
                          Exercice {arch.annee}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          Archivé le{' '}
                          {arch.archivedAt
                            ? new Date(arch.archivedAt).toLocaleDateString('fr-FR')
                            : '—'}{' '}
                          · {arch.summaryStats.interventionsCount} interv. ·{' '}
                          {arch.summaryStats.tasksCount} tâches ·{' '}
                          {arch.summaryStats.parcCount} actifs
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {confirmRestoreArchiveId === arch.id ? (
                          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                            <span className="text-[11px] text-blue-900 font-medium">
                              Remplacer l&apos;actif ?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRestoreCloudArchive(arch)}
                              className="text-[11px] font-bold text-blue-700 hover:underline"
                            >
                              Oui
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRestoreArchiveId(null)}
                              className="text-[11px] text-slate-600 hover:underline"
                            >
                              Non
                            </button>
                          </div>
                        ) : confirmDeleteArchiveId === arch.id ? (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                            <span className="text-[11px] text-red-900 font-medium">
                              Supprimer ?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCloudArchive(arch.id)}
                              className="text-[11px] font-bold text-red-700 hover:underline"
                            >
                              Confirmer
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteArchiveId(null)}
                              className="text-[11px] text-slate-600 hover:underline"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                exportFullBackupJson(arch.data);
                                onShowToast(`Archive ${arch.annee} exportée en JSON.`);
                              }}
                              className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-[11px]"
                            >
                              JSON
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRestoreArchiveId(arch.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[11px]"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restaurer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteArchiveId(arch.id)}
                              title="Supprimer cette archive"
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Étape 4 : Nettoyage & Restauration */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h4 className="text-[13px] font-bold text-slate-900">
            4. Opérations de nettoyage &amp; restauration JSON
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
              Supprime les données d&apos;exemple tout en conservant la structure officielle, les 12 rapports mensuels, les 4 bilans trimestriels et vos informations de garde.
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
                  Cette action réinitialisera les tables à zéro pour accueillir vos données d&apos;entreprise.
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
        )}
      </div>
    </Modal>
  );
};
