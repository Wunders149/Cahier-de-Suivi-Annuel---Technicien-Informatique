import React, { useMemo, useState } from 'react';
import { LogicielLicence } from '../../types/it-tracker';
import {
  KeyRound,
  Plus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Lock,
  Search,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import { CrudRowActions } from '../ui/CrudRowActions';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import {
  fieldInputClass,
  fieldSelectClass,
  fieldTextareaClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/formStyles';

interface SoftwareLicensesSectionProps {
  licences: LogicielLicence[];
  onUpdateLicences: (licences: LogicielLicence[]) => void;
  onShowToast?: (msg: string) => void;
}

const DEFAULT_LICENCE = (): Partial<LogicielLicence> => ({
  nomLogiciel: '',
  editeur: '',
  version: '',
  typeLicence: 'Abonnement SaaS',
  nombreLicencesAchetees: 10,
  nombreLicencesAttribuees: 10,
  dateExpiration: `${new Date().getFullYear()}-12-31`,
  coutRenouvellementEstime: '—',
  procedureInstallation: 'Standard',
  gestionComptesEtDroits: 'Synchronisation Entra ID / MFA',
  statutConformite: 'Conforme',
  observations: '',
});

const getConformiteBadge = (statut: string) => {
  switch (statut) {
    case 'Conforme':
      return {
        classes: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />,
      };
    case 'Sur-licencié':
      return {
        classes: 'text-blue-800 bg-blue-50 border-blue-200',
        icon: <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />,
      };
    case 'Expire sous 30j':
    case 'À renouveler':
      return {
        classes: 'text-amber-800 bg-amber-50 border-amber-200',
        icon: <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />,
      };
    default:
      return {
        classes: 'text-red-800 bg-red-50 border-red-200',
        icon: <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />,
      };
  }
};

export const SoftwareLicensesSection: React.FC<SoftwareLicensesSectionProps> = ({
  licences,
  onUpdateLicences,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');

  // États CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [formLic, setFormLic] = useState<Partial<LogicielLicence>>(DEFAULT_LICENCE);
  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const inspectingLic = useMemo(
    () => licences.find((l) => l.id === inspectingId) || null,
    [licences, inspectingId]
  );

  const deletingLic = useMemo(
    () => licences.find((l) => l.id === deletingId) || null,
    [licences, deletingId]
  );

  const openCreateModal = () => {
    setEditingId(null);
    setIsDuplicating(false);
    setFormLic(DEFAULT_LICENCE());
    setModalOpen(true);
  };

  const openEditModal = (lic: LogicielLicence) => {
    setEditingId(lic.id);
    setIsDuplicating(false);
    setFormLic({ ...lic });
    setModalOpen(true);
  };

  const openDuplicateModal = (lic: LogicielLicence) => {
    setEditingId(null);
    setIsDuplicating(true);
    setFormLic({
      ...lic,
      id: undefined,
      nomLogiciel: `${lic.nomLogiciel} (copie)`,
    });
    setModalOpen(true);
  };

  const handleSaveLicence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLic.nomLogiciel?.trim()) return;

    const payload: LogicielLicence = {
      id: editingId || `LIC-${Date.now()}`,
      nomLogiciel: formLic.nomLogiciel.trim(),
      editeur: formLic.editeur?.trim() || 'Éditeur non précisé',
      version: formLic.version?.trim() || 'Dernière version',
      typeLicence: (formLic.typeLicence as LogicielLicence['typeLicence']) || 'Abonnement SaaS',
      nombreLicencesAchetees: Number(formLic.nombreLicencesAchetees) || 0,
      nombreLicencesAttribuees: Number(formLic.nombreLicencesAttribuees) || 0,
      dateExpiration: formLic.dateExpiration?.trim() || `${new Date().getFullYear()}-12-31`,
      coutRenouvellementEstime: formLic.coutRenouvellementEstime?.trim() || '—',
      procedureInstallation: formLic.procedureInstallation?.trim() || 'Standard',
      gestionComptesEtDroits: formLic.gestionComptesEtDroits?.trim() || 'Attribution nominale',
      statutConformite:
        (formLic.statutConformite as LogicielLicence['statutConformite']) || 'Conforme',
      observations: formLic.observations?.trim() || '',
    };

    if (editingId) {
      onUpdateLicences(licences.map((l) => (l.id === editingId ? payload : l)));
      notify(`Licence « ${payload.nomLogiciel} » mise à jour.`);
    } else {
      onUpdateLicences([...licences, payload]);
      notify(
        isDuplicating
          ? `Licence « ${payload.nomLogiciel} » dupliquée.`
          : `Licence « ${payload.nomLogiciel} » enregistrée.`
      );
    }

    setModalOpen(false);
    setEditingId(null);
    setIsDuplicating(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingId) return;
    onUpdateLicences(licences.filter((l) => l.id !== deletingId));
    if (inspectingId === deletingId) setInspectingId(null);
    setDeletingId(null);
    notify('Licence logicielle supprimée.');
  };

  const filteredLicences = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return licences.filter((lic) => {
      const matchStatus = statusFilter === 'Tous' || lic.statutConformite === statusFilter;
      const matchSearch =
        !q ||
        lic.nomLogiciel.toLowerCase().includes(q) ||
        lic.editeur.toLowerCase().includes(q) ||
        lic.typeLicence.toLowerCase().includes(q) ||
        lic.gestionComptesEtDroits.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [licences, searchTerm, statusFilter]);

  const overAllocatedCount = licences.filter(
    (l) => l.nombreLicencesAttribuees > l.nombreLicencesAchetees
  ).length;
  const expiringCount = licences.filter(
    (l) => l.statutConformite === 'Expire sous 30j' || l.statutConformite === 'Sous-licencié'
  ).length;

  const seatBalance =
    (Number(formLic.nombreLicencesAchetees) || 0) -
    (Number(formLic.nombreLicencesAttribuees) || 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
              8
            </span>
            <span>Gestion des Logiciels, Licences &amp; Droits d&apos;Accès</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Conformité des licences logicielles, suivi des versions, renouvellements et gestion sécurisée des comptes utilisateurs.
          </p>
        </div>
        <button type="button" onClick={openCreateModal} className={primaryButtonClass}>
          <Plus className="w-4 h-4" />
          <span>Ajouter un Logiciel / Licence</span>
        </button>
      </div>

      {/* AVERTISSEMENT SÉCURITÉ MOT DE PASSE (Exigence stricte de sécurité) */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-amber-900 font-bold block text-sm">
            RÈGLE DE SÉCURITÉ CRITIQUE : INTERDICTION DE STOCKAGE DE MOTS DE PASSE EN CLAIR
          </strong>
          <p className="text-amber-800 leading-relaxed">
            Conformément aux directives de l&apos;ANSSI et aux standards ISO 27001, ce registre ne comporte intentionnellement{' '}
            <strong>aucun champ de mot de passe en clair</strong>. Les secrets et identifiants administrateurs doivent être
            obligatoirement stockés dans le coffre-fort d&apos;entreprise chiffré (ex : Bitwarden / KeePass certifié) avec double
            authentification MFA.
          </p>
        </div>
      </div>

      {/* Barre de synthèse et recherche */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-slate-500">Total logiciels : </span>
            <strong className="font-mono tabular-nums text-slate-900">{licences.length}</strong>
          </div>
          {overAllocatedCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold font-mono tabular-nums">
              {overAllocatedCount} dépassement(s) de quota
            </span>
          )}
          {expiringCount > 0 && (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold font-mono tabular-nums">
              {expiringCount} alerte(s) conformité
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs"
            aria-label="Filtrer par conformité"
          >
            <option value="Tous">Tous les statuts</option>
            <option value="Conforme">Conforme</option>
            <option value="Sous-licencié">Sous-licencié</option>
            <option value="Sur-licencié">Sur-licencié</option>
            <option value="Expire sous 30j">Expire sous 30j</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher logiciel, éditeur, RBAC..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Modal Création / Édition / Duplication */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId
            ? 'Modifier la Licence Logicielle'
            : isDuplicating
            ? 'Dupliquer une Licence Logicielle'
            : 'Ajouter une Licence Logicielle'
        }
        subtitle="Suivi de conformité, quota de postes et renouvellement annuel."
        icon={<KeyRound className="w-4 h-4" />}
        size="lg"
        onSubmit={handleSaveLicence}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              {editingId ? 'Enregistrer les modifications' : 'Enregistrer la licence'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Identification logicielle">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Nom du logiciel" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: Microsoft 365, Adobe CC..."
                  value={formLic.nomLogiciel || ''}
                  onChange={(e) => setFormLic({ ...formLic, nomLogiciel: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Éditeur" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: Microsoft, Veeam, Adobe..."
                  value={formLic.editeur || ''}
                  onChange={(e) => setFormLic({ ...formLic, editeur: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Version utilisée">
                <input
                  type="text"
                  placeholder="Ex: v12.2 ou Cloud SaaS"
                  value={formLic.version || ''}
                  onChange={(e) => setFormLic({ ...formLic, version: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Type de licence">
                <select
                  value={formLic.typeLicence || 'Abonnement SaaS'}
                  onChange={(e) =>
                    setFormLic({
                      ...formLic,
                      typeLicence: e.target.value as LogicielLicence['typeLicence'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Abonnement SaaS">Abonnement SaaS</option>
                  <option value="Perpétuelle">Perpétuelle</option>
                  <option value="Volume VL">Volume VL</option>
                  <option value="OEM">OEM</option>
                  <option value="Open Source">Open Source</option>
                </select>
              </FormField>
              <FormField label="Statut de conformité">
                <select
                  value={formLic.statutConformite || 'Conforme'}
                  onChange={(e) =>
                    setFormLic({
                      ...formLic,
                      statutConformite: e.target.value as LogicielLicence['statutConformite'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Conforme">Conforme</option>
                  <option value="Sous-licencié">Sous-licencié</option>
                  <option value="Sur-licencié">Sur-licencié</option>
                  <option value="Expire sous 30j">Expire sous 30j</option>
                </select>
              </FormField>
            </div>
          </FormSection>

          <FormSection
            title="2. Quotas, Échéance & Droits d'accès"
            separated
            rightSlot={
              <span
                className={`text-[11px] font-mono tabular-nums font-semibold ${
                  seatBalance < 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {seatBalance >= 0
                  ? `${seatBalance} siège(s) disponible(s)`
                  : `Surconsommation (${Math.abs(seatBalance)})`}
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Licences achetées">
                <input
                  type="number"
                  min={0}
                  value={formLic.nombreLicencesAchetees ?? 0}
                  onChange={(e) =>
                    setFormLic({
                      ...formLic,
                      nombreLicencesAchetees: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Licences attribuées">
                <input
                  type="number"
                  min={0}
                  value={formLic.nombreLicencesAttribuees ?? 0}
                  onChange={(e) =>
                    setFormLic({
                      ...formLic,
                      nombreLicencesAttribuees: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Date d'expiration" hint="AAAA-MM-JJ ou « Perpétuelle »">
                <input
                  type="text"
                  placeholder="2026-12-31 ou Perpétuelle"
                  value={formLic.dateExpiration || ''}
                  onChange={(e) => setFormLic({ ...formLic, dateExpiration: e.target.value })}
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Coût renouvellement estimé">
                <input
                  type="text"
                  placeholder="Ex: 2 400 000 Ar / an"
                  value={formLic.coutRenouvellementEstime || ''}
                  onChange={(e) =>
                    setFormLic({ ...formLic, coutRenouvellementEstime: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Gestion comptes & droits (RBAC)">
                <input
                  type="text"
                  placeholder="Ex: Synchronisation Entra ID / Groupes RBAC"
                  value={formLic.gestionComptesEtDroits || ''}
                  onChange={(e) =>
                    setFormLic({ ...formLic, gestionComptesEtDroits: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <FormField label="Procédure d'installation / déploiement">
              <input
                type="text"
                placeholder="Ex: Télédéploiement Intune Win32 ou GPO"
                value={formLic.procedureInstallation || ''}
                onChange={(e) =>
                  setFormLic({ ...formLic, procedureInstallation: e.target.value })
                }
                className={fieldInputClass}
              />
            </FormField>

            <FormField label="Observations / Notes d'audit">
              <textarea
                rows={2}
                placeholder="Historique de renouvellement, remarques contrat..."
                value={formLic.observations || ''}
                onChange={(e) => setFormLic({ ...formLic, observations: e.target.value })}
                className={fieldTextareaClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Consultation détaillée (READ) */}
      <Modal
        isOpen={Boolean(inspectingLic)}
        onClose={() => setInspectingId(null)}
        title={inspectingLic?.nomLogiciel || 'Fiche Licence'}
        subtitle={
          inspectingLic
            ? `${inspectingLic.editeur} · ${inspectingLic.version} · ${inspectingLic.typeLicence}`
            : undefined
        }
        icon={<KeyRound className="w-4 h-4" />}
        size="md"
        footer={
          inspectingLic && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(inspectingLic.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                Supprimer
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingLic;
                    setInspectingId(null);
                    openDuplicateModal(target);
                  }}
                  className={secondaryButtonClass}
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingLic;
                    setInspectingId(null);
                    openEditModal(target);
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
        {inspectingLic && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500">Sièges alloués</div>
                <div
                  className={`font-mono tabular-nums font-bold mt-0.5 ${
                    inspectingLic.nombreLicencesAttribuees > inspectingLic.nombreLicencesAchetees
                      ? 'text-red-700'
                      : 'text-slate-900'
                  }`}
                >
                  {inspectingLic.nombreLicencesAttribuees} / {inspectingLic.nombreLicencesAchetees}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Expiration</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {inspectingLic.dateExpiration}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Coût estimé</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {inspectingLic.coutRenouvellementEstime}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Conformité licence
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-semibold border ${
                  getConformiteBadge(inspectingLic.statutConformite).classes
                }`}
              >
                {getConformiteBadge(inspectingLic.statutConformite).icon}
                {inspectingLic.statutConformite}
              </span>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Gestion des comptes &amp; droits
              </h4>
              <p className="text-slate-800">{inspectingLic.gestionComptesEtDroits || '—'}</p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Procédure d&apos;installation
              </h4>
              <p className="text-slate-800">{inspectingLic.procedureInstallation || '—'}</p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Observations
              </h4>
              <p className="text-slate-700 p-3 rounded-lg bg-slate-50 border border-slate-200 whitespace-pre-line">
                {inspectingLic.observations || 'Aucune observation enregistrée.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingLic)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer cette licence logicielle ?"
        itemLabel={deletingLic?.nomLogiciel || ''}
        itemMeta={
          deletingLic
            ? `${deletingLic.editeur} · ${deletingLic.nombreLicencesAttribuees}/${deletingLic.nombreLicencesAchetees} licences`
            : undefined
        }
      />

      {/* Grille des licences */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 font-semibold">Logiciel &amp; Éditeur</th>
                <th className="p-3 font-semibold whitespace-nowrap">Version &amp; Type</th>
                <th className="p-3 font-semibold whitespace-nowrap">Licences (Allouées / Achetées)</th>
                <th className="p-3 font-semibold whitespace-nowrap">Expiration</th>
                <th className="p-3 font-semibold whitespace-nowrap">Coût</th>
                <th className="p-3 font-semibold">Droits &amp; Déploiement</th>
                <th className="p-3 font-semibold whitespace-nowrap">Statut</th>
                <th className="p-3 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredLicences.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <p className="text-slate-600 font-medium">
                        {licences.length === 0
                          ? 'Aucune licence ou logiciel répertorié.'
                          : 'Aucune licence ne correspond à votre recherche.'}
                      </p>
                      {licences.length === 0 && (
                        <button
                          type="button"
                          onClick={openCreateModal}
                          className={primaryButtonClass}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter une licence</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLicences.map((lic) => {
                  const disponible = lic.nombreLicencesAchetees - lic.nombreLicencesAttribuees;
                  const badge = getConformiteBadge(lic.statutConformite);
                  return (
                    <tr key={lic.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 align-top">
                        <button
                          type="button"
                          onClick={() => setInspectingId(lic.id)}
                          className="text-left group"
                        >
                          <strong className="text-blue-900 group-hover:text-blue-700 block font-bold text-sm">
                            {lic.nomLogiciel}
                          </strong>
                        </button>
                        <span className="text-[11px] text-slate-500 font-medium">{lic.editeur}</span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="text-slate-800 font-medium block">{lic.version}</span>
                        <span className="text-slate-400 text-[11px]">{lic.typeLicence}</span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold font-mono tabular-nums ${
                              disponible < 0 ? 'text-red-700' : 'text-slate-900'
                            }`}
                          >
                            {lic.nombreLicencesAttribuees} / {lic.nombreLicencesAchetees}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium font-mono tabular-nums ${
                              disponible < 0
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {disponible >= 0
                              ? `${disponible} dispo`
                              : `-${Math.abs(disponible)} excédent`}
                          </span>
                        </div>
                        <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full ${
                              lic.nombreLicencesAttribuees > lic.nombreLicencesAchetees
                                ? 'bg-red-500'
                                : 'bg-blue-600'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                (lic.nombreLicencesAttribuees / (lic.nombreLicencesAchetees || 1)) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums font-medium text-slate-800">
                        {lic.dateExpiration}
                      </td>
                      <td className="p-3 align-top whitespace-nowrap font-semibold text-slate-900">
                        {lic.coutRenouvellementEstime}
                      </td>
                      <td className="p-3 align-top text-[11px] max-w-xs">
                        <span className="text-slate-800 font-medium block">
                          {lic.gestionComptesEtDroits}
                        </span>
                        <span className="text-slate-400 text-[10px] block">
                          Procédure : {lic.procedureInstallation}
                        </span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold border ${badge.classes}`}
                        >
                          {badge.icon}
                          {lic.statutConformite}
                        </span>
                      </td>
                      <td className="p-3 align-top text-right whitespace-nowrap">
                        <CrudRowActions
                          onView={() => setInspectingId(lic.id)}
                          onEdit={() => openEditModal(lic)}
                          onDuplicate={() => openDuplicateModal(lic)}
                          onDelete={() => setDeletingId(lic.id)}
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
  );
};
