import React, { useMemo, useState } from 'react';
import { EquipementParc } from '../../types/it-tracker';
import {
  Laptop,
  Plus,
  Search,
  X,
  PlugZap,
  QrCode,
  Users,
  Building2,
  Truck,
  Smartphone,
  FileCheck2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useSogedipromaLiveSnapshot } from '../../utils/sogedipromaLiveStore';
import { getLocalTodayIso } from '../../utils/coherenceUtils';
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

  // Onglets avancés SOGEDIPROMA (Campagne QR + Agents/Flotte/Fournisseurs)
  const liveSnapshot = useSogedipromaLiveSnapshot();
  const [activeTab, setActiveTab] = useState<'parc' | 'campaign' | 'directory'>('parc');
  const [campSearch, setCampSearch] = useState('');
  const [campStatusFilter, setCampStatusFilter] = useState<'Tous' | 'Pointés' | 'À pointer'>('Tous');
  const [campLimit, setCampLimit] = useState(50);

  const [empSearch, setEmpSearch] = useState('');
  const [empFilter, setEmpFilter] = useState<
    'Tous' | 'Flotte GSM' | 'Charte signée' | 'Charte manquante'
  >('Tous');
  const [empLimit, setEmpLimit] = useState(50);

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
    dateAcquisition: getLocalTodayIso(),
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
      dateAcquisition: formItem.dateAcquisition || getLocalTodayIso(),
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

  const campaign = liveSnapshot?.inventoryCampaign || null;

  const filteredCampaignItems = useMemo(() => {
    const items = campaign?.items || [];
    const q = campSearch.trim().toLowerCase();
    return items.filter((it) => {
      const isChecked = Boolean(it.checkedAt || (it.resultStatus && it.resultStatus !== 'Non pointé'));
      if (campStatusFilter === 'Pointés' && !isChecked) return false;
      if (campStatusFilter === 'À pointer' && isChecked) return false;
      if (!q) return true;
      return (
        it.qrCode.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        it.assignedName.toLowerCase().includes(q) ||
        it.department.toLowerCase().includes(q) ||
        it.location.toLowerCase().includes(q)
      );
    });
  }, [campaign, campSearch, campStatusFilter]);

  const filteredEmployees = useMemo(() => {
    const rows = liveSnapshot?.employees || [];
    const q = empSearch.trim().toLowerCase();
    return rows.filter((e) => {
      if (empFilter === 'Flotte GSM' && !e.fleetPhone) return false;
      if (empFilter === 'Charte signée' && !e.hasCharter) return false;
      if (empFilter === 'Charte manquante' && e.hasCharter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.fleetPhone.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
      );
    });
  }, [liveSnapshot?.employees, empSearch, empFilter]);

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

      {/* Onglets Parc CMDB vs Campagne QR vs Annuaire Agents/Fournisseurs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('parc')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'parc'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Parc CMDB ({parc.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('campaign')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'campaign'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Campagne Inventaire {campaign?.year || new Date().getFullYear()} (
              {campaign ? `${campaign.checkedItems}/${campaign.totalItems}` : '0/0'})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'directory'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Agents, Flotte &amp; Fournisseurs ({liveSnapshot?.counts.employees || 0})
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'parc' && (
        <>
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
        </>
      )}

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

      {activeTab === 'campaign' ? (
        <div className="space-y-4">
          {!campaign ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              Synchronisez SOGEDIPROMA pour exploiter la campagne d&apos;inventaire annuel (codes QR et pointages).
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{campaign.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Périmètre : {campaign.scopeLabel} · Compteur : {campaign.counter} · Valideur :{' '}
                      {campaign.reviewer} · Statut : <strong className="text-blue-700">{campaign.status}</strong>
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="text-lg font-bold text-slate-900">
                      {campaign.checkedItems} / {campaign.totalItems}
                    </span>
                    <span className="text-xs text-slate-500 block">
                      {Math.round((campaign.checkedItems / (campaign.totalItems || 1)) * 100)}% pointés ·{' '}
                      <span className="text-emerald-700">{campaign.conformeCount} conforme(s)</span>
                      {campaign.anomalyCount > 0 && (
                        <span className="text-amber-700"> · {campaign.anomalyCount} anomalie(s)</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((campaign.checkedItems / (campaign.totalItems || 1)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={campSearch}
                    onChange={(e) => {
                      setCampSearch(e.target.value);
                      setCampLimit(50);
                    }}
                    placeholder="Scanner ou rechercher un code QR (A-...), code actif, utilisateur, lieu..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                  {(['Tous', 'Pointés', 'À pointer'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setCampStatusFilter(st);
                        setCampLimit(50);
                      }}
                      className={`px-3 py-1 rounded-md font-semibold transition ${
                        campStatusFilter === st
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="p-3 font-semibold whitespace-nowrap">Code Actif / QR</th>
                        <th className="p-3 font-semibold">Équipement &amp; Catégorie</th>
                        <th className="p-3 font-semibold">Collaborateur &amp; Service</th>
                        <th className="p-3 font-semibold whitespace-nowrap">Statut Pointage</th>
                        <th className="p-3 font-semibold whitespace-nowrap">Contrôle &amp; Méthode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {filteredCampaignItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">
                            Aucun équipement trouvé dans la campagne pour ce filtre.
                          </td>
                        </tr>
                      ) : (
                        filteredCampaignItems.slice(0, campLimit).map((it) => {
                          const isChecked = Boolean(
                            it.checkedAt || (it.resultStatus && it.resultStatus !== 'Non pointé')
                          );
                          return (
                            <tr key={it.id} className="hover:bg-slate-50 transition">
                              <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums">
                                <strong className="text-blue-900 block">{it.code}</strong>
                                <span className="text-[11px] text-slate-500">
                                  {it.qrCode || '—'}
                                </span>
                              </td>
                              <td className="p-3 align-top">
                                <strong className="text-slate-900 block font-semibold">
                                  {it.name}
                                </strong>
                                <span className="text-[11px] text-slate-500">
                                  {it.category} · {it.location}
                                </span>
                              </td>
                              <td className="p-3 align-top">
                                <span className="font-medium text-slate-900 block">
                                  {it.assignedName || 'Non affecté'}
                                </span>
                                <span className="text-[11px] text-slate-500">{it.department}</span>
                              </td>
                              <td className="p-3 align-top whitespace-nowrap">
                                {isChecked ? (
                                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {it.resultStatus || 'Conforme'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                                    <Clock className="w-3.5 h-3.5" />
                                    À pointer
                                  </span>
                                )}
                              </td>
                              <td className="p-3 align-top whitespace-nowrap text-[11px] text-slate-600">
                                {it.checkedAt ? (
                                  <>
                                    <span className="font-mono tabular-nums block text-slate-800">
                                      {it.checkedAt.slice(0, 10)}
                                    </span>
                                    <span>
                                      {it.checkedBy || 'Contrôleur'}
                                      {it.checkMethod ? ` (${it.checkMethod})` : ''}
                                    </span>
                                  </>
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredCampaignItems.length > campLimit && (
                  <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums text-slate-600">
                      Affichage {campLimit} / {filteredCampaignItems.length} équipements
                    </span>
                    <button
                      type="button"
                      onClick={() => setCampLimit((n) => n + 50)}
                      className={secondaryButtonClass}
                    >
                      Afficher +50 équipements
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : activeTab === 'directory' ? (
        <div className="space-y-6">
          {/* 4 KPI Annuaire SOGEDIPROMA */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Collaborateurs actifs</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <strong className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {liveSnapshot?.counts.employees || 0}
              </strong>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Lignes Flotte GSM</span>
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </div>
              <strong className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1 block">
                {liveSnapshot?.counts.fleetPhones || 0}
              </strong>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Chartes IT signées</span>
                <FileCheck2 className="w-4 h-4 text-blue-600" />
              </div>
              <strong className="text-xl font-bold font-mono tabular-nums text-blue-800 mt-1 block">
                {liveSnapshot?.counts.chartersSigned || 0} / {liveSnapshot?.counts.employees || 0}
              </strong>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Fournisseurs / Services</span>
                <Building2 className="w-4 h-4 text-slate-600" />
              </div>
              <strong className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                {liveSnapshot?.counts.suppliers || 0} / {liveSnapshot?.counts.departments || 0}
              </strong>
            </div>
          </div>

          {/* Barre de recherche & filtres Agents */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={empSearch}
                onChange={(e) => {
                  setEmpSearch(e.target.value);
                  setEmpLimit(50);
                }}
                placeholder="Rechercher agent, poste, département, n° flotte GSM, email..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['Tous', 'Flotte GSM', 'Charte signée', 'Charte manquante'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setEmpFilter(f);
                    setEmpLimit(50);
                  }}
                  className={`px-3 py-1 rounded-md font-semibold transition whitespace-nowrap ${
                    empFilter === f
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Table des 159 Agents & Flotte GSM */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-3 font-semibold">Collaborateur &amp; Poste</th>
                    <th className="p-3 font-semibold">Département &amp; Site</th>
                    <th className="p-3 font-semibold whitespace-nowrap">Flotte GSM / Tél.</th>
                    <th className="p-3 font-semibold">Email</th>
                    <th className="p-3 font-semibold whitespace-nowrap">Charte IT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        {liveSnapshot
                          ? 'Aucun collaborateur ne correspond à votre filtre.'
                          : 'Synchronisez SOGEDIPROMA pour charger les 159 agents.'}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.slice(0, empLimit).map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 align-top">
                          <strong className="text-slate-900 block font-semibold">{emp.name}</strong>
                          <span className="text-[11px] text-slate-500">
                            {emp.position || emp.status}
                          </span>
                        </td>
                        <td className="p-3 align-top">
                          <span className="font-medium text-slate-800 block">{emp.department}</span>
                          {emp.location && (
                            <span className="text-[11px] text-slate-500">{emp.location}</span>
                          )}
                        </td>
                        <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums">
                          {emp.fleetPhone ? (
                            <strong className="text-emerald-700 block">
                              Flotte : {emp.fleetPhone}
                            </strong>
                          ) : null}
                          <span className="text-slate-600 text-[11px]">{emp.phone || '—'}</span>
                        </td>
                        <td className="p-3 align-top text-slate-700">
                          {emp.email || '—'}
                        </td>
                        <td className="p-3 align-top whitespace-nowrap">
                          {emp.hasCharter ? (
                            <span className="font-semibold text-emerald-700">
                              Signée ({emp.charterName || 'PDF'})
                            </span>
                          ) : (
                            <span className="text-slate-400">Non rattachée</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredEmployees.length > empLimit && (
              <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-slate-600">
                  Affichage {empLimit} / {filteredEmployees.length} agents
                </span>
                <button
                  type="button"
                  onClick={() => setEmpLimit((n) => n + 50)}
                  className={secondaryButtonClass}
                >
                  Afficher +50 agents
                </button>
              </div>
            )}
          </div>

          {/* Fournisseurs & Départements SOGEDIPROMA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-900">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Fournisseurs Référencés ({liveSnapshot?.suppliers.length || 0})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="p-2.5 font-semibold">Fournisseur</th>
                      <th className="p-2.5 font-semibold">Contact</th>
                      <th className="p-2.5 font-semibold">Ville</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {(liveSnapshot?.suppliers || []).map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-2.5 align-top">
                          <strong className="text-slate-900 block">{s.name}</strong>
                          <span className="text-[11px] text-slate-500">{s.category}</span>
                        </td>
                        <td className="p-2.5 align-top text-[11px]">
                          <span className="block text-slate-800">{s.contact || '—'}</span>
                          <span className="font-mono text-slate-500 block">{s.phone}</span>
                          {s.email && <span className="text-slate-500 block">{s.email}</span>}
                        </td>
                        <td className="p-2.5 align-top text-slate-600 whitespace-nowrap">
                          {s.city || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-900">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Départements &amp; Sites ({liveSnapshot?.departments.length || 0})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="p-2.5 font-semibold">Service / Code</th>
                      <th className="p-2.5 font-semibold">Responsable</th>
                      <th className="p-2.5 font-semibold text-right whitespace-nowrap">Agents / Actifs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {(liveSnapshot?.departments || []).map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="p-2.5 align-top">
                          <strong className="text-slate-900 block">{d.name}</strong>
                          <span className="text-[11px] font-mono text-slate-500">
                            {d.code || '—'} {d.location ? `· ${d.location}` : ''}
                          </span>
                        </td>
                        <td className="p-2.5 align-top text-slate-700">{d.manager || '—'}</td>
                        <td className="p-2.5 align-top text-right font-mono tabular-nums whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{d.employeesCount}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="font-semibold text-blue-700">{d.assetsCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tableau d'inventaire Parc CMDB */
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
      )}
    </div>
  );
};
