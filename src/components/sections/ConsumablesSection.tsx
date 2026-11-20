import React, { useMemo, useState } from 'react';
import { ArticleConsommable, DemandeAchat } from '../../types/it-tracker';
import {
  Package,
  ShoppingCart,
  Plus,
  AlertCircle,
  PlugZap,
  ArrowUpDown,
  Search,
  Send,
} from 'lucide-react';
import {
  saveSogedipromaLiveSnapshot,
  useSogedipromaLiveSnapshot,
} from '../../utils/sogedipromaLiveStore';
import {
  mapSogedipromaToWorkbookDelta,
} from '../../utils/sogedipromaSync';
import {
  postSogInventoryMovementSmart,
  resolvePreferredSogUrl,
  syncSogStateSmart,
} from '../../utils/sogedipromaLiveClient';
import { getLocalTodayIso } from '../../utils/coherenceUtils';
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import { CrudRowActions } from '../ui/CrudRowActions';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import {
  emeraldButtonClass,
  fieldInputClass,
  fieldSelectClass,
  fieldTextareaClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/formStyles';

interface ConsumablesSectionProps {
  consommables: ArticleConsommable[];
  demandesAchat: DemandeAchat[];
  onUpdateConsommables: (consommables: ArticleConsommable[]) => void;
  onUpdateDemandesAchat: (demandes: DemandeAchat[]) => void;
  onShowToast?: (msg: string) => void;
  onOpenSogedipromaSync?: () => void;
}

const DEFAULT_ARTICLE = (): Partial<ArticleConsommable> => ({
  reference: '',
  designation: '',
  categorie: 'Toners & Cartouches',
  stockActuel: 5,
  stockMinimumAlerte: 2,
  quantiteRecommandeeAchat: 5,
  unite: 'Unité',
  emplacementStock: 'Armoire Réserve IT',
  fournisseur: '',
  statut: 'En stock',
});

const computeArticleStatus = (
  stock: number,
  minAlert: number,
  manualStatus?: ArticleConsommable['statut']
): ArticleConsommable['statut'] => {
  if (manualStatus === 'Commande en cours' && stock <= minAlert) {
    return 'Commande en cours';
  }
  if (stock <= 0) return 'Rupture';
  if (stock <= minAlert) return 'Stock bas';
  return 'En stock';
};

export const ConsumablesSection: React.FC<ConsumablesSectionProps> = ({
  consommables,
  demandesAchat,
  onUpdateConsommables,
  onUpdateDemandesAchat,
  onShowToast,
  onOpenSogedipromaSync,
}) => {
  // 1. CRUD Articles Consommables
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [isDuplicatingArticle, setIsDuplicatingArticle] = useState(false);
  const [formArt, setFormArt] = useState<Partial<ArticleConsommable>>(DEFAULT_ARTICLE);
  const [inspectingArticleId, setInspectingArticleId] = useState<string | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);

  // 2. CRUD Demandes d'Achat
  const [daModalOpen, setDaModalOpen] = useState(false);
  const [editingDaId, setEditingDaId] = useState<string | null>(null);
  const [isDuplicatingDa, setIsDuplicatingDa] = useState(false);
  const [inspectingDaId, setInspectingDaId] = useState<string | null>(null);
  const [deletingDaId, setDeletingDaId] = useState<string | null>(null);

  // 3. Onglet Mouvements SOGEDIPROMA (1 255 mouvements live) & Écriture directe
  const liveSnapshot = useSogedipromaLiveSnapshot();
  const [activeTab, setActiveTab] = useState<'stocks' | 'movements'>('stocks');
  const [movSearch, setMovSearch] = useState('');
  const [movTypeFilter, setMovTypeFilter] = useState<'Tous' | 'Entrée' | 'Sortie'>('Tous');
  const [movLimit, setMovLimit] = useState(50);

  const [sogMovModalOpen, setSogMovModalOpen] = useState(false);
  const [sogMovItemId, setSogMovItemId] = useState('');
  const [sogMovType, setSogMovType] = useState<'Entrée' | 'Sortie'>('Sortie');
  const [sogMovQty, setSogMovQty] = useState(1);
  const [sogMovDate, setSogMovDate] = useState(() => getLocalTodayIso());
  const [sogMovReason, setSogMovReason] = useState('Attribution service / intervention IT');
  const [sogMovRef, setSogMovRef] = useState('');
  const [sogMovEmpId, setSogMovEmpId] = useState('');
  const [sogMovDeptId, setSogMovDeptId] = useState('');
  const [isPostingMov, setIsPostingMov] = useState(false);
  const [movError, setMovError] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const getNextDaNumber = () => {
    const year = new Date().getFullYear();
    const maxNum = demandesAchat.reduce((max, da) => {
      const m = da.numeroCommande?.match(/(\d+)$/);
      const parsed = m ? parseInt(m[1], 10) : 0;
      return Number.isFinite(parsed) && parsed > max ? parsed : max;
    }, 0);
    const nextNum = Math.max(demandesAchat.length + 1, maxNum + 1);
    return `DA-${year}-${String(nextNum).padStart(3, '0')}`;
  };

  const buildDefaultDA = (): Partial<DemandeAchat> => ({
    numeroCommande: getNextDaNumber(),
    dateDemande: getLocalTodayIso(),
    demandeur: 'Technicien IT',
    articlesDemandes: '',
    quantite: 1,
    fournisseur: '',
    montantEstimeTTC: 0,
    priorite: 'Normale',
    statut: 'Brouillon',
    dateReception: '',
    observations: '',
  });

  const [formDA, setFormDA] = useState<Partial<DemandeAchat>>(buildDefaultDA);

  const inspectingArticle = useMemo(
    () => consommables.find((c) => c.id === inspectingArticleId) || null,
    [consommables, inspectingArticleId]
  );
  const deletingArticle = useMemo(
    () => consommables.find((c) => c.id === deletingArticleId) || null,
    [consommables, deletingArticleId]
  );

  const inspectingDA = useMemo(
    () => demandesAchat.find((d) => d.id === inspectingDaId) || null,
    [demandesAchat, inspectingDaId]
  );
  const deletingDA = useMemo(
    () => demandesAchat.find((d) => d.id === deletingDaId) || null,
    [demandesAchat, deletingDaId]
  );

  // Quick stock adjustment (+/-)
  const handleStockDelta = (id: string, delta: number) => {
    const updated = consommables.map((c) => {
      if (c.id === id) {
        const nextStock = Math.max(0, c.stockActuel + delta);
        return {
          ...c,
          stockActuel: nextStock,
          statut: computeArticleStatus(nextStock, c.stockMinimumAlerte, c.statut),
        };
      }
      return c;
    });
    onUpdateConsommables(updated);
  };

  // Handlers Articles Consommables
  const openCreateArticle = () => {
    setEditingArticleId(null);
    setIsDuplicatingArticle(false);
    setFormArt(DEFAULT_ARTICLE());
    setArticleModalOpen(true);
  };

  const openEditArticle = (art: ArticleConsommable) => {
    setEditingArticleId(art.id);
    setIsDuplicatingArticle(false);
    setFormArt({ ...art });
    setArticleModalOpen(true);
  };

  const openDuplicateArticle = (art: ArticleConsommable) => {
    setEditingArticleId(null);
    setIsDuplicatingArticle(true);
    setFormArt({
      ...art,
      id: undefined,
      reference: `${art.reference}-COPIE`,
      designation: `${art.designation} (copie)`,
    });
    setArticleModalOpen(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formArt.designation?.trim()) return;

    const currentStock = Number(formArt.stockActuel) || 0;
    const minAlert = Number(formArt.stockMinimumAlerte) || 1;

    const payload: ArticleConsommable = {
      id: editingArticleId || `CSM-${Date.now()}`,
      reference: formArt.reference?.trim() || `REF-${Date.now().toString().slice(-4)}`,
      designation: formArt.designation.trim(),
      categorie:
        (formArt.categorie as ArticleConsommable['categorie']) || 'Câbles & Connectique',
      stockActuel: currentStock,
      stockMinimumAlerte: minAlert,
      quantiteRecommandeeAchat: Number(formArt.quantiteRecommandeeAchat) || 5,
      unite: (formArt.unite as ArticleConsommable['unite']) || 'Unité',
      emplacementStock: formArt.emplacementStock?.trim() || 'Atelier',
      fournisseur: formArt.fournisseur?.trim() || 'Fournisseur IT',
      statut: computeArticleStatus(
        currentStock,
        minAlert,
        formArt.statut as ArticleConsommable['statut']
      ),
    };

    if (editingArticleId) {
      onUpdateConsommables(
        consommables.map((c) => (c.id === editingArticleId ? payload : c))
      );
      notify(`Article « ${payload.designation} » mis à jour.`);
    } else {
      onUpdateConsommables([...consommables, payload]);
      notify(
        isDuplicatingArticle
          ? `Article « ${payload.designation} » dupliqué.`
          : `Article « ${payload.designation} » ajouté au stock.`
      );
    }

    setArticleModalOpen(false);
    setEditingArticleId(null);
    setIsDuplicatingArticle(false);
  };

  const handleConfirmDeleteArticle = () => {
    if (!deletingArticleId) return;
    onUpdateConsommables(consommables.filter((c) => c.id !== deletingArticleId));
    if (inspectingArticleId === deletingArticleId) setInspectingArticleId(null);
    setDeletingArticleId(null);
    notify('Article consommable supprimé.');
  };

  // Handlers Demandes d'Achat (DA)
  const openCreateDA = (presetArticle?: ArticleConsommable) => {
    setEditingDaId(null);
    setIsDuplicatingDa(false);
    const base = buildDefaultDA();
    if (presetArticle) {
      base.articlesDemandes = `${presetArticle.reference} — ${presetArticle.designation}`;
      base.quantite = presetArticle.quantiteRecommandeeAchat || 1;
      base.fournisseur = presetArticle.fournisseur || '';
      base.priorite = presetArticle.stockActuel === 0 ? 'Urgente' : 'Normale';
    }
    setFormDA(base);
    setDaModalOpen(true);
  };

  const openEditDA = (da: DemandeAchat) => {
    setEditingDaId(da.id);
    setIsDuplicatingDa(false);
    setFormDA({ ...da });
    setDaModalOpen(true);
  };

  const openDuplicateDA = (da: DemandeAchat) => {
    setEditingDaId(null);
    setIsDuplicatingDa(true);
    setFormDA({
      ...da,
      id: undefined,
      numeroCommande: getNextDaNumber(),
      dateDemande: getLocalTodayIso(),
      statut: 'Brouillon',
      dateReception: '',
    });
    setDaModalOpen(true);
  };

  const handleSaveDA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDA.articlesDemandes?.trim()) return;

    const payload: DemandeAchat = {
      id: editingDaId || `DA-${Date.now()}`,
      numeroCommande: formDA.numeroCommande?.trim() || getNextDaNumber(),
      dateDemande: formDA.dateDemande || getLocalTodayIso(),
      demandeur: formDA.demandeur?.trim() || 'Technicien IT',
      articlesDemandes: formDA.articlesDemandes.trim(),
      quantite: Number(formDA.quantite) || 1,
      fournisseur: formDA.fournisseur?.trim() || 'Fournisseur Matériel',
      montantEstimeTTC: Number(formDA.montantEstimeTTC) || 0,
      priorite: (formDA.priorite as DemandeAchat['priorite']) || 'Normale',
      statut: (formDA.statut as DemandeAchat['statut']) || 'Brouillon',
      dateReception: formDA.dateReception?.trim() || undefined,
      observations: formDA.observations?.trim() || '',
    };

    if (editingDaId) {
      onUpdateDemandesAchat(demandesAchat.map((d) => (d.id === editingDaId ? payload : d)));
      notify(`Demande d'achat ${payload.numeroCommande} mise à jour.`);
    } else {
      onUpdateDemandesAchat([payload, ...demandesAchat]);
      notify(
        isDuplicatingDa
          ? `Demande d'achat ${payload.numeroCommande} dupliquée.`
          : `Demande d'achat ${payload.numeroCommande} créée.`
      );
    }

    // Cohérence DA <-> Stock consommable : marquer l'article correspondant comme "Commande en cours" si validée/commandée
    if (payload.statut === 'Commandé' || payload.statut === 'Validé Direction') {
      const targetText = payload.articlesDemandes.toLowerCase();
      let didUpdateStock = false;
      const syncedConsommables = consommables.map((c) => {
        const refMatch = c.reference && targetText.includes(c.reference.toLowerCase());
        const desMatch = c.designation && targetText.includes(c.designation.toLowerCase());
        if ((refMatch || desMatch) && c.stockActuel <= c.stockMinimumAlerte && c.statut !== 'Commande en cours') {
          didUpdateStock = true;
          return { ...c, statut: 'Commande en cours' as ArticleConsommable['statut'] };
        }
        return c;
      });
      if (didUpdateStock) {
        onUpdateConsommables(syncedConsommables);
      }
    }

    setDaModalOpen(false);
    setEditingDaId(null);
    setIsDuplicatingDa(false);
  };

  const handleConfirmDeleteDA = () => {
    if (!deletingDaId) return;
    onUpdateDemandesAchat(demandesAchat.filter((d) => d.id !== deletingDaId));
    if (inspectingDaId === deletingDaId) setInspectingDaId(null);
    setDeletingDaId(null);
    notify("Demande d'achat supprimée.");
  };

  const filteredMovements = useMemo(() => {
    const rows = liveSnapshot?.stockMovements || [];
    const q = movSearch.trim().toLowerCase();
    return rows.filter((m) => {
      if (movTypeFilter !== 'Tous' && m.type !== movTypeFilter) return false;
      if (!q) return true;
      return (
        m.itemName.toLowerCase().includes(q) ||
        m.itemSku.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q) ||
        m.employeeName.toLowerCase().includes(q) ||
        m.departmentName.toLowerCase().includes(q) ||
        m.user.toLowerCase().includes(q) ||
        m.reference.toLowerCase().includes(q)
      );
    });
  }, [liveSnapshot?.stockMovements, movSearch, movTypeFilter]);

  const openSogMovementModal = () => {
    setMovError(null);
    const firstItem = liveSnapshot?.inventoryItems?.[0]?.id || '';
    if (!sogMovItemId && firstItem) setSogMovItemId(firstItem);
    setSogMovQty(1);
    setSogMovDate(getLocalTodayIso());
    setSogMovModalOpen(true);
  };

  const handleSubmitSogMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sogMovItemId || sogMovQty <= 0) return;
    setMovError(null);
    try {
      setIsPostingMov(true);
      const serverUrl = resolvePreferredSogUrl();

      await postSogInventoryMovementSmart({
        baseUrl: serverUrl,
        movement: {
          id: `mov-cahier-${Date.now()}`,
          itemId: sogMovItemId,
          type: sogMovType,
          quantity: Number(sogMovQty),
          date: sogMovDate,
          reason: sogMovReason.trim() || 'Ajustement depuis Cahier IT',
          reference: sogMovRef.trim(),
          assignedEmployeeId: sogMovEmpId || undefined,
          departmentId: sogMovDeptId || undefined,
        },
      });

      // Rafraîchir le snapshot live après écriture
      const syncJson = await syncSogStateSmart({ baseUrl: serverUrl }).catch(() => null);
      if (syncJson?.data) {
        saveSogedipromaLiveSnapshot(syncJson.data, syncJson.revision);
        const delta = mapSogedipromaToWorkbookDelta(syncJson.data);
        if (delta.consommables.length > 0) {
          const manual = consommables.filter((c) => !c.id.startsWith('sog-'));
          onUpdateConsommables([...manual, ...delta.consommables]);
        }
      }

      setSogMovModalOpen(false);
      notify(`Mouvement ${sogMovType} (${sogMovQty}) enregistré dans SOGEDIPROMA.`);
    } catch (err) {
      setMovError(err instanceof Error ? err.message : 'Erreur lors de l’envoi vers SOGEDIPROMA.');
    } finally {
      setIsPostingMov(false);
    }
  };

  const alertes = consommables.filter(
    (c) => c.stockActuel <= c.stockMinimumAlerte || c.statut === 'Rupture' || c.statut === 'Stock bas'
  );

  const previewStock = Number(formArt.stockActuel) || 0;
  const previewMin = Number(formArt.stockMinimumAlerte) || 1;
  const previewStockStatus = computeArticleStatus(
    previewStock,
    previewMin,
    formArt.statut as ArticleConsommable['statut']
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
              10
            </span>
            <span>Gestion des Consommables &amp; Demandes d&apos;Achat</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Suivi des stocks d&apos;atelier, mouvements SOGEDIPROMA ({liveSnapshot?.counts.stockMovements || 0} opérations) et demandes d&apos;achat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {liveSnapshot && liveSnapshot.inventoryItems.length > 0 && (
            <button
              type="button"
              onClick={openSogMovementModal}
              className={emeraldButtonClass}
              title="Enregistrer directement une Entrée ou Sortie de stock dans SOGEDIPROMA (/api/inventory/movements)"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Mouvement Stock Live</span>
            </button>
          )}
          {onOpenSogedipromaSync && (
            <button
              type="button"
              onClick={onOpenSogedipromaSync}
              className={secondaryButtonClass}
              title="Importer ou synchroniser les consommables et achats depuis SOGEDIPROMA (/api/state)"
            >
              <PlugZap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sync SOGEDIPROMA</span>
            </button>
          )}
          <button type="button" onClick={openCreateArticle} className={primaryButtonClass}>
            <Plus className="w-4 h-4" />
            <span>Nouvel Article Consommable</span>
          </button>
          <button
            type="button"
            onClick={() => openCreateDA()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Créer Demande d&apos;Achat (DA)</span>
          </button>
        </div>
      </div>

      {/* Sélecteur segmenté : Stocks & Commandes vs Mouvements SOGEDIPROMA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('stocks')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'stocks'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stocks &amp; Commandes ({consommables.length} · {demandesAchat.length} DA)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'movements'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mouvements SOGEDIPROMA ({liveSnapshot?.counts.stockMovements || 0})
          </button>
        </div>
      </div>

      {/* Modal Mouvement Stock Direct SOGEDIPROMA */}
      <Modal
        isOpen={sogMovModalOpen}
        onClose={() => setSogMovModalOpen(false)}
        title="Enregistrer un Mouvement de Stock SOGEDIPROMA"
        subtitle="Écriture directe sur POST /api/inventory/movements puis rafraîchissement automatique du stock."
        icon={<ArrowUpDown className="w-4 h-4" />}
        size="md"
        onSubmit={handleSubmitSogMovement}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSogMovModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" disabled={isPostingMov} className={emeraldButtonClass}>
              <Send className="w-3.5 h-3.5" />
              <span>{isPostingMov ? 'Envoi...' : 'Valider dans SOGEDIPROMA'}</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {movError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {movError}
            </div>
          )}
          <FormField label="Article de stock SOGEDIPROMA" required>
            <select
              required
              value={sogMovItemId}
              onChange={(e) => setSogMovItemId(e.target.value)}
              className={fieldSelectClass}
            >
              {(liveSnapshot?.inventoryItems || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku ? `[${item.sku}] ` : ''}
                  {item.name} (Stock : {item.quantity} {item.unit})
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Type" required>
              <select
                value={sogMovType}
                onChange={(e) => setSogMovType(e.target.value as 'Entrée' | 'Sortie')}
                className={fieldSelectClass}
              >
                <option value="Sortie">Sortie</option>
                <option value="Entrée">Entrée</option>
              </select>
            </FormField>
            <FormField label="Quantité" required>
              <input
                type="number"
                min={1}
                required
                value={sogMovQty}
                onChange={(e) => setSogMovQty(Math.max(1, Number(e.target.value) || 1))}
                className={`${fieldInputClass} font-mono tabular-nums`}
              />
            </FormField>
            <FormField label="Date" required>
              <input
                type="date"
                required
                value={sogMovDate}
                onChange={(e) => setSogMovDate(e.target.value)}
                className={`${fieldInputClass} font-mono tabular-nums`}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Collaborateur bénéficiaire">
              <select
                value={sogMovEmpId}
                onChange={(e) => setSogMovEmpId(e.target.value)}
                className={fieldSelectClass}
              >
                <option value="">— Optionnel —</option>
                {(liveSnapshot?.employees || []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Département">
              <select
                value={sogMovDeptId}
                onChange={(e) => setSogMovDeptId(e.target.value)}
                className={fieldSelectClass}
              >
                <option value="">— Optionnel —</option>
                {(liveSnapshot?.departments || []).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Motif du mouvement">
              <input
                type="text"
                value={sogMovReason}
                onChange={(e) => setSogMovReason(e.target.value)}
                className={fieldInputClass}
              />
            </FormField>
            <FormField label="Référence bon / ticket">
              <input
                type="text"
                placeholder="Ex: TIC-2026 / BL..."
                value={sogMovRef}
                onChange={(e) => setSogMovRef(e.target.value)}
                className={`${fieldInputClass} font-mono`}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Alerte stock bas si besoin */}
      {alertes.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-red-900 font-bold block text-sm">
              ALERTE STOCK CRITIQUE ({alertes.length} article(s) sous le seuil d&apos;alerte)
            </strong>
            <p className="text-red-700">
              Articles nécessitant un réapprovisionnement immédiat :{' '}
              {alertes.map((a) => `${a.designation} (${a.stockActuel} restant)`).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* Modal Article Consommable (Create / Edit / Duplicate) */}
      <Modal
        isOpen={articleModalOpen}
        onClose={() => setArticleModalOpen(false)}
        title={
          editingArticleId
            ? "Modifier l'Article Consommable"
            : isDuplicatingArticle
            ? "Dupliquer l'Article Consommable"
            : 'Ajouter un Article au Stock de Consommables'
        }
        subtitle="Référencement atelier, seuil d'alerte et volume de réassort."
        icon={<Package className="w-4 h-4" />}
        size="lg"
        onSubmit={handleSaveArticle}
        footer={
          <>
            <button
              type="button"
              onClick={() => setArticleModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              {editingArticleId ? 'Enregistrer les modifications' : "Enregistrer l'article"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Référencement & Catégorie">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Référence article" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: TON-CAN-BK"
                  value={formArt.reference || ''}
                  onChange={(e) => setFormArt({ ...formArt, reference: e.target.value })}
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>
              <FormField label="Catégorie">
                <select
                  value={formArt.categorie || 'Toners & Cartouches'}
                  onChange={(e) =>
                    setFormArt({
                      ...formArt,
                      categorie: e.target.value as ArticleConsommable['categorie'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Toners & Cartouches">Toners &amp; Cartouches</option>
                  <option value="Papier">Papier</option>
                  <option value="Câbles & Connectique">Câbles &amp; Connectique</option>
                  <option value="Périphériques d'entrée">Périphériques d&apos;entrée</option>
                  <option value="Stockage & Accessoires">Stockage &amp; Accessoires</option>
                  <option value="Pièces de rechange">Pièces de rechange</option>
                  <option value="Nouveaux équipements">Nouveaux équipements</option>
                </select>
              </FormField>
              <FormField label="Unité de mesure">
                <select
                  value={formArt.unite || 'Unité'}
                  onChange={(e) =>
                    setFormArt({
                      ...formArt,
                      unite: e.target.value as ArticleConsommable['unite'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Unité">Unité</option>
                  <option value="Pack">Pack</option>
                  <option value="Carton">Carton</option>
                  <option value="Rouleau">Rouleau</option>
                </select>
              </FormField>
            </div>

            <FormField label="Désignation précise" required>
              <input
                type="text"
                required
                placeholder="Ex: Toner Noir Canon C-EXV 49BK pour copieur C3520i"
                value={formArt.designation || ''}
                onChange={(e) => setFormArt({ ...formArt, designation: e.target.value })}
                className={fieldInputClass}
              />
            </FormField>
          </FormSection>

          <FormSection
            title="2. Niveaux de Stock & Logistique"
            separated
            rightSlot={
              <span
                className={`text-[11px] font-semibold ${
                  previewStockStatus === 'En stock'
                    ? 'text-emerald-700'
                    : previewStockStatus === 'Commande en cours'
                    ? 'text-blue-700'
                    : previewStockStatus === 'Stock bas'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                Statut calculé : {previewStockStatus}
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <FormField label="Stock actuel">
                <input
                  type="number"
                  min={0}
                  value={formArt.stockActuel ?? 0}
                  onChange={(e) =>
                    setFormArt({ ...formArt, stockActuel: parseInt(e.target.value, 10) || 0 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Seuil mini d'alerte">
                <input
                  type="number"
                  min={1}
                  value={formArt.stockMinimumAlerte ?? 2}
                  onChange={(e) =>
                    setFormArt({
                      ...formArt,
                      stockMinimumAlerte: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Qté réassort conseillée">
                <input
                  type="number"
                  min={1}
                  value={formArt.quantiteRecommandeeAchat ?? 5}
                  onChange={(e) =>
                    setFormArt({
                      ...formArt,
                      quantiteRecommandeeAchat: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Statut stock">
                <select
                  value={formArt.statut || 'En stock'}
                  onChange={(e) =>
                    setFormArt({
                      ...formArt,
                      statut: e.target.value as ArticleConsommable['statut'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="En stock">En stock</option>
                  <option value="Stock bas">Stock bas</option>
                  <option value="Rupture">Rupture</option>
                  <option value="Commande en cours">Commande en cours</option>
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Emplacement en réserve">
                <input
                  type="text"
                  placeholder="Ex: Armoire IT - Étagère 2"
                  value={formArt.emplacementStock || ''}
                  onChange={(e) => setFormArt({ ...formArt, emplacementStock: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Fournisseur habituel">
                <input
                  type="text"
                  placeholder="Ex: Distributeur Bureautique"
                  value={formArt.fournisseur || ''}
                  onChange={(e) => setFormArt({ ...formArt, fournisseur: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Consultation détaillée Article Consommable */}
      <Modal
        isOpen={Boolean(inspectingArticle)}
        onClose={() => setInspectingArticleId(null)}
        title={inspectingArticle?.designation || 'Détail Article'}
        subtitle={
          inspectingArticle
            ? `${inspectingArticle.reference} · ${inspectingArticle.categorie}`
            : undefined
        }
        icon={<Package className="w-4 h-4" />}
        size="md"
        footer={
          inspectingArticle && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingArticleId(inspectingArticle.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                Supprimer
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const art = inspectingArticle;
                    setInspectingArticleId(null);
                    openCreateDA(art);
                  }}
                  className={secondaryButtonClass}
                >
                  Émettre DA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const art = inspectingArticle;
                    setInspectingArticleId(null);
                    openDuplicateArticle(art);
                  }}
                  className={secondaryButtonClass}
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const art = inspectingArticle;
                    setInspectingArticleId(null);
                    openEditArticle(art);
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
        {inspectingArticle && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500">Stock actuel</div>
                <div
                  className={`font-mono tabular-nums font-bold text-base mt-0.5 ${
                    inspectingArticle.stockActuel <= inspectingArticle.stockMinimumAlerte
                      ? 'text-red-700'
                      : 'text-slate-900'
                  }`}
                >
                  {inspectingArticle.stockActuel} {inspectingArticle.unite}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Seuil alerte</div>
                <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {inspectingArticle.stockMinimumAlerte} {inspectingArticle.unite}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Réassort conseillé</div>
                <div className="font-mono tabular-nums font-semibold text-blue-700 mt-0.5">
                  +{inspectingArticle.quantiteRecommandeeAchat} {inspectingArticle.unite}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Emplacement réserve
                </h4>
                <p className="text-slate-800">{inspectingArticle.emplacementStock}</p>
              </div>
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Fournisseur habituel
                </h4>
                <p className="text-slate-800">{inspectingArticle.fournisseur}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingArticle)}
        onClose={() => setDeletingArticleId(null)}
        onConfirm={handleConfirmDeleteArticle}
        title="Supprimer cet article du stock ?"
        itemLabel={deletingArticle?.designation || ''}
        itemMeta={
          deletingArticle
            ? `${deletingArticle.reference} · ${deletingArticle.stockActuel} ${deletingArticle.unite}`
            : undefined
        }
      />

      {/* Modal Demande d'Achat (Create / Edit / Duplicate) */}
      <Modal
        isOpen={daModalOpen}
        onClose={() => setDaModalOpen(false)}
        title={
          editingDaId
            ? "Modifier la Demande d'Achat (DA)"
            : isDuplicatingDa
            ? "Dupliquer la Demande d'Achat (DA)"
            : "Émettre une Demande d'Achat (DA)"
        }
        subtitle="Préparation de commande matériel ou consommables et suivi d'approbation."
        icon={<ShoppingCart className="w-4 h-4" />}
        size="lg"
        onSubmit={handleSaveDA}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDaModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              {editingDaId ? 'Enregistrer les modifications' : 'Enregistrer la demande'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Références de la demande">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="N° Commande / DA" required>
                <input
                  type="text"
                  required
                  value={formDA.numeroCommande || ''}
                  onChange={(e) => setFormDA({ ...formDA, numeroCommande: e.target.value })}
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>
              <FormField label="Date de la demande" required>
                <input
                  type="date"
                  required
                  value={formDA.dateDemande || ''}
                  onChange={(e) => setFormDA({ ...formDA, dateDemande: e.target.value })}
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Demandeur">
                <input
                  type="text"
                  placeholder="Ex: Technicien IT"
                  value={formDA.demandeur || ''}
                  onChange={(e) => setFormDA({ ...formDA, demandeur: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <FormField label="Articles & Références demandées" required>
              <textarea
                rows={2}
                required
                placeholder="Ex: Lot de 10 cordons RJ45 2m + 2x Toners Noirs..."
                value={formDA.articlesDemandes || ''}
                onChange={(e) => setFormDA({ ...formDA, articlesDemandes: e.target.value })}
                className={fieldTextareaClass}
              />
            </FormField>
          </FormSection>

          <FormSection title="2. Budget, Fournisseur & Réception" separated>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Quantité totale">
                <input
                  type="number"
                  min={1}
                  value={formDA.quantite ?? 1}
                  onChange={(e) =>
                    setFormDA({ ...formDA, quantite: parseInt(e.target.value, 10) || 1 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Fournisseur">
                <input
                  type="text"
                  placeholder="Ex: Dell, Grossiste..."
                  value={formDA.fournisseur || ''}
                  onChange={(e) => setFormDA({ ...formDA, fournisseur: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Montant estimé (Ar)">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={formDA.montantEstimeTTC ?? 0}
                  onChange={(e) =>
                    setFormDA({ ...formDA, montantEstimeTTC: parseFloat(e.target.value) || 0 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <FormField label="Priorité">
                <select
                  value={formDA.priorite || 'Normale'}
                  onChange={(e) =>
                    setFormDA({ ...formDA, priorite: e.target.value as DemandeAchat['priorite'] })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Normale">Normale</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Basse">Basse</option>
                </select>
              </FormField>
              <FormField label="Statut d'approbation">
                <select
                  value={formDA.statut || 'Brouillon'}
                  onChange={(e) =>
                    setFormDA({ ...formDA, statut: e.target.value as DemandeAchat['statut'] })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Brouillon">Brouillon</option>
                  <option value="Validé Direction">Validé Direction</option>
                  <option value="Commandé">Commandé</option>
                  <option value="Reçu / Contrôlé">Reçu / Contrôlé</option>
                </select>
              </FormField>
              <FormField label="Date de réception">
                <input
                  type="date"
                  value={formDA.dateReception || ''}
                  onChange={(e) => setFormDA({ ...formDA, dateReception: e.target.value })}
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <FormField label="Observations / Justification">
              <input
                type="text"
                placeholder="Justification du besoin, n° bon de livraison..."
                value={formDA.observations || ''}
                onChange={(e) => setFormDA({ ...formDA, observations: e.target.value })}
                className={fieldInputClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Consultation détaillée DA */}
      <Modal
        isOpen={Boolean(inspectingDA)}
        onClose={() => setInspectingDaId(null)}
        title={inspectingDA?.numeroCommande || "Demande d'Achat"}
        subtitle={
          inspectingDA
            ? `Demandée le ${inspectingDA.dateDemande} par ${inspectingDA.demandeur}`
            : undefined
        }
        icon={<ShoppingCart className="w-4 h-4" />}
        size="md"
        footer={
          inspectingDA && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingDaId(inspectingDA.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                Supprimer
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingDA;
                    setInspectingDaId(null);
                    openDuplicateDA(target);
                  }}
                  className={secondaryButtonClass}
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingDA;
                    setInspectingDaId(null);
                    openEditDA(target);
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
        {inspectingDA && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500">Montant TTC</div>
                <div className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                  {Math.round(inspectingDA.montantEstimeTTC || 0).toLocaleString('fr-FR')} Ar
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Statut</div>
                <div className="font-semibold text-blue-800 mt-0.5">{inspectingDA.statut}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Quantité / Priorité</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {inspectingDA.quantite} · {inspectingDA.priorite}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Articles demandés ({inspectingDA.fournisseur})
              </h4>
              <p className="text-slate-800 whitespace-pre-line">{inspectingDA.articlesDemandes}</p>
            </div>

            {inspectingDA.dateReception && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                Réceptionné et contrôlé le {inspectingDA.dateReception}
              </div>
            )}

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Observations
              </h4>
              <p className="text-slate-700 p-3 rounded-lg bg-slate-50 border border-slate-200">
                {inspectingDA.observations || 'Aucune observation particulière.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingDA)}
        onClose={() => setDeletingDaId(null)}
        onConfirm={handleConfirmDeleteDA}
        title="Supprimer cette demande d'achat ?"
        itemLabel={deletingDA?.numeroCommande || ''}
        itemMeta={
          deletingDA
            ? `${deletingDA.articlesDemandes} · ${Math.round(deletingDA.montantEstimeTTC || 0).toLocaleString('fr-FR')} Ar`
            : undefined
        }
      />

      {activeTab === 'movements' ? (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={movSearch}
                onChange={(e) => {
                  setMovSearch(e.target.value);
                  setMovLimit(50);
                }}
                placeholder="Rechercher par article, SKU, employé, service, motif, opérateur..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              {(['Tous', 'Entrée', 'Sortie'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setMovTypeFilter(t);
                    setMovLimit(50);
                  }}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    movTypeFilter === t
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-3 font-semibold whitespace-nowrap">Date</th>
                    <th className="p-3 font-semibold">Article &amp; SKU</th>
                    <th className="p-3 font-semibold whitespace-nowrap">Type / Qté</th>
                    <th className="p-3 font-semibold whitespace-nowrap">Avant → Après</th>
                    <th className="p-3 font-semibold">Motif &amp; Référence</th>
                    <th className="p-3 font-semibold">Bénéficiaire / Service</th>
                    <th className="p-3 font-semibold">Opérateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        {liveSnapshot
                          ? 'Aucun mouvement ne correspond à votre recherche.'
                          : 'Synchronisez SOGEDIPROMA pour charger les 1 255 mouvements de stock réels.'}
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.slice(0, movLimit).map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums text-slate-800">
                          {m.date || m.createdAt.slice(0, 10)}
                        </td>
                        <td className="p-3 align-top">
                          <strong className="text-slate-900 block font-semibold">{m.itemName}</strong>
                          {m.itemSku && (
                            <span className="font-mono text-[11px] text-slate-500">{m.itemSku}</span>
                          )}
                        </td>
                        <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums font-bold">
                          <span className={m.type === 'Entrée' ? 'text-emerald-700' : 'text-amber-700'}>
                            {m.type === 'Entrée' ? '+' : '-'}
                            {m.quantity} ({m.type})
                          </span>
                        </td>
                        <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums text-slate-600">
                          {m.previousQuantity !== undefined && m.newQuantity !== undefined
                            ? `${m.previousQuantity} → ${m.newQuantity}`
                            : '—'}
                        </td>
                        <td className="p-3 align-top text-slate-700 max-w-xs">
                          <span>{m.reason || '—'}</span>
                          {m.reference && (
                            <span className="block font-mono text-[10px] text-slate-500">
                              Réf : {m.reference}
                            </span>
                          )}
                        </td>
                        <td className="p-3 align-top text-slate-700">
                          <span className="font-medium block">{m.employeeName || 'Atelier IT'}</span>
                          {m.departmentName && (
                            <span className="text-[11px] text-slate-500">{m.departmentName}</span>
                          )}
                        </td>
                        <td className="p-3 align-top text-[11px] text-slate-600 whitespace-nowrap">
                          {m.user || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredMovements.length > movLimit && (
              <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-slate-600">
                  Affichage {movLimit} / {filteredMovements.length} mouvements
                </span>
                <button
                  type="button"
                  onClick={() => setMovLimit((n) => n + 100)}
                  className={secondaryButtonClass}
                >
                  Afficher +100 mouvements
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
      {/* Tableau des consommables */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <span>État des Stocks d&apos;Atelier ({consommables.length} références)</span>
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 font-semibold">Référence &amp; Désignation</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Catégorie</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Stock Actuel</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Seuil Alerte &amp; Réassort</th>
                  <th className="p-3 font-semibold">Emplacement &amp; Fournisseur</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Statut</th>
                  <th className="p-3 font-semibold text-center whitespace-nowrap">Ajuster</th>
                  <th className="p-3 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {consommables.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-slate-600 font-medium">
                          Aucun consommable ou pièce détachée en stock.
                        </p>
                        <button
                          type="button"
                          onClick={openCreateArticle}
                          className={primaryButtonClass}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter un article</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  consommables.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 align-top">
                        <button
                          type="button"
                          onClick={() => setInspectingArticleId(c.id)}
                          className="text-left group"
                        >
                          <strong className="font-mono tabular-nums text-blue-900 group-hover:text-blue-700 font-bold block text-xs">
                            {c.reference}
                          </strong>
                          <span className="text-slate-900 font-medium text-xs">{c.designation}</span>
                        </button>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap text-xs text-slate-600 font-medium">
                        {c.categorie}
                      </td>
                      <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums">
                        <span
                          className={`text-base font-extrabold ${
                            c.stockActuel <= c.stockMinimumAlerte
                              ? 'text-red-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {c.stockActuel}
                        </span>{' '}
                        <span className="text-slate-500 text-[11px] font-sans">{c.unite}</span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap text-xs font-mono tabular-nums">
                        <span className="text-slate-600 block text-[11px]">
                          Min : {c.stockMinimumAlerte} {c.unite}
                        </span>
                        <span className="text-blue-700 font-semibold">
                          À cder : {c.quantiteRecommandeeAchat}
                        </span>
                      </td>
                      <td className="p-3 align-top text-xs">
                        <span className="text-slate-800 font-medium block">
                          {c.emplacementStock}
                        </span>
                        <span className="text-slate-400 text-[11px]">{c.fournisseur}</span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap text-xs">
                        <span
                          className={`font-semibold ${
                            c.statut === 'En stock'
                              ? 'text-emerald-700'
                              : c.statut === 'Commande en cours'
                              ? 'text-blue-700'
                              : c.statut === 'Stock bas'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}
                        >
                          {c.statut}
                        </span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleStockDelta(c.id, -1)}
                            className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center border border-slate-300"
                            title="Décrémenter stock (-1)"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStockDelta(c.id, 1)}
                            className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center"
                            title="Incrémenter stock (+1)"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="p-3 align-top text-right whitespace-nowrap">
                        <CrudRowActions
                          onView={() => setInspectingArticleId(c.id)}
                          onEdit={() => openEditArticle(c)}
                          onDuplicate={() => openDuplicateArticle(c)}
                          onDelete={() => setDeletingArticleId(c.id)}
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

      {/* Tableau des demandes d'achat */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <span>Registre des Demandes d&apos;Achat ({demandesAchat.length} DA)</span>
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 font-semibold whitespace-nowrap">N° Commande &amp; Date</th>
                  <th className="p-3 font-semibold">Articles Demandés</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Fournisseur &amp; Montant</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Priorité</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Statut Approbation</th>
                  <th className="p-3 font-semibold">Réception &amp; Observations</th>
                  <th className="p-3 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {demandesAchat.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="text-slate-600 font-medium">
                          Aucune demande d&apos;achat enregistrée.
                        </p>
                        <button
                          type="button"
                          onClick={() => openCreateDA()}
                          className={secondaryButtonClass}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Créer une demande d&apos;achat</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  demandesAchat.map((da) => (
                    <tr key={da.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectingDaId(da.id)}
                          className="text-left group"
                        >
                          <strong className="font-mono tabular-nums text-blue-900 group-hover:text-blue-700 font-bold block">
                            {da.numeroCommande}
                          </strong>
                        </button>
                        <span className="text-slate-400 text-[11px] font-mono tabular-nums">
                          {da.dateDemande}
                        </span>
                      </td>
                      <td className="p-3 align-top max-w-sm">
                        <strong className="text-slate-900 block font-semibold">
                          {da.articlesDemandes}
                        </strong>
                        <span className="text-slate-500 text-[11px] font-mono tabular-nums">
                          Quantité totale : {da.quantite}
                        </span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span className="text-slate-800 font-medium block">{da.fournisseur}</span>
                        <strong className="text-slate-900 text-sm font-mono tabular-nums">
                          {Math.round(da.montantEstimeTTC || 0).toLocaleString('fr-FR')} Ar
                        </strong>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            da.priorite === 'Urgente'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {da.priorite}
                        </span>
                      </td>
                      <td className="p-3 align-top whitespace-nowrap">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            da.statut === 'Reçu / Contrôlé'
                              ? 'bg-emerald-100 text-emerald-800'
                              : da.statut === 'Validé Direction'
                              ? 'bg-blue-100 text-blue-800'
                              : da.statut === 'Commandé'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {da.statut}
                        </span>
                      </td>
                      <td className="p-3 align-top text-[11px] max-w-xs text-slate-600">
                        {da.dateReception && (
                          <span className="text-emerald-700 font-bold block font-mono tabular-nums">
                            Reçu le {da.dateReception}
                          </span>
                        )}
                        <span>{da.observations}</span>
                      </td>
                      <td className="p-3 align-top text-right whitespace-nowrap">
                        <CrudRowActions
                          onView={() => setInspectingDaId(da.id)}
                          onEdit={() => openEditDA(da)}
                          onDuplicate={() => openDuplicateDA(da)}
                          onDelete={() => setDeletingDaId(da.id)}
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
        </>
      )}
    </div>
  );
};
