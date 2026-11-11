import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { EquipementParc } from '../../types/it-tracker';
import { Laptop, Monitor, Server, Cpu, PieChart as PieIcon, BarChart3, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface InventoryDataVizProps {
  parc: EquipementParc[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export type MainCategory = 'Ordinateurs' | 'Écrans' | 'Serveurs' | 'Périphériques';

export function categorizeEquipment(item: EquipementParc): MainCategory {
  const typeLower = item.type.toLowerCase();
  const desigLower = item.designation.toLowerCase();

  if (
    typeLower.includes('portable') ||
    typeLower.includes('fixe') ||
    typeLower.includes('pc') ||
    desigLower.includes('portable') ||
    desigLower.includes('station fixe') ||
    desigLower.includes('workstation') ||
    desigLower.includes('macbook')
  ) {
    return 'Ordinateurs';
  }

  if (
    typeLower.includes('écran') ||
    typeLower.includes('ecran') ||
    desigLower.includes('écran') ||
    desigLower.includes('moniteur')
  ) {
    return 'Écrans';
  }

  if (
    typeLower.includes('serveur') ||
    desigLower.includes('serveur') ||
    desigLower.includes('hyperviseur') ||
    desigLower.includes('nas') ||
    desigLower.includes('vmware') ||
    desigLower.includes('poweredge') ||
    desigLower.includes('proliant')
  ) {
    return 'Serveurs';
  }

  return 'Périphériques';
}

const CATEGORY_CONFIG: Record<
  MainCategory,
  {
    color: string;
    lightBg: string;
    borderColor: string;
    textColor: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }
> = {
  Ordinateurs: {
    color: '#2563eb', // Bleu Roi
    lightBg: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: Laptop,
    description: 'Postes de travail (PC Portables, Postes fixes, Stations CAO)',
  },
  Écrans: {
    color: '#0284c7', // Sky / Cyan
    lightBg: 'bg-sky-50 dark:bg-sky-950/40',
    borderColor: 'border-sky-200 dark:border-sky-800',
    textColor: 'text-sky-700 dark:text-sky-300',
    icon: Monitor,
    description: 'Moniteurs bureautiques, dalles 4K USB-C et configurations doubles',
  },
  Serveurs: {
    color: '#7c3aed', // Violet
    lightBg: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-800',
    textColor: 'text-purple-700 dark:text-purple-300',
    icon: Server,
    description: 'Hyperviseurs de virtualisation, stockage NAS et contrôleurs AD',
  },
  Périphériques: {
    color: '#059669', // Emeraude
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    icon: Cpu,
    description: 'Imprimantes, copieurs, onduleurs, docks et scanners de production',
  },
};

export const InventoryDataViz: React.FC<InventoryDataVizProps> = ({
  parc,
  selectedCategory,
  onSelectCategory,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'donut' | 'bar'>('donut');

  // Agrégation des données par catégorie
  const { statsByCategory, pieData, barData, totalItems, inWarrantyCount } = useMemo(() => {
    const total = parc.length;
    let warrantyCount = 0;

    const counts: Record<MainCategory, { count: number; items: EquipementParc[]; conditionCounts: Record<string, number> }> = {
      Ordinateurs: { count: 0, items: [], conditionCounts: {} },
      Écrans: { count: 0, items: [], conditionCounts: {} },
      Serveurs: { count: 0, items: [], conditionCounts: {} },
      Périphériques: { count: 0, items: [], conditionCounts: {} },
    };

    parc.forEach((item) => {
      const cat = categorizeEquipment(item);
      counts[cat].count += 1;
      counts[cat].items.push(item);

      // Calcul état
      const etat = item.etatMateriel || 'Bon état';
      counts[cat].conditionCounts[etat] = (counts[cat].conditionCounts[etat] || 0) + 1;

      // Calcul garantie active (si finGarantie ne contient pas 'expiré' et est future ou active)
      if (
        item.finGarantie &&
        !item.finGarantie.toLowerCase().includes('expir') &&
        !item.finGarantie.toLowerCase().includes('échue')
      ) {
        warrantyCount += 1;
      }
    });

    const pData = (Object.keys(counts) as MainCategory[]).map((cat) => {
      const count = counts[cat].count;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        name: cat,
        value: count,
        percentage,
        color: CATEGORY_CONFIG[cat].color,
      };
    });

    const bData = (Object.keys(counts) as MainCategory[]).map((cat) => {
      const cond = counts[cat].conditionCounts;
      const neufOuTresBon = (cond['Neuf'] || 0) + (cond['Très bon état'] || 0);
      const bon = cond['Bon état'] || 0;
      const attention = (cond['Dégradé'] || 0) + (cond['En réparation'] || 0) + (cond['Rebut / Obsolète'] || 0);

      return {
        category: cat,
        'Excellent / Neuf': neufOuTresBon,
        'Bon état': bon,
        'Maintenance / Dégradé': attention,
        total: counts[cat].count,
      };
    });

    return {
      statsByCategory: counts,
      pieData: pData,
      barData: bData,
      totalItems: total,
      inWarrantyCount: warrantyCount,
    };
  }, [parc]);

  // Tooltip personnalisé pour le donut
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const cat = data.name as MainCategory;
      const config = CATEGORY_CONFIG[cat];
      const items = statsByCategory[cat]?.items || [];

      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[200px] z-50">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: data.color }}
              />
              {data.name}
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {data.value} {data.value > 1 ? 'équipements' : 'équipement'}
            </span>
          </div>

          <div className="mt-2 text-slate-300 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Part du parc :</span>
              <strong className="text-white font-mono">{data.percentage}%</strong>
            </div>
            <div className="text-[10px] text-slate-400 italic pt-1">
              {config?.description}
            </div>
            {items.length > 0 && (
              <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
                <span className="block font-medium text-slate-300 mb-0.5">Exemples d'actifs :</span>
                {items.slice(0, 2).map((it) => (
                  <div key={it.id} className="truncate text-slate-400">
                    • {it.designation}
                  </div>
                ))}
                {items.length > 2 && (
                  <div className="text-slate-500 italic">+ {items.length - 2} autres</div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    };
    return null;
  };

  // Tooltip personnalisé pour le graphique en barres
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[190px] z-50">
          <div className="font-bold text-white pb-1.5 border-b border-slate-800">
            {label}
          </div>
          <div className="mt-2 space-y-1 text-[11px]">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name} :
                </span>
                <span className="font-mono font-bold text-white">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    };
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
      {/* Barre de titre et commutateur de vue */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <PieIcon className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Visualisation & Répartition du Parc Informatique
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Répartition analytique des actifs par familles : ordinateurs, écrans, serveurs et périphériques.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveChartTab('donut')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition ${
              activeChartTab === 'donut'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Donut Types</span>
          </button>
          <button
            onClick={() => setActiveChartTab('bar')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition ${
              activeChartTab === 'bar'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>État par Famille</span>
          </button>
        </div>
      </div>

      {/* Cartes KPI récapitulatives interactives */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(CATEGORY_CONFIG) as MainCategory[]).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const Icon = cfg.icon;
          const count = statsByCategory[cat]?.count || 0;
          const percentage = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
          const isSelected = selectedCategory === cat;

          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(isSelected ? null : cat)}
              className={`text-left p-3.5 rounded-xl border transition duration-150 flex flex-col justify-between relative overflow-hidden group ${
                isSelected
                  ? 'ring-2 ring-blue-600 bg-blue-50/50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-xs'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-2xs border border-slate-100 dark:border-slate-700">
                  <Icon className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                </span>
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${cfg.color}18`,
                    color: cfg.color,
                  }}
                >
                  {percentage}%
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                  {cat}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {count}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {count > 1 ? 'unités' : 'unité'}
                  </span>
                </div>
              </div>

              {/* Indicateur de filtre actif */}
              {isSelected && (
                <div className="mt-2 pt-1.5 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between text-[10px] text-blue-700 dark:text-blue-300 font-semibold">
                  <span>Filtre actif</span>
                  <span>✕ Réinitialiser</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Zone du graphique Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
        {/* Graphique principal */}
        <div className="lg:col-span-7 h-64 sm:h-72 w-full flex items-center justify-center">
          {totalItems === 0 ? (
            <div className="text-center text-slate-400 text-xs py-8">
              Aucun équipement enregistré dans le parc.
            </div>
          ) : activeChartTab === 'donut' ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  onClick={(entry) => {
                    const cat = entry.name as MainCategory;
                    onSelectCategory(selectedCategory === cat ? null : cat);
                  }}
                  cursor="pointer"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={selectedCategory === entry.name ? '#0f172a' : '#ffffff'}
                      strokeWidth={selectedCategory === entry.name ? 3 : 1.5}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="category"
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
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="Excellent / Neuf" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Bon état" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Maintenance / Dégradé" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Légende analytique & Indicateurs clés d'exploitation */}
        <div className="lg:col-span-5 space-y-3.5 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-6">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
            Synthèse d'exploitation du Parc
          </div>

          <div className="space-y-2.5">
            {(Object.keys(CATEGORY_CONFIG) as MainCategory[]).map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const count = statsByCategory[cat]?.count || 0;
              const percentage = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
              const isSelected = selectedCategory === cat;

              return (
                <div
                  key={cat}
                  onClick={() => onSelectCategory(isSelected ? null : cat)}
                  className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 font-semibold text-blue-900 dark:text-blue-200'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="truncate">{cat}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      {count} {count > 1 ? 'actifs' : 'actif'}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 min-w-[32px] text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cartouche informatif KPI santé globale */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/60 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                  Sous garantie
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  {inWarrantyCount} / {totalItems}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/60 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                  Actifs gérés
                </span>
                <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                  {totalItems} équipements
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
