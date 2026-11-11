import React, { useState } from 'react';
import { TacheJournal } from '../../types/it-tracker';
import { Plus, Search, Filter, CheckCircle2, Clock, AlertCircle, Calendar, ArrowUpDown } from 'lucide-react';

interface DailyLogSectionProps {
  taches: TacheJournal[];
  onUpdateTaches: (taches: TacheJournal[]) => void;
}

export const DailyLogSection: React.FC<DailyLogSectionProps> = ({ taches, onUpdateTaches }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [categoryFilter, setCategoryFilter] = useState<string>('Tous');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTask, setNewTask] = useState<Partial<TacheJournal>>({
    date: new Date().toISOString().split('T')[0],
    heure: '09:00',
    tache: '',
    description: '',
    categorie: 'Support Utilisateur',
    priorite: 'Normale',
    dureeEstimeeMin: 30,
    dureeReelleMin: 30,
    statut: 'Terminé',
    resultat: '',
    observations: '',
  });

  const handleStatusChange = (id: string, newStatus: TacheJournal['statut']) => {
    const updated = taches.map((t) => (t.id === id ? { ...t, statut: newStatus } : t));
    onUpdateTaches(updated);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.tache) return;

    const item: TacheJournal = {
      id: `JRN-${Date.now()}`,
      date: newTask.date || new Date().toISOString().split('T')[0],
      heure: newTask.heure || '09:00',
      tache: newTask.tache || '',
      description: newTask.description || '',
      categorie: (newTask.categorie as any) || 'Support Utilisateur',
      priorite: (newTask.priorite as any) || 'Normale',
      dureeEstimeeMin: Number(newTask.dureeEstimeeMin) || 30,
      dureeReelleMin: Number(newTask.dureeReelleMin) || 30,
      statut: (newTask.statut as any) || 'Terminé',
      resultat: newTask.resultat || 'Tâche effectuée avec succès.',
      observations: newTask.observations || 'N/A',
    };

    onUpdateTaches([item, ...taches]);
    setShowAddModal(false);
    setNewTask({
      date: new Date().toISOString().split('T')[0],
      heure: '09:00',
      tache: '',
      description: '',
      categorie: 'Support Utilisateur',
      priorite: 'Normale',
      dureeEstimeeMin: 30,
      dureeReelleMin: 30,
      statut: 'Terminé',
      resultat: '',
      observations: '',
    });
  };

  const filteredTaches = taches.filter((t) => {
    const matchSearch =
      t.tache.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.resultat.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.observations.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'Tous' || t.statut === statusFilter;
    const matchCat = categoryFilter === 'Tous' || t.categorie === categoryFilter;

    return matchSearch && matchStatus && matchCat;
  });

  const totalMinutes = filteredTaches.reduce((acc, t) => acc + (t.dureeReelleMin || 0), 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">3</span>
            Gestion Quotidienne des Activités (Journal de Bord)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Consignation chronologique des travaux, durées réelles, priorités, statuts et résultats techniques.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une tâche quotidienne</span>
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une tâche, description, observation..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
          >
            <option value="Tous">Tous les statuts</option>
            <option value="Terminé">Terminé</option>
            <option value="En cours">En cours</option>
            <option value="À faire">À faire</option>
            <option value="En attente">En attente</option>
            <option value="Reporté">Reporté</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
          >
            <option value="Tous">Toutes catégories</option>
            <option value="Support Utilisateur">Support Utilisateur</option>
            <option value="Déploiement Matériel">Déploiement Matériel</option>
            <option value="Réseau & Wifi">Réseau & Wifi</option>
            <option value="Système & Serveur">Système & Serveur</option>
            <option value="Maintenance Préventive">Maintenance Préventive</option>
            <option value="Sécurité & Sauvegarde">Sécurité & Sauvegarde</option>
            <option value="Gestion des Stocks">Gestion des Stocks</option>
          </select>

          <div className="bg-blue-50 text-blue-900 px-3 py-2 rounded-lg border border-blue-200 font-semibold">
            Temps total : {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </div>
        </div>
      </div>

      {/* Modal d'ajout de tâche */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Nouvelle Entrée au Journal Quotidien</span>
            </h3>

            <form onSubmit={handleAddTask} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newTask.date}
                    onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Heure</label>
                  <input
                    type="time"
                    required
                    value={newTask.heure}
                    onChange={(e) => setNewTask({ ...newTask, heure: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Tâche ou travail à effectuer</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Remplacement switch étage 1 et tests de connectivité"
                  value={newTask.tache}
                  onChange={(e) => setNewTask({ ...newTask, tache: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description détaillée de l'activité</label>
                <textarea
                  rows={2}
                  placeholder="Détails techniques, étapes, contexte..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={newTask.categorie}
                    onChange={(e) => setNewTask({ ...newTask, categorie: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="Support Utilisateur">Support Utilisateur</option>
                    <option value="Déploiement Matériel">Déploiement Matériel</option>
                    <option value="Réseau & Wifi">Réseau & Wifi</option>
                    <option value="Système & Serveur">Système & Serveur</option>
                    <option value="Maintenance Préventive">Maintenance Préventive</option>
                    <option value="Sécurité & Sauvegarde">Sécurité & Sauvegarde</option>
                    <option value="Gestion des Stocks">Gestion des Stocks</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Priorité</label>
                  <select
                    value={newTask.priorite}
                    onChange={(e) => setNewTask({ ...newTask, priorite: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="Faible">Faible</option>
                    <option value="Normale">Normale</option>
                    <option value="Élevée">Élevée</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Durée estimée (min)</label>
                  <input
                    type="number"
                    min={5}
                    value={newTask.dureeEstimeeMin}
                    onChange={(e) => setNewTask({ ...newTask, dureeEstimeeMin: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Durée réelle (min)</label>
                  <input
                    type="number"
                    min={0}
                    value={newTask.dureeReelleMin}
                    onChange={(e) => setNewTask({ ...newTask, dureeReelleMin: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Statut</label>
                  <select
                    value={newTask.statut}
                    onChange={(e) => setNewTask({ ...newTask, statut: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="Terminé">Terminé</option>
                    <option value="En cours">En cours</option>
                    <option value="À faire">À faire</option>
                    <option value="En attente">En attente</option>
                    <option value="Reporté">Reporté</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Résultat obtenu</label>
                  <input
                    type="text"
                    placeholder="Ex: Opérationnel, conforme..."
                    value={newTask.resultat}
                    onChange={(e) => setNewTask({ ...newTask, resultat: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Observations / Commentaires</label>
                <input
                  type="text"
                  placeholder="Observations complémentaires, suite à donner..."
                  value={newTask.observations}
                  onChange={(e) => setNewTask({ ...newTask, observations: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
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
                  Enregistrer dans le journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tableau du journal */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 font-semibold">Date & Heure</th>
                <th className="p-3 font-semibold">Tâche & Description</th>
                <th className="p-3 font-semibold">Catégorie</th>
                <th className="p-3 font-semibold">Priorité</th>
                <th className="p-3 font-semibold">Durée (Est./Réelle)</th>
                <th className="p-3 font-semibold">Statut</th>
                <th className="p-3 font-semibold">Résultat & Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredTaches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    Aucune entrée trouvée pour les critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredTaches.map((tache) => (
                  <tr key={tache.id} className="hover:bg-slate-50 transition border-b border-slate-100">
                    <td className="p-3 whitespace-nowrap align-top font-mono tabular-nums text-xs">
                      <span className="font-bold text-slate-900 block">{tache.date}</span>
                      <span className="text-[11px] text-slate-500">{tache.heure}</span>
                    </td>
                    <td className="p-3 align-top max-w-xs">
                      <strong className="text-slate-900 block font-bold text-xs">{tache.tache}</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{tache.description}</p>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <span className="text-slate-600 font-medium text-xs">
                        {tache.categorie}
                      </span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold ${
                          tache.priorite === 'Urgente'
                            ? 'text-red-700'
                            : tache.priorite === 'Élevée'
                            ? 'text-amber-700'
                            : tache.priorite === 'Normale'
                            ? 'text-blue-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {tache.priorite}
                      </span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums text-xs">
                      <span className="font-bold text-slate-900">{tache.dureeReelleMin}m</span>
                      <span className="text-slate-400 text-[11px] block">(est. {tache.dureeEstimeeMin}m)</span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <select
                        value={tache.statut}
                        onChange={(e) => handleStatusChange(tache.id, e.target.value as any)}
                        className={`text-xs font-semibold px-2 py-1 rounded border ${
                          tache.statut === 'Terminé'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : tache.statut === 'En cours'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : tache.statut === 'À faire'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="À faire">À faire</option>
                        <option value="En cours">En cours</option>
                        <option value="Terminé">Terminé</option>
                        <option value="Reporté">Reporté</option>
                        <option value="En attente">En attente</option>
                      </select>
                    </td>
                    <td className="p-3 align-top text-xs">
                      <div className="font-medium text-emerald-900 bg-emerald-50/60 p-1.5 rounded border border-emerald-200/60 mb-1 leading-snug">
                        {tache.resultat}
                      </div>
                      {tache.observations && (
                        <div className="text-slate-500 italic text-[11px]">
                          Obs : {tache.observations}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
