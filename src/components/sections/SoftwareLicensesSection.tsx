import React, { useState } from 'react';
import { LogicielLicence } from '../../types/it-tracker';
import { KeyRound, Plus, CheckCircle2, Lock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import {
  fieldInputClass,
  fieldSelectClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/formStyles';

interface SoftwareLicensesSectionProps {
  licences: LogicielLicence[];
  onUpdateLicences: (licences: LogicielLicence[]) => void;
}

const DEFAULT_NEW_LICENCE = (): Partial<LogicielLicence> => ({
  nomLogiciel: '',
  editeur: '',
  version: '',
  typeLicence: 'Abonnement SaaS',
  nombreLicencesAchetees: 10,
  nombreLicencesAttribuees: 10,
  dateExpiration: '2026-12-31',
  coutRenouvellementEstime: '—',
  procedureInstallation: 'Standard',
  gestionComptesEtDroits: 'Synchronisation Entra ID / MFA',
  statutConformite: 'Conforme',
  observations: '',
});

export const SoftwareLicensesSection: React.FC<SoftwareLicensesSectionProps> = ({
  licences,
  onUpdateLicences,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLic, setNewLic] = useState<Partial<LogicielLicence>>(DEFAULT_NEW_LICENCE);

  const openModal = () => {
    setNewLic(DEFAULT_NEW_LICENCE());
    setShowAddModal(true);
  };

  const handleAddLicence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLic.nomLogiciel) return;

    const item: LogicielLicence = {
      id: `LIC-${Date.now()}`,
      nomLogiciel: newLic.nomLogiciel || '',
      editeur: newLic.editeur || '',
      version: newLic.version || '',
      typeLicence: (newLic.typeLicence as any) || 'Abonnement SaaS',
      nombreLicencesAchetees: Number(newLic.nombreLicencesAchetees) || 0,
      nombreLicencesAttribuees: Number(newLic.nombreLicencesAttribuees) || 0,
      dateExpiration: newLic.dateExpiration || '2026-12-31',
      coutRenouvellementEstime: newLic.coutRenouvellementEstime || '—',
      procedureInstallation: newLic.procedureInstallation || '',
      gestionComptesEtDroits: newLic.gestionComptesEtDroits || 'Attribution nominale',
      statutConformite: (newLic.statutConformite as any) || 'Conforme',
      observations: newLic.observations || '',
    };

    onUpdateLicences([...licences, item]);
    setNewLic(DEFAULT_NEW_LICENCE());
    setShowAddModal(false);
  };

  const seatBalance =
    (Number(newLic.nombreLicencesAchetees) || 0) -
    (Number(newLic.nombreLicencesAttribuees) || 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">8</span>
            Gestion des Logiciels, Licences & Droits d'Accès
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Conformité des licences logicielles, suivi des versions, renouvellements et gestion sécurisée des comptes utilisateurs.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className={primaryButtonClass}
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Logiciel / Licence</span>
        </button>
      </div>

      {/* AVERTISSEMENT SÉCURITÉ MOT DE PASSE (Exigence stricte de sécurité) */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-xs flex items-start gap-3 shadow-xs">
        <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-amber-900 font-bold block text-sm">
            RÈGLE DE SÉCURITÉ CRITIQUE : INTERDICTION DE STOCKAGE DE MOTS DE PASSE EN CLAIR
          </strong>
          <p className="text-amber-800 leading-relaxed">
            Conformément aux directives de l'ANSSI et aux standards ISO 27001, ce registre ne comporte intentionnellement <strong>aucun champ de mot de passe en clair</strong>. 
            Les secrets et identifiants administrateurs doivent être obligatoirement stockés dans le coffre-fort d'entreprise chiffré (ex: Bitwarden / KeePass certifié) avec double authentification MFA.
          </p>
        </div>
      </div>

      {/* Modal d'ajout */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Ajouter une Licence Logicielle"
        subtitle="Suivi de conformité, quota de postes et renouvellement annuel."
        icon={<KeyRound className="w-4 h-4" />}
        size="lg"
        onSubmit={handleAddLicence}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              Enregistrer la licence
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Identification logicielle">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Nom du logiciel" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: Microsoft 365, Adobe CC..."
                  value={newLic.nomLogiciel || ''}
                  onChange={(e) => setNewLic({ ...newLic, nomLogiciel: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Éditeur" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: Microsoft, Veeam, Adobe..."
                  value={newLic.editeur || ''}
                  onChange={(e) => setNewLic({ ...newLic, editeur: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Version utilisée">
                <input
                  type="text"
                  placeholder="Ex: v12.2 ou Cloud SaaS"
                  value={newLic.version || ''}
                  onChange={(e) => setNewLic({ ...newLic, version: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Type de licence">
                <select
                  value={newLic.typeLicence || 'Abonnement SaaS'}
                  onChange={(e) => setNewLic({ ...newLic, typeLicence: e.target.value as any })}
                  className={fieldSelectClass}
                >
                  <option value="Abonnement SaaS">Abonnement SaaS</option>
                  <option value="Perpétuelle">Perpétuelle</option>
                  <option value="Volume VL">Volume VL</option>
                  <option value="OEM">OEM</option>
                  <option value="Open Source">Open Source</option>
                </select>
              </FormField>
              <FormField label="Conformité">
                <select
                  value={newLic.statutConformite || 'Conforme'}
                  onChange={(e) => setNewLic({ ...newLic, statutConformite: e.target.value as any })}
                  className={fieldSelectClass}
                >
                  <option value="Conforme">Conforme</option>
                  <option value="À renouveler">À renouveler</option>
                  <option value="Non conforme">Non conforme</option>
                </select>
              </FormField>
            </div>
          </FormSection>

          <FormSection
            title="2. Quotas, Échéance & Coût"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Licences achetées">
                <input
                  type="number"
                  min={0}
                  value={newLic.nombreLicencesAchetees ?? 0}
                  onChange={(e) =>
                    setNewLic({ ...newLic, nombreLicencesAchetees: parseInt(e.target.value, 10) || 0 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Licences attribuées">
                <input
                  type="number"
                  min={0}
                  value={newLic.nombreLicencesAttribuees ?? 0}
                  onChange={(e) =>
                    setNewLic({ ...newLic, nombreLicencesAttribuees: parseInt(e.target.value, 10) || 0 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Date d'expiration" hint="Date AAAA-MM-JJ ou « Perpétuelle »">
                <input
                  type="text"
                  placeholder="2026-12-31 ou Perpétuelle"
                  value={newLic.dateExpiration || ''}
                  onChange={(e) => setNewLic({ ...newLic, dateExpiration: e.target.value })}
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Coût renouvellement estimé">
                <input
                  type="text"
                  placeholder="Ex: 2 400 € / an"
                  value={newLic.coutRenouvellementEstime || ''}
                  onChange={(e) =>
                    setNewLic({ ...newLic, coutRenouvellementEstime: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Gestion comptes & droits">
                <input
                  type="text"
                  placeholder="Ex: RBAC / Groupes Active Directory"
                  value={newLic.gestionComptesEtDroits || ''}
                  onChange={(e) =>
                    setNewLic({ ...newLic, gestionComptesEtDroits: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <FormField label="Procédure d'installation / déploiement">
              <input
                type="text"
                placeholder="Ex: Télédéploiement Intune Win32 ou GPO"
                value={newLic.procedureInstallation || ''}
                onChange={(e) =>
                  setNewLic({ ...newLic, procedureInstallation: e.target.value })
                }
                className={fieldInputClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      {/* Grille des licences */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 font-semibold">Logiciel & Éditeur</th>
                <th className="p-3 font-semibold">Version & Type</th>
                <th className="p-3 font-semibold">Licences (Achetées / Allouées)</th>
                <th className="p-3 font-semibold">Date d'Expiration</th>
                <th className="p-3 font-semibold">Coût Renouvellement</th>
                <th className="p-3 font-semibold">Gestion des Droits & Comptes</th>
                <th className="p-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {licences.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    Aucune licence ou logiciel répertorié. Cliquez sur « Ajouter une Licence » pour suivre vos abonnements SaaS, licences perpétuelles et dates d'expiration.
                  </td>
                </tr>
              ) : (
                licences.map((lic) => {
                  const disponible = lic.nombreLicencesAchetees - lic.nombreLicencesAttribuees;
                  return (
                    <tr key={lic.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 align-top">
                      <strong className="text-blue-900 block font-bold text-sm">{lic.nomLogiciel}</strong>
                      <span className="text-[11px] text-slate-500 font-medium">{lic.editeur}</span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <span className="text-slate-800 font-medium block">{lic.version}</span>
                      <span className="text-slate-400 text-[11px]">{lic.typeLicence}</span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {lic.nombreLicencesAttribuees} / {lic.nombreLicencesAchetees}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {disponible >= 0 ? `${disponible} dispo` : 'Surconsommation'}
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
                              (lic.nombreLicencesAttribuees / (lic.nombreLicencesAchetees || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap font-medium text-slate-800">
                      {lic.dateExpiration}
                    </td>
                    <td className="p-3 align-top whitespace-nowrap font-semibold text-slate-900">
                      {lic.coutRenouvellementEstime}
                    </td>
                    <td className="p-3 align-top text-[11px] max-w-xs">
                      <span className="text-slate-800 font-medium block">{lic.gestionComptesEtDroits}</span>
                      <span className="text-slate-400 text-[10px] block">Procédure : {lic.procedureInstallation}</span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {lic.statutConformite}
                      </span>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
