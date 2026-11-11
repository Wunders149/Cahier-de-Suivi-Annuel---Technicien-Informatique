import React, { useState } from 'react';
import { FicheIntervention } from '../../types/it-tracker';
import { Plus, Wrench, Search, CheckCircle, Clock, AlertTriangle, FileText, Printer, Check, UserCheck } from 'lucide-react';

interface InterventionsSectionProps {
  interventions: FicheIntervention[];
  onUpdateInterventions: (interventions: FicheIntervention[]) => void;
}

export const InterventionsSection: React.FC<InterventionsSectionProps> = ({
  interventions,
  onUpdateInterventions,
}) => {
  const [selectedIntervention, setSelectedIntervention] = useState<FicheIntervention | null>(
    interventions[0] || null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTicket, setNewTicket] = useState<Partial<FicheIntervention>>({
    dateReception: new Date().toISOString().split('T')[0],
    heureReception: '10:00',
    nomDemandeur: '',
    serviceDemandeur: '',
    equipementConcerne: '',
    typeIntervention: 'Matériel',
    priorite: 'Normale',
    descriptionPanne: '',
    diagnosticTechnique: '',
    causeIdentifiee: '',
    solutionAppliquee: '',
    materielLogicielUtilise: '',
    tempsConsacreMin: 30,
    resultat: 'Résolu',
    validationDemandeur: true,
    commentairesDemandeur: '',
  });

  const handleAddTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.nomDemandeur || !newTicket.descriptionPanne) return;

    const numIndex = interventions.length + 1;
    const item: FicheIntervention = {
      id: `INT-${Date.now()}`,
      numeroReference: `INT-2026-${numIndex < 10 ? '00' + numIndex : numIndex < 100 ? '0' + numIndex : numIndex}`,
      dateReception: newTicket.dateReception || new Date().toISOString().split('T')[0],
      heureReception: newTicket.heureReception || '10:00',
      nomDemandeur: newTicket.nomDemandeur || '',
      serviceDemandeur: newTicket.serviceDemandeur || 'Général',
      equipementConcerne: newTicket.equipementConcerne || 'Poste de travail',
      typeIntervention: (newTicket.typeIntervention as any) || 'Matériel',
      priorite: (newTicket.priorite as any) || 'Normale',
      descriptionPanne: newTicket.descriptionPanne || '',
      diagnosticTechnique: newTicket.diagnosticTechnique || 'Diagnostic préliminaire conforme.',
      causeIdentifiee: newTicket.causeIdentifiee || 'Dysfonctionnement identifié.',
      solutionAppliquee: newTicket.solutionAppliquee || 'Résolution standard appliquée.',
      materielLogicielUtilise: newTicket.materielLogicielUtilise || 'Outillage standard',
      tempsConsacreMin: Number(newTicket.tempsConsacreMin) || 30,
      resultat: (newTicket.resultat as any) || 'Résolu',
      validationDemandeur: Boolean(newTicket.validationDemandeur),
      dateValidation: newTicket.validationDemandeur ? `${newTicket.dateReception} ${newTicket.heureReception}` : undefined,
      commentairesDemandeur: newTicket.commentairesDemandeur || 'Conforme aux attentes.',
    };

    const updated = [item, ...interventions];
    onUpdateInterventions(updated);
    setSelectedIntervention(item);
    setShowAddModal(false);
  };

  const handleToggleValidation = (id: string) => {
    const updated = interventions.map((it) => {
      if (it.id === id) {
        const nextVal = !it.validationDemandeur;
        return {
          ...it,
          validationDemandeur: nextVal,
          dateValidation: nextVal ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined,
        };
      }
      return it;
    });
    onUpdateInterventions(updated);
    if (selectedIntervention?.id === id) {
      setSelectedIntervention({
        ...selectedIntervention,
        validationDemandeur: !selectedIntervention.validationDemandeur,
      });
    }
  };

  const filtered = interventions.filter(
    (i) =>
      i.numeroReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.nomDemandeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.serviceDemandeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.equipementConcerne.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.descriptionPanne.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">4</span>
            Registre des Interventions Informatiques
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Fiches d'intervention détaillées, diagnostic technique, solutions appliquées et validation du demandeur.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Fiche d'Intervention</span>
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° ticket, demandeur, service, matériel..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 shrink-0 font-medium">
          {filtered.length} fiche(s) enregistrée(s)
        </div>
      </div>

      {/* Modal d'ajout de ticket */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <span>Créer une Nouvelle Fiche d'Intervention</span>
            </h3>

            <form onSubmit={handleAddTicket} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date de réception</label>
                  <input
                    type="date"
                    required
                    value={newTicket.dateReception}
                    onChange={(e) => setNewTicket({ ...newTicket, dateReception: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Heure de réception</label>
                  <input
                    type="time"
                    required
                    value={newTicket.heureReception}
                    onChange={(e) => setNewTicket({ ...newTicket, heureReception: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Priorité</label>
                  <select
                    value={newTicket.priorite}
                    onChange={(e) => setNewTicket({ ...newTicket, priorite: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="Critique">Critique</option>
                    <option value="Haute">Haute</option>
                    <option value="Normale">Normale</option>
                    <option value="Basse">Basse</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nom du demandeur</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean DUPONT"
                    value={newTicket.nomDemandeur}
                    onChange={(e) => setNewTicket({ ...newTicket, nomDemandeur: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Service concerné</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Comptabilité, Commercial..."
                    value={newTicket.serviceDemandeur}
                    onChange={(e) => setNewTicket({ ...newTicket, serviceDemandeur: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Équipement concerné</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PC Dell Latitude / Copieur"
                    value={newTicket.equipementConcerne}
                    onChange={(e) => setNewTicket({ ...newTicket, equipementConcerne: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description de la panne ou du problème</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Symptômes constatés par l'utilisateur..."
                  value={newTicket.descriptionPanne}
                  onChange={(e) => setNewTicket({ ...newTicket, descriptionPanne: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Diagnostic technique</label>
                  <textarea
                    rows={2}
                    placeholder="Tests réalisés, messages d'erreurs..."
                    value={newTicket.diagnosticTechnique}
                    onChange={(e) => setNewTicket({ ...newTicket, diagnosticTechnique: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Cause identifiée</label>
                  <textarea
                    rows={2}
                    placeholder="Origine racine du dysfonctionnement..."
                    value={newTicket.causeIdentifiee}
                    onChange={(e) => setNewTicket({ ...newTicket, causeIdentifiee: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Solution appliquée</label>
                <textarea
                  rows={2}
                  placeholder="Action de réparation ou paramétrage effectué..."
                  value={newTicket.solutionAppliquee}
                  onChange={(e) => setNewTicket({ ...newTicket, solutionAppliquee: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Matériel ou logiciel utilisé</label>
                  <input
                    type="text"
                    placeholder="Ex: Cordon Cat6, tournevis, utilitaire..."
                    value={newTicket.materielLogicielUtilise}
                    onChange={(e) => setNewTicket({ ...newTicket, materielLogicielUtilise: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Temps consacré (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    value={newTicket.tempsConsacreMin}
                    onChange={(e) => setNewTicket({ ...newTicket, tempsConsacreMin: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Résultat</label>
                  <select
                    value={newTicket.resultat}
                    onChange={(e) => setNewTicket({ ...newTicket, resultat: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="Résolu">Résolu</option>
                    <option value="En cours">En cours</option>
                    <option value="En attente pièce">En attente pièce</option>
                    <option value="Escaladé N3">Escaladé N3</option>
                    <option value="Non résolu">Non résolu</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold shadow"
                >
                  Créer et enregistrer la fiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disposition principale : Liste latérale + Vue détaillée de la fiche */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Liste des tickets (gauche) */}
        <div className="lg:col-span-5 space-y-2">
          {filtered.map((it) => (
            <div
              key={it.id}
              onClick={() => setSelectedIntervention(it)}
              className={`p-3.5 rounded-xl border cursor-pointer transition text-xs ${
                selectedIntervention?.id === it.id
                  ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-400'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-900">{it.numeroReference}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    it.priorite === 'Critique'
                      ? 'bg-red-100 text-red-800'
                      : it.priorite === 'Haute'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {it.priorite}
                </span>
              </div>
              <div className="font-semibold text-slate-900 truncate">
                {it.nomDemandeur} ({it.serviceDemandeur})
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5 truncate">{it.descriptionPanne}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                <span>{it.dateReception} ({it.tempsConsacreMin} min)</span>
                <span className={`font-semibold ${it.resultat === 'Résolu' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {it.resultat}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Fiche d'intervention détaillée (droite) */}
        <div className="lg:col-span-7">
          {selectedIntervention ? (
            <div className="bg-white rounded-2xl border-2 border-blue-900 shadow-md overflow-hidden">
              {/* En-tête de la fiche */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-blue-300 font-bold block">
                    Fiche d'Intervention Technique
                  </span>
                  <h3 className="text-lg font-extrabold text-white">
                    {selectedIntervention.numeroReference}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Réceptionnée le</span>
                  <span className="text-xs font-semibold text-white">
                    {selectedIntervention.dateReception} à {selectedIntervention.heureReception}
                  </span>
                </div>
              </div>

              {/* Corps de la fiche */}
              <div className="p-5 space-y-4 text-xs">
                {/* Cadre demandeur & matériel */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Demandeur :</span>
                    <strong className="text-slate-900 text-sm block">{selectedIntervention.nomDemandeur}</strong>
                    <span className="text-slate-600">{selectedIntervention.serviceDemandeur}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Équipement concerné :</span>
                    <strong className="text-slate-900 block">{selectedIntervention.equipementConcerne}</strong>
                    <span className="text-slate-600">Type : {selectedIntervention.typeIntervention}</span>
                  </div>
                </div>

                {/* Description de la panne */}
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px] text-blue-900 block">
                    1. Description de la panne signalée :
                  </span>
                  <p className="bg-red-50/60 p-2.5 rounded border border-red-200/60 text-slate-800 leading-relaxed">
                    {selectedIntervention.descriptionPanne}
                  </p>
                </div>

                {/* Diagnostic & Cause */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px] text-blue-900 block">
                      2. Diagnostic technique :
                    </span>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700 min-h-[60px]">
                      {selectedIntervention.diagnosticTechnique}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px] text-blue-900 block">
                      3. Cause identifiée :
                    </span>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700 min-h-[60px]">
                      {selectedIntervention.causeIdentifiee}
                    </div>
                  </div>
                </div>

                {/* Solution appliquée */}
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px] text-blue-900 block">
                    4. Solution corrective appliquée :
                  </span>
                  <p className="bg-emerald-50/60 p-2.5 rounded border border-emerald-200/60 text-slate-800 leading-relaxed">
                    {selectedIntervention.solutionAppliquee}
                  </p>
                </div>

                {/* Moyens & Temps */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Matériel / Logiciel utilisé :</span>
                    <span className="font-medium text-slate-900">{selectedIntervention.materielLogicielUtilise}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Temps total consacré :</span>
                    <span className="font-bold text-slate-900">{selectedIntervention.tempsConsacreMin} minutes</span>
                  </div>
                </div>

                {/* Validation du demandeur */}
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-700" />
                      Validation & Clôture par le demandeur
                    </span>
                    <button
                      onClick={() => handleToggleValidation(selectedIntervention.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                        selectedIntervention.validationDemandeur
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {selectedIntervention.validationDemandeur ? 'Validé par demandeur' : 'Marquer comme validé'}
                    </button>
                  </div>
                  <p className="text-slate-600 italic">
                    « {selectedIntervention.commentairesDemandeur || 'Intervention validée sans réserve.'} »
                  </p>
                  {selectedIntervention.dateValidation && (
                    <span className="text-[10px] text-slate-500 block">
                      Date de signature : {selectedIntervention.dateValidation}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 italic">
              Sélectionnez une fiche d'intervention dans la liste pour afficher tous les détails.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
