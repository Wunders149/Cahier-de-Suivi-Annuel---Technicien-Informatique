import React, { useState } from 'react';
import { EquipementParc } from '../../types/it-tracker';
import { Laptop, Plus, Search, Filter, ShieldCheck, Tag, Calendar, User, MapPin } from 'lucide-react';

interface InventorySectionProps {
  parc: EquipementParc[];
  onUpdateParc: (parc: EquipementParc[]) => void;
}

export const InventorySection: React.FC<InventorySectionProps> = ({ parc, onUpdateParc }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newItem, setNewItem] = useState<Partial<EquipementParc>>({
    numeroInventaire: `PARC-PC-0${parc.length + 1}`,
    designation: '',
    type: 'PC Portable',
    marqueModele: '',
    numeroSerie: '',
    configurationTechnique: '',
    dateAcquisition: new Date().toISOString().split('T')[0],
    etatMateriel: 'Bon état',
    utilisateurResponsable: '',
    service: '',
    localisation: '',
    finGarantie: '3 ans constructeur',
    dureeVieEstimeeAns: 4,
    historiqueInterventions: 'Mise en service initiale.',
  });

  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.designation || !newItem.marqueModele) return;

    const item: EquipementParc = {
      id: `PARC-${Date.now()}`,
      numeroInventaire: newItem.numeroInventaire || `PARC-${parc.length + 1}`,
      designation: newItem.designation || '',
      type: (newItem.type as any) || 'PC Portable',
      marqueModele: newItem.marqueModele || '',
      numeroSerie: newItem.numeroSerie || 'N/A',
      configurationTechnique: newItem.configurationTechnique || 'Standard',
      dateAcquisition: newItem.dateAcquisition || new Date().toISOString().split('T')[0],
      etatMateriel: (newItem.etatMateriel as any) || 'Bon état',
      utilisateurResponsable: newItem.utilisateurResponsable || 'Non attribué',
      service: newItem.service || 'Stock DSI',
      localisation: newItem.localisation || 'Atelier',
      finGarantie: newItem.finGarantie || '1 an',
      dureeVieEstimeeAns: Number(newItem.dureeVieEstimeeAns) || 4,
      historiqueInterventions: newItem.historiqueInterventions || 'Neuf',
    };

    onUpdateParc([item, ...parc]);
    setShowAddModal(false);
  };

  const filtered = parc.filter((p) => {
    const matchSearch =
      p.numeroInventaire.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.marqueModele.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.numeroSerie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.utilisateurResponsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.localisation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = typeFilter === 'Tous' || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const typesList = ['Tous', 'PC Portable', 'PC Fixe', 'Serveur', 'Imprimante', 'Écran', 'Switch/Réseau'];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">7</span>
            Gestion du Parc Informatique (CMDB & Inventaire Matériel)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Recensement exhaustif des actifs informatiques, numéros de série, caractéristiques, garanties et affectations.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Équipement</span>
        </button>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° inventaire, utilisateur, marque, numéro de série..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {typesList.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition ${
                typeFilter === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Modal ajout matériel */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-blue-600" />
              <span>Enregistrer un Nouvel Équipement dans le Parc</span>
            </h3>

            <form onSubmit={handleAddEquipment} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">N° Inventaire (Code-barres)</label>
                  <input
                    type="text"
                    required
                    value={newItem.numeroInventaire}
                    onChange={(e) => setNewItem({ ...newItem, numeroInventaire: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Type de matériel</label>
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="PC Portable">PC Portable</option>
                    <option value="PC Fixe">PC Fixe</option>
                    <option value="Serveur">Serveur</option>
                    <option value="Imprimante">Imprimante</option>
                    <option value="Écran">Écran</option>
                    <option value="Switch/Réseau">Switch/Réseau</option>
                    <option value="Smartphone">Smartphone</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Désignation</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PC Portable Dell Latitude 5540"
                    value={newItem.designation}
                    onChange={(e) => setNewItem({ ...newItem, designation: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Marque & Modèle précis</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dell Latitude 5540 15 pouces"
                    value={newItem.marqueModele}
                    onChange={(e) => setNewItem({ ...newItem, marqueModele: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Numéro de Série (S/N / Service Tag)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 8XYZ123"
                    value={newItem.numeroSerie}
                    onChange={(e) => setNewItem({ ...newItem, numeroSerie: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">État du matériel</label>
                  <select
                    value={newItem.etatMateriel}
                    onChange={(e) => setNewItem({ ...newItem, etatMateriel: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="Neuf">Neuf</option>
                    <option value="Très bon état">Très bon état</option>
                    <option value="Bon état">Bon état</option>
                    <option value="Dégradé">Dégradé</option>
                    <option value="En réparation">En réparation</option>
                    <option value="Rebut / Obsolète">Rebut / Obsolète</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Configuration Technique</label>
                <input
                  type="text"
                  placeholder="CPU, RAM, Disque, OS (Ex: i7-1365U, 32 Go, 1 To NVMe, Win 11 Pro)"
                  value={newItem.configurationTechnique}
                  onChange={(e) => setNewItem({ ...newItem, configurationTechnique: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Utilisateur responsable</label>
                  <input
                    type="text"
                    placeholder="Ex: Nom Prénom"
                    value={newItem.utilisateurResponsable}
                    onChange={(e) => setNewItem({ ...newItem, utilisateurResponsable: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Service / Département</label>
                  <input
                    type="text"
                    placeholder="Ex: RH, Finance, R&D"
                    value={newItem.service}
                    onChange={(e) => setNewItem({ ...newItem, service: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Localisation (Bureau)</label>
                  <input
                    type="text"
                    placeholder="Ex: Bât A - Bureau 102"
                    value={newItem.localisation}
                    onChange={(e) => setNewItem({ ...newItem, localisation: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date d'acquisition</label>
                  <input
                    type="date"
                    value={newItem.dateAcquisition}
                    onChange={(e) => setNewItem({ ...newItem, dateAcquisition: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Fin de garantie constructeur</label>
                  <input
                    type="text"
                    placeholder="Ex: 2027-05-15 (J+1 sur site)"
                    value={newItem.finGarantie}
                    onChange={(e) => setNewItem({ ...newItem, finGarantie: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
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
                  Ajouter à l'inventaire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tableau d'inventaire */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 font-semibold">N° Inv. / Type</th>
                <th className="p-3 font-semibold">Désignation & Modèle</th>
                <th className="p-3 font-semibold">N° Série (S/N)</th>
                <th className="p-3 font-semibold">Configuration Technique</th>
                <th className="p-3 font-semibold">Affectation & Lieu</th>
                <th className="p-3 font-semibold">Garantie & État</th>
                <th className="p-3 font-semibold">Historique Interventions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 align-top whitespace-nowrap">
                    <strong className="text-blue-900 font-bold block">{item.numeroInventaire}</strong>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      {item.type}
                    </span>
                  </td>
                  <td className="p-3 align-top">
                    <strong className="text-slate-900 block font-semibold">{item.designation}</strong>
                    <span className="text-[11px] text-slate-500">{item.marqueModele}</span>
                  </td>
                  <td className="p-3 align-top whitespace-nowrap font-mono text-[11px] text-slate-800 font-bold">
                    {item.numeroSerie}
                  </td>
                  <td className="p-3 align-top text-[11px] max-w-xs text-slate-700">
                    {item.configurationTechnique}
                  </td>
                  <td className="p-3 align-top text-[11px]">
                    <strong className="text-slate-900 block">{item.utilisateurResponsable}</strong>
                    <span className="text-slate-500 block">{item.service}</span>
                    <span className="text-slate-400 block text-[10px]">{item.localisation}</span>
                  </td>
                  <td className="p-3 align-top whitespace-nowrap text-[11px]">
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded block mb-1 text-center ${
                        item.etatMateriel.includes('bon') || item.etatMateriel === 'Neuf'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.etatMateriel}
                    </span>
                    <span className="text-slate-500 text-[10px] block">Garantie : {item.finGarantie}</span>
                  </td>
                  <td className="p-3 align-top text-[11px] text-slate-600 max-w-xs italic">
                    {item.historiqueInterventions || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
