import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Wrench,
  Laptop,
  Package,
  CheckSquare,
  ArrowRight,
  TrendingUp,
  FileBadge,
  CalendarRange,
  ShieldCheck,
} from 'lucide-react';
import { CahierSuiviData } from '../types/it-tracker';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  data: CahierSuiviData;
  onNavigate: (tab: string) => void;
}

interface PaletteItem {
  id: string;
  tab: string;
  group: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}

const QUICK_NAV_ITEMS: PaletteItem[] = [
  {
    id: 'nav-general',
    tab: 'general',
    group: 'Accès rapide aux modules',
    title: 'Tableau de Bord & Page de Garde',
    subtitle: 'Indicateurs clés et informations générales',
    icon: <FileBadge className="w-4 h-4 text-blue-600 shrink-0" />,
  },
  {
    id: 'nav-interventions',
    tab: 'interventions',
    group: 'Accès rapide aux modules',
    title: 'Registre des Interventions IT',
    subtitle: 'Tickets, diagnostics et rapports PDF / Word',
    icon: <Wrench className="w-4 h-4 text-blue-600 shrink-0" />,
  },
  {
    id: 'nav-journal',
    tab: 'journal',
    group: 'Accès rapide aux modules',
    title: 'Journal Quotidien des Tâches',
    subtitle: 'Suivi journalier des activités et temps passé',
    icon: <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />,
  },
  {
    id: 'nav-parc',
    tab: 'parc',
    group: 'Accès rapide aux modules',
    title: 'Parc Matériel (CMDB)',
    subtitle: 'Postes, serveurs, garanties et numéros de série',
    icon: <Laptop className="w-4 h-4 text-indigo-600 shrink-0" />,
  },
  {
    id: 'nav-securite',
    tab: 'securite',
    group: 'Accès rapide aux modules',
    title: 'Sauvegardes & Sécurité (PRA)',
    subtitle: 'Règle 3-2-1 et registre cybersécurité',
    icon: <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />,
  },
  {
    id: 'nav-rapports',
    tab: 'rapports',
    group: 'Accès rapide aux modules',
    title: 'Rapports Mensuels & Livraison',
    subtitle: 'Cahiers mensuels Janvier – Décembre',
    icon: <CalendarRange className="w-4 h-4 text-sky-600 shrink-0" />,
  },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  data,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    setQuery('');
    setActiveIndex(0);

    const timer = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === 'function' &&
        document.contains(previousFocusRef.current)
      ) {
        previousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [isOpen, onClose]);

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return QUICK_NAV_ITEMS;

    const list: PaletteItem[] = [];

    data.interventions
      .filter(
        (i) =>
          i.numeroReference.toLowerCase().includes(q) ||
          i.nomDemandeur.toLowerCase().includes(q) ||
          i.descriptionPanne.toLowerCase().includes(q) ||
          i.equipementConcerne.toLowerCase().includes(q) ||
          (i.type || i.typeIntervention || '').toLowerCase().includes(q)
      )
      .slice(0, 4)
      .forEach((it) => {
        list.push({
          id: `int-${it.id}`,
          tab: 'interventions',
          group: 'Interventions IT',
          title: `${it.numeroReference} · ${it.equipementConcerne}`,
          subtitle: `${it.nomDemandeur} — ${it.descriptionPanne}`,
          icon: <Wrench className="w-4 h-4 text-blue-600 shrink-0" />,
        });
      });

    data.journalTaches
      .filter(
        (t) =>
          t.tache.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.observations.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .forEach((t) => {
        list.push({
          id: `tsk-${t.id}`,
          tab: 'journal',
          group: 'Journal Quotidien',
          title: t.tache,
          subtitle: `${t.date} · ${t.statut}`,
          icon: <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />,
        });
      });

    data.parcEquipements
      .filter(
        (p) =>
          p.numeroInventaire.toLowerCase().includes(q) ||
          p.designation.toLowerCase().includes(q) ||
          p.marqueModele.toLowerCase().includes(q) ||
          p.numeroSerie.toLowerCase().includes(q) ||
          p.utilisateurResponsable.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .forEach((p) => {
        list.push({
          id: `prc-${p.id}`,
          tab: 'parc',
          group: 'Parc Matériel & CMDB',
          title: `${p.numeroInventaire} · ${p.designation}`,
          subtitle: `${p.marqueModele} (${p.utilisateurResponsable})`,
          icon: <Laptop className="w-4 h-4 text-indigo-600 shrink-0" />,
        });
      });

    data.consommables
      .filter(
        (c) =>
          c.reference.toLowerCase().includes(q) ||
          c.designation.toLowerCase().includes(q) ||
          c.fournisseur.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .forEach((c) => {
        list.push({
          id: `csm-${c.id}`,
          tab: 'consommables',
          group: 'Consommables & Stocks',
          title: `${c.reference} · ${c.designation}`,
          subtitle: `Stock : ${c.stockActuel} ${c.unite}`,
          icon: <Package className="w-4 h-4 text-amber-600 shrink-0" />,
        });
      });

    (data.bilanAnnuel.projetsRoi || [])
      .filter(
        (r) =>
          r.nomProjet.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.categorie.toLowerCase().includes(q) ||
          'roi retour sur investissement rentabilité amortissement gain économie'.includes(q)
      )
      .slice(0, 4)
      .forEach((r) => {
        list.push({
          id: `roi-${r.id}`,
          tab: 'bilans',
          group: 'Projets & Retour sur Investissement',
          title: r.nomProjet,
          subtitle: `${r.categorie} · +${Math.round(r.economiesFinancieresAnnuellesEuros || 0).toLocaleString('fr-FR')} Ar/an · ${r.gainTempsEstimeHeuresParAn} h/an`,
          icon: <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />,
        });
      });

    return list;
  }, [query, data]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`
    );
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  if (!isOpen) return null;

  const grouped = items.reduce<Record<string, { item: PaletteItem; index: number }[]>>(
    (acc, item, index) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push({ item, index });
      return acc;
    },
    {}
  );

  const handleSelectItem = (item: PaletteItem) => {
    onNavigate(item.tab);
    onClose();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = items[activeIndex] || items[0];
      if (target) handleSelectItem(target);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] flex items-start justify-center pt-12 sm:pt-20 px-4 animate-modal-backdrop no-print"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche globale dans le cahier"
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre de recherche */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50/60">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Rechercher une tâche, intervention, machine, ticket, référence..."
            className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder:text-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Effacer la recherche"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0 mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-mono text-slate-500 ml-1 px-2 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 transition-colors shrink-0"
          >
            Échap
          </button>
        </div>

        {/* Résultats */}
        <div ref={listRef} className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          {items.length === 0 ? (
            <div className="py-10 text-center text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">
                Aucun résultat pour « {query} »
              </p>
              <p className="text-[11px] text-slate-400">
                Essayez un numéro de ticket, un nom d'équipement, un consommable ou un mot-clé.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([groupName, groupItems]) => (
              <div key={groupName}>
                <div className="text-[11px] font-semibold text-slate-500 px-2.5 pb-1.5">
                  {groupName}
                </div>
                <div className="space-y-0.5">
                  {groupItems.map(({ item, index }) => {
                    const isActive = index === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-palette-index={index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleSelectItem(item)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-950 ring-1 ring-blue-200'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.icon}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                        <ArrowRight
                          className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                            isActive ? 'text-blue-600 opacity-100' : 'text-slate-400 opacity-0'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pied de la palette */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]">
                ↑↓
              </kbd>{' '}
              Naviguer
            </span>
            <span>
              <kbd className="font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]">
                Entrée
              </kbd>{' '}
              Ouvrir
            </span>
          </div>
          <span>Recherche instantanée</span>
        </div>
      </div>
    </div>
  );
};
