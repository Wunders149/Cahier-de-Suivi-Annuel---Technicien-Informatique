import React, { useState } from 'react';
import { ObjectifAnnuel, JalonCalendrier } from '../../types/it-tracker';
import { Target, Calendar, Plus, CheckCircle, Clock, AlertTriangle, CheckSquare, Sparkles } from 'lucide-react';

interface AnnualPlanSectionProps {
  objectifs: ObjectifAnnuel[];
  jalons: JalonCalendrier[];
  onUpdateObjectifs: (objectifs: ObjectifAnnuel[]) => void;
  onUpdateJalons: (jalons: JalonCalendrier[]) => void;
}

export const AnnualPlanSection: React.FC<AnnualPlanSectionProps> = ({
  objectifs,
  jalons,
  onUpdateObjectifs,
  onUpdateJalons,
}) => {
  const [showAddObjective, setShowAddObjective] = useState(false);
  const [newObj, setNewObj] = useState<Partial<ObjectifAnnuel>>({
    titre: '',
    description: '',
    missionsPrevue: '',
    resultatsAttendus: '',
    ressourcesNecessaires: '',
    echeance: '2026-12-31',
    priorite: 'Haute',
    kpi: '',
    avancement: 0,
    statut: 'Non démarré',
  });

  const handleToggleJalon = (id: string) => {
    const updated = jalons.map((j) => (j.id === id ? { ...j, estComplete: !j.estComplete } : j));
    onUpdateJalons(updated);
  };

  const handleUpdateAvancement = (id: string, delta: number) => {
    const updated = objectifs.map((obj) => {
      if (obj.id === id) {
        const newVal = Math.min(100, Math.max(0, obj.avancement + delta));
        let newStatut = obj.statut;
        if (newVal === 100) newStatut = 'Atteint';
        else if (newVal > 0) newStatut = 'En cours';
        else newStatut = 'Non démarré';
        return { ...obj, avancement: newVal, statut: newStatut };
      }
      return obj;
    });
    onUpdateObjectifs(updated);
  };

  const handleAddObjectiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObj.titre) return;
    const item: ObjectifAnnuel = {
      id: `OBJ-${objectifs.length + 1 < 10 ? '0' + (objectifs.length + 1) : objectifs.length + 1}`,
      titre: newObj.titre || '',
      description: newObj.description || '',
      missionsPrevue: newObj.missionsPrevue || '',
      resultatsAttendus: newObj.resultatsAttendus || '',
      ressourcesNecessaires: newObj.ressourcesNecessaires || '',
      echeance: newObj.echeance || '2026-12-31',
      priorite: (newObj.priorite as any) || 'Moyenne',
      kpi: newObj.kpi || '',
      avancement: newObj.avancement || 0,
      statut: newObj.avancement === 100 ? 'Atteint' : newObj.avancement! > 0 ? 'En cours' : 'Non démarré',
    };
    onUpdateObjectifs([...objectifs, item]);
    setShowAddObjective(false);
    setNewObj({
      titre: '',
      description: '',
      missionsPrevue: '',
      resultatsAttendus: '',
      ressourcesNecessaires: '',
      echeance: '2026-12-31',
      priorite: 'Haute',
      kpi: '',
      avancement: 0,
      statut: 'Non démarré',
    });
  };

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">2</span>
            Planification Annuelle & Calendrier d'Activité
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Définition des objectifs stratégiques annuels, missions prévues, KPI et jalonnement mensuel de Janvier à Décembre.
          </p>
        </div>
        <button
          onClick={() => setShowAddObjective(!showAddObjective)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel Objectif Annuel</span>
        </button>
      </div>

      {/* Formulaire ajout objectif */}
      {showAddObjective && (
        <form onSubmit={handleAddObjectiveSubmit} className="bg-slate-50 border border-blue-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-blue-900">Ajouter un objectif annuel</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Intitulé de l'objectif</label>
              <input
                type="text"
                required
                value={newObj.titre}
                onChange={(e) => setNewObj({ ...newObj, titre: e.target.value })}
                placeholder="Ex: Migration du parc vers Windows 11 Entreprise"
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Missions et activités prévues</label>
              <textarea
                value={newObj.missionsPrevue}
                onChange={(e) => setNewObj({ ...newObj, missionsPrevue: e.target.value })}
                rows={2}
                placeholder="Étapes clés, actions de terrain..."
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Résultats attendus</label>
              <textarea
                value={newObj.resultatsAttendus}
                onChange={(e) => setNewObj({ ...newObj, resultatsAttendus: e.target.value })}
                rows={2}
                placeholder="Livrables concrets, critères de succès..."
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Ressources nécessaires</label>
              <input
                type="text"
                value={newObj.ressourcesNecessaires}
                onChange={(e) => setNewObj({ ...newObj, ressourcesNecessaires: e.target.value })}
                placeholder="Matériel, licences, budget..."
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Indicateur de Performance (KPI)</label>
              <input
                type="text"
                value={newObj.kpi}
                onChange={(e) => setNewObj({ ...newObj, kpi: e.target.value })}
                placeholder="Ex: Taux de couverture > 98%"
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Échéance</label>
              <input
                type="date"
                value={newObj.echeance}
                onChange={(e) => setNewObj({ ...newObj, echeance: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Priorité</label>
              <select
                value={newObj.priorite}
                onChange={(e) => setNewObj({ ...newObj, priorite: e.target.value as any })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              >
                <option value="Haute">Haute</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Basse">Basse</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddObjective(false)}
              className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Enregistrer l'objectif
            </button>
          </div>
        </form>
      )}

      {/* Cartes des objectifs annuels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span>Tableau des Objectifs Annuels & Indicateurs Clés ({objectifs.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            Moyenne d'avancement globale :{' '}
            <strong className="text-blue-700">
              {Math.round(objectifs.reduce((acc, o) => acc + o.avancement, 0) / (objectifs.length || 1))}%
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {objectifs.map((obj) => (
            <div
              key={obj.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-bold">
                      {obj.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        obj.priorite === 'Haute'
                          ? 'bg-red-100 text-red-800'
                          : obj.priorite === 'Moyenne'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Priorité {obj.priorite}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        obj.statut === 'Atteint'
                          ? 'bg-emerald-100 text-emerald-800'
                          : obj.statut === 'En cours'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {obj.statut}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{obj.titre}</h4>
                  <p className="text-xs text-slate-500">{obj.description}</p>
                </div>

                {/* Boutons d'avancement rapide */}
                <div className="flex items-center gap-1.5 self-start shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => handleUpdateAvancement(obj.id, -10)}
                    className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-300"
                    title="Diminuer 10%"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-slate-800 w-10 text-center">{obj.avancement}%</span>
                  <button
                    onClick={() => handleUpdateAvancement(obj.id, 10)}
                    className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center"
                    title="Augmenter 10%"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full transition-all duration-300 ${
                    obj.avancement >= 80 ? 'bg-emerald-500' : obj.avancement >= 40 ? 'bg-blue-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${obj.avancement}%` }}
                />
              </div>

              {/* Détails complémentaires */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100 text-slate-600">
                <div>
                  <strong className="text-slate-800 block">Missions prévues :</strong>
                  <span>{obj.missionsPrevue}</span>
                </div>
                <div>
                  <strong className="text-slate-800 block">Résultats attendus :</strong>
                  <span>{obj.resultatsAttendus}</span>
                </div>
                <div>
                  <strong className="text-slate-800 block">KPI & Échéance :</strong>
                  <span className="text-blue-700 font-semibold">{obj.kpi}</span>
                  <span className="block text-slate-500 text-[11px]">Échéance : {obj.echeance}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendrier Annuel Janvier - Décembre */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Calendrier Annuel des Jalons & Opérations Majeures (Janvier à Décembre)</span>
          </h3>
          <span className="text-xs text-slate-500">
            {jalons.filter((j) => j.estComplete).length} / {jalons.length} jalons validés
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jalons.map((jalon) => (
            <div
              key={jalon.id}
              onClick={() => handleToggleJalon(jalon.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                jalon.estComplete
                  ? 'bg-emerald-50/70 border-emerald-300 text-slate-800'
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                    Mois {jalon.mois < 10 ? '0' + jalon.mois : jalon.mois} • {moisNoms[jalon.mois - 1]}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      jalon.categorie === 'Audit'
                        ? 'bg-purple-100 text-purple-700'
                        : jalon.categorie === 'Maintenance'
                        ? 'bg-amber-100 text-amber-700'
                        : jalon.categorie === 'Projet'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {jalon.categorie}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 leading-snug">{jalon.titre}</h5>
                <p className="text-[11px] text-slate-500 mt-1">{jalon.description}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">Prio: {jalon.priorite}</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold text-xs ${
                    jalon.estComplete ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {jalon.estComplete ? 'Validé' : 'À planifier'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
