import React, { useState, useEffect } from 'react';
import { Search, X, Wrench, Laptop, Package, CheckSquare, KeyRound, ArrowRight, TrendingUp } from 'lucide-react';
import { CahierSuiviData } from '../types/it-tracker';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  data: CahierSuiviData;
  onNavigate: (tab: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  data,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or toggle
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Recherche dans les tâches quotidiennes
  const matchingTasks = q
    ? data.journalTaches.filter(
        (t) =>
          t.tache.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.observations.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  // Recherche dans les interventions
  const matchingInterventions = q
    ? data.interventions.filter(
        (i) =>
          i.numeroReference.toLowerCase().includes(q) ||
          i.nomDemandeur.toLowerCase().includes(q) ||
          i.descriptionPanne.toLowerCase().includes(q) ||
          i.equipementConcerne.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  // Recherche dans le parc matériel
  const matchingParc = q
    ? data.parcEquipements.filter(
        (p) =>
          p.numeroInventaire.toLowerCase().includes(q) ||
          p.designation.toLowerCase().includes(q) ||
          p.marqueModele.toLowerCase().includes(q) ||
          p.numeroSerie.toLowerCase().includes(q) ||
          p.utilisateurResponsable.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  // Recherche dans les consommables
  const matchingConsommables = q
    ? data.consommables.filter(
        (c) =>
          c.reference.toLowerCase().includes(q) ||
          c.designation.toLowerCase().includes(q) ||
          c.fournisseur.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  // Recherche dans les projets ROI
  const matchingRoiProjects = q
    ? (data.bilanAnnuel.projetsRoi || []).filter(
        (r) =>
          r.nomProjet.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.categorie.toLowerCase().includes(q) ||
          'roi retour sur investissement rentabilité amortissement gain économie'.includes(q)
      ).slice(0, 3)
    : [];

  const hasResults =
    matchingTasks.length > 0 ||
    matchingInterventions.length > 0 ||
    matchingParc.length > 0 ||
    matchingConsommables.length > 0 ||
    matchingRoiProjects.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Barre de recherche */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une tâche, intervention, machine, ticket, référence..."
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[11px] font-mono text-slate-400 ml-2 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            ESC
          </span>
        </div>

        {/* Résultats */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          {!q ? (
            <div className="py-8 text-center text-slate-400">
              <p className="font-medium">Tapez votre recherche...</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Ex: "Windows 11", "Toner", "Dell Latitude", "INT-2026", "VPN"
              </p>
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-slate-400">
              <p className="font-medium">Aucun résultat trouvé pour "{query}"</p>
            </div>
          ) : (
            <>
              {matchingInterventions.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                    Interventions IT ({matchingInterventions.length})
                  </span>
                  <div className="space-y-1">
                    {matchingInterventions.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => {
                          onNavigate('interventions');
                          onClose();
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between group transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white mr-2">
                              {it.numeroReference}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {it.nomDemandeur} — {it.descriptionPanne}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchingTasks.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                    Journal Quotidien ({matchingTasks.length})
                  </span>
                  <div className="space-y-1">
                    {matchingTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onNavigate('journal');
                          onClose();
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between group transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white mr-2">
                              {t.tache}
                            </span>
                            <span className="text-slate-500">
                              {t.date} · {t.statut}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchingParc.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                    Parc Matériel & CMDB ({matchingParc.length})
                  </span>
                  <div className="space-y-1">
                    {matchingParc.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onNavigate('parc');
                          onClose();
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between group transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Laptop className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white mr-2">
                              {p.numeroInventaire}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {p.designation} ({p.utilisateurResponsable})
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchingConsommables.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                    Consommables & Stocks ({matchingConsommables.length})
                  </span>
                  <div className="space-y-1">
                    {matchingConsommables.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onNavigate('consommables');
                          onClose();
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between group transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Package className="w-4 h-4 text-amber-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white mr-2">
                              {c.reference}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {c.designation} — Stock: {c.stockActuel}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchingRoiProjects.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                    Projets & Retour sur Investissement ({matchingRoiProjects.length})
                  </span>
                  <div className="space-y-1">
                    {matchingRoiProjects.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          onNavigate('bilans');
                          onClose();
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between group transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 dark:text-white mr-2">
                              {r.nomProjet}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              [{r.categorie}] · Éco: +{r.economiesFinancieresAnnuellesEuros}€ · Gain: {r.gainTempsEstimeHeuresParAn}h
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pied de la palette */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Recherche globale instantanée</span>
          <span>Appuyez sur Entrée pour naviguer</span>
        </div>
      </div>
    </div>
  );
};
