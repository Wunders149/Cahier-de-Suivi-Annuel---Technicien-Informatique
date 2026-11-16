import React, { useMemo, useState } from 'react';
import { TacheJournal } from '../../types/it-tracker';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Calendar as CalendarIcon,
  RotateCcw,
} from 'lucide-react';
import { formatDuration } from '../../utils/durationFormatter';
import { primaryButtonClass, secondaryButtonClass } from '../ui/formStyles';

interface DailyLogCalendarProps {
  taches: TacheJournal[];
  allTachesCount: number;
  statuts: TacheJournal['statut'][];
  onCreateForDate: (isoDate: string) => void;
  onInspectTask: (tache: TacheJournal) => void;
  onEditTask: (tache: TacheJournal) => void;
  onDuplicateTask: (tache: TacheJournal) => void;
  onDeleteTask: (id: string) => void;
  onStatusChange: (id: string, status: TacheJournal['statut']) => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const WEEKDAY_FULL_FR = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

const toLocalIsoDate = (year: number, monthIndex: number, day: number) =>
  `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;

const getLocalTodayIso = () => {
  const now = new Date();
  return toLocalIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
};

const formatFullDateFr = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return isoDate;
  const dateObj = new Date(y, m - 1, d);
  const weekday = WEEKDAY_FULL_FR[dateObj.getDay()] || '';
  const monthName = MONTH_NAMES_FR[m - 1]?.toLowerCase() || '';
  return `${weekday} ${d} ${monthName} ${y}`;
};

const getChipStatusStyle = (statut: TacheJournal['statut']) => {
  switch (statut) {
    case 'Terminé':
      return 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100/80';
    case 'En cours':
      return 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100/80';
    case 'À faire':
      return 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/80';
    default:
      return 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/70';
  }
};

const getStatusSelectStyle = (statut: TacheJournal['statut']) => {
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

interface CalendarCell {
  iso: string;
  day: number;
  monthIndex: number;
  year: number;
  isCurrentMonth: boolean;
}

export const DailyLogCalendar: React.FC<DailyLogCalendarProps> = ({
  taches,
  allTachesCount,
  statuts,
  onCreateForDate,
  onInspectTask,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onStatusChange,
  hasActiveFilters = false,
  onResetFilters,
}) => {
  const todayIso = useMemo(() => getLocalTodayIso(), []);
  const [viewCursor, setViewCursor] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalTodayIso());

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TacheJournal[]>();
    for (const t of taches) {
      if (!t.date) continue;
      const list = map.get(t.date);
      if (list) {
        list.push(t);
      } else {
        map.set(t.date, [t]);
      }
    }
    for (const [, list] of map) {
      list.sort((a, b) => (a.heure || '00:00').localeCompare(b.heure || '00:00'));
    }
    return map;
  }, [taches]);

  const calendarCells = useMemo<CalendarCell[]>(() => {
    const { year, month } = viewCursor;
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;

    const totalGridCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
    const cells: CalendarCell[] = [];

    for (let i = 0; i < totalGridCells; i++) {
      const dateObj = new Date(year, month, 1 - mondayOffset + i);
      const cellYear = dateObj.getFullYear();
      const cellMonth = dateObj.getMonth();
      const cellDay = dateObj.getDate();
      cells.push({
        iso: toLocalIsoDate(cellYear, cellMonth, cellDay),
        day: cellDay,
        monthIndex: cellMonth,
        year: cellYear,
        isCurrentMonth: cellYear === year && cellMonth === month,
      });
    }

    return cells;
  }, [viewCursor]);

  const currentMonthPrefix = `${viewCursor.year}-${pad2(viewCursor.month + 1)}`;

  const monthSummary = useMemo(() => {
    const monthTasks = taches.filter((t) => t.date?.startsWith(currentMonthPrefix));
    const completed = monthTasks.filter((t) => t.statut === 'Terminé').length;
    const realMinutes = monthTasks.reduce((acc, t) => acc + (t.dureeReelleMin || 0), 0);
    return {
      total: monthTasks.length,
      completed,
      realMinutes,
    };
  }, [taches, currentMonthPrefix]);

  const selectedDayTasks = useMemo(
    () => tasksByDate.get(selectedDate) || [],
    [tasksByDate, selectedDate]
  );

  const selectedDayDurations = useMemo(() => {
    const real = selectedDayTasks.reduce((acc, t) => acc + (t.dureeReelleMin || 0), 0);
    const est = selectedDayTasks.reduce((acc, t) => acc + (t.dureeEstimeeMin || 0), 0);
    return { real, est };
  }, [selectedDayTasks]);

  const goToPrevMonth = () => {
    setViewCursor((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 }
    );
  };

  const goToNextMonth = () => {
    setViewCursor((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 }
    );
  };

  const goToToday = () => {
    const now = new Date();
    setViewCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDate(todayIso);
  };

  const handleSelectCell = (cell: CalendarCell) => {
    setSelectedDate(cell.iso);
    if (!cell.isCurrentMonth) {
      setViewCursor({ year: cell.year, month: cell.monthIndex });
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      {/* Grille mensuelle */}
      <div className="xl:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Barre de navigation du mois */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {MONTH_NAMES_FR[viewCursor.month]} {viewCursor.year}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono tabular-nums">
                {monthSummary.total} tâche{monthSummary.total > 1 ? 's' : ''} ce mois
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-emerald-700 font-medium">
                {monthSummary.completed} terminée{monthSummary.completed > 1 ? 's' : ''}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-blue-700 font-medium">
                {formatDuration(monthSummary.realMinutes)} cumulé
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label="Mois précédent"
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Mois suivant"
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* En-tête des jours de la semaine (Lundi -> Dimanche) */}
        <div className="grid grid-cols-7 bg-slate-900 text-white text-[11px] font-semibold">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-2 px-2 text-center tracking-wide border-r border-slate-800 last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grille des jours */}
        <div className="grid grid-cols-7 border-t border-slate-200">
          {calendarCells.map((cell, idx) => {
            const dayTasks = tasksByDate.get(cell.iso) || [];
            const isToday = cell.iso === todayIso;
            const isSelected = cell.iso === selectedDate;
            const visibleTasks = dayTasks.slice(0, 3);
            const extraCount = dayTasks.length - visibleTasks.length;
            const dayRealMin = dayTasks.reduce(
              (acc, t) => acc + (t.dureeReelleMin || 0),
              0
            );
            const isLastCol = (idx + 1) % 7 === 0;
            const isLastRow = idx >= calendarCells.length - 7;

            return (
              <div
                key={cell.iso}
                onClick={() => handleSelectCell(cell)}
                className={`group relative min-h-[104px] sm:min-h-[120px] p-1.5 border-slate-200 ${
                  isLastCol ? '' : 'border-r'
                } ${
                  isLastRow ? '' : 'border-b'
                } flex flex-col gap-1 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/55 ring-2 ring-inset ring-blue-500/80'
                    : cell.isCurrentMonth
                    ? 'bg-white hover:bg-slate-50/90'
                    : 'bg-slate-50/75 text-slate-400 hover:bg-slate-100/70'
                }`}
              >
                {/* Numéro du jour + action rapide + durée cumulée */}
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectCell(cell);
                    }}
                    aria-label={`Sélectionner le ${formatFullDateFr(cell.iso)}, ${dayTasks.length} tâche${dayTasks.length > 1 ? 's' : ''}`}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-mono tabular-nums font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : isSelected
                        ? 'bg-blue-100 text-blue-800 font-bold'
                        : cell.isCurrentMonth
                        ? 'text-slate-800 hover:bg-slate-200/60'
                        : 'text-slate-400 hover:bg-slate-200/50'
                    }`}
                  >
                    {cell.day}
                  </button>

                  <div className="flex items-center gap-1">
                    {dayRealMin > 0 && (
                      <span className="hidden sm:inline text-[10px] font-mono tabular-nums text-slate-500">
                        {formatDuration(dayRealMin)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(cell.iso);
                        onCreateForDate(cell.iso);
                      }}
                      title={`Planifier une tâche le ${cell.day}/${pad2(cell.monthIndex + 1)}`}
                      aria-label={`Ajouter une tâche le ${formatFullDateFr(cell.iso)}`}
                      className={`w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-blue-700 hover:bg-blue-100/80 transition-opacity focus-visible:opacity-100 ${
                        isSelected
                          ? 'opacity-100 text-blue-700'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Aperçu des tâches du jour */}
                <div className="flex flex-col gap-1 min-w-0">
                  {visibleTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(cell.iso);
                        onInspectTask(t);
                      }}
                      title={`${t.heure} · ${t.tache} (${t.statut})`}
                      className={`w-full text-left px-1.5 py-0.5 rounded border text-[11px] leading-tight truncate transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${getChipStatusStyle(
                        t.statut
                      )}`}
                    >
                      <span className="font-mono tabular-nums text-[10px] opacity-80 mr-1">
                        {t.heure}
                      </span>
                      {t.priorite === 'Urgente' && (
                        <span className="text-red-700 font-bold mr-1" aria-label="Priorité urgente">
                          !
                        </span>
                      )}
                      <span className="font-medium">{t.tache}</span>
                    </button>
                  ))}

                  {extraCount > 0 && (
                    <span className="px-1 text-[10px] font-semibold text-blue-700 font-mono tabular-nums">
                      +{extraCount} autre{extraCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Légende sémantique explicite */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-100 border border-amber-300" aria-hidden="true" />
              <span>À faire</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-100 border border-blue-300" aria-hidden="true" />
              <span>En cours</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-100 border border-emerald-300" aria-hidden="true" />
              <span>Terminé</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 border border-slate-300" aria-hidden="true" />
              <span>En attente / Reporté</span>
            </span>
          </div>
          <span className="text-slate-500">
            Cliquez sur un jour pour planifier ou consulter son programme.
          </span>
        </div>
      </div>

      {/* Panneau latéral : Programme du jour sélectionné */}
      <div className="xl:col-span-4 xl:sticky xl:top-6 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {formatFullDateFr(selectedDate)}
              </h3>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono tabular-nums">
              {selectedDate === todayIso && (
                <>
                  <span className="font-sans font-semibold text-blue-700">
                    Aujourd&apos;hui
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>
                {selectedDayTasks.length} tâche{selectedDayTasks.length > 1 ? 's' : ''}
              </span>
              {selectedDayTasks.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {formatDuration(selectedDayDurations.real)} réel
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onCreateForDate(selectedDate)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Planifier</span>
          </button>
        </div>

        {selectedDayTasks.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs font-medium text-slate-700">
              {allTachesCount === 0
                ? 'Aucune tâche enregistrée dans le journal.'
                : 'Aucune tâche planifiée pour cette journée.'}
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {hasActiveFilters
                ? 'Certaines entrées peuvent être masquées par les filtres actifs.'
                : 'Ajoutez une activité planifiée ou réalisée à cette date pour construire votre suivi quotidien.'}
            </p>
            <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onCreateForDate(selectedDate)}
                className={primaryButtonClass}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter pour ce jour</span>
              </button>
              {hasActiveFilters && onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className={secondaryButtonClass}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
            {selectedDayTasks.map((tache) => (
              <div
                key={tache.id}
                className="p-3.5 hover:bg-slate-50/80 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {tache.heure}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {formatDuration(tache.dureeReelleMin)}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className={`font-semibold ${getPriorityTone(tache.priorite)}`}>
                      {tache.priorite}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 truncate max-w-[130px]">
                    {tache.categorie}
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => onInspectTask(tache)}
                    className="text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                  >
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {tache.tache}
                    </div>
                  </button>
                  {tache.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {tache.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <select
                    value={tache.statut}
                    onChange={(e) =>
                      onStatusChange(
                        tache.id,
                        e.target.value as TacheJournal['statut']
                      )
                    }
                    aria-label={`Statut de ${tache.tache}`}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${getStatusSelectStyle(
                      tache.statut
                    )}`}
                  >
                    {statuts.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onInspectTask(tache)}
                      title="Voir le détail"
                      aria-label={`Voir ${tache.tache}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditTask(tache)}
                      title="Modifier"
                      aria-label={`Modifier ${tache.tache}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateTask(tache)}
                      title="Dupliquer"
                      aria-label={`Dupliquer ${tache.tache}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(tache.id)}
                      title="Supprimer"
                      aria-label={`Supprimer ${tache.tache}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
