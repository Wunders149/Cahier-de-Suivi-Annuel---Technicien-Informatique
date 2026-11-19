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
  Package,
  AlertTriangle,
  ShieldAlert,
  Target,
  Activity,
} from 'lucide-react';
import { getMonthPrefix } from '../../utils/monthlyDeliverableGenerator';
import { useSogedipromaLiveSnapshot } from '../../utils/sogedipromaLiveStore';

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

function parseBudgetAr(text?: string): number {
  if (!text) return 0;
  const digits = text.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function formatCompactAr(amount: number): string {
  if (amount <= 0) return '0 Ar';
  if (amount >= 1_000_000) {
    const m = (amount / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',');
    return `${m} M Ar`;
  }
  return `${Math.round(amount).toLocaleString('fr-FR')} Ar`;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  data,
  onNavigateTab,
}) => {
  const annee = data.generalInfo.anneeReference || new Date().getFullYear();
  const liveSnapshot = useSogedipromaLiveSnapshot();

  const {
    monthlySeries,
    totalCompletedInterventions,
    totalInterventionsCount,
    resolutionRate,
    completedTasksCount,
    totalTaskHours,
    deliveredReportsCount,
    hasAnyInterventions,
    sogAlerts,
  } = useMemo(() => {
    const interventions = data.interventions || [];
    const taches = data.journalTaches || [];
    const rapports = data.rapportsMensuels || [];
    const consommables = data.consommables || [];
    const demandesAchat = data.demandesAchat || [];
    const maintenances = data.maintenances || [];
    const logiciels = data.logicielsLicences || [];
    const objectifs = data.objectifsAnnuels || [];
    const jalons = data.jalonsCalendrier || [];

    const yearPrefix = `${annee}-`;

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

    const yearInterventions = interventions.filter((i) =>
      i.dateReception?.startsWith(yearPrefix)
    );
    const totalTerminees = yearInterventions.filter(
      (i) => i.resultat === 'Résolu'
    ).length;
    const totalGlobal = yearInterventions.length;
    const rate =
      totalGlobal > 0 ? Math.round((totalTerminees / totalGlobal) * 100) : 100;

    const yearTasks = taches.filter((t) => t.date?.startsWith(yearPrefix));
    const doneTasks = yearTasks.filter((t) => t.statut === 'Terminé').length;
    const totalMins = yearTasks.reduce(
      (acc, t) => acc + (t.dureeReelleMin || 0),
      0
    );
    const hours = Math.round((totalMins / 60) * 10) / 10;

    const deliveredCount = rapports.filter(
      (r) => r.statutLivraison === 'Livré'
    ).length;

    // Alertes & indicateurs opérationnels SOGEDIPROMA
    const ruptureCount = consommables.filter((c) => c.stockActuel <= 0).length;
    const lowStockCount = consommables.filter(
      (c) => c.stockActuel > 0 && c.stockActuel <= c.stockMinimumAlerte
    ).length;
    const pendingPurchasesCount = demandesAchat.filter(
      (d) => d.statut !== 'Reçu / Contrôlé'
    ).length;

    const openTickets = interventions.filter((i) => i.resultat !== 'Résolu');
    const urgentTicketsCount = openTickets.filter(
      (i) => i.priorite === 'Critique' || i.priorite === 'Haute'
    ).length;

    const now = Date.now();
    const in30Days = now + 30 * 24 * 60 * 60 * 1000;
    const expiringLicencesCount = logiciels.filter((l) => {
      if (l.statutConformite === 'Expire sous 30j' || l.statutConformite === 'Sous-licencié') {
        return true;
      }
      if (!l.dateExpiration) return false;
      const ts = new Date(l.dateExpiration).getTime();
      return Number.isFinite(ts) && ts <= in30Days;
    }).length;

    const cameraControls = maintenances.filter(
      (m) =>
        m.id?.startsWith('sog-camchk-') ||
        m.id?.startsWith('sog-cam-') ||
        /cam[eé]ra|vid[eé]o|nvr/i.test(`${m.tacheControle} ${m.responsableOuEquipement}`)
    );
    const liveCameras = liveSnapshot?.cameraHealth || [];
    const cameraTotalCount =
      liveCameras.length > 0 ? liveCameras.length : cameraControls.length;
    const cameraAlertCount =
      liveCameras.length > 0
        ? liveCameras.filter((c) => c.issueCount > 0).length
        : cameraControls.filter((m) => m.statut === 'À traiter' || !m.valide).length;

    const budgetObjectives = objectifs.filter((o) => o.id?.startsWith('sog-bdg-'));
    const totalBudgetAr = budgetObjectives.reduce(
      (sum, o) => sum + parseBudgetAr(o.ressourcesNecessaires),
      0
    );
    const campaignJalons = jalons.filter(
      (j) =>
        j.id?.startsWith('sog-camp-') || /inventaire/i.test(j.titre || '')
    );
    const completedCampaignCount = campaignJalons.filter(
      (j) => j.estComplete
    ).length;

    let lastSyncRev: string | null = null;
    try {
      const rawSync = localStorage.getItem('sogediproma_last_sync_v1');
      if (rawSync) {
        const parsed = JSON.parse(rawSync) as { revision?: number; at?: string };
        if (parsed.revision) {
          const dt = parsed.at
            ? new Date(parsed.at).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';
          lastSyncRev = `Rév. #${parsed.revision}${dt ? ` · ${dt}` : ''}`;
        }
      }
    } catch {
      // Ignorer erreur localStorage
    }

    return {
      monthlySeries: series,
      totalCompletedInterventions: totalTerminees,
      totalInterventionsCount: totalGlobal,
      resolutionRate: rate,
      completedTasksCount: doneTasks,
      totalTaskHours: hours,
      deliveredReportsCount: deliveredCount,
      hasAnyInterventions: totalGlobal > 0,
      sogAlerts: {
        ruptureCount,
        lowStockCount,
        pendingPurchasesCount,
        openTicketsCount: openTickets.length,
        urgentTicketsCount,
        expiringLicencesCount,
        cameraTotalCount,
        cameraAlertCount,
        budgetCount: budgetObjectives.length,
        totalBudgetAr,
        campaignTotalCount: campaignJalons.length,
        completedCampaignCount,
        lastSyncRev,
      },
    };
  }, [
    data.interventions,
    data.journalTaches,
    data.rapportsMensuels,
    data.consommables,
    data.demandesAchat,
    data.maintenances,
    data.logicielsLicences,
    data.objectifsAnnuels,
    data.jalonsCalendrier,
    liveSnapshot,
    annee,
  ]);

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
          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium">Interventions terminées</span>
            <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {totalCompletedInterventions}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="font-mono tabular-nums">
              Sur {totalInterventionsCount} en {annee}
            </span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
          </div>
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium">Taux de résolution</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
            {resolutionRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {totalInterventionsCount - totalCompletedInterventions} ouverte(s)
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('journal')}
          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium">Tâches journal terminées</span>
            <ListTodo className="w-4 h-4 text-indigo-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {completedTasksCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="font-mono tabular-nums">
              {totalTaskHours} h consignées
            </span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('rapports')}
          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-medium">Cahiers mensuels livrés</span>
            <CalendarRange className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {deliveredReportsCount} / 12
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Générer & livrer</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
          </div>
        </button>
      </div>

      {/* Pilotage & Alertes opérationnelles SOGEDIPROMA */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Pilotage &amp; Alertes SOGEDIPROMA</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-slate-500">
            {sogAlerts.lastSyncRev ? `Source live : ${sogAlerts.lastSyncRev}` : 'Indicateurs temps réel du cahier'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('consommables')}
            className="text-left bg-white rounded-xl border border-slate-200 p-3.5 hover:border-blue-300 transition group"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-medium">Stocks critiques &amp; Achats</span>
              <Package
                className={`w-3.5 h-3.5 shrink-0 ${
                  sogAlerts.ruptureCount > 0
                    ? 'text-red-600'
                    : sogAlerts.lowStockCount > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {sogAlerts.ruptureCount + sogAlerts.lowStockCount} alerte(s)
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-2">
              <span className="font-mono tabular-nums truncate">
                {sogAlerts.ruptureCount} rupture · {sogAlerts.pendingPurchasesCount} DA en cours
              </span>
              <ArrowRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('interventions')}
            className="text-left bg-white rounded-xl border border-slate-200 p-3.5 hover:border-blue-300 transition group"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-medium">Tickets ouverts &amp; Urgences</span>
              <AlertTriangle
                className={`w-3.5 h-3.5 shrink-0 ${
                  sogAlerts.urgentTicketsCount > 0
                    ? 'text-red-600'
                    : sogAlerts.openTicketsCount > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {sogAlerts.openTicketsCount} actif(s)
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-2">
              <span className="font-mono tabular-nums truncate">
                {sogAlerts.urgentTicketsCount} critique(s)/haute(s)
              </span>
              <ArrowRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigateTab(
                sogAlerts.expiringLicencesCount > 0 ? 'logiciels' : 'maintenance'
              )
            }
            className="text-left bg-white rounded-xl border border-slate-200 p-3.5 hover:border-blue-300 transition group"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-medium">Vidéosurveillance &amp; Licences</span>
              <ShieldAlert
                className={`w-3.5 h-3.5 shrink-0 ${
                  sogAlerts.expiringLicencesCount > 0 || sogAlerts.cameraAlertCount > 0
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {sogAlerts.expiringLicencesCount} à renouveler
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-2">
              <span className="font-mono tabular-nums truncate">
                {sogAlerts.cameraTotalCount} caméras ({sogAlerts.cameraAlertCount} à suivre)
              </span>
              <ArrowRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('plan')}
            className="text-left bg-white rounded-xl border border-slate-200 p-3.5 hover:border-blue-300 transition group"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-medium">Budgets &amp; Inventaire</span>
              <Target className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 truncate">
              {sogAlerts.totalBudgetAr > 0
                ? formatCompactAr(sogAlerts.totalBudgetAr)
                : `${data.objectifsAnnuels.length} objectif(s)`}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-2">
              <span className="font-mono tabular-nums truncate">
                {sogAlerts.budgetCount} budgets · {sogAlerts.completedCampaignCount}/{sogAlerts.campaignTotalCount || data.jalonsCalendrier.length} jalons
              </span>
              <ArrowRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
            </div>
          </button>
        </div>
      </div>

      {/* Graphique linéaire Recharts : Interventions terminées par mois */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Évolution Mensuelle des Interventions Terminées ({annee})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Graphique linéaire basé en temps réel sur les fiches clôturées du registre des interventions.
            </p>
          </div>
        </div>

        <div className="relative h-72 w-full">
          {!hasAnyInterventions && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/85 backdrop-blur-[1px] rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <Wrench className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-800">
                Aucune intervention enregistrée pour {annee}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md">
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
