import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CahierSuiviData } from '../../types/it-tracker';
import {
  TrendingUp,
  CheckCircle2,
  Wrench,
  CalendarRange,
  ArrowRight,
  ListTodo,
} from 'lucide-react';
import { getMonthPrefix } from '../../utils/monthlyDeliverableGenerator';

interface DashboardStatsProps {
  data: CahierSuiviData;
  onNavigateTab: (tab: string) => void;
}

const SHORT_MONTHS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

const FULL_MONTHS = [
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

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  data,
  onNavigateTab,
}) => {
  const annee = data.generalInfo.anneeReference || new Date().getFullYear();

  const {
    monthlySeries,
    totalCompletedInterventions,
    totalInterventionsCount,
    resolutionRate,
    completedTasksCount,
    totalTaskHours,
    deliveredReportsCount,
    hasAnyInterventions,
  } = useMemo(() => {
    const interventions = data.interventions || [];
    const taches = data.journalTaches || [];
    const rapports = data.rapportsMensuels || [];

    const series = SHORT_MONTHS.map((shortName, idx) => {
      const moisIndex = idx + 1;
      const prefix = getMonthPrefix(annee, moisIndex);

      const monthInterventions = interventions.filter((i) =>
        i.dateReception?.startsWith(prefix)
      );
      const interventionsTerminees = monthInterventions.filter(
        (i) => i.resultat === 'Résolu'
      ).length;
      const interventionsEnCours =
        monthInterventions.length - interventionsTerminees;

      const monthTasks = taches.filter((t) => t.date?.startsWith(prefix));
      const tachesTerminees = monthTasks.filter(
        (t) => t.statut === 'Terminé'
      ).length;

      const rapport = rapports.find((r) => r.moisIndex === moisIndex);

      return {
        mois: shortName,
        moisComplet: FULL_MONTHS[idx],
        moisIndex,
        interventionsTerminees,
        interventionsEnCours,
        totalInterventions: monthInterventions.length,
        tachesTerminees,
        estLivre: rapport?.statutLivraison === 'Livré',
      };
    });

    const totalTerminees = interventions.filter(
      (i) => i.resultat === 'Résolu'
    ).length;
    const totalGlobal = interventions.length;
    const rate =
      totalGlobal > 0 ? Math.round((totalTerminees / totalGlobal) * 100) : 100;

    const doneTasks = taches.filter((t) => t.statut === 'Terminé').length;
    const totalMins = taches.reduce(
      (acc, t) => acc + (t.dureeReelleMin || 0),
      0
    );
    const hours = Math.round((totalMins / 60) * 10) / 10;

    const deliveredCount = rapports.filter(
      (r) => r.statutLivraison === 'Livré'
    ).length;

    return {
      monthlySeries: series,
      totalCompletedInterventions: totalTerminees,
      totalInterventionsCount: totalGlobal,
      resolutionRate: rate,
      completedTasksCount: doneTasks,
      totalTaskHours: hours,
      deliveredReportsCount: deliveredCount,
      hasAnyInterventions: totalGlobal > 0,
    };
  }, [data.interventions, data.journalTaches, data.rapportsMensuels, annee]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    const pct =
      item.totalInterventions > 0
        ? Math.round(
            (item.interventionsTerminees / item.totalInterventions) * 100
          )
        : 0;

    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[220px]">
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
          <span className="font-bold text-white">
            {item.moisComplet} {annee}
          </span>
          <span className="font-mono tabular-nums text-[11px] text-slate-400">
            {item.estLivre ? 'Cahier livré' : 'Suivi mensuel'}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">Interventions terminées</span>
            <strong className="font-mono tabular-nums text-blue-400">
              {item.interventionsTerminees}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">Total reçues ce mois</span>
            <strong className="font-mono tabular-nums text-slate-200">
              {item.totalInterventions}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-300">Tâches journal terminées</span>
            <strong className="font-mono tabular-nums text-emerald-400">
              {item.tachesTerminees}
            </strong>
          </div>
          {item.totalInterventions > 0 && (
            <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-800 text-[11px]">
              <span className="text-slate-400">Taux de résolution</span>
              <strong className="font-mono tabular-nums text-white">
                {pct}%
              </strong>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section aria-label="Tableau de bord statistique" className="space-y-5">
      {/* 4 Cartes KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab('interventions')}
          className="text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-medium">Interventions terminées</span>
            <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {totalCompletedInterventions}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span className="font-mono tabular-nums">
              Sur {totalInterventionsCount} en {annee}
            </span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
          </div>
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-medium">Taux de résolution</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {resolutionRate}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {totalInterventionsCount - totalCompletedInterventions} ouverte(s)
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('journal')}
          className="text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-medium">Tâches journal terminées</span>
            <ListTodo className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {completedTasksCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span className="font-mono tabular-nums">
              {totalTaskHours} h consignées
            </span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('rapports')}
          className="text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-medium">Cahiers mensuels livrés</span>
            <CalendarRange className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {deliveredReportsCount} / 12
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Générer & livrer</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
          </div>
        </button>
      </div>

      {/* Graphique linéaire Recharts : Interventions terminées par mois */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Évolution Mensuelle des Interventions Terminées ({annee})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Graphique linéaire basé en temps réel sur les fiches clôturées du registre des interventions.
            </p>
          </div>
        </div>

        <div className="relative h-72 w-full">
          {!hasAnyInterventions && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/85 dark:bg-slate-900/85 backdrop-blur-[1px] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
              <Wrench className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Aucune intervention enregistrée pour {annee}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                La courbe mensuelle se tracera automatiquement dès que vous consignerez des fiches d'intervention résolues.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('interventions')}
                className="mt-4 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition whitespace-nowrap"
              >
                Consigner une intervention
              </button>
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlySeries}
              margin={{ top: 12, right: 16, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="mois"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="interventionsTerminees"
                name="Interventions terminées"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#1d4ed8' }}
              />
              <Line
                type="monotone"
                dataKey="totalInterventions"
                name="Total interventions reçues"
                stroke="#94a3b8"
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: '#64748b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
