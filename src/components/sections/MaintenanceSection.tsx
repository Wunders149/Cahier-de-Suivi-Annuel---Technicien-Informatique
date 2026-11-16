import React, { useState } from 'react';
import { ItemMaintenance } from '../../types/it-tracker';
import { CheckSquare, Plus, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import {
  fieldInputClass,
  fieldSelectClass,
  fieldTextareaClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/formStyles';

interface MaintenanceSectionProps {
  maintenances: ItemMaintenance[];
  onUpdateMaintenances: (maintenances: ItemMaintenance[]) => void;
}

export const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({
  maintenances,
  onUpdateMaintenances,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const [typeFilter, setTypeFilter] = useState<'Tous' | 'Préventive' | 'Corrective'>('Tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const categories = [
    'Tous',
    'Ordinateurs',
    'Imprimantes',
    'Périphériques',
    'Nettoyage physique',
    'Mise à jour OS',
    'Vérification Antivirus',
    'Disques et stockage',
    'Serveurs',
    'Équipements réseau',
    'Onduleurs',
    'Contrôle sauvegardes',
  ];

  const [newItem, setNewItem] = useState<Partial<ItemMaintenance>>({
    categorie: 'Ordinateurs',
    typeMaintenance: 'Préventive',
    tacheControle: '',
    frequence: 'Mensuelle',
    dernierControle: new Date().toISOString().split('T')[0],
    prochainControle: '',
    statut: 'Conforme',
    responsableOuEquipement: 'Parc bureautique',
    observations: '',
    valide: true,
  });

  const handleToggleValide = (id: string) => {
    const updated = maintenances.map((m) =>
      m.id === id ? { ...m, valide: !m.valide, statut: (!m.valide ? 'Conforme' : 'À traiter') as any } : m
    );
    onUpdateMaintenances(updated);
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.tacheControle) return;

    const item: ItemMaintenance = {
      id: `MNT-${Date.now()}`,
      categorie: (newItem.categorie as any) || 'Ordinateurs',
      typeMaintenance: (newItem.typeMaintenance as any) || 'Préventive',
      tacheControle: newItem.tacheControle || '',
      frequence: (newItem.frequence as any) || 'Mensuelle',
      dernierControle: newItem.dernierControle || new Date().toISOString().split('T')[0],
      prochainControle: newItem.prochainControle || '2026-12-31',
      statut: (newItem.statut as any) || 'Conforme',
      responsableOuEquipement: newItem.responsableOuEquipement || 'Parc global',
      observations: newItem.observations || '',
      valide: Boolean(newItem.valide),
    };

    onUpdateMaintenances([...maintenances, item]);
    setShowAddModal(false);
    setNewItem({
      categorie: 'Ordinateurs',
      typeMaintenance: 'Préventive',
      tacheControle: '',
      frequence: 'Mensuelle',
      dernierControle: new Date().toISOString().split('T')[0],
      prochainControle: '',
      statut: 'Conforme',
      responsableOuEquipement: 'Parc bureautique',
      observations: '',
      valide: true,
    });
  };

  const filtered = maintenances.filter((m) => {
    const matchCat = activeCategory === 'Tous' || m.categorie === activeCategory;
    const matchType = typeFilter === 'Tous' || m.typeMaintenance === typeFilter;
    const matchSearch =
      m.tacheControle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.responsableOuEquipement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.observations.toLowerCase().includes(searchTerm.toLowerCase());

    return matchCat && matchType && matchSearch;
  });

  const countConformes = maintenances.filter((m) => m.valide).length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">5</span>
            Maintenance Préventive et Corrective (11 Domaines)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Grilles de contrôle périodiques, check-lists de conformité et distinction stricte Préventif vs Correctif.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une Tâche de Maintenance</span>
        </button>
      </div>

      {/* Barre de métriques rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">Total points de contrôle</span>
            <strong className="text-lg font-bold text-slate-900">{maintenances.length}</strong>
          </div>
          <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-bold">11 Domaines</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-700 block">Contrôles conformes</span>
            <strong className="text-lg font-bold text-emerald-900">{countConformes} / {maintenances.length}</strong>
          </div>
          <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
            {Math.round((countConformes / (maintenances.length || 1)) * 100)}% OK
          </span>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-700 block">À traiter ou vérifier</span>
            <strong className="text-lg font-bold text-amber-900">
              {maintenances.filter((m) => !m.valide).length}
            </strong>
          </div>
          <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-bold">Action requise</span>
        </div>
      </div>

      {/* Filtres par domaine et type */}
      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        {/* Filtre Type (Préventive vs Corrective) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
            {(['Tous', 'Préventive', 'Corrective'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  typeFilter === t
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'Tous' ? 'Toutes les maintenances' : `Maintenance ${t}`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher tâche, matériel, note..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs"
            />
          </div>
        </div>

        {/* Boutons des 11 domaines */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Modal d'ajout */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Ajouter une tâche de maintenance"
        subtitle="Planifiez un contrôle préventif ou une action corrective sur les 11 domaines IT."
        icon={<CheckSquare className="w-4 h-4" />}
        size="lg"
        onSubmit={handleAddMaintenance}
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
              Enregistrer le contrôle
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Domaine & Procédure de contrôle">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Domaine" required>
                <select
                  value={newItem.categorie || 'Ordinateurs'}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      categorie: e.target.value as ItemMaintenance['categorie'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  {categories
                    .filter((c) => c !== 'Tous')
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </FormField>
              <FormField label="Type de maintenance" required>
                <select
                  value={newItem.typeMaintenance || 'Préventive'}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      typeMaintenance: e.target
                        .value as ItemMaintenance['typeMaintenance'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Préventive">Préventive</option>
                  <option value="Corrective">Corrective</option>
                </select>
              </FormField>
            </div>

            <FormField label="Équipement ou périmètre concerné" required>
              <input
                type="text"
                required
                placeholder="Ex: Baie serveur 1, Ensemble des postes portables..."
                value={newItem.responsableOuEquipement || ''}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    responsableOuEquipement: e.target.value,
                  })
                }
                className={fieldInputClass}
              />
            </FormField>

            <FormField label="Tâche de contrôle / Procédure" required>
              <textarea
                rows={2}
                required
                placeholder="Détail du contrôle ou de l'intervention..."
                value={newItem.tacheControle || ''}
                onChange={(e) =>
                  setNewItem({ ...newItem, tacheControle: e.target.value })
                }
                className={fieldTextareaClass}
              />
            </FormField>
          </FormSection>

          <FormSection title="2. Fréquence & Conformité" separated>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Fréquence">
                <select
                  value={newItem.frequence || 'Mensuelle'}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      frequence: e.target.value as ItemMaintenance['frequence'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Quotidienne">Quotidienne</option>
                  <option value="Hebdomadaire">Hebdomadaire</option>
                  <option value="Mensuelle">Mensuelle</option>
                  <option value="Trimestrielle">Trimestrielle</option>
                  <option value="Semestrielle">Semestrielle</option>
                  <option value="Annuelle">Annuelle</option>
                </select>
              </FormField>
              <FormField label="Dernier contrôle">
                <input
                  type="date"
                  value={newItem.dernierControle || ''}
                  onChange={(e) =>
                    setNewItem({ ...newItem, dernierControle: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Prochain contrôle">
                <input
                  type="date"
                  value={newItem.prochainControle || ''}
                  onChange={(e) =>
                    setNewItem({ ...newItem, prochainControle: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
              <FormField label="Statut de conformité">
                <select
                  value={newItem.statut || 'Conforme'}
                  onChange={(e) => {
                    const nextStatut = e.target.value as ItemMaintenance['statut'];
                    setNewItem({
                      ...newItem,
                      statut: nextStatut,
                      valide: nextStatut === 'Conforme',
                    });
                  }}
                  className={fieldSelectClass}
                >
                  <option value="Conforme">Conforme</option>
                  <option value="À traiter">À traiter</option>
                  <option value="Anomalie mineure">Anomalie mineure</option>
                  <option value="Critique">Critique</option>
                </select>
              </FormField>

              <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer select-none text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(newItem.valide)}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      valide: e.target.checked,
                      statut: e.target.checked ? 'Conforme' : 'À traiter',
                    })
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Marquer ce point comme validé conforme</span>
              </label>
            </div>

            <FormField label="Observations / Mesures relevées">
              <input
                type="text"
                placeholder="Notes techniques, valeurs mesurées..."
                value={newItem.observations || ''}
                onChange={(e) =>
                  setNewItem({ ...newItem, observations: e.target.value })
                }
                className={fieldInputClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      {/* Grille des tâches de maintenance */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 font-semibold">Valide</th>
                <th className="p-3 font-semibold">Domaine & Équipement</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Tâche de Contrôle & Procédure</th>
                <th className="p-3 font-semibold">Fréquence</th>
                <th className="p-3 font-semibold">Dernier / Prochain</th>
                <th className="p-3 font-semibold">Observations & Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    {maintenances.length === 0
                      ? "Aucune ligne de maintenance enregistrée. Cliquez sur « Nouveau Contrôle » pour créer vos fiches de maintenance préventive et corrective."
                      : "Aucune tâche de maintenance ne correspond à votre filtre."}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 align-top whitespace-nowrap">
                    <button
                      onClick={() => handleToggleValide(item.id)}
                      className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                        item.valide
                          ? 'bg-emerald-600 border-emerald-700 text-white'
                          : 'bg-white border-slate-300 hover:border-slate-400'
                      }`}
                      title={item.valide ? 'Marqué conforme (cliquer pour décocher)' : 'Cliquer pour valider'}
                    >
                      {item.valide && <CheckSquare className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                  <td className="p-3 align-top whitespace-nowrap">
                    <strong className="text-slate-900 block font-semibold">{item.categorie}</strong>
                    <span className="text-[11px] text-slate-500">{item.responsableOuEquipement}</span>
                  </td>
                  <td className="p-3 align-top whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.typeMaintenance === 'Préventive'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.typeMaintenance}
                    </span>
                  </td>
                  <td className="p-3 align-top max-w-sm">
                    <p className="text-slate-900 leading-snug">{item.tacheControle}</p>
                  </td>
                  <td className="p-3 align-top whitespace-nowrap">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                      {item.frequence}
                    </span>
                  </td>
                  <td className="p-3 align-top whitespace-nowrap text-[11px]">
                    <span className="text-slate-800 font-medium block">Fait le : {item.dernierControle}</span>
                    <span className="text-slate-400">Prochain : {item.prochainControle}</span>
                  </td>
                  <td className="p-3 align-top text-[11px]">
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded inline-block mb-1 ${
                        item.valide ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.statut}
                    </span>
                    {item.observations && (
                      <p className="text-slate-500 italic mt-0.5">{item.observations}</p>
                    )}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
