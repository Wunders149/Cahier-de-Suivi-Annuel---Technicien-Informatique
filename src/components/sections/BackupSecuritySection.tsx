import React, { useMemo, useState } from 'react';
import { SuiviSauvegarde, IncidentSecurite } from '../../types/it-tracker';
import {
  ShieldCheck,
  HardDrive,
  ShieldAlert,
  Plus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import { CrudRowActions } from '../ui/CrudRowActions';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import {
  dangerButtonClass,
  fieldInputClass,
  fieldSelectClass,
  fieldTextareaClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/formStyles';

interface BackupSecuritySectionProps {
  sauvegardes: SuiviSauvegarde[];
  incidentsSecurite: IncidentSecurite[];
  onUpdateSauvegardes: (sauvegardes: SuiviSauvegarde[]) => void;
  onUpdateIncidentsSecurite: (incidents: IncidentSecurite[]) => void;
  onShowToast?: (msg: string) => void;
}

const DEFAULT_BACKUP = (): Partial<SuiviSauvegarde> => ({
  nomJob: '',
  serveurCible: '',
  typeSauvegarde: 'Quotidienne Incrémentale',
  horaireExecution: '23:00',
  tailleGo: 250,
  dureeExecutionMin: 35,
  destinationStockage: 'NAS Local + Cloud Immuable (Règle 3-2-1)',
  statut: 'Succès',
  dateDernierTestRestauration: new Date().toISOString().split('T')[0],
  resultatTestRestauration: 'Succès complet',
  observations: '',
});

const DEFAULT_SECURITY = (): Partial<IncidentSecurite> => ({
  dateHeure: new Date().toISOString().replace('T', ' ').slice(0, 16),
  typeIncident: 'Tentative Phishing',
  severite: 'Moyenne',
  postesConcernes: '',
  description: '',
  actionsMenées: '',
  statut: 'Clôturé',
  leconsApprises: '',
});

const getBackupStatusBadge = (statut: SuiviSauvegarde['statut']) => {
  switch (statut) {
    case 'Succès':
      return {
        classes: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      };
    case 'Avertissement':
      return {
        classes: 'text-amber-800 bg-amber-50 border-amber-200',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
      };
    case 'Échec':
      return {
        classes: 'text-red-800 bg-red-50 border-red-200',
        icon: <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />,
      };
    default:
      return {
        classes: 'text-slate-700 bg-slate-100 border-slate-300',
        icon: <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
      };
  }
};

const getRestoreResultTone = (res: SuiviSauvegarde['resultatTestRestauration']) => {
  switch (res) {
    case 'Succès complet':
      return 'text-emerald-700';
    case 'Succès partiel':
      return 'text-amber-700';
    case 'Échec':
      return 'text-red-700';
    default:
      return 'text-slate-600';
  }
};

const getSecurityStatusClasses = (statut: string) => {
  switch (statut) {
    case 'Clôturé':
      return 'bg-emerald-100 text-emerald-800';
    case 'Sous surveillance':
    case 'Contenu':
      return 'bg-amber-100 text-amber-800';
    case 'Rapporté au RSSI':
    case 'En investigation':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

export const BackupSecuritySection: React.FC<BackupSecuritySectionProps> = ({
  sauvegardes,
  incidentsSecurite,
  onUpdateSauvegardes,
  onUpdateIncidentsSecurite,
  onShowToast,
}) => {
  // 1. CRUD Jobs de sauvegarde
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [editingBackupId, setEditingBackupId] = useState<string | null>(null);
  const [isDuplicatingBackup, setIsDuplicatingBackup] = useState(false);
  const [formBackup, setFormBackup] = useState<Partial<SuiviSauvegarde>>(DEFAULT_BACKUP);
  const [inspectingBackupId, setInspectingBackupId] = useState<string | null>(null);
  const [deletingBackupId, setDeletingBackupId] = useState<string | null>(null);

  // 2. CRUD Incidents de sécurité
  const [secModalOpen, setSecModalOpen] = useState(false);
  const [editingSecId, setEditingSecId] = useState<string | null>(null);
  const [isDuplicatingSec, setIsDuplicatingSec] = useState(false);
  const [formSec, setFormSec] = useState<Partial<IncidentSecurite>>(DEFAULT_SECURITY);
  const [inspectingSecId, setInspectingSecId] = useState<string | null>(null);
  const [deletingSecId, setDeletingSecId] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const inspectingBackup = useMemo(
    () => sauvegardes.find((b) => b.id === inspectingBackupId) || null,
    [sauvegardes, inspectingBackupId]
  );

  const deletingBackup = useMemo(
    () => sauvegardes.find((b) => b.id === deletingBackupId) || null,
    [sauvegardes, deletingBackupId]
  );

  const inspectingSec = useMemo(
    () => incidentsSecurite.find((s) => s.id === inspectingSecId) || null,
    [incidentsSecurite, inspectingSecId]
  );

  const deletingSec = useMemo(
    () => incidentsSecurite.find((s) => s.id === deletingSecId) || null,
    [incidentsSecurite, deletingSecId]
  );

  // Handlers Sauvegardes
  const openCreateBackup = () => {
    setEditingBackupId(null);
    setIsDuplicatingBackup(false);
    setFormBackup(DEFAULT_BACKUP());
    setBackupModalOpen(true);
  };

  const openEditBackup = (job: SuiviSauvegarde) => {
    setEditingBackupId(job.id);
    setIsDuplicatingBackup(false);
    setFormBackup({ ...job });
    setBackupModalOpen(true);
  };

  const openDuplicateBackup = (job: SuiviSauvegarde) => {
    setEditingBackupId(null);
    setIsDuplicatingBackup(true);
    setFormBackup({
      ...job,
      id: undefined,
      nomJob: `${job.nomJob} (copie)`,
    });
    setBackupModalOpen(true);
  };

  const handleSaveBackup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBackup.nomJob?.trim()) return;

    const payload: SuiviSauvegarde = {
      id: editingBackupId || `BAK-${Date.now()}`,
      nomJob: formBackup.nomJob.trim(),
      serveurCible: formBackup.serveurCible?.trim() || 'Serveur principal',
      typeSauvegarde:
        (formBackup.typeSauvegarde as SuiviSauvegarde['typeSauvegarde']) ||
        'Quotidienne Incrémentale',
      horaireExecution: formBackup.horaireExecution?.trim() || '23:00',
      tailleGo: Number(formBackup.tailleGo) || 0,
      dureeExecutionMin: Number(formBackup.dureeExecutionMin) || 0,
      destinationStockage: formBackup.destinationStockage?.trim() || 'NAS Local + Cloud 3-2-1',
      statut: (formBackup.statut as SuiviSauvegarde['statut']) || 'Succès',
      dateDernierTestRestauration:
        formBackup.dateDernierTestRestauration?.trim() ||
        new Date().toISOString().split('T')[0],
      resultatTestRestauration:
        (formBackup.resultatTestRestauration as SuiviSauvegarde['resultatTestRestauration']) ||
        'À planifier',
      observations: formBackup.observations?.trim() || '',
    };

    if (editingBackupId) {
      onUpdateSauvegardes(sauvegardes.map((b) => (b.id === editingBackupId ? payload : b)));
      notify(`Job de sauvegarde « ${payload.nomJob} » mis à jour.`);
    } else {
      onUpdateSauvegardes([...sauvegardes, payload]);
      notify(
        isDuplicatingBackup
          ? `Job de sauvegarde « ${payload.nomJob} » dupliqué.`
          : `Job de sauvegarde « ${payload.nomJob} » enregistré.`
      );
    }

    setBackupModalOpen(false);
    setEditingBackupId(null);
    setIsDuplicatingBackup(false);
  };

  const handleConfirmDeleteBackup = () => {
    if (!deletingBackupId) return;
    onUpdateSauvegardes(sauvegardes.filter((b) => b.id !== deletingBackupId));
    if (inspectingBackupId === deletingBackupId) setInspectingBackupId(null);
    setDeletingBackupId(null);
    notify('Job de sauvegarde supprimé.');
  };

  // Handlers Incidents Sécurité
  const openCreateSec = () => {
    setEditingSecId(null);
    setIsDuplicatingSec(false);
    setFormSec(DEFAULT_SECURITY());
    setSecModalOpen(true);
  };

  const openEditSec = (sec: IncidentSecurite) => {
    setEditingSecId(sec.id);
    setIsDuplicatingSec(false);
    setFormSec({ ...sec });
    setSecModalOpen(true);
  };

  const openDuplicateSec = (sec: IncidentSecurite) => {
    setEditingSecId(null);
    setIsDuplicatingSec(true);
    setFormSec({
      ...sec,
      id: undefined,
      dateHeure: new Date().toISOString().replace('T', ' ').slice(0, 16),
      statut: 'Sous surveillance',
    });
    setSecModalOpen(true);
  };

  const handleSaveSec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSec.description?.trim()) return;

    const payload: IncidentSecurite = {
      id: editingSecId || `SEC-${Date.now()}`,
      dateHeure:
        formSec.dateHeure?.trim() || new Date().toISOString().replace('T', ' ').slice(0, 16),
      typeIncident:
        (formSec.typeIncident as IncidentSecurite['typeIncident']) || 'Tentative Phishing',
      severite: (formSec.severite as IncidentSecurite['severite']) || 'Moyenne',
      postesConcernes: formSec.postesConcernes?.trim() || 'Tout le parc',
      description: formSec.description.trim(),
      actionsMenées: formSec.actionsMenées?.trim() || "Mesures d'endiguement prises.",
      statut: (formSec.statut as IncidentSecurite['statut']) || 'Clôturé',
      leconsApprises: formSec.leconsApprises?.trim() || 'Sensibilisation continue.',
    };

    if (editingSecId) {
      onUpdateIncidentsSecurite(
        incidentsSecurite.map((s) => (s.id === editingSecId ? payload : s))
      );
      notify('Incident de sécurité mis à jour.');
    } else {
      onUpdateIncidentsSecurite([payload, ...incidentsSecurite]);
      notify(
        isDuplicatingSec
          ? 'Incident de sécurité dupliqué.'
          : 'Incident de sécurité consigné au registre PSSI.'
      );
    }

    setSecModalOpen(false);
    setEditingSecId(null);
    setIsDuplicatingSec(false);
  };

  const handleConfirmDeleteSec = () => {
    if (!deletingSecId) return;
    onUpdateIncidentsSecurite(incidentsSecurite.filter((s) => s.id !== deletingSecId));
    if (inspectingSecId === deletingSecId) setInspectingSecId(null);
    setDeletingSecId(null);
    notify('Incident de sécurité supprimé.');
  };

  const openTemplateBackup = (preset: Partial<SuiviSauvegarde>) => {
    setEditingBackupId(null);
    setIsDuplicatingBackup(false);
    setFormBackup({
      ...DEFAULT_BACKUP(),
      ...preset,
    });
    setBackupModalOpen(true);
  };

  const openTemplateSecurity = (preset: Partial<IncidentSecurite>) => {
    setEditingSecId(null);
    setIsDuplicatingSec(false);
    setFormSec({
      ...DEFAULT_SECURITY(),
      ...preset,
    });
    setSecModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
              9
            </span>
            <span>Sauvegarde &amp; Sécurité Informatique (PSSI &amp; PRA)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Application stricte de la règle 3-2-1, tests de restauration périodiques, protection EDR et registre cybersécurité.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openCreateBackup} className={primaryButtonClass}>
            <Plus className="w-4 h-4" />
            <span>Ajouter un Job Sauvegarde</span>
          </button>
          <button type="button" onClick={openCreateSec} className={dangerButtonClass}>
            <Plus className="w-4 h-4" />
            <span>Consigner un Incident</span>
          </button>
        </div>
      </div>

      {/* Modèles rapides SOGEDIPROMA (PRA & Sécurité) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 mr-1">
          <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          Modèles rapides :
        </span>
        <button
          type="button"
          onClick={() =>
            openTemplateBackup({
              nomJob: 'Sauvegarde NAS Règle 3-2-1 — Données Partagées',
              serveurCible: 'NAS-SOGEDIPROMA',
              typeSauvegarde: 'Quotidienne Incrémentale',
              horaireExecution: '22:30',
              tailleGo: 320,
              dureeExecutionMin: 40,
              destinationStockage: 'NAS Synology RAID + Disque Externe Hors-Site (3-2-1)',
              statut: 'Succès',
              resultatTestRestauration: 'Succès complet',
              observations: 'Copie quotidienne vérifiée avec rotation hebdomadaire sur support externe.',
            })
          }
          className={secondaryButtonClass}
        >
          Backup NAS 3-2-1
        </button>
        <button
          type="button"
          onClick={() =>
            openTemplateBackup({
              nomJob: 'Dump Base Odoo ERP / PostgreSQL',
              serveurCible: 'SRV-SOGEDIPROMA-APP',
              typeSauvegarde: 'Hebdomadaire Différentielle',
              horaireExecution: '23:30',
              tailleGo: 45,
              dureeExecutionMin: 18,
              destinationStockage: 'NAS Local + Archive Cloud Chiffrée',
              statut: 'Succès',
              resultatTestRestauration: 'Succès complet',
              observations: 'Export pg_dump + filestore Odoo vérifié sans erreur.',
            })
          }
          className={secondaryButtonClass}
        >
          Dump Odoo PostgreSQL
        </button>
        <button
          type="button"
          onClick={() =>
            openTemplateBackup({
              nomJob: 'Exercice Trimestriel de Restauration PRA',
              serveurCible: 'Serveur Fichiers & ERP',
              typeSauvegarde: 'Mensuelle Complète',
              horaireExecution: '14:00',
              tailleGo: 120,
              dureeExecutionMin: 30,
              destinationStockage: 'Environnement Bac à Sable PRA',
              statut: 'Succès',
              resultatTestRestauration: 'Succès complet',
              observations: 'Restauration testée : intégrité fichiers et démarrage base validés (RTO < 45 min).',
            })
          }
          className={secondaryButtonClass}
        >
          Test Restauration PRA
        </button>
        <button
          type="button"
          onClick={() =>
            openTemplateSecurity({
              typeIncident: 'Alerte EDR / Malware',
              severite: 'Faible',
              postesConcernes: 'Parc Postes & Pare-feu SOGEDIPROMA',
              description: 'Contrôle périodique signatures Antivirus/EDR, pare-feu et mises à jour Windows.',
              actionsMenées: 'Vérification consoles de sécurité et mise à jour des postes détectés.',
              statut: 'Clôturé',
              leconsApprises: 'Audit de conformité préventif conforme PSSI.',
            })
          }
          className={secondaryButtonClass}
        >
          Contrôle Antivirus / Firewall
        </button>
        <button
          type="button"
          onClick={() =>
            openTemplateSecurity({
              typeIncident: 'Tentative Phishing',
              severite: 'Moyenne',
              postesConcernes: 'Messagerie Collaborateur',
              description: 'Email suspect signalé avec pièce jointe ou lien frauduleux.',
              actionsMenées: 'Mise en quarantaine du message, blocage domaine expéditeur et sensibilisation utilisateur.',
              statut: 'Sous surveillance',
              leconsApprises: 'Rappel de vigilance sur l’authentification des expéditeurs externes.',
            })
          }
          className={secondaryButtonClass}
        >
          Alerte Phishing
        </button>
      </div>

      {/* Cartouche Règle 3-2-1 de sauvegarde */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Conformité à la Règle d&apos;Or 3-2-1-1-0 des Sauvegardes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <span className="text-emerald-300 font-bold block text-sm">3 Exemplaires de données</span>
            <p className="text-slate-300">
              1 jeu de production + 1 sauvegarde primaire sur NAS local + 1 copie externalisée.
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <span className="text-emerald-300 font-bold block text-sm">2 Médias distincts</span>
            <p className="text-slate-300">
              Stockage flash NVMe/SSD pour la rapidité de restauration + Baie NAS RAID 6 dédiée.
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
            <span className="text-emerald-300 font-bold block text-sm">1 Copie Hors-Site Immuable</span>
            <p className="text-slate-300">
              Stockage Cloud S3 verrouillé en écriture (WORM Object Lock) invulnérable aux rançongiciels.
            </p>
          </div>
        </div>
      </div>

      {/* Tableau des jobs de sauvegarde */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <span>
              Suivi Quotidien des Sauvegardes &amp; Tests de Restauration ({sauvegardes.length})
            </span>
          </h3>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 font-semibold">Nom du Job &amp; Cible</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Type de Sauvegarde</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Horaire &amp; Durée</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Taille</th>
                  <th className="p-3 font-semibold">Destination (Règle 3-2-1)</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Dernier Test PRA</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Statut</th>
                  <th className="p-3 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {sauvegardes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-slate-600 font-medium">
                          Aucun job de sauvegarde consigné.
                        </p>
                        <button
                          type="button"
                          onClick={openCreateBackup}
                          className={primaryButtonClass}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter un job de sauvegarde</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sauvegardes.map((s) => {
                    const badge = getBackupStatusBadge(s.statut);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 align-top whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setInspectingBackupId(s.id)}
                            className="text-left group"
                          >
                            <strong className="text-blue-900 group-hover:text-blue-700 font-bold block">
                              {s.nomJob}
                            </strong>
                          </button>
                          <span className="text-[11px] text-slate-500">{s.serveurCible}</span>
                        </td>
                        <td className="p-3 align-top whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                            {s.typeSauvegarde}
                          </span>
                        </td>
                        <td className="p-3 align-top whitespace-nowrap text-[11px] font-mono tabular-nums">
                          <span className="text-slate-900 font-medium block">
                            {s.horaireExecution}
                          </span>
                          <span className="text-slate-400">Durée : {s.dureeExecutionMin} min</span>
                        </td>
                        <td className="p-3 align-top whitespace-nowrap font-bold font-mono tabular-nums text-slate-800">
                          {s.tailleGo} Go
                        </td>
                        <td className="p-3 align-top text-[11px] max-w-xs text-slate-700">
                          {s.destinationStockage}
                        </td>
                        <td className="p-3 align-top whitespace-nowrap text-[11px]">
                          <span className="text-slate-800 font-mono tabular-nums font-medium block">
                            {s.dateDernierTestRestauration}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${getRestoreResultTone(
                              s.resultatTestRestauration
                            )}`}
                          >
                            {s.resultatTestRestauration}
                          </span>
                        </td>
                        <td className="p-3 align-top whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold border ${badge.classes}`}
                          >
                            {badge.icon}
                            {s.statut}
                          </span>
                        </td>
                        <td className="p-3 align-top text-right whitespace-nowrap">
                          <CrudRowActions
                            onView={() => setInspectingBackupId(s.id)}
                            onEdit={() => openEditBackup(s)}
                            onDuplicate={() => openDuplicateBackup(s)}
                            onDelete={() => setDeletingBackupId(s.id)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Job de sauvegarde (Create / Edit / Duplicate) */}
      <Modal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        title={
          editingBackupId
            ? 'Modifier le Job de Sauvegarde'
            : isDuplicatingBackup
            ? 'Dupliquer un Job de Sauvegarde'
            : 'Ajouter un Job de Sauvegarde'
        }
        subtitle="Planification des sauvegardes 3-2-1 et suivi des tests de restauration PRA."
        icon={<HardDrive className="w-4 h-4" />}
        size="lg"
        onSubmit={handleSaveBackup}
        footer={
          <>
            <button
              type="button"
              onClick={() => setBackupModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              {editingBackupId ? 'Enregistrer les modifications' : 'Enregistrer le job'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Identification & Planification">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Nom du job" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: Veeam-VM-ERP-Daily"
                  value={formBackup.nomJob || ''}
                  onChange={(e) => setFormBackup({ ...formBackup, nomJob: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Serveur / Périmètre cible" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: SRV-ERP-01 / Hyper-V Cluster"
                  value={formBackup.serveurCible || ''}
                  onChange={(e) => setFormBackup({ ...formBackup, serveurCible: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <FormField label="Type de sauvegarde" className="sm:col-span-2">
                <select
                  value={formBackup.typeSauvegarde || 'Quotidienne Incrémentale'}
                  onChange={(e) =>
                    setFormBackup({
                      ...formBackup,
                      typeSauvegarde: e.target.value as SuiviSauvegarde['typeSauvegarde'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Quotidienne Incrémentale">Quotidienne Incrémentale</option>
                  <option value="Hebdomadaire Différentielle">Hebdomadaire Différentielle</option>
                  <option value="Mensuelle Complète">Mensuelle Complète</option>
                  <option value="Snapshot Cloud">Snapshot Cloud</option>
                </select>
              </FormField>
              <FormField label="Horaire d'exécution">
                <input
                  type="text"
                  placeholder="Ex: 23:00"
                  value={formBackup.horaireExecution || ''}
                  onChange={(e) =>
                    setFormBackup({ ...formBackup, horaireExecution: e.target.value })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Statut d'exécution">
                <select
                  value={formBackup.statut || 'Succès'}
                  onChange={(e) =>
                    setFormBackup({
                      ...formBackup,
                      statut: e.target.value as SuiviSauvegarde['statut'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Succès">Succès</option>
                  <option value="Avertissement">Avertissement</option>
                  <option value="Échec">Échec</option>
                  <option value="Non exécuté">Non exécuté</option>
                </select>
              </FormField>
            </div>
          </FormSection>

          <FormSection title="2. Stockage & Test de restauration (PRA)" separated>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Volume sauvegardé (Go)">
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={formBackup.tailleGo ?? 0}
                  onChange={(e) =>
                    setFormBackup({ ...formBackup, tailleGo: parseFloat(e.target.value) || 0 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Durée (minutes)">
                <input
                  type="number"
                  min={0}
                  value={formBackup.dureeExecutionMin ?? 0}
                  onChange={(e) =>
                    setFormBackup({
                      ...formBackup,
                      dureeExecutionMin: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Date dernier test PRA">
                <input
                  type="date"
                  value={formBackup.dateDernierTestRestauration || ''}
                  onChange={(e) =>
                    setFormBackup({
                      ...formBackup,
                      dateDernierTestRestauration: e.target.value,
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Destination stockage (Règle 3-2-1)">
                <input
                  type="text"
                  placeholder="Ex: NAS Local Synology + S3 Immuable"
                  value={formBackup.destinationStockage || ''}
                  onChange={(e) =>
                    setFormBackup({ ...formBackup, destinationStockage: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Résultat du test de restauration">
                <select
                  value={formBackup.resultatTestRestauration || 'Succès complet'}
                  onChange={(e) =>
                    setFormBackup({
                      ...formBackup,
                      resultatTestRestauration: e.target
                        .value as SuiviSauvegarde['resultatTestRestauration'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Succès complet">Succès complet</option>
                  <option value="Succès partiel">Succès partiel</option>
                  <option value="Échec">Échec</option>
                  <option value="À planifier">À planifier</option>
                </select>
              </FormField>
            </div>

            <FormField label="Observations techniques">
              <textarea
                rows={2}
                placeholder="Temps de restauration constaté (RTO), point d'attention..."
                value={formBackup.observations || ''}
                onChange={(e) => setFormBackup({ ...formBackup, observations: e.target.value })}
                className={fieldTextareaClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Consultation détaillée Job de sauvegarde */}
      <Modal
        isOpen={Boolean(inspectingBackup)}
        onClose={() => setInspectingBackupId(null)}
        title={inspectingBackup?.nomJob || 'Détail Job de Sauvegarde'}
        subtitle={
          inspectingBackup
            ? `${inspectingBackup.serveurCible} · ${inspectingBackup.typeSauvegarde}`
            : undefined
        }
        icon={<HardDrive className="w-4 h-4" />}
        size="md"
        footer={
          inspectingBackup && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingBackupId(inspectingBackup.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                Supprimer
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingBackup;
                    setInspectingBackupId(null);
                    openDuplicateBackup(target);
                  }}
                  className={secondaryButtonClass}
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingBackup;
                    setInspectingBackupId(null);
                    openEditBackup(target);
                  }}
                  className={primaryButtonClass}
                >
                  Modifier
                </button>
              </div>
            </div>
          )
        }
      >
        {inspectingBackup && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500">Volume / Durée</div>
                <div className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                  {inspectingBackup.tailleGo} Go · {inspectingBackup.dureeExecutionMin} min
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Horaire</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {inspectingBackup.horaireExecution}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Test PRA</div>
                <div
                  className={`font-semibold mt-0.5 ${getRestoreResultTone(
                    inspectingBackup.resultatTestRestauration
                  )}`}
                >
                  {inspectingBackup.resultatTestRestauration} ({inspectingBackup.dateDernierTestRestauration})
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Destination de stockage
              </h4>
              <p className="text-slate-800">{inspectingBackup.destinationStockage}</p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Observations
              </h4>
              <p className="text-slate-700 p-3 rounded-lg bg-slate-50 border border-slate-200 whitespace-pre-line">
                {inspectingBackup.observations || 'Aucune observation particulière.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingBackup)}
        onClose={() => setDeletingBackupId(null)}
        onConfirm={handleConfirmDeleteBackup}
        title="Supprimer ce job de sauvegarde ?"
        itemLabel={deletingBackup?.nomJob || ''}
        itemMeta={
          deletingBackup
            ? `${deletingBackup.serveurCible} · ${deletingBackup.typeSauvegarde}`
            : undefined
        }
      />

      {/* Modal Incident de sécurité (Create / Edit / Duplicate) */}
      <Modal
        isOpen={secModalOpen}
        onClose={() => setSecModalOpen(false)}
        title={
          editingSecId
            ? "Modifier l'Incident de Cybersécurité"
            : isDuplicatingSec
            ? "Dupliquer l'Incident de Cybersécurité"
            : 'Consigner un Incident de Cybersécurité'
        }
        subtitle="Traçabilité PSSI, mesures d'endiguement et retour d'expérience."
        icon={<ShieldAlert className="w-4 h-4" />}
        tone="danger"
        size="lg"
        onSubmit={handleSaveSec}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSecModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={dangerButtonClass}>
              {editingSecId ? 'Enregistrer les modifications' : "Enregistrer l'incident"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Qualification de l'événement">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Date et heure">
                <input
                  type="text"
                  value={formSec.dateHeure || ''}
                  onChange={(e) => setFormSec({ ...formSec, dateHeure: e.target.value })}
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Type d'incident">
                <select
                  value={formSec.typeIncident || 'Tentative Phishing'}
                  onChange={(e) =>
                    setFormSec({
                      ...formSec,
                      typeIncident: e.target.value as IncidentSecurite['typeIncident'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Tentative Phishing">Tentative Phishing</option>
                  <option value="Alerte EDR / Malware">Alerte EDR / Malware</option>
                  <option value="Tentative Brute Force">Tentative Brute Force</option>
                  <option value="Périphérique USB non autorisé">
                    Périphérique USB non autorisé
                  </option>
                  <option value="Perte / Vol matériel">Perte / Vol matériel</option>
                  <option value="Faille vulnérabilité critique">
                    Faille vulnérabilité critique
                  </option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Sévérité">
                <select
                  value={formSec.severite || 'Moyenne'}
                  onChange={(e) =>
                    setFormSec({
                      ...formSec,
                      severite: e.target.value as IncidentSecurite['severite'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Faible">Faible</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Élevée">Élevée</option>
                  <option value="Critique">Critique</option>
                </select>
              </FormField>
              <FormField label="Statut">
                <select
                  value={formSec.statut || 'Clôturé'}
                  onChange={(e) =>
                    setFormSec({
                      ...formSec,
                      statut: e.target.value as IncidentSecurite['statut'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Clôturé">Clôturé</option>
                  <option value="Sous surveillance">Sous surveillance</option>
                  <option value="Rapporté au RSSI">Rapporté au RSSI</option>
                </select>
              </FormField>
              <FormField label="Postes / Comptes concernés">
                <input
                  type="text"
                  placeholder="Ex: PARC-PC-023, RH"
                  value={formSec.postesConcernes || ''}
                  onChange={(e) => setFormSec({ ...formSec, postesConcernes: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="2. Analyse & Endiguement" separated>
            <FormField label="Description de la menace / incident" required>
              <textarea
                rows={2}
                required
                placeholder="Détail de l'événement détecté..."
                value={formSec.description || ''}
                onChange={(e) => setFormSec({ ...formSec, description: e.target.value })}
                className={fieldTextareaClass}
              />
            </FormField>

            <FormField label="Actions immédiates menées (Endiguement)" required>
              <textarea
                rows={2}
                required
                placeholder="Isolation réseau, purge, réinitialisation de mot de passe..."
                value={formSec.actionsMenées || ''}
                onChange={(e) => setFormSec({ ...formSec, actionsMenées: e.target.value })}
                className={fieldTextareaClass}
              />
            </FormField>

            <FormField label="Leçons apprises & Recommandations">
              <input
                type="text"
                placeholder="Sensibilisation utilisateur, durcissement règle EDR..."
                value={formSec.leconsApprises || ''}
                onChange={(e) => setFormSec({ ...formSec, leconsApprises: e.target.value })}
                className={fieldInputClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Consultation détaillée Incident Sécurité */}
      <Modal
        isOpen={Boolean(inspectingSec)}
        onClose={() => setInspectingSecId(null)}
        title={inspectingSec?.typeIncident || 'Détail Incident Sécurité'}
        subtitle={
          inspectingSec
            ? `${inspectingSec.dateHeure} · Sévérité ${inspectingSec.severite} · ${inspectingSec.postesConcernes}`
            : undefined
        }
        icon={<ShieldAlert className="w-4 h-4" />}
        tone="danger"
        size="md"
        footer={
          inspectingSec && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingSecId(inspectingSec.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                Supprimer
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingSec;
                    setInspectingSecId(null);
                    openDuplicateSec(target);
                  }}
                  className={secondaryButtonClass}
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingSec;
                    setInspectingSecId(null);
                    openEditSec(target);
                  }}
                  className={primaryButtonClass}
                >
                  Modifier
                </button>
              </div>
            </div>
          )
        }
      >
        {inspectingSec && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[11px] text-slate-500 block">Périmètre concerné</span>
                <strong className="text-slate-900">{inspectingSec.postesConcernes}</strong>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded font-bold ${getSecurityStatusClasses(
                  inspectingSec.statut
                )}`}
              >
                {inspectingSec.statut}
              </span>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Description de la menace
              </h4>
              <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                {inspectingSec.description}
              </p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Actions d&apos;endiguement menées
              </h4>
              <p className="text-emerald-950 p-3 rounded-lg bg-emerald-50 border border-emerald-200 whitespace-pre-line">
                {inspectingSec.actionsMenées}
              </p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Leçons apprises &amp; Durcissement
              </h4>
              <p className="text-slate-700 italic">
                {inspectingSec.leconsApprises || 'Aucune note complémentaire.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingSec)}
        onClose={() => setDeletingSecId(null)}
        onConfirm={handleConfirmDeleteSec}
        title="Supprimer cet incident de sécurité ?"
        itemLabel={deletingSec?.description || ''}
        itemMeta={
          deletingSec
            ? `${deletingSec.dateHeure} · ${deletingSec.typeIncident} (${deletingSec.severite})`
            : undefined
        }
      />

      {/* Registre des incidents de cybersécurité */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <span>
            Registre des Incidents de Sécurité &amp; Actions de Remédiation ({incidentsSecurite.length})
          </span>
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 font-semibold whitespace-nowrap">Date &amp; Heure</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Type &amp; Sévérité</th>
                  <th className="p-3 font-semibold">Périmètre / Postes</th>
                  <th className="p-3 font-semibold">Description de la Menace</th>
                  <th className="p-3 font-semibold">Actions Menées</th>
                  <th className="p-3 font-semibold">Statut &amp; Leçons</th>
                  <th className="p-3 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {incidentsSecurite.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-slate-600 font-medium">
                          Aucun incident de cybersécurité enregistré.
                        </p>
                        <button
                          type="button"
                          onClick={openCreateSec}
                          className={secondaryButtonClass}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Consigner un incident</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  incidentsSecurite.map((sec) => (
                    <tr key={sec.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums font-medium text-slate-900">
                        {sec.dateHeure}
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectingSecId(sec.id)}
                          className="text-left hover:text-blue-700"
                        >
                          <strong className="text-slate-900 block font-semibold">
                            {sec.typeIncident}
                          </strong>
                        </button>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            sec.severite === 'Critique'
                              ? 'bg-red-100 text-red-800'
                              : sec.severite === 'Élevée'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          Sévérité {sec.severite}
                        </span>
                      </td>
                      <td className="p-3 align-top text-[11px] text-slate-800 font-medium max-w-[140px]">
                        {sec.postesConcernes}
                      </td>
                      <td className="p-3 align-top text-slate-700 max-w-xs">{sec.description}</td>
                      <td className="p-3 align-top text-emerald-900 bg-emerald-50/40 max-w-xs">
                        {sec.actionsMenées}
                      </td>
                      <td className="p-3 align-top text-[11px]">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold mb-1 ${getSecurityStatusClasses(
                            sec.statut
                          )}`}
                        >
                          {sec.statut}
                        </span>
                        <p className="text-slate-500 italic">{sec.leconsApprises}</p>
                      </td>
                      <td className="p-3 align-top text-right whitespace-nowrap">
                        <CrudRowActions
                          onView={() => setInspectingSecId(sec.id)}
                          onEdit={() => openEditSec(sec)}
                          onDuplicate={() => openDuplicateSec(sec)}
                          onDelete={() => setDeletingSecId(sec.id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
