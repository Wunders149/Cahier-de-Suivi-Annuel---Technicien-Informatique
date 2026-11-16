import React, { useState } from 'react';
import { ArticleConsommable, DemandeAchat } from '../../types/it-tracker';
import { Package, ShoppingCart, Plus, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import {
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
}

const DEFAULT_NEW_ARTICLE = (): Partial<ArticleConsommable> => ({
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

export const ConsumablesSection: React.FC<ConsumablesSectionProps> = ({
  consommables,
  demandesAchat,
  onUpdateConsommables,
  onUpdateDemandesAchat,
}) => {
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [showAddDA, setShowAddDA] = useState(false);

  const [newArt, setNewArt] = useState<Partial<ArticleConsommable>>(DEFAULT_NEW_ARTICLE);

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

  const [newDA, setNewDA] = useState<Partial<DemandeAchat>>({
    numeroCommande: getNextDaNumber(),
    dateDemande: new Date().toISOString().split('T')[0],
    demandeur: 'Technicien IT',
    articlesDemandes: '',
    quantite: 1,
    fournisseur: '',
    montantEstimeTTC: 150,
    priorite: 'Normale',
    statut: 'Brouillon',
    observations: '',
  });

  const handleStockDelta = (id: string, delta: number) => {
    const updated = consommables.map((c) => {
      if (c.id === id) {
        const nextStock = Math.max(0, c.stockActuel + delta);
        let statut = c.statut;
        if (nextStock === 0) statut = 'Rupture';
        else if (nextStock <= c.stockMinimumAlerte) statut = 'Stock bas';
        else statut = 'En stock';
        return { ...c, stockActuel: nextStock, statut };
      }
      return c;
    });
    onUpdateConsommables(updated);
  };

  const handleAddArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArt.designation) return;

    const currentStock = Number(newArt.stockActuel) || 0;
    const minAlert = Number(newArt.stockMinimumAlerte) || 2;

    const item: ArticleConsommable = {
      id: `CSM-${Date.now()}`,
      reference: newArt.reference || `REF-${Date.now().toString().slice(-4)}`,
      designation: newArt.designation || '',
      categorie: (newArt.categorie as any) || 'Câbles & Connectique',
      stockActuel: currentStock,
      stockMinimumAlerte: minAlert,
      quantiteRecommandeeAchat: Number(newArt.quantiteRecommandeeAchat) || 5,
      unite: (newArt.unite as any) || 'Unité',
      emplacementStock: newArt.emplacementStock || 'Atelier',
      fournisseur: newArt.fournisseur || 'Fournisseur IT',
      statut:
        currentStock === 0
          ? 'Rupture'
          : currentStock <= minAlert
          ? 'Stock bas'
          : 'En stock',
    };

    onUpdateConsommables([...consommables, item]);
    setNewArt(DEFAULT_NEW_ARTICLE());
    setShowAddArticle(false);
  };

  const handleAddDA = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDA.articlesDemandes) return;

    const item: DemandeAchat = {
      id: `DA-${Date.now()}`,
      numeroCommande: newDA.numeroCommande || `DA-2026-${Date.now().toString().slice(-3)}`,
      dateDemande: newDA.dateDemande || new Date().toISOString().split('T')[0],
      demandeur: newDA.demandeur || 'Technicien IT',
      articlesDemandes: newDA.articlesDemandes || '',
      quantite: Number(newDA.quantite) || 1,
      fournisseur: newDA.fournisseur || 'Fournisseur Matériel',
      montantEstimeTTC: Number(newDA.montantEstimeTTC) || 0,
      priorite: (newDA.priorite as any) || 'Normale',
      statut: (newDA.statut as any) || 'Brouillon',
      observations: newDA.observations || '',
    };

    onUpdateDemandesAchat([item, ...demandesAchat]);
    setShowAddDA(false);
  };

  const alertes = consommables.filter((c) => c.stockActuel <= c.stockMinimumAlerte);
  const previewStock = Number(newArt.stockActuel) || 0;
  const previewMin = Number(newArt.stockMinimumAlerte) || 0;
  const previewStockStatus =
    previewStock === 0
      ? 'Rupture'
      : previewStock <= previewMin
      ? 'Stock bas'
      : 'En stock';

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">10</span>
            Gestion des Consommables & Demandes d'Achat
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Suivi des stocks d'atelier (toners, câbles, périphériques, disques) et registre des demandes d'achat (DA).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNewArt(DEFAULT_NEW_ARTICLE());
              setShowAddArticle(true);
            }}
            className={primaryButtonClass}
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Article Consommable</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setNewDA({
                numeroCommande: getNextDaNumber(),
                dateDemande: new Date().toISOString().split('T')[0],
                demandeur: 'Technicien IT',
                articlesDemandes: '',
                quantite: 1,
                fournisseur: '',
                montantEstimeTTC: 150,
                priorite: 'Normale',
                statut: 'Brouillon',
                observations: '',
              });
              setShowAddDA(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Créer Demande d'Achat (DA)</span>
          </button>
        </div>
      </div>

      {/* Alerte stock bas si besoin */}
      {alertes.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-red-900 font-bold block text-sm">
              ALERTE STOCK CRITIQUE ({alertes.length} article(s) sous le seuil d'alerte)
            </strong>
            <p className="text-red-700">
              Articles nécessitant un réapprovisionnement immédiat :{' '}
              {alertes.map((a) => `${a.designation} (${a.stockActuel} restant)`).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* Modal Nouvel Article */}
      <Modal
        isOpen={showAddArticle}
        onClose={() => setShowAddArticle(false)}
        title="Ajouter un Article au Stock de Consommables"
        subtitle="Référencement atelier, seuil d'alerte et volume de réassort."
        icon={<Package className="w-4 h-4" />}
        size="lg"
        onSubmit={handleAddArticle}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddArticle(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              Enregistrer l'article
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Référencement & Catégorie">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Référence article" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: TON-CAN-BK"
                  value={newArt.reference || ''}
                  onChange={(e) => setNewArt({ ...newArt, reference: e.target.value })}
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>
              <FormField label="Catégorie">
                <select
                  value={newArt.categorie || 'Toners & Cartouches'}
                  onChange={(e) => setNewArt({ ...newArt, categorie: e.target.value as any })}
                  className={fieldSelectClass}
                >
                  <option value="Toners & Cartouches">Toners & Cartouches</option>
                  <option value="Papier">Papier</option>
                  <option value="Câbles & Connectique">Câbles & Connectique</option>
                  <option value="Périphériques d'entrée">Périphériques d'entrée</option>
                  <option value="Stockage & Accessoires">Stockage & Accessoires</option>
                  <option value="Pièces de rechange">Pièces de rechange</option>
                  <option value="Nouveaux équipements">Nouveaux équipements</option>
                </select>
              </FormField>
              <FormField label="Unité de mesure">
                <select
                  value={newArt.unite || 'Unité'}
                  onChange={(e) => setNewArt({ ...newArt, unite: e.target.value as any })}
                  className={fieldSelectClass}
                >
                  <option value="Unité">Unité</option>
                  <option value="Boîte">Boîte</option>
                  <option value="Ramette">Ramette</option>
                  <option value="Carton">Carton</option>
                  <option value="Lot">Lot</option>
                  <option value="Mètre">Mètre</option>
                </select>
              </FormField>
            </div>

            <FormField label="Désignation précise" required>
              <input
                type="text"
                required
                placeholder="Ex: Toner Noir Canon C-EXV 49BK pour copieur C3520i"
                value={newArt.designation || ''}
                onChange={(e) => setNewArt({ ...newArt, designation: e.target.value })}
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
                    : previewStockStatus === 'Stock bas'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                Statut calculé : {previewStockStatus}
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Stock actuel">
                <input
                  type="number"
                  min={0}
                  value={newArt.stockActuel ?? 0}
                  onChange={(e) =>
                    setNewArt({ ...newArt, stockActuel: parseInt(e.target.value, 10) || 0 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Seuil mini d'alerte">
                <input
                  type="number"
                  min={1}
                  value={newArt.stockMinimumAlerte ?? 2}
                  onChange={(e) =>
                    setNewArt({
                      ...newArt,
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
                  value={newArt.quantiteRecommandeeAchat ?? 5}
                  onChange={(e) =>
                    setNewArt({
                      ...newArt,
                      quantiteRecommandeeAchat: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Emplacement en réserve">
                <input
                  type="text"
                  placeholder="Ex: Armoire IT - Étagère 2"
                  value={newArt.emplacementStock || ''}
                  onChange={(e) => setNewArt({ ...newArt, emplacementStock: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Fournisseur habituel">
                <input
                  type="text"
                  placeholder="Ex: Distributeur Bureautique"
                  value={newArt.fournisseur || ''}
                  onChange={(e) => setNewArt({ ...newArt, fournisseur: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Nouvelle DA */}
      <Modal
        isOpen={showAddDA}
        onClose={() => setShowAddDA(false)}
        title="Émettre une Demande d'Achat (DA)"
        subtitle="Préparation de commande matériel ou consommables et suivi d'approbation."
        icon={<ShoppingCart className="w-4 h-4" />}
        size="lg"
        onSubmit={handleAddDA}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddDA(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              Créer la demande
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Références de la demande">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="N° Commande / DA" required>
                <input
                  type="text"
                  required
                  value={newDA.numeroCommande || ''}
                  onChange={(e) => setNewDA({ ...newDA, numeroCommande: e.target.value })}
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>
              <FormField label="Date de la demande" required>
                <input
                  type="date"
                  required
                  value={newDA.dateDemande || ''}
                  onChange={(e) => setNewDA({ ...newDA, dateDemande: e.target.value })}
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>
              <FormField label="Demandeur">
                <input
                  type="text"
                  placeholder="Ex: Technicien IT"
                  value={newDA.demandeur || ''}
                  onChange={(e) => setNewDA({ ...newDA, demandeur: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <FormField label="Articles & Références demandées" required>
              <textarea
                rows={2}
                required
                placeholder="Ex: Lot de 10 cordons RJ45 2m + 2x Toners Noirs..."
                value={newDA.articlesDemandes || ''}
                onChange={(e) => setNewDA({ ...newDA, articlesDemandes: e.target.value })}
                className={fieldTextareaClass}
              />
            </FormField>
          </FormSection>

          <FormSection title="2. Budget, Fournisseur & Statut" separated>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Quantité totale">
                <input
                  type="number"
                  min={1}
                  value={newDA.quantite ?? 1}
                  onChange={(e) =>
                    setNewDA({ ...newDA, quantite: parseInt(e.target.value, 10) || 1 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Fournisseur">
                <input
                  type="text"
                  placeholder="Ex: Dell, Grossiste..."
                  value={newDA.fournisseur || ''}
                  onChange={(e) => setNewDA({ ...newDA, fournisseur: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Montant estimé (€ TTC)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={newDA.montantEstimeTTC ?? 0}
                  onChange={(e) =>
                    setNewDA({ ...newDA, montantEstimeTTC: parseFloat(e.target.value) || 0 })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Priorité">
                <select
                  value={newDA.priorite || 'Normale'}
                  onChange={(e) => setNewDA({ ...newDA, priorite: e.target.value as any })}
                  className={fieldSelectClass}
                >
                  <option value="Normale">Normale</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Basse">Basse</option>
                </select>
              </FormField>
              <FormField label="Statut initial">
                <select
                  value={newDA.statut || 'Brouillon'}
                  onChange={(e) => setNewDA({ ...newDA, statut: e.target.value as any })}
                  className={fieldSelectClass}
                >
                  <option value="Brouillon">Brouillon</option>
                  <option value="Validé Direction">Validé Direction</option>
                  <option value="Commandé">Commandé</option>
                  <option value="Reçu / Contrôlé">Reçu / Contrôlé</option>
                </select>
              </FormField>
            </div>

            <FormField label="Observations / Justification">
              <input
                type="text"
                placeholder="Justification du besoin..."
                value={newDA.observations || ''}
                onChange={(e) => setNewDA({ ...newDA, observations: e.target.value })}
                className={fieldInputClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      {/* Tableau des consommables */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <span>État des Stocks d'Atelier ({consommables.length} références)</span>
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 font-semibold">Référence & Désignation</th>
                  <th className="p-3 font-semibold">Catégorie</th>
                  <th className="p-3 font-semibold">Stock Actuel</th>
                  <th className="p-3 font-semibold">Seuil Alerte & Commande</th>
                  <th className="p-3 font-semibold">Emplacement & Fournisseur</th>
                  <th className="p-3 font-semibold">Statut</th>
                  <th className="p-3 font-semibold text-center">Ajuster Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {consommables.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      Aucun consommable ou pièce détachée en stock. Cliquez sur « Nouvel Article » pour créer votre inventaire d'atelier (toners, câbles, adaptateurs).
                    </td>
                  </tr>
                ) : (
                  consommables.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 align-top">
                        <strong className="font-mono tabular-nums text-blue-900 font-bold block text-xs">{c.reference}</strong>
                        <span className="text-slate-900 font-medium text-xs">{c.designation}</span>
                      </td>
                    <td className="p-3 align-top whitespace-nowrap text-xs text-slate-600 font-medium">
                      {c.categorie}
                    </td>
                    <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums">
                      <span
                        className={`text-base font-extrabold ${
                          c.stockActuel <= c.stockMinimumAlerte ? 'text-red-600' : 'text-slate-900'
                        }`}
                      >
                        {c.stockActuel}
                      </span>{' '}
                      <span className="text-slate-500 text-[11px] font-sans">{c.unite}</span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap text-xs font-mono tabular-nums">
                      <span className="text-slate-600 block text-[11px]">Min : {c.stockMinimumAlerte} {c.unite}</span>
                      <span className="text-blue-700 font-semibold">À cder : {c.quantiteRecommandeeAchat}</span>
                    </td>
                    <td className="p-3 align-top text-xs">
                      <span className="text-slate-800 font-medium block">{c.emplacementStock}</span>
                      <span className="text-slate-400 text-[11px]">{c.fournisseur}</span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap text-xs">
                      <span
                        className={`font-semibold ${
                          c.statut === 'En stock'
                            ? 'text-emerald-700'
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
                          onClick={() => handleStockDelta(c.id, -1)}
                          className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center border border-slate-300"
                          title="Décrémenter stock (-1)"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleStockDelta(c.id, 1)}
                          className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center"
                          title="Incrémenter stock (+1)"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tableau des demandes d'achat */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <span>Registre des Demandes d'Achat (DA)</span>
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 font-semibold">N° Commande & Date</th>
                  <th className="p-3 font-semibold">Articles Demandés</th>
                  <th className="p-3 font-semibold">Fournisseur & Montant</th>
                  <th className="p-3 font-semibold">Priorité</th>
                  <th className="p-3 font-semibold">Statut Approbation</th>
                  <th className="p-3 font-semibold">Réception & Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {demandesAchat.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                      Aucune demande d'achat enregistrée. Utilisez « Nouvelle Demande d'Achat » pour planifier vos commandes de matériel et réapprovisionnements.
                    </td>
                  </tr>
                ) : (
                  demandesAchat.map((da) => (
                    <tr key={da.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 align-top whitespace-nowrap">
                      <strong className="text-blue-900 font-bold block">{da.numeroCommande}</strong>
                      <span className="text-slate-400 text-[11px]">{da.dateDemande}</span>
                    </td>
                    <td className="p-3 align-top max-w-sm">
                      <strong className="text-slate-900 block font-semibold">{da.articlesDemandes}</strong>
                      <span className="text-slate-500 text-[11px]">Quantité totale : {da.quantite}</span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <span className="text-slate-800 font-medium block">{da.fournisseur}</span>
                      <strong className="text-slate-900 text-sm">{da.montantEstimeTTC.toFixed(2)} € TTC</strong>
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
                        <span className="text-emerald-700 font-bold block">
                          Reçu le {da.dateReception}
                        </span>
                      )}
                      <span>{da.observations}</span>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
