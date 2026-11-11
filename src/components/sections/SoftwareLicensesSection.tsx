import React, { useState } from 'react';
import { LogicielLicence } from '../../types/it-tracker';
import { KeyRound, ShieldAlert, Plus, CheckCircle2, AlertTriangle, Lock, Users } from 'lucide-react';

interface SoftwareLicensesSectionProps {
  licences: LogicielLicence[];
  onUpdateLicences: (licences: LogicielLicence[]) => void;
}

export const SoftwareLicensesSection: React.FC<SoftwareLicensesSectionProps> = ({
  licences,
  onUpdateLicences,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLic, setNewLic] = useState<Partial<LogicielLicence>>({
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
    setShowAddModal(false);
  };

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
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
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
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <span>Ajouter une Licence Logicielle</span>
            </h3>

            <form onSubmit={handleAddLicence} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nom du logiciel</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Microsoft 365, Adobe CC..."
                    value={newLic.nomLogiciel}
                    onChange={(e) => setNewLic({ ...newLic, nomLogiciel: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Éditeur</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Microsoft, Veeam, Adobe..."
                    value={newLic.editeur}
                    onChange={(e) => setNewLic({ ...newLic, editeur: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Version utilisée</label>
                  <input
                    type="text"
                    placeholder="Ex: v12.2 ou Cloud SaaS"
                    value={newLic.version}
                    onChange={(e) => setNewLic({ ...newLic, version: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Type de licence</label>
                  <select
                    value={newLic.typeLicence}
                    onChange={(e) => setNewLic({ ...newLic, typeLicence: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="Abonnement SaaS">Abonnement SaaS</option>
                    <option value="Perpétuelle">Perpétuelle</option>
                    <option value="Volume VL">Volume VL</option>
                    <option value="OEM">OEM</option>
                    <option value="Open Source">Open Source</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Licences achetées</label>
                  <input
                    type="number"
                    min={0}
                    value={newLic.nombreLicencesAchetees}
                    onChange={(e) => setNewLic({ ...newLic, nombreLicencesAchetees: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Licences attribuées</label>
                  <input
                    type="number"
                    min={0}
                    value={newLic.nombreLicencesAttribuees}
                    onChange={(e) => setNewLic({ ...newLic, nombreLicencesAttribuees: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date d'expiration</label>
                  <input
                    type="text"
                    value={newLic.dateExpiration}
                    onChange={(e) => setNewLic({ ...newLic, dateExpiration: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Coût renouvellement estimé</label>
                  <input
                    type="text"
                    placeholder="Ex: 2 400 € / an"
                    value={newLic.coutRenouvellementEstime}
                    onChange={(e) => setNewLic({ ...newLic, coutRenouvellementEstime: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Gestion comptes & droits</label>
                  <input
                    type="text"
                    placeholder="Ex: RBAC / Groupes Active Directory"
                    value={newLic.gestionComptesEtDroits}
                    onChange={(e) => setNewLic({ ...newLic, gestionComptesEtDroits: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Procédure d'installation / déploiement</label>
                <input
                  type="text"
                  placeholder="Ex: Télédéploiement Intune Win32 ou GPO"
                  value={newLic.procedureInstallation}
                  onChange={(e) => setNewLic({ ...newLic, procedureInstallation: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                >
                  Enregistrer la licence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {licences.map((lic) => {
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
