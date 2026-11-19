import React, { useMemo, useState } from 'react';
import { TacheJournal } from '../../types/it-tracker';
import {
  Plus,
  Search,
  Calendar,
  Eye,
  Edit3,
  Trash2,
  Copy,
  X,
  ArrowUpDown,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  LayoutList,
  CalendarDays,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import {
  dangerButtonClass,
  fieldInputClass,
  fieldSelectClass,
  fieldTextareaClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/formStyles';
import { formatDuration } from '../../utils/durationFormatter';
import { addDaysToIso, getLocalTodayIso } from '../../utils/coherenceUtils';
import { DailyLogCalendar } from '../journal/DailyLogCalendar';

interface DailyLogSectionProps {
  taches: TacheJournal[];
  onUpdateTaches: (taches: TacheJournal[]) => void;
  onShowToast?: (msg: string) => void;
}

const CATEGORIES: TacheJournal['categorie'][] = [
  'Support Utilisateur',
  'Déploiement Matériel',
  'Réseau & Wifi',
  'Système & Serveur',
  'Maintenance Préventive',
  'Sécurité & Sauvegarde',
  'Gestion des Stocks',
  'Autre',
];

const PRIORITES: TacheJournal['priorite'][] = [
  'Urgente',
  'Élevée',
  'Normale',
  'Faible',
];

const STATUTS: TacheJournal['statut'][] = [
  'À faire',
  'En cours',
  'Terminé',
  'En attente',
  'Reporté',
];

type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
type SortDirection = 'desc' | 'asc';

const getTodayIso = () => getLocalTodayIso();

const DEFAULT_TASK_FORM = (): Partial<TacheJournal> => ({
  date: getTodayIso(),
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

const getPriorityTone = (priorite: TacheJournal['priorite']) => {
  switch (priorite) {
    case 'Urgente':
      return 'text-red-700';
    case 'Élevée':
      return 'text-amber-700';
    case 'Normale':
      return 'text-blue-700';
    default:
      return 'text-slate-500';
  }
};

const getStatusClasses = (statut: TacheJournal['statut']) => {
  switch (statut) {
    case 'Terminé':
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    case 'En cours':
      return 'bg-blue-50 text-blue-800 border-blue-300';
    case 'À faire':
      return 'bg-amber-50 text-amber-800 border-amber-300';
    case 'En attente':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-300';
  }
};

const formatDateShortFr = (isoDate: string) => {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const DailyLogSection: React.FC<DailyLogSectionProps> = ({
  taches,
  onUpdateTaches,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [categoryFilter, setCategoryFilter] = useState<string>('Tous');
  const [priorityFilter, setPriorityFilter] = useState<string>('Toutes');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customDate, setCustomDate] = useState<string>(getTodayIso());
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modales CRUD
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [formTask, setFormTask] = useState<Partial<TacheJournal>>(DEFAULT_TASK_FORM);

  const [inspectingId, setInspectingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const inspectingTask = useMemo(
    () => taches.find((t) => t.id === inspectingId) || null,
    [taches, inspectingId]
  );

  const taskPendingDelete = useMemo(
    () => taches.find((t) => t.id === confirmDeleteId) || null,
    [taches, confirmDeleteId]
  );

  const openCreateModal = (presetDate?: string) => {
    setEditingId(null);
    setIsDuplicating(false);
    const today = getTodayIso();
    const targetDate = presetDate || today;
    setFormTask({
      ...DEFAULT_TASK_FORM(),
      date: targetDate,
      statut: targetDate > today ? 'À faire' : 'Terminé',
    });
    setShowFormModal(true);
  };

  const openEditModal = (tache: TacheJournal) => {
    setEditingId(tache.id);
    setIsDuplicating(false);
    setFormTask({ ...tache });
    setShowFormModal(true);
  };

  const openDuplicateModal = (tache: TacheJournal) => {
    setEditingId(null);
    setIsDuplicating(true);
    setFormTask({
      ...tache,
      id: undefined,
      date: getTodayIso(),
      statut: 'À faire',
      resultat: '',
    });
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setEditingId(null);
    setIsDuplicating(false);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = formTask.tache?.trim();
    if (!title) return;

    const cleanEstimee = Math.max(0, Number(formTask.dureeEstimeeMin) || 0);
    const cleanReelle = Math.max(0, Number(formTask.dureeReelleMin) || 0);
    const resolvedResultat =
      formTask.resultat?.trim() ||
      (formTask.statut === 'Terminé' ? 'Tâche effectuée avec succès.' : 'En suivi.');

    const payload: TacheJournal = {
      id: editingId || `JRN-${Date.now()}`,
      date: formTask.date || getTodayIso(),
      heure: formTask.heure || '09:00',
      tache: title,
      description: formTask.description?.trim() || '',
      categorie: formTask.categorie || 'Support Utilisateur',
      priorite: formTask.priorite || 'Normale',
      dureeEstimeeMin: cleanEstimee,
      dureeReelleMin: cleanReelle,
      statut: formTask.statut || 'Terminé',
      resultat: resolvedResultat,
      observations: formTask.observations?.trim() || '',
    };

    if (editingId) {
      const updated = taches.map((t) => (t.id === editingId ? payload : t));
      onUpdateTaches(updated);
      notify('Entrée du journal mise à jour.');
    } else {
      onUpdateTaches([payload, ...taches]);
      notify(
        isDuplicating
          ? 'Entrée dupliquée et ajoutée au journal.'
          : 'Nouvelle tâche enregistrée dans le journal.'
      );
    }

    handleCloseFormModal();
  };

  const handleStatusChange = (id: string, newStatus: TacheJournal['statut']) => {
    const updated = taches.map((t) =>
      t.id === id ? { ...t, statut: newStatus } : t
    );
    onUpdateTaches(updated);
    notify(`Statut mis à jour : ${newStatus}`);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteId) return;
    const updated = taches.filter((t) => t.id !== confirmDeleteId);
    onUpdateTaches(updated);
    if (inspectingId === confirmDeleteId) {
      setInspectingId(null);
    }
    setConfirmDeleteId(null);
    notify('Entrée supprimée du journal.');
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'Tous' ||
    categoryFilter !== 'Tous' ||
    priorityFilter !== 'Toutes' ||
    (viewMode === 'list' && periodFilter !== 'all');

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Tous');
    setCategoryFilter('Tous');
    setPriorityFilter('Toutes');
    setPeriodFilter('all');
  };

  const baseFilteredTaches = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return taches.filter((t) => {
      const matchSearch =
        !query ||
        t.tache.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.resultat.toLowerCase().includes(query) ||
        (t.observations || '').toLowerCase().includes(query) ||
        t.categorie.toLowerCase().includes(query);

      const matchStatus = statusFilter === 'Tous' || t.statut === statusFilter;
      const matchCat = categoryFilter === 'Tous' || t.categorie === categoryFilter;
      const matchPriority =
        priorityFilter === 'Toutes' || t.priorite === priorityFilter;

      return matchSearch && matchStatus && matchCat && matchPriority;
    });
  }, [taches, searchTerm, statusFilter, categoryFilter, priorityFilter]);

  const filteredTaches = useMemo(() => {
    const today = getTodayIso();
    const weekAgoIso = addDaysToIso(today, -7);
    const currentMonthPrefix = today.slice(0, 7);

    const filtered = baseFilteredTaches.filter((t) => {
      if (periodFilter === 'today') {
        return t.date === today;
      }
      if (periodFilter === 'week') {
        return t.date >= weekAgoIso && t.date <= today;
      }
      if (periodFilter === 'month') {
        return t.date.startsWith(currentMonthPrefix);
      }
      if (periodFilter === 'custom' && customDate) {
        return t.date === customDate;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const keyA = `${a.date}T${a.heure || '00:00'}`;
      const keyB = `${b.date}T${b.heure || '00:00'}`;
      if (keyA === keyB) return 0;
      return sortDirection === 'desc'
        ? keyB.localeCompare(keyA)
        : keyA.localeCompare(keyB);
    });
  }, [baseFilteredTaches, periodFilter, customDate, sortDirection]);

  const activeScopeTaches =
    viewMode === 'calendar' ? baseFilteredTaches : filteredTaches;

  const stats = useMemo(() => {
    const totalRealMin = activeScopeTaches.reduce(
      (acc, t) => acc + (t.dureeReelleMin || 0),
      0
    );
    const totalEstMin = activeScopeTaches.reduce(
      (acc, t) => acc + (t.dureeEstimeeMin || 0),
      0
    );
    const completedCount = activeScopeTaches.filter(
      (t) => t.statut === 'Terminé'
    ).length;
    const activeCount = activeScopeTaches.filter(
      (t) => t.statut === 'À faire' || t.statut === 'En cours' || t.statut === 'En attente'
    ).length;
    const completionRate =
      activeScopeTaches.length > 0
        ? Math.round((completedCount / activeScopeTaches.length) * 100)
        : 0;

    return {
      totalRealMin,
      totalEstMin,
      completedCount,
      activeCount,
      completionRate,
    };
  }, [activeScopeTaches]);

  const formDurationDiff =
    (Number(formTask.dureeReelleMin) || 0) - (Number(formTask.dureeEstimeeMin) || 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
              3
            </span>
            <span>Gestion Quotidienne des Activités (Journal de Bord)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Consignation chronologique, planification mensuelle, suivi des durées réelles et clôture des activités.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Mode d'affichage du journal"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/80"
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              aria-pressed={viewMode === 'calendar'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendrier</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal()}
            className={primaryButtonClass}
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une tâche</span>
          </button>
        </div>
      </div>

      {/* Synthèse quantitative du journal (selon filtres actifs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="text-[11px] font-medium text-slate-500">
            Entrées affichées
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {activeScopeTaches.length}
            </span>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              sur {taches.length} au total
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="text-[11px] font-medium text-slate-500">
            Taux d&apos;achèvement
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
              {stats.completionRate}%
            </span>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              {stats.completedCount} terminée{stats.completedCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="text-[11px] font-medium text-slate-500">
            À traiter / En cours
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold text-amber-700 font-mono tabular-nums">
              {stats.activeCount}
            </span>
            <span className="text-[11px] text-slate-500">
              tâche{stats.activeCount > 1 ? 's' : ''} ouverte{stats.activeCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <div className="text-[11px] font-medium text-slate-500">
            Temps réel cumulé
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold text-blue-700 font-mono tabular-nums">
              {formatDuration(stats.totalRealMin)}
            </span>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              est. {formatDuration(stats.totalEstMin)}
            </span>
          </div>
        </div>
      </div>

      {/* Barre de recherche, filtres et tri */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par intitulé, description, résultat, observation..."
              aria-label="Rechercher dans le journal quotidien"
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Effacer la recherche"
                className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrer par statut"
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="Tous">Tous les statuts</option>
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filtrer par catégorie"
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="Tous">Toutes catégories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filtrer par priorité"
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="Toutes">Toutes priorités</option>
              {PRIORITES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {viewMode === 'list' && (
              <button
                type="button"
                onClick={() =>
                  setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                }
                title="Inverser l'ordre chronologique"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium whitespace-nowrap shrink-0 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {sortDirection === 'desc' ? 'Plus récent' : 'Plus ancien'}
                </span>
              </button>
            )}

            {viewMode === 'calendar' && hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium whitespace-nowrap shrink-0 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Sélecteur de période + Réinitialisation (mode liste) */}
        {viewMode === 'list' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'Toutes dates' },
                  { id: 'today', label: "Aujourd'hui" },
                  { id: 'week', label: '7 jours' },
                  { id: 'month', label: 'Ce mois' },
                  { id: 'custom', label: 'Date précise' },
                ] as { id: PeriodFilter; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPeriodFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    periodFilter === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}

              {periodFilter === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  aria-label="Choisir une date précise"
                  className="ml-1 px-2 py-1 rounded-md border border-slate-300 bg-white text-slate-800 text-xs font-mono tabular-nums"
                />
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser les filtres</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Création / Édition / Duplication */}
      <Modal
        isOpen={showFormModal}
        onClose={handleCloseFormModal}
        title={
          editingId
            ? "Modifier l'entrée du journal"
            : isDuplicating
            ? 'Dupliquer une entrée du journal'
            : 'Nouvelle entrée au journal quotidien'
        }
        subtitle={
          editingId
            ? 'Mettez à jour les informations, durées ou observations de cette tâche.'
            : 'Consignez une activité, son estimation de durée et le résultat obtenu.'
        }
        icon={<Calendar className="w-4 h-4" />}
        size="lg"
        onSubmit={handleSaveTask}
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseFormModal}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              {editingId
                ? 'Enregistrer les modifications'
                : 'Enregistrer dans le journal'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Planification & Nature de l'activité">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Date" required>
                <input
                  type="date"
                  required
                  value={formTask.date || ''}
                  onChange={(e) =>
                    setFormTask({ ...formTask, date: e.target.value })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Heure" required>
                <input
                  type="time"
                  required
                  value={formTask.heure || '09:00'}
                  onChange={(e) =>
                    setFormTask({ ...formTask, heure: e.target.value })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <FormField label="Intitulé de la tâche" required>
              <input
                type="text"
                required
                data-autofocus
                placeholder="Ex: Remplacement switch étage 1 et tests de connectivité"
                value={formTask.tache || ''}
                onChange={(e) =>
                  setFormTask({ ...formTask, tache: e.target.value })
                }
                className={fieldInputClass}
              />
            </FormField>

            <FormField label="Description détaillée de l'activité">
              <textarea
                rows={3}
                placeholder="Détails techniques, étapes, contexte..."
                value={formTask.description || ''}
                onChange={(e) =>
                  setFormTask({ ...formTask, description: e.target.value })
                }
                className={fieldTextareaClass}
              />
            </FormField>
          </FormSection>

          <FormSection
            title="2. Classification & Suivi du temps"
            separated
            rightSlot={
              <span
                className={`text-[11px] font-mono tabular-nums font-medium ${
                  formDurationDiff > 0
                    ? 'text-amber-700'
                    : formDurationDiff < 0
                    ? 'text-emerald-700'
                    : 'text-slate-500'
                }`}
              >
                {formDurationDiff === 0
                  ? 'Écart : conforme'
                  : formDurationDiff > 0
                  ? `Écart : +${formatDuration(formDurationDiff)}`
                  : `Écart : -${formatDuration(Math.abs(formDurationDiff))}`}
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Catégorie">
                <select
                  value={formTask.categorie || 'Support Utilisateur'}
                  onChange={(e) =>
                    setFormTask({
                      ...formTask,
                      categorie: e.target.value as TacheJournal['categorie'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Priorité">
                <select
                  value={formTask.priorite || 'Normale'}
                  onChange={(e) =>
                    setFormTask({
                      ...formTask,
                      priorite: e.target.value as TacheJournal['priorite'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  {PRIORITES.map((prio) => (
                    <option key={prio} value={prio}>
                      {prio}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField
                label="Durée estimée (min)"
                rightSlot={
                  <span className="text-[11px] font-mono tabular-nums text-slate-500">
                    {formatDuration(formTask.dureeEstimeeMin ?? 30)}
                  </span>
                }
              >
                <input
                  type="number"
                  min={0}
                  value={formTask.dureeEstimeeMin ?? 30}
                  onChange={(e) =>
                    setFormTask({
                      ...formTask,
                      dureeEstimeeMin: Math.max(
                        0,
                        parseInt(e.target.value, 10) || 0
                      ),
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>

              <FormField
                label="Durée réelle (min)"
                rightSlot={
                  <span className="text-[11px] font-mono tabular-nums font-semibold text-blue-700">
                    {formatDuration(formTask.dureeReelleMin ?? 30)}
                  </span>
                }
              >
                <input
                  type="number"
                  min={0}
                  value={formTask.dureeReelleMin ?? 30}
                  onChange={(e) =>
                    setFormTask({
                      ...formTask,
                      dureeReelleMin: Math.max(
                        0,
                        parseInt(e.target.value, 10) || 0
                      ),
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500 mr-1">
                  Raccourcis durée réelle :
                </span>
                {[15, 30, 60, 120, 240, 480].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      setFormTask({ ...formTask, dureeReelleMin: mins })
                    }
                    className={`px-2.5 py-1 rounded-md border font-mono tabular-nums transition-colors ${
                      formTask.dureeReelleMin === mins
                        ? 'bg-blue-50 border-blue-400 text-blue-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {formatDuration(mins)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormTask({
                    ...formTask,
                    dureeReelleMin: formTask.dureeEstimeeMin ?? 30,
                  })
                }
                className="text-blue-700 hover:underline font-medium whitespace-nowrap"
              >
                Aligner sur l&apos;estimée
              </button>
            </div>
          </FormSection>

          <FormSection title="3. Statut & Compte-rendu" separated>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <FormField label="Statut">
                <select
                  value={formTask.statut || 'Terminé'}
                  onChange={(e) =>
                    setFormTask({
                      ...formTask,
                      statut: e.target.value as TacheJournal['statut'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  {STATUTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Résultat obtenu">
                <input
                  type="text"
                  placeholder="Ex: Opérationnel, conforme..."
                  value={formTask.resultat || ''}
                  onChange={(e) =>
                    setFormTask({ ...formTask, resultat: e.target.value })
                  }
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <FormField label="Observations / Suite à donner">
              <textarea
                rows={2}
                placeholder="Observations complémentaires, points d'attention..."
                value={formTask.observations || ''}
                onChange={(e) =>
                  setFormTask({ ...formTask, observations: e.target.value })
                }
                className={fieldTextareaClass}
              />
            </FormField>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Lecture / Inspection détaillée (READ) */}
      <Modal
        isOpen={Boolean(inspectingTask)}
        onClose={() => setInspectingId(null)}
        title={inspectingTask?.tache || 'Détail de la tâche'}
        subtitle={
          inspectingTask
            ? `${formatDateShortFr(inspectingTask.date)} · ${inspectingTask.heure} · ${inspectingTask.categorie}`
            : undefined
        }
        icon={<Clock className="w-4 h-4" />}
        size="md"
        footer={
          inspectingTask && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(inspectingTask.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingTask;
                    setInspectingId(null);
                    openDuplicateModal(target);
                  }}
                  className={secondaryButtonClass}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Dupliquer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectingTask;
                    setInspectingId(null);
                    openEditModal(target);
                  }}
                  className={primaryButtonClass}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
              </div>
            </div>
          )
        }
      >
        {inspectingTask && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="text-[11px] text-slate-500">Statut</div>
                <div className="mt-1">
                  <select
                    value={inspectingTask.statut}
                    onChange={(e) =>
                      handleStatusChange(
                        inspectingTask.id,
                        e.target.value as TacheJournal['statut']
                      )
                    }
                    aria-label="Changer le statut de la tâche"
                    className={`text-xs font-semibold px-2 py-1 rounded-md border ${getStatusClasses(
                      inspectingTask.statut
                    )}`}
                  >
                    {STATUTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Priorité</div>
                <div
                  className={`mt-1.5 text-xs font-semibold ${getPriorityTone(
                    inspectingTask.priorite
                  )}`}
                >
                  {inspectingTask.priorite}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Durée réelle / estimée</div>
                <div className="mt-1.5 text-xs font-mono tabular-nums font-semibold text-slate-900">
                  {formatDuration(inspectingTask.dureeReelleMin)}{' '}
                  <span className="font-normal text-slate-500">
                    / {formatDuration(inspectingTask.dureeEstimeeMin)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Description complète
              </h4>
              <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">
                {inspectingTask.description || 'Aucune description renseignée.'}
              </p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Résultat obtenu
              </h4>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-[13px] leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{inspectingTask.resultat || 'Non précisé.'}</span>
              </div>
            </div>

            {inspectingTask.observations && inspectingTask.observations !== 'N/A' && (
              <div>
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Observations / Suite à donner
                </h4>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[13px] leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line">
                    {inspectingTask.observations}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Confirmation Suppression (DELETE) */}
      <Modal
        isOpen={Boolean(taskPendingDelete)}
        onClose={() => setConfirmDeleteId(null)}
        title="Supprimer cette entrée du journal ?"
        subtitle="Cette action retirera définitivement la tâche du cahier de bord."
        icon={<Trash2 className="w-4 h-4" />}
        tone="danger"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className={dangerButtonClass}
            >
              Supprimer définitivement
            </button>
          </>
        }
      >
        {taskPendingDelete && (
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>Vous êtes sur le point de supprimer l&apos;activité suivante :</p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-semibold text-slate-900">
                {taskPendingDelete.tache}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
                {formatDateShortFr(taskPendingDelete.date)} · {taskPendingDelete.heure} ·{' '}
                {taskPendingDelete.categorie}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Vue Calendrier ou Tableau du journal */}
      {viewMode === 'calendar' ? (
        <DailyLogCalendar
          taches={baseFilteredTaches}
          allTachesCount={taches.length}
          statuts={STATUTS}
          onCreateForDate={(isoDate) => openCreateModal(isoDate)}
          onInspectTask={(tache) => setInspectingId(tache.id)}
          onEditTask={openEditModal}
          onDuplicateTask={openDuplicateModal}
          onDeleteTask={(id) => setConfirmDeleteId(id)}
          onStatusChange={handleStatusChange}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 font-semibold whitespace-nowrap">Date &amp; Heure</th>
                  <th className="p-3 font-semibold">Tâche &amp; Description</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Catégorie</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Priorité</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Durée (Réelle / Est.)</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Statut</th>
                  <th className="p-3 font-semibold">Résultat &amp; Observations</th>
                  <th className="p-3 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filteredTaches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <p className="text-sm font-medium text-slate-700">
                          {taches.length === 0
                            ? 'Votre journal quotidien est vierge et prêt pour vos premières saisies.'
                            : 'Aucune entrée ne correspond aux critères sélectionnés.'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {taches.length === 0
                            ? 'Consignez vos interventions de support, déploiements et contrôles techniques avec suivi des durées.'
                            : 'Essayez de modifier votre recherche ou de réinitialiser les filtres actifs.'}
                        </p>
                        <div className="pt-1 flex items-center justify-center gap-2">
                          {taches.length === 0 ? (
                            <button
                              type="button"
                              onClick={() => openCreateModal()}
                              className={primaryButtonClass}
                            >
                              <Plus className="w-4 h-4" />
                              <span>Consigner une première tâche</span>
                            </button>
                        ) : (
                          <button
                            type="button"
                            onClick={resetFilters}
                            className={secondaryButtonClass}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Réinitialiser les filtres</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTaches.map((tache) => (
                  <tr
                    key={tache.id}
                    className="hover:bg-slate-50/90 transition-colors"
                  >
                    <td className="p-3 whitespace-nowrap align-top font-mono tabular-nums text-xs">
                      <span className="font-bold text-slate-900 block">
                        {formatDateShortFr(tache.date)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {tache.heure}
                      </span>
                    </td>
                    <td className="p-3 align-top max-w-xs">
                      <button
                        type="button"
                        onClick={() => setInspectingId(tache.id)}
                        className="text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                      >
                        <strong className="text-slate-900 group-hover:text-blue-700 transition-colors block font-bold text-xs">
                          {tache.tache}
                        </strong>
                        {tache.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {tache.description}
                          </p>
                        )}
                      </button>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <span className="text-slate-600 font-medium text-xs">
                        {tache.categorie}
                      </span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold ${getPriorityTone(
                          tache.priorite
                        )}`}
                      >
                        {tache.priorite}
                      </span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap font-mono tabular-nums text-xs">
                      <span className="font-bold text-slate-900">
                        {formatDuration(tache.dureeReelleMin)}
                      </span>
                      <span className="text-slate-400 text-[11px] block">
                        est. {formatDuration(tache.dureeEstimeeMin)}
                      </span>
                    </td>
                    <td className="p-3 align-top whitespace-nowrap">
                      <select
                        value={tache.statut}
                        onChange={(e) =>
                          handleStatusChange(
                            tache.id,
                            e.target.value as TacheJournal['statut']
                          )
                        }
                        aria-label={`Statut de ${tache.tache}`}
                        className={`text-xs font-semibold px-2 py-1 rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${getStatusClasses(
                          tache.statut
                        )}`}
                      >
                        {STATUTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 align-top text-xs min-w-[200px] max-w-sm">
                      <div className="font-medium text-emerald-950 bg-emerald-50/70 px-2 py-1.5 rounded-md border border-emerald-200/70 leading-snug">
                        {tache.resultat || '—'}
                      </div>
                      {tache.observations && tache.observations !== 'N/A' && (
                        <div className="text-slate-500 italic text-[11px] mt-1 line-clamp-2">
                          Obs : {tache.observations}
                        </div>
                      )}
                    </td>
                    <td className="p-3 align-top whitespace-nowrap text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setInspectingId(tache.id)}
                          title="Voir le détail complet"
                          aria-label={`Voir ${tache.tache}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(tache)}
                          title="Modifier cette entrée"
                          aria-label={`Modifier ${tache.tache}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDuplicateModal(tache)}
                          title="Dupliquer pour aujourd'hui"
                          aria-label={`Dupliquer ${tache.tache}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(tache.id)}
                          title="Supprimer cette entrée"
                          aria-label={`Supprimer ${tache.tache}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
