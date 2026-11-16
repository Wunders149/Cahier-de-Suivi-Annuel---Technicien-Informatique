import React from 'react';
import { CahierSuiviData } from '../types/it-tracker';
import { Modal } from './ui/Modal';
import {
  Cloud,
  HardDrive,
  GitMerge,
  Download,
  AlertTriangle,
} from 'lucide-react';
import {
  emeraldButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui/formStyles';
import { exportFullBackupJson } from '../utils/backupService';

export interface CloudConflictState {
  localData: CahierSuiviData;
  cloudData: CahierSuiviData;
  localUpdatedAt: string | null;
  cloudUpdatedAt: string;
}

interface CloudConflictModalProps {
  conflict: CloudConflictState | null;
  onResolveMerge: () => void;
  onResolveKeepLocal: () => void;
  onResolveLoadCloud: () => void;
  onShowToast: (msg: string) => void;
}

function summarizeWorkbook(d: CahierSuiviData) {
  return {
    annee: d.generalInfo?.anneeReference || new Date().getFullYear(),
    interventions: d.interventions?.length || 0,
    taches: d.journalTaches?.length || 0,
    parc: d.parcEquipements?.length || 0,
    licences: d.logicielsLicences?.length || 0,
    maintenances: d.maintenances?.length || 0,
    consommables: d.consommables?.length || 0,
  };
}

function formatIsoFr(iso?: string | null): string {
  if (!iso) return 'Non horodatée';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CloudConflictModal: React.FC<CloudConflictModalProps> = ({
  conflict,
  onResolveMerge,
  onResolveKeepLocal,
  onResolveLoadCloud,
  onShowToast,
}) => {
  if (!conflict) return null;

  const localStats = summarizeWorkbook(conflict.localData);
  const cloudStats = summarizeWorkbook(conflict.cloudData);

  const handleBackupLocalFirst = () => {
    exportFullBackupJson(conflict.localData);
    onShowToast('Sauvegarde JSON locale téléchargée par sécurité.');
  };

  return (
    <Modal
      isOpen={Boolean(conflict)}
      onClose={onResolveMerge}
      closeOnBackdrop={false}
      title="Conflit de synchronisation détecté (Local vs Cloud)"
      subtitle="Des modifications locales non synchronisées coexistent avec une version distante différente dans Firestore."
      icon={<AlertTriangle className="w-4 h-4" />}
      tone="amber"
      size="xl"
      footer={
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <button
            type="button"
            onClick={handleBackupLocalFirst}
            className={secondaryButtonClass}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sauvegarde JSON préalable</span>
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onResolveLoadCloud}
              className={secondaryButtonClass}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Charger version Cloud</span>
            </button>
            <button
              type="button"
              onClick={onResolveKeepLocal}
              className={primaryButtonClass}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Garder ma version locale</span>
            </button>
            <button
              type="button"
              onClick={onResolveMerge}
              className={emeraldButtonClass}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Fusionner sans perte</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
          La synchronisation automatique est temporairement mise en pause pour éviter tout écrasement silencieux. Choisissez comment concilier les deux versions ci-dessous.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Version Locale */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span>Version Locale (cet appareil)</span>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                Exercice {localStats.annee}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Dernière modification :{' '}
              <strong className="text-slate-800 font-mono tabular-nums">
                {formatIsoFr(conflict.localUpdatedAt)}
              </strong>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between">
                <span className="text-slate-500">Interventions</span>
                <strong className="font-mono tabular-nums text-slate-900">{localStats.interventions}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between">
                <span className="text-slate-500">Journal</span>
                <strong className="font-mono tabular-nums text-slate-900">{localStats.taches}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between">
                <span className="text-slate-500">Parc CMDB</span>
                <strong className="font-mono tabular-nums text-slate-900">{localStats.parc}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between">
                <span className="text-slate-500">Licences</span>
                <strong className="font-mono tabular-nums text-slate-900">{localStats.licences}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between">
                <span className="text-slate-500">Maintenances</span>
                <strong className="font-mono tabular-nums text-slate-900">{localStats.maintenances}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200 flex justify-between">
                <span className="text-slate-500">Consommables</span>
                <strong className="font-mono tabular-nums text-slate-900">{localStats.consommables}</strong>
              </div>
            </div>
          </div>

          {/* Version Cloud */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-blue-200/80 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Cloud className="w-4 h-4 text-emerald-600" />
                <span>Version Cloud (Firestore)</span>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-blue-700">
                Exercice {cloudStats.annee}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Dernière synchro Cloud :{' '}
              <strong className="text-slate-800 font-mono tabular-nums">
                {formatIsoFr(conflict.cloudUpdatedAt)}
              </strong>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-blue-100 flex justify-between">
                <span className="text-slate-500">Interventions</span>
                <strong className="font-mono tabular-nums text-slate-900">{cloudStats.interventions}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 flex justify-between">
                <span className="text-slate-500">Journal</span>
                <strong className="font-mono tabular-nums text-slate-900">{cloudStats.taches}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 flex justify-between">
                <span className="text-slate-500">Parc CMDB</span>
                <strong className="font-mono tabular-nums text-slate-900">{cloudStats.parc}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 flex justify-between">
                <span className="text-slate-500">Licences</span>
                <strong className="font-mono tabular-nums text-slate-900">{cloudStats.licences}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 flex justify-between">
                <span className="text-slate-500">Maintenances</span>
                <strong className="font-mono tabular-nums text-slate-900">{cloudStats.maintenances}</strong>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-100 flex justify-between">
                <span className="text-slate-500">Consommables</span>
                <strong className="font-mono tabular-nums text-slate-900">{cloudStats.consommables}</strong>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          <strong className="text-slate-700">Option recommandée (« Fusionner sans perte ») :</strong> réunit les enregistrements des deux sources par identifiant unique en conservant vos modifications locales récentes tout en ajoutant les fiches présentes uniquement dans le Cloud.
        </p>
      </div>
    </Modal>
  );
};
