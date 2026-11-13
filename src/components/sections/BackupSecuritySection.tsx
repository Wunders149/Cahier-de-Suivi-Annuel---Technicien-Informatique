import React, { useState } from 'react';
import { SuiviSauvegarde, IncidentSecurite } from '../../types/it-tracker';
import { ShieldCheck, HardDrive, ShieldAlert, Plus, CheckCircle2, AlertTriangle, RefreshCw, Lock } from 'lucide-react';

interface BackupSecuritySectionProps {
  sauvegardes: SuiviSauvegarde[];
  incidentsSecurite: IncidentSecurite[];
  onUpdateSauvegardes: (sauvegardes: SuiviSauvegarde[]) => void;
  onUpdateIncidentsSecurite: (incidents: IncidentSecurite[]) => void;
}

export const BackupSecuritySection: React.FC<BackupSecuritySectionProps> = ({
  sauvegardes,
  incidentsSecurite,
  onUpdateSauvegardes,
  onUpdateIncidentsSecurite,
}) => {
  const [showAddIncident, setShowAddIncident] = useState(false);
  const [newSec, setNewSec] = useState<Partial<IncidentSecurite>>({
    dateHeure: new Date().toISOString().replace('T', ' ').slice(0, 16),
    typeIncident: 'Tentative Phishing',
    severite: 'Moyenne',
    postesConcernes: '',
    description: '',
    actionsMenées: '',
    statut: 'Clôturé',
    leconsApprises: '',
  });

  const handleAddIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSec.description) return;

    const item: IncidentSecurite = {
      id: `SEC-${Date.now()}`,
      dateHeure: newSec.dateHeure || new Date().toISOString().replace('T', ' ').slice(0, 16),
      typeIncident: (newSec.typeIncident as any) || 'Tentative Phishing',
      severite: (newSec.severite as any) || 'Moyenne',
      postesConcernes: newSec.postesConcernes || 'Tout le parc',
      description: newSec.description || '',
      actionsMenées: newSec.actionsMenées || 'Mesures d\'endiguement prises.',
      statut: (newSec.statut as any) || 'Clôturé',
      leconsApprises: newSec.leconsApprises || 'Sensibilisation continue.',
    };

    onUpdateIncidentsSecurite([item, ...incidentsSecurite]);
    setShowAddIncident(false);
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">9</span>
            Sauvegarde & Sécurité Informatique (PSSI & PRA)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Application stricte de la règle 3-2-1, tests de restauration périodiques, protection EDR et registre cybersécurité.
          </p>
        </div>
        <button
          onClick={() => setShowAddIncident(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Consigner un Incident de Sécurité</span>
        </button>
      </div>

      {/* Cartouche Règle 3-2-1 de sauvegarde */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border-b-4 border-emerald-500">
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Conformité à la Règle d'Or 3-2-1-1-0 des Sauvegardes
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
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-600" />
          <span>Suivi Quotidien des Sauvegardes & Tests de Restauration (PRA)</span>
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 font-semibold">Nom du Job & Cible</th>
                  <th className="p-3 font-semibold">Type de Sauvegarde</th>
                  <th className="p-3 font-semibold">Horaire & Durée</th>
                  <th className="p-3 font-semibold">Taille (Go)</th>
                  <th className="p-3 font-semibold">Destination (Règle 3-2-1)</th>
                  <th className="p-3 font-semibold">Dernier Test Restauration</th>
                  <th className="p-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {sauvegardes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      Aucun job de sauvegarde consigné. Documentez vos sauvegardes (règle 3-2-1) et vos tests périodiques de restauration.
                    </td>
                  </tr>
                ) : (
                  sauvegardes.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 align-top whitespace-nowrap">
                        <strong className="text-blue-900 font-bold block">{s.nomJob}</strong>
                        <span className="text-[11px] text-slate-500">{s.serveurCible}</span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                          {s.typeSauvegarde}
                      </span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap text-[11px]">
                      <span className="text-slate-900 font-medium block">{s.horaireExecution}</span>
                      <span className="text-slate-400">Durée : {s.dureeExecutionMin} min</span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap font-bold text-slate-800">
                      {s.tailleGo} Go
                    </td>
                    <td className="p-3 align-top text-[11px] max-w-xs text-slate-700">
                      {s.destinationStockage}
                    </td>
                    <td className="p-3 align-top whitespace-nowrap text-[11px]">
                      <span className="text-slate-800 font-medium block">{s.dateDernierTestRestauration}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {s.resultatTestRestauration}
                      </span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded font-semibold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {s.statut}
                      </span>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal ajout incident de sécurité */}
      {showAddIncident && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Consigner un Incident de Cybersécurité</span>
            </h3>

            <form onSubmit={handleAddIncident} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date et heure</label>
                  <input
                    type="text"
                    value={newSec.dateHeure}
                    onChange={(e) => setNewSec({ ...newSec, dateHeure: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Type d'incident</label>
                  <select
                    value={newSec.typeIncident}
                    onChange={(e) => setNewSec({ ...newSec, typeIncident: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="Tentative Phishing">Tentative Phishing</option>
                    <option value="Alerte EDR / Malware">Alerte EDR / Malware</option>
                    <option value="Tentative Brute Force">Tentative Brute Force</option>
                    <option value="Périphérique USB non autorisé">Périphérique USB non autorisé</option>
                    <option value="Perte / Vol matériel">Perte / Vol matériel</option>
                    <option value="Faille vulnérabilité critique">Faille vulnérabilité critique</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sévérité</label>
                  <select
                    value={newSec.severite}
                    onChange={(e) => setNewSec({ ...newSec, severite: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="Faible">Faible</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Élevée">Élevée</option>
                    <option value="Critique">Critique</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Postes / Comptes concernés</label>
                  <input
                    type="text"
                    placeholder="Ex: PC PARC-PC-023, boîtes mails RH"
                    value={newSec.postesConcernes}
                    onChange={(e) => setNewSec({ ...newSec, postesConcernes: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description de la menace / incident</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Détail de l'événement détecté..."
                  value={newSec.description}
                  onChange={(e) => setNewSec({ ...newSec, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Actions immédiates menées (Endiguement)</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Isolation réseau, purge, réinitialisation de mot de passe..."
                  value={newSec.actionsMenées}
                  onChange={(e) => setNewSec({ ...newSec, actionsMenées: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Leçons apprises & Recommandations</label>
                <input
                  type="text"
                  placeholder="Sensibilisation utilisateur, durcissement règle EDR..."
                  value={newSec.leconsApprises}
                  onChange={(e) => setNewSec({ ...newSec, leconsApprises: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddIncident(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
                >
                  Enregistrer l'incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registre des incidents de cybersécurité */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <span>Registre des Incidents de Sécurité & Actions de Remédiation</span>
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 font-semibold">Date & Heure</th>
                  <th className="p-3 font-semibold">Type & Sévérité</th>
                  <th className="p-3 font-semibold">Périmètre / Postes</th>
                  <th className="p-3 font-semibold">Description de la Menace</th>
                  <th className="p-3 font-semibold">Actions Menées</th>
                  <th className="p-3 font-semibold">Statut & Leçons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {incidentsSecurite.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                      Aucun incident de cybersécurité enregistré. Le registre PSSI est vierge et prêt pour la consignation des événements.
                    </td>
                  </tr>
                ) : (
                  incidentsSecurite.map((sec) => (
                    <tr key={sec.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 align-top whitespace-nowrap font-medium text-slate-900">
                        {sec.dateHeure}
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <strong className="text-slate-900 block font-semibold">{sec.typeIncident}</strong>
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
                      <td className="p-3 align-top text-slate-700 max-w-xs">
                        {sec.description}
                      </td>
                      <td className="p-3 align-top text-emerald-900 bg-emerald-50/40 max-w-xs">
                        {sec.actionsMenées}
                      </td>
                      <td className="p-3 align-top text-[11px]">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold mb-1">
                          {sec.statut}
                        </span>
                        <p className="text-slate-500 italic">{sec.leconsApprises}</p>
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
