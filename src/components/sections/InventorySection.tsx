import React, { useMemo, useState } from 'react';
import { EquipementParc } from '../../types/it-tracker';
import { Laptop, Plus, Search, X, PlugZap } from 'lucide-react';
import { InventoryDataViz, categorizeEquipment } from '../inventory/InventoryDataViz';
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

interface InventorySectionProps {
  parc: EquipementParc[];
  onUpdateParc: (parc: EquipementParc[]) => void;
  onShowToast?: (msg: string) => void;
  onOpenSogedipromaSync?: () => void;
}

export const InventorySection: React.FC<InventorySectionProps> = ({
  parc,
  onUpdateParc,
  onShowToast,
  onOpenSogedipromaSync,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // États CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const getNextInventoryRef = () => {
    const maxNum = parc.reduce((max, p) => {
      const m = p.numeroInventaire?.match(/(\d+)$/);
      const parsed = m ? parseInt(m[1], 10) : 0;
      return Number.isFinite(parsed) && parsed > max ? parsed : max;
    }, 0);
    const nextNum = Math.max(parc.length + 1, maxNum + 1);
    return `PARC-PC-${String(nextNum).padStart(2, '0')}`;
  };

  const createDefaultForm = (): Partial<EquipementParc> => ({
    numeroInventaire: getNextInventoryRef(),
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

  const [formItem, setFormItem] = useState<Partial<EquipementParc>>(createDefaultForm);

  const inspectingItem = useMemo(
    () => parc.find((p) => p.id === inspectingId) || null,
    [parc, inspectingId]
  );

  const deletingItem = useMemo(
    () => parc.find((p) => p.id === deletingId) || null,
    [parc, deletingId]
  );

  const openCreateModal = () => {
    setEditingId(null);
    setIsDuplicating(false);
    setFormItem(createDefaultForm());
    setModalOpen(true);
  };

  const openEditModal = (item: EquipementParc) => {
    setEditingId(item.id);
    setIsDuplicating(false);
    setFormItem({ ...item });
    setModalOpen(true);
  };

  const openDuplicateModal = (item: EquipementParc) => {
    setEditingId(null);
    setIsDuplicating(true);
    setFormItem({
      ...item,
      id: undefined,
      numeroInventaire: getNextInventoryRef(),
      numeroSerie: '',
      utilisateurResponsable: 'Stock DSI',
      historiqueInterventions: 'Dupliqué depuis équipement de référence.',
    });
    setModalOpen(true);
  };

  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItem.designation?.trim() || !formItem.marqueModele?.trim()) return;

    const payload: EquipementParc = {
      id: editingId || `PARC-${Date.now()}`,
      numeroInventaire: formItem.numeroInventaire?.trim() || getNextInventoryRef(),
      designation: formItem.designation.trim(),
      type: (formItem.type as EquipementParc['type']) || 'PC Portable',
      marqueModele: formItem.marqueModele.trim(),
      numeroSerie: formItem.numeroSerie?.trim() || 'N/A',
      configurationTechnique: formItem.configurationTechnique?.trim() || 'Standard',
      dateAcquisition:
        formItem.dateAcquisition || new Date().toISOString().split('T')[0],
      etatMateriel:
        (formItem.etatMateriel as EquipementParc['etatMateriel']) || 'Bon état',
      utilisateurResponsable: formItem.utilisateurResponsable?.trim() || 'Non attribué',
      service: formItem.service?.trim() || 'Stock DSI',
      localisation: formItem.localisation?.trim() || 'Atelier',
      finGarantie: formItem.finGarantie?.trim() || '1 an',
      dureeVieEstimeeAns: Math.max(1, Number(formItem.dureeVieEstimeeAns) || 4),
      historiqueInterventions: formItem.historiqueInterventions?.trim() || 'Neuf',
    };

    if (editingId) {
      onUpdateParc(parc.map((p) => (p.id === editingId ? payload : p)));
      notify(`Fiche actif ${payload.numeroInventaire} mise à jour.`);
    } else {
      onUpdateParc([payload, ...parc]);
      notify(
        isDuplicating
          ? `Actif dupliqué (${payload.numeroInventaire}).`
          : `Équipement ${payload.numeroInventaire} ajouté au parc.`
      );
    }

    setModalOpen(false);
    setEditingId(null);
    setIsDuplicating(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingId) return;
    onUpdateParc(parc.filter((p) => p.id !== deletingId));
    if (inspectingId === deletingId) setInspectingId(null);
    setDeletingId(null);
    notify('Équipement supprimé du parc CMDB.');
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
    const matchCategory =
      !selectedCategory || categorizeEquipment(p) === selectedCategory;

    return matchSearch && matchType && matchCategory;
  });

  const typesList = [
    'Tous',
    'PC Portable',
    'PC Fixe',
    'Serveur',
    'Imprimante',
    'Écran',
    'Périphérique',
    'Switch/Réseau',
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
              7
            </span>
            <span>Gestion du Parc Informatique (CMDB &amp; Inventaire Matériel)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Recensement exhaustif des actifs informatiques, numéros de série, caractéristiques, garanties et affectations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenSogedipromaSync && (
            <button
              type="button"
              onClick={onOpenSogedipromaSync}
              className={secondaryButtonClass}
              title="Importer ou synchroniser les matériels & équipements depuis SOGEDIPROMA (/api/state)"
            >
              <PlugZap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sync SOGEDIPROMA</span>
            </button>
          )}
          <button type="button" onClick={openCreateModal} className={primaryButtonClass}>
            <Plus className="w-4 h-4" />
            <span>Ajouter un Équipement</span>
          </button>
        </div>
      </div>

      {/* Visualisation Recharts : Répartition du parc par type d'équipement */}
      <InventoryDataViz
        parc={parc}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Filtres et recherche */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs">
        <div className="flex-1 flex items-center gap-2">
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

          {selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 text-xs font-semibold whitespace-nowrap transition"
              title="Réinitialiser le filtre de famille"
            >
              <span>{selectedCategory}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {typesList.map((t) => (
            <button
              key={t}
              type="button"
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

      {/* Modal Création / Édition / Duplication matériel */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId
            ? `Modifier l'équipement (${formItem.numeroInventaire || ''})`
            : isDuplicating
            ? 'Dupliquer un équipement du parc'
            : 'Enregistrer un nouvel équipement'
        }
        subtitle="Gérez la fiche complète de l'actif informatique dans le référentiel CMDB."
        icon={<Laptop className="w-4 h-4" />}
        size="lg"
        onSubmit={handleSaveEquipment}
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
              {editingId ? 'Enregistrer les modifications' : "Ajouter à l'inventaire"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Identification & Matériel">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="N° Inventaire (Code-barres)" required>
                <input
                  type="text"
                  required
                  value={formItem.numeroInventaire || ''}
                  onChange={(e) =>
                    setFormItem({ ...formItem, numeroInventaire: e.target.value })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Type de matériel" required>
                <select
                  value={formItem.type || 'PC Portable'}
                  onChange={(e) =>
                    setFormItem({
                      ...formItem,
                      type: e.target.value as EquipementParc['type'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="PC Portable">PC Portable</option>
                  <option value="PC Fixe">PC Fixe</option>
                  <option value="Serveur">Serveur</option>
                  <option value="Écran">Écran</option>
                  <option value="Périphérique">
                    Périphérique (Onduleur, Dock, Scanner...)
                  </option>
                  <option value="Imprimante">Imprimante</option>
                  <option value="Switch/Réseau">Switch/Réseau</option>
                  <option value="Smartphone">Smartphone</option>
                  <option value="Tablette">Tablette</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Désignation" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: PC Portable Dell Latitude 5540"
                  value={formItem.designation || ''}
                  onChange={(e) =>
                    setFormItem({ ...formItem, designation: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Marque & Modèle précis" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dell Latitude 5540 15 pouces"
                  value={formItem.marqueModele || ''}
                  onChange={(e) =>
                    setFormItem({ ...formItem, marqueModele: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Numéro de Série (S/N)" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: 8XYZ123"
                  value={formItem.numeroSerie || ''}
                  onChange={(e) =>
                    setFormItem({ ...formItem, numeroSerie: e.target.value })
                  }
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>
              <FormField label="État du matériel">
                <select
                  value={formItem.etatMateriel || 'Bon état'}
                  onChange={(e) =>
                    setFormItem({
                      ...formItem,
                      etatMateriel: e.target.value as EquipementParc['etatMateriel'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Neuf">Neuf</option>
                  <option value="Très bon état">Très bon état</option>
                  <option value="Bon état">Bon état</option>
                  <option value="Dégradé">Dégradé</option>
                  <option value="En réparation">En réparation</option>
                  <option value="Rebut / Obsolète">Rebut / Obsolète</option>
                </select>
              </FormField>
            </div>

            <FormField
              label="Configuration technique"
              hint="Processeur, mémoire vive, stockage, système d'exploitation."
            >
              <input
                type="text"
                placeholder="Ex: i7-1365U, 32 Go RAM, 1 To NVMe, Windows 11 Pro"
                value={formItem.configurationTechnique || ''}
                onChange={(e) =>
                  setFormItem({
                    ...formItem,
                    configurationTechnique: e.target.value,
                  })
                }
                className={fieldInputClass}
              />
            </FormField>
          </FormSection>

          <FormSection title="2. Affectation, Garantie & Historique" separated>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Utilisateur responsable">
                <input
                  type="text"
                  placeholder="Ex: Nom Prénom"
                  value={formItem.utilisateurResponsable || ''}
                  onChange={(e) =>
                    setFormItem({
                      ...formItem,
                      utilisateurResponsable: e.target.value,
                    })
                  }
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Service / Département">
                <input
                  type="text"
                  placeholder="Ex: RH, Finance, R&D"
                  value={formItem.service || ''}
                  onChange={(e) =>
                    setFormItem({ ...formItem, service: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Localisation (Bureau)">
                <input
                  type="text"
                  placeholder="Ex: Bât A - Bureau 102"
                  value={formItem.localisation || ''}
                  onChange={(e) =>
                    setFormItem({ ...formItem, localisation: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Date d'acquisition">
                <input
                  type="date"
                  value={formItem.dateAcquisition || ''}
                  onChange={(e) =>
                    setFormItem({ ...formItem, dateAcquisition: e.target.value })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Fin de garantie constructeur">
                <input
                  type="text"
                  placeholder="Ex: 2027-05-15 (J+1)"
                  value={formItem.finGarantie || ''}
                  onChange={(e) =>
                    setFormItem({ ...formItem, finGarantie: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Durée de vie estimée (ans)">
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={formItem.dureeVieEstimeeAns ?? 4}
                  onChange={(e) =>
                    setFormItem({
                      ...formItem,
                      dureeVieEstimeeAns: Math.max(1, parseInt(e.target.value, 10) || 4),
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <FormField label="Historique des interventions & notes CMDB">
              <textarea
                rows={2}
                placeholder="Opérations réalisées, upgrades RAM/SSD, tickets associés..."
                value={formItem.historiqueInterventions || ''}
                onChange={(e) =>
                  setFormItem({ ...formItem, historiqueInterventions: e.target.value })
                }
                className={fieldTextareaClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Fiche Détail Actif CMDB (READ) */}
      <Modal
        isOpen={Boolean(inspectingItem)}
        onClose={() => setInspectingId(null)}
        title={inspectingItem?.designation || 'Fiche Actif CMDB'}
        subtitle={
          inspectingItem
            ? `${inspectingItem.numeroInventaire} · ${inspectingItem.type} · ${inspectingItem.marqueModele}`
            : undefined
        }
        icon={<Laptop className="w-4 h-4" />}
        size="md"
        footer={
          inspectingItem && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(inspectingItem.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold"
              >
                Supprimer
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingItem;
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
                    const target = inspectingItem;
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
        {inspectingItem && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500">N° Série</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {inspectingItem.numeroSerie}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">État</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {inspectingItem.etatMateriel}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Fin de garantie</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {inspectingItem.finGarantie}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Utilisateur</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {inspectingItem.utilisateurResponsable}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Service / Lieu</div>
                <div className="text-slate-800 mt-0.5">
                  {inspectingItem.service} · {inspectingItem.localisation}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Acquisition / Vie</div>
                <div className="font-mono tabular-nums text-slate-800 mt-0.5">
                  {inspectingItem.dateAcquisition} ({inspectingItem.dureeVieEstimeeAns} ans)
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Configuration technique
              </h4>
              <p className="text-slate-800 leading-relaxed">
                {inspectingItem.configurationTechnique}
              </p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Historique des interventions
              </h4>
              <p className="text-slate-700 p-3 rounded-lg bg-slate-50 border border-slate-200 whitespace-pre-line">
                {inspectingItem.historiqueInterventions || 'Aucune intervention enregistrée.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer cet équipement du parc ?"
        itemLabel={deletingItem ? `${deletingItem.numeroInventaire} — ${deletingItem.designation}` : ''}
        itemMeta={
          deletingItem
            ? `S/N ${deletingItem.numeroSerie} · ${deletingItem.utilisateurResponsable}`
            : undefined
        }
      />

      {/* Tableau d'inventaire */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 font-semibold whitespace-nowrap">N° Inv. / Type</th>
                <th className="p-3 font-semibold">Désignation &amp; Modèle</th>
                <th className="p-3 font-semibold whitespace-nowrap">N° Série (S/N)</th>
                <th className="p-3 font-semibold">Configuration Technique</th>
                <th className="p-3 font-semibold">Affectation &amp; Lieu</th>
                <th className="p-3 font-semibold whitespace-nowrap">Garantie &amp; État</th>
                <th className="p-3 font-semibold">Historique Interventions</th>
                <th className="p-3 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="space-y-2">
                      <p className="text-slate-600 font-medium">
                        {parc.length === 0
                          ? "Aucun équipement enregistré dans le parc CMDB."
                          : 'Aucun équipement ne correspond à votre recherche.'}
                      </p>
                      {parc.length === 0 && (
                        <button
                          type="button"
                          onClick={openCreateModal}
                          className={primaryButtonClass}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter le premier équipement</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition border-b border-slate-100"
                  >
                    <td className="p-3 align-top whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setInspectingId(item.id)}
                        className="font-mono tabular-nums text-blue-900 hover:text-blue-700 font-bold block text-xs"
                      >
                        {item.numeroInventaire}
                      </button>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {item.type}
                      </span>
                    </td>
                    <td className="p-3 align-top">
                      <button
                        type="button"
                        onClick={() => setInspectingId(item.id)}
                        className="text-left text-slate-900 hover:text-blue-700 block font-bold text-xs"
                      >
                        {item.designation}
                      </button>
                      <span className="text-[11px] text-slate-500">{item.marqueModele}</span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums text-xs text-slate-800 font-bold">
                      {item.numeroSerie}
                    </td>
                    <td className="p-3 align-top text-xs max-w-xs text-slate-700 leading-snug">
                      {item.configurationTechnique}
                    </td>
                    <td className="p-3 align-top text-xs">
                      <strong className="text-slate-900 block font-bold">
                        {item.utilisateurResponsable}
                      </strong>
                      <span className="text-slate-500 block text-[11px]">{item.service}</span>
                      <span className="text-slate-400 block text-[10px]">
                        {item.localisation}
                      </span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap text-xs">
                      <span
                        className={`font-semibold block mb-0.5 ${
                          item.etatMateriel.includes('bon') || item.etatMateriel === 'Neuf'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {item.etatMateriel}
                      </span>
                      <span className="text-slate-500 text-[10px] block font-mono tabular-nums">
                        Garantie : {item.finGarantie}
                      </span>
                    </td>
                    <td className="p-3 align-top text-xs text-slate-600 max-w-xs italic leading-snug">
                      {item.historiqueInterventions || 'N/A'}
                    </td>
                    <td className="p-3 align-top text-right whitespace-nowrap">
                      <CrudRowActions
                        onView={() => setInspectingId(item.id)}
                        onEdit={() => openEditModal(item)}
                        onDuplicate={() => openDuplicateModal(item)}
                        onDelete={() => setDeletingId(item.id)}
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
  );
};
