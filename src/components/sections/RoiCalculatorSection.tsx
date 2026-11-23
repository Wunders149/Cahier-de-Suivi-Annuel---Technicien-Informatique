import React, { useMemo, useState } from 'react';
import {
  Calculator,
  TrendingUp,
  RefreshCw,
  ArrowRightLeft,
  Search,
  Sparkles,
  CheckCircle2,
  Plus,
  BarChart2,
  Coins,
  Layers,
  RotateCcw,
  PlugZap,
  Clock,
  SlidersHorizontal,
  FileDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CahierSuiviData, ObjectifAnnuel, ProjetRoiIT } from '../../types/it-tracker';
import { RoiProjectsSection } from '../roi/RoiProjectsSection';
import {
  DEFAULT_FX_RATES,
  FxRates,
  RoiCurrency,
  convertFromAriary,
  convertToAriary,
  detectCurrencyAndConvertToAr,
  formatAriary,
  formatCompactAriary,
  formatCompactAriaryAxis,
  loadFxRates,
  saveFxRates,
} from '../../utils/currencyConverter';
import { getLocalTodayIso } from '../../utils/coherenceUtils';

interface RoiCalculatorSectionProps {
  data: CahierSuiviData;
  onUpdateProjets: (projets: ProjetRoiIT[]) => void;
  onShowToast?: (msg: string) => void;
  onOpenSogedipromaSync?: () => void;
}

interface ParsedBudgetLine {
  id: string;
  titre: string;
  categorie: string;
  roiCategorie: ProjetRoiIT['categorie'];
  exercice: string;
  responsable: string;
  allocatedAr: number;
  committedAr: number;
  spentAr: number;
  remainingAr: number;
  consumptionPct: number;
  rawDescription: string;
  rawResultats: string;
}

interface LineSimOverride {
  savingsPct?: number;
  capexRaw?: number;
  capexCurrency?: RoiCurrency;
  hoursSavedPerYear?: number;
}

const DEFAULT_HOURLY_RATE_AR = 25000;

function extractSegment(text: string, prefix: string): string {
  if (!text) return '';
  const parts = text.split('·').map((s) => s.trim());
  const match = parts.find((p) => p.toLowerCase().startsWith(prefix.toLowerCase()));
  if (!match) return '';
  return match.slice(prefix.length).trim();
}

function parseAriaryDigits(text?: string): number {
  if (!text) return 0;
  const digits = text.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function mapCategoryToRoi(titre: string, cat: string, desc: string): ProjetRoiIT['categorie'] {
  const hay = `${titre} ${cat} ${desc}`.toLowerCase();
  if (/sécur|sauvegard|antivirus|pare-feu|caméra|cctv|vidéo|pra/.test(hay)) {
    return 'Sécurité & Sauvegarde';
  }
  if (/réseau|fibre|starlink|switch|wifi|routeur|télécom/.test(hay)) {
    return 'Réseau & Télécoms';
  }
  if (/cloud|saas|licence|odoo|m365|abonnement|logiciel|workspace|chatgpt/.test(hay)) {
    return 'Cloud & SaaS';
  }
  if (/automat|script|api|logiciel/.test(hay)) {
    return 'Automatisation';
  }
  if (/poste|pc|laptop|imprimante|bureautique|écran|consommable/.test(hay)) {
    return 'Bureautique & Postes';
  }
  return 'Infrastructure';
}

function defaultSavingsPctForCategory(roiCat: ProjetRoiIT['categorie'], fallbackPct: number): number {
  switch (roiCat) {
    case 'Cloud & SaaS':
      return Math.min(45, fallbackPct + 5);
    case 'Automatisation':
      return Math.min(45, fallbackPct + 5);
    default:
      return fallbackPct;
  }
}

export const RoiCalculatorSection: React.FC<RoiCalculatorSectionProps> = ({
  data,
  onUpdateProjets,
  onShowToast,
  onOpenSogedipromaSync,
}) => {
  const projets = data.bilanAnnuel.projetsRoi || [];

  const [activeView, setActiveView] = useState<'analyser' | 'portfolio'>('analyser');
  const [fxRates, setFxRates] = useState<FxRates>(() => loadFxRates());

  // Paramètres globaux du simulateur 2027
  const [globalOptimizationPct, setGlobalOptimizationPct] = useState<number>(20);
  const [hourlyRateAr, setHourlyRateAr] = useState<number>(DEFAULT_HOURLY_RATE_AR);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<'2027' | 'all'>('2027');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lineOverrides, setLineOverrides] = useState<Record<string, LineSimOverride>>({});

  // Convertisseur rapide multi-devises vers Ar -> Projet ROI
  const [quickLabel, setQuickLabel] = useState<string>('');
  const [quickAmount, setQuickAmount] = useState<number>(500);
  const [quickCurrency, setQuickCurrency] = useState<RoiCurrency>('EUR');
  const [quickBilling, setQuickBilling] = useState<'annual' | 'monthly' | 'one_time'>('monthly');
  const [quickSavingsPct, setQuickSavingsPct] = useState<number>(25);

  const handleUpdateRates = (next: Partial<FxRates>) => {
    const updated: FxRates = {
      EUR: Math.max(1, Math.round(next.EUR ?? fxRates.EUR)),
      USD: Math.max(1, Math.round(next.USD ?? fxRates.USD)),
      updatedAt: new Date().toISOString(),
    };
    setFxRates(updated);
    saveFxRates(updated);
  };

  const handleResetRates = () => {
    const reset = { ...DEFAULT_FX_RATES, updatedAt: new Date().toISOString() };
    setFxRates(reset);
    saveFxRates(reset);
    onShowToast?.('Taux de conversion réinitialisés (1 EUR = 4 950 Ar · 1 USD = 4 550 Ar).');
  };

  // 1. Extraction structurée des budgets SOGEDIPROMA depuis objectifsAnnuels
  const parsedBudgets = useMemo<ParsedBudgetLine[]>(() => {
    return (data.objectifsAnnuels || [])
      .filter((o: ObjectifAnnuel) => o.id?.startsWith('sog-bdg-'))
      .map((o: ObjectifAnnuel) => {
        const desc = o.description || '';
        const res = o.resultatsAttendus || '';
        const rawCat = extractSegment(desc, 'Catégorie :') || 'Infrastructure IT';
        const rawYear =
          extractSegment(desc, 'Exercice budgétaire :') ||
          (o.echeance ? o.echeance.slice(0, 4) : '2027');
        const owner = extractSegment(desc, 'Responsable :') || 'DSI SOGEDIPROMA';

        const allocatedRaw = extractSegment(res, 'Alloué :');
        const committedRaw = extractSegment(res, 'Engagé :');
        const spentRaw = extractSegment(res, 'Dépensé :');

        const allocatedAr =
          parseAriaryDigits(allocatedRaw) || parseAriaryDigits(o.ressourcesNecessaires);
        const committedAr = parseAriaryDigits(committedRaw);
        const spentAr = parseAriaryDigits(spentRaw);
        const remainingAr = Math.max(0, allocatedAr - Math.max(committedAr, spentAr));
        const consumptionPct =
          allocatedAr > 0 ? Math.min(100, Math.round((spentAr / allocatedAr) * 100)) : o.avancement || 0;

        const cleanTitle = o.titre.replace(/^Budget\s+\d{4}\s+—\s+/i, '').trim();

        return {
          id: o.id,
          titre: cleanTitle,
          categorie: rawCat,
          roiCategorie: mapCategoryToRoi(cleanTitle, rawCat, desc),
          exercice: rawYear,
          responsable: owner,
          allocatedAr,
          committedAr,
          spentAr,
          remainingAr,
          consumptionPct,
          rawDescription: desc,
          rawResultats: res,
        };
      });
  }, [data.objectifsAnnuels]);

  const has2027Budgets = useMemo(
    () => parsedBudgets.some((b) => b.exercice === '2027'),
    [parsedBudgets]
  );

  // Catégories disponibles pour le filtre
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    parsedBudgets.forEach((b) => set.add(b.categorie));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [parsedBudgets]);

  // Lignes filtrées
  const filteredBudgets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parsedBudgets.filter((b) => {
      if (yearFilter === '2027' && has2027Budgets && b.exercice !== '2027') return false;
      if (categoryFilter !== 'all' && b.categorie !== categoryFilter) return false;
      if (!q) return true;
      return (
        b.titre.toLowerCase().includes(q) ||
        b.categorie.toLowerCase().includes(q) ||
        b.responsable.toLowerCase().includes(q) ||
        b.exercice.includes(q)
      );
    });
  }, [parsedBudgets, searchQuery, yearFilter, has2027Budgets, categoryFilter]);

  // 2. Analyse des coûts opérationnels réels (Licences SaaS converties en Ar + Demandes d'achat)
  const liveOperationalCosts = useMemo(() => {
    let saasAnnualizedAr = 0;
    let saasForeignConvertedCount = 0;

    (data.logicielsLicences || []).forEach((lic) => {
      const parsed = detectCurrencyAndConvertToAr(lic.coutRenouvellementEstime, fxRates);
      if (parsed.annualizedAr > 0) {
        saasAnnualizedAr += parsed.annualizedAr;
        if (parsed.currency !== 'Ar') {
          saasForeignConvertedCount += 1;
        }
      }
    });

    const purchasesTotalAr = (data.demandesAchat || []).reduce(
      (sum, d) => sum + (Number(d.montantEstimeTTC) || 0),
      0
    );
    const pendingPurchasesAr = (data.demandesAchat || [])
      .filter((d) => d.statut !== 'Reçu / Contrôlé')
      .reduce((sum, d) => sum + (Number(d.montantEstimeTTC) || 0), 0);

    return {
      saasAnnualizedAr,
      saasForeignConvertedCount,
      purchasesTotalAr,
      pendingPurchasesAr,
      licencesCount: (data.logicielsLicences || []).length,
      purchasesCount: (data.demandesAchat || []).length,
    };
  }, [data.logicielsLicences, data.demandesAchat, fxRates]);

  // 3. Projection financière & économies sur les budgets affichés
  const simulatedRows = useMemo(() => {
    return filteredBudgets.map((b) => {
      const ov = lineOverrides[b.id] || {};
      const savingsPct =
        ov.savingsPct !== undefined
          ? ov.savingsPct
          : defaultSavingsPctForCategory(b.roiCategorie, globalOptimizationPct);
      const capexCurrency: RoiCurrency = ov.capexCurrency || 'Ar';
      const capexRaw =
        ov.capexRaw !== undefined
          ? ov.capexRaw
          : Math.round(b.allocatedAr * 0.12);
      const capexAr = convertToAriary(capexRaw, capexCurrency, fxRates);
      const hoursSavedPerYear =
        ov.hoursSavedPerYear !== undefined
          ? ov.hoursSavedPerYear
          : b.roiCategorie === 'Automatisation' || b.roiCategorie === 'Cloud & SaaS'
          ? 36
          : 18;

      const directSavingsYear1Ar = Math.round((b.allocatedAr * savingsPct) / 100);
      const timeValueYear1Ar = hoursSavedPerYear * hourlyRateAr;
      const totalBenefitYear1Ar = directSavingsYear1Ar + timeValueYear1Ar;
      const totalSavings3YearsAr = totalBenefitYear1Ar * 3;
      const netGain3YearsAr = totalSavings3YearsAr - capexAr;
      const optimizedCostAr = Math.max(0, b.allocatedAr - directSavingsYear1Ar);
      const paybackMonths =
        totalBenefitYear1Ar > 0
          ? Math.round((capexAr / totalBenefitYear1Ar) * 12 * 10) / 10
          : 0;

      const alreadyInPortfolio = projets.some(
        (p) =>
          p.id === `ROI-BDG-${b.id}` ||
          p.nomProjet.toLowerCase().includes(b.titre.toLowerCase())
      );

      return {
        ...b,
        savingsPct,
        capexRaw,
        capexCurrency,
        capexAr,
        hoursSavedPerYear,
        directSavingsYear1Ar,
        timeValueYear1Ar,
        totalBenefitYear1Ar,
        totalSavings3YearsAr,
        netGain3YearsAr,
        optimizedCostAr,
        paybackMonths,
        alreadyInPortfolio,
      };
    });
  }, [filteredBudgets, lineOverrides, globalOptimizationPct, hourlyRateAr, fxRates, projets]);

  const simulationSummary = useMemo(() => {
    const totals = simulatedRows.reduce(
      (acc, r) => {
        acc.allocatedAr += r.allocatedAr;
        acc.committedAr += r.committedAr;
        acc.spentAr += r.spentAr;
        acc.capexAr += r.capexAr;
        acc.directSavingsYear1Ar += r.directSavingsYear1Ar;
        acc.timeValueYear1Ar += r.timeValueYear1Ar;
        acc.totalBenefitYear1Ar += r.totalBenefitYear1Ar;
        acc.totalSavings3YearsAr += r.totalSavings3YearsAr;
        acc.hoursSavedPerYear += r.hoursSavedPerYear;
        return acc;
      },
      {
        allocatedAr: 0,
        committedAr: 0,
        spentAr: 0,
        capexAr: 0,
        directSavingsYear1Ar: 0,
        timeValueYear1Ar: 0,
        totalBenefitYear1Ar: 0,
        totalSavings3YearsAr: 0,
        hoursSavedPerYear: 0,
      }
    );

    const roi1An =
      totals.capexAr > 0
        ? Math.round(((totals.totalBenefitYear1Ar - totals.capexAr) / totals.capexAr) * 100)
        : 0;
    const paybackMonths =
      totals.totalBenefitYear1Ar > 0
        ? Math.round((totals.capexAr / totals.totalBenefitYear1Ar) * 12 * 10) / 10
        : 0;

    return {
      ...totals,
      roi1An,
      paybackMonths,
      allocatedEur: convertFromAriary(totals.allocatedAr, 'EUR', fxRates),
      savingsYear1Eur: convertFromAriary(totals.totalBenefitYear1Ar, 'EUR', fxRates),
      savings3YearsEur: convertFromAriary(totals.totalSavings3YearsAr, 'EUR', fxRates),
    };
  }, [simulatedRows, fxRates]);

  // Données graphiques par catégorie budgétaire
  const chartData = useMemo(() => {
    const byCat = new Map<
      string,
      { categorie: string; 'Budget Alloué (Ar)': number; 'Coût Optimisé (Ar)': number; 'Économies 3 Ans (Ar)': number }
    >();
    simulatedRows.forEach((r) => {
      const key = r.roiCategorie;
      const existing = byCat.get(key) || {
        categorie: key,
        'Budget Alloué (Ar)': 0,
        'Coût Optimisé (Ar)': 0,
        'Économies 3 Ans (Ar)': 0,
      };
      existing['Budget Alloué (Ar)'] += r.allocatedAr;
      existing['Coût Optimisé (Ar)'] += r.optimizedCostAr;
      existing['Économies 3 Ans (Ar)'] += r.totalSavings3YearsAr;
      byCat.set(key, existing);
    });
    return Array.from(byCat.values()).sort(
      (a, b) => b['Budget Alloué (Ar)'] - a['Budget Alloué (Ar)']
    );
  }, [simulatedRows]);

  // Convertisseur rapide calculé en direct
  const quickCalc = useMemo(() => {
    const baseAr = convertToAriary(quickAmount, quickCurrency, fxRates);
    const annualCostAr =
      quickBilling === 'monthly' ? baseAr * 12 : baseAr;
    const projectedSavingsAr = Math.round((annualCostAr * quickSavingsPct) / 100);
    const optimizedAnnualAr = Math.max(0, annualCostAr - projectedSavingsAr);
    return {
      unitAr: baseAr,
      annualCostAr,
      projectedSavingsAr,
      optimizedAnnualAr,
      threeYearsSavingsAr: projectedSavingsAr * 3,
      eurEquivalent: convertFromAriary(annualCostAr, 'EUR', fxRates),
    };
  }, [quickAmount, quickCurrency, quickBilling, quickSavingsPct, fxRates]);

  const handleUpdateLineOverride = (id: string, patch: Partial<LineSimOverride>) => {
    setLineOverrides((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...patch,
      },
    }));
  };

  const handleApplyGlobalPreset = (pct: number) => {
    setGlobalOptimizationPct(pct);
    setLineOverrides((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k]) {
          delete next[k].savingsPct;
        }
      });
      return next;
    });
  };

  const handleConvertRowToRoiProject = (row: (typeof simulatedRows)[number]) => {
    const targetId = `ROI-BDG-${row.id}`;
    const newProjet: ProjetRoiIT = {
      id: targetId,
      nomProjet: `Optimisation ${row.titre} (${row.exercice})`,
      description: `Projection d'économie (${row.savingsPct}%) sur le poste budgétaire SOGEDIPROMA "${row.titre}" (Alloué : ${formatAriary(row.allocatedAr)}).`,
      categorie: row.roiCategorie,
      coutInvestissementEuros: row.capexAr,
      economiesFinancieresAnnuellesEuros: row.directSavingsYear1Ar,
      gainTempsEstimeHeuresParAn: row.hoursSavedPerYear,
      tauxHoraireMoyenValorise: hourlyRateAr,
      impactQualitatif: `Économie 3 ans projetée : +${formatAriary(row.totalSavings3YearsAr)} · Responsable : ${row.responsable}.`,
      dateMiseEnService: `${row.exercice}-01-15`,
      statut: 'En cours',
    };

    const exists = projets.some((p) => p.id === targetId);
    const nextProjets = exists
      ? projets.map((p) => (p.id === targetId ? newProjet : p))
      : [...projets, newProjet];

    onUpdateProjets(nextProjets);
    onShowToast?.(
      exists
        ? `Projection ROI "${row.titre}" mise à jour dans le portefeuille (${formatAriary(row.directSavingsYear1Ar)}/an).`
        : `Projection ROI "${row.titre}" ajoutée au portefeuille (${formatAriary(row.directSavingsYear1Ar)}/an).`
    );
  };

  const handleBatchConvertMissingBudgets = () => {
    const candidates = simulatedRows.filter((r) => !r.alreadyInPortfolio && r.allocatedAr > 0);
    if (candidates.length === 0) {
      onShowToast?.('Toutes les lignes filtrées sont déjà présentes dans le portefeuille ROI.');
      return;
    }

    const created: ProjetRoiIT[] = candidates.map((row) => ({
      id: `ROI-BDG-${row.id}`,
      nomProjet: `Optimisation ${row.titre} (${row.exercice})`,
      description: `Projection d'économie (${row.savingsPct}%) sur le poste budgétaire SOGEDIPROMA "${row.titre}" (Alloué : ${formatAriary(row.allocatedAr)}).`,
      categorie: row.roiCategorie,
      coutInvestissementEuros: row.capexAr,
      economiesFinancieresAnnuellesEuros: row.directSavingsYear1Ar,
      gainTempsEstimeHeuresParAn: row.hoursSavedPerYear,
      tauxHoraireMoyenValorise: hourlyRateAr,
      impactQualitatif: `Économie 3 ans projetée : +${formatAriary(row.totalSavings3YearsAr)} · Responsable : ${row.responsable}.`,
      dateMiseEnService: `${row.exercice}-01-15`,
      statut: 'En cours',
    }));

    onUpdateProjets([...projets, ...created]);
    onShowToast?.(
      `${created.length} projection(s) budgétaire(s) ajoutée(s) au Portefeuille Projets ROI.`
    );
  };

  const handleAddQuickConversionAsProject = () => {
    const label = quickLabel.trim() || `Optimisation coût IT (${quickCurrency} → Ar)`;
    const capexAr =
      quickBilling === 'one_time' ? quickCalc.annualCostAr : Math.round(quickCalc.annualCostAr * 0.25);
    const newProjet: ProjetRoiIT = {
      id: `ROI-FX-${Date.now()}`,
      nomProjet: label,
      description: `Saisie source : ${quickAmount.toLocaleString('fr-FR')} ${quickCurrency} (${quickBilling === 'monthly' ? 'Mensuel x12' : quickBilling === 'annual' ? 'Annuel' : 'Ponctuel'}), converti automatiquement à 1 ${quickCurrency} = ${quickCurrency === 'EUR' ? fxRates.EUR : quickCurrency === 'USD' ? fxRates.USD : 1} Ar.`,
      categorie: 'Cloud & SaaS',
      coutInvestissementEuros: capexAr,
      economiesFinancieresAnnuellesEuros: quickCalc.projectedSavingsAr,
      gainTempsEstimeHeuresParAn: 24,
      tauxHoraireMoyenValorise: hourlyRateAr,
      impactQualitatif: `Économie sur 3 ans estimée à +${formatAriary(quickCalc.threeYearsSavingsAr)}.`,
      dateMiseEnService: getLocalTodayIso(),
      statut: 'En cours',
    };

    onUpdateProjets([...projets, newProjet]);
    setQuickLabel('');
    onShowToast?.(`Projet "${label}" enregistré en Ariary (${formatAriary(quickCalc.projectedSavingsAr)}/an).`);
  };

  return (
    <div className="space-y-6">
      {/* En-tête de la Section 13 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
              13
            </span>
            <span>Calculateur ROI &amp; Analyse Budgétaire IT (Ar)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Analyse des coûts informatiques, projection d&apos;économies sur les budgets 2027 SOGEDIPROMA et conversion automatique multi-devises en Ariary (Ar).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Sélecteur de vue segmenté */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveView('analyser')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                activeView === 'analyser'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Budgets 2027 &amp; Convertisseur</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('portfolio')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                activeView === 'portfolio'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Portefeuille Projets ROI</span>
              <span
                className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums ${
                  activeView === 'portfolio'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {projets.length}
              </span>
            </button>
          </div>

          {onOpenSogedipromaSync && (
            <button
              type="button"
              onClick={onOpenSogedipromaSync}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold transition whitespace-nowrap"
            >
              <PlugZap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Sync SOGEDIPROMA</span>
            </button>
          )}

          <button
            type="button"
            onClick={async () => {
              try {
                const { generateRoiAnalysisPdf } = await import('../../utils/roiReportGenerator');
                generateRoiAnalysisPdf(data, fxRates);
                onShowToast?.('Rapport financier ROI & Budgets (PDF) prêt.');
              } catch (err) {
                console.error('Erreur export PDF ROI:', err);
                onShowToast?.('Erreur lors de la génération du rapport PDF ROI.');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition whitespace-nowrap shadow-xs"
            title="Exporter l'analyse budgétaire et le portefeuille ROI au format PDF A4"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Exporter PDF</span>
          </button>
        </div>
      </div>

      {/* Barre permanente des taux de change & Convertisseur Automatique vers Ariary (Ar) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Conversion Automatique Multi-Devises → Ariary (Ar)
              </h3>
              <p className="text-[11px] text-slate-500">
                Tous les devis SaaS, achats matériels et projections saisis en EUR ou USD sont convertis instantanément en Ariary.
              </p>
            </div>
          </div>

          {/* Paramètres taux de change */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="font-semibold text-slate-600">1 EUR =</span>
              <input
                type="number"
                min={1}
                step={50}
                value={fxRates.EUR}
                onChange={(e) => handleUpdateRates({ EUR: Number(e.target.value) })}
                className="w-20 bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono tabular-nums font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-mono font-semibold text-slate-500">Ar</span>
            </label>

            <label className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <span className="font-semibold text-slate-600">1 USD =</span>
              <input
                type="number"
                min={1}
                step={50}
                value={fxRates.USD}
                onChange={(e) => handleUpdateRates({ USD: Number(e.target.value) })}
                className="w-20 bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono tabular-nums font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-mono font-semibold text-slate-500">Ar</span>
            </label>

            <button
              type="button"
              onClick={handleResetRates}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
              title="Réinitialiser les taux par défaut"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Convertisseur Rapide en Ligne */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-3 space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Libellé du coût ou devis IT
            </label>
            <input
              type="text"
              placeholder="Ex : Renouvellement SaaS / Pare-feu"
              value={quickLabel}
              onChange={(e) => setQuickLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="lg:col-span-3 space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Montant source &amp; devise
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                step={quickCurrency === 'Ar' ? 50000 : 10}
                value={quickAmount}
                onChange={(e) => setQuickAmount(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-mono tabular-nums font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={quickCurrency}
                onChange={(e) => setQuickCurrency(e.target.value as RoiCurrency)}
                className="px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-800"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="Ar">Ar</option>
              </select>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">
              Périodicité &amp; % Éco.
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={quickBilling}
                onChange={(e) => setQuickBilling(e.target.value as 'annual' | 'monthly' | 'one_time')}
                className="flex-1 px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
              >
                <option value="monthly">Mensuel (x12)</option>
                <option value="annual">Annuel</option>
                <option value="one_time">Ponctuel</option>
              </select>
              <input
                type="number"
                min={0}
                max={90}
                value={quickSavingsPct}
                onChange={(e) => setQuickSavingsPct(Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
                className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-xs font-mono tabular-nums font-bold text-emerald-700 text-right"
                title="Pourcentage d'économie visé"
              />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
                Coût annualisé · Économie projetée ({quickSavingsPct}%)
              </span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <strong className="text-xs font-mono tabular-nums text-slate-900">
                  {formatAriary(quickCalc.annualCostAr)}
                </strong>
                <span className="text-slate-300">→</span>
                <strong className="text-xs font-mono tabular-nums text-emerald-700">
                  +{formatAriary(quickCalc.projectedSavingsAr)}/an
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddQuickConversionAsProject}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter ROI</span>
            </button>
          </div>
        </div>
      </div>

      {activeView === 'analyser' ? (
        <div className="space-y-6">
          {/* 4 KPI Consolidés des Budgets 2027 & Économies Projetées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Enveloppe Budgets {yearFilter === '2027' && has2027Budgets ? '2027' : 'IT'}
                </span>
                <Coins className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 font-mono tabular-nums">
                {formatAriary(simulationSummary.allocatedAr)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                {simulatedRows.length} ligne(s) · ≈ {simulationSummary.allocatedEur.toLocaleString('fr-FR')} €
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Coûts Engagés &amp; Opérations
                </span>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 font-mono tabular-nums">
                {formatAriary(simulationSummary.committedAr + simulationSummary.spentAr)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums truncate">
                SaaS : {formatCompactAriary(liveOperationalCosts.saasAnnualizedAr)}/an · Achats : {formatCompactAriary(liveOperationalCosts.purchasesTotalAr)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Économies Projetées (An 1)
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-700 font-mono tabular-nums">
                +{formatAriary(simulationSummary.totalBenefitYear1Ar)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                Direct : +{formatCompactAriary(simulationSummary.directSavingsYear1Ar)} · Temps : +{formatCompactAriary(simulationSummary.timeValueYear1Ar)}
              </div>
            </div>

            <div className="bg-emerald-700 text-white p-4 rounded-xl border border-emerald-800">
              <div className="flex items-center justify-between text-emerald-100 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Cumul Projeté sur 3 Ans
                </span>
                <Sparkles className="w-4 h-4 text-emerald-200" />
              </div>
              <div className="text-lg sm:text-xl font-black font-mono tabular-nums">
                +{formatAriary(simulationSummary.totalSavings3YearsAr)}
              </div>
              <div className="text-[11px] text-emerald-100 mt-1 font-mono tabular-nums flex items-center justify-between">
                <span>ROI An 1 : {simulationSummary.roi1An > 0 ? `+${simulationSummary.roi1An}%` : `${simulationSummary.roi1An}%`}</span>
                <span>Payback : {simulationSummary.paybackMonths} mois</span>
              </div>
            </div>
          </div>

          {/* Paramètres du Simulateur & Filtres */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <span>Simulateur d&apos;Optimisation des Budgets 2027 SOGEDIPROMA</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Ajustez l&apos;objectif global de réduction des coûts ou affinez chaque ligne budgétaire avant de la convertir en Projet ROI.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: 'Prudent 10%', val: 10 },
                  { label: 'Équilibré 20%', val: 20 },
                  { label: 'Ambitieux 30%', val: 30 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => handleApplyGlobalPreset(preset.val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      globalOptimizationPct === preset.val
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100 items-center">
              {/* Curseur global */}
              <div className="md:col-span-4 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Objectif d&apos;économie cible</span>
                  <span className="font-mono tabular-nums font-bold text-blue-700">
                    {globalOptimizationPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={globalOptimizationPct}
                  onChange={(e) => handleApplyGlobalPreset(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* Taux horaire de valorisation */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Taux horaire (Ar/h)</span>
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={hourlyRateAr}
                  onChange={(e) => setHourlyRateAr(Math.max(1000, Number(e.target.value) || DEFAULT_HOURLY_RATE_AR))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono tabular-nums font-bold text-slate-900"
                />
              </div>

              {/* Recherche */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  Filtrer les postes budgétaires
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nom du budget, responsable..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Exercice & Catégorie */}
              <div className="md:col-span-3 flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Exercice
                  </label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value as '2027' | 'all')}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                  >
                    <option value="2027">2027 ({parsedBudgets.filter((b) => b.exercice === '2027').length})</option>
                    <option value="all">Tous ({parsedBudgets.length})</option>
                  </select>
                </div>

                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Catégorie
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                  >
                    <option value="all">Toutes</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* État vide si aucun budget SOGEDIPROMA synchronisé */}
          {parsedBudgets.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-lg mx-auto">
                <h4 className="text-sm font-bold text-slate-900">
                  Aucun budget 2027 SOGEDIPROMA synchronisé pour le moment
                </h4>
                <p className="text-xs text-slate-500">
                  Lancez une synchronisation avec votre serveur SOGEDIPROMA pour importer automatiquement les lignes budgétaires 2027, ou utilisez le convertisseur ci-dessus et le Portefeuille Projets ROI.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                {onOpenSogedipromaSync && (
                  <button
                    type="button"
                    onClick={onOpenSogedipromaSync}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                  >
                    <PlugZap className="w-3.5 h-3.5" />
                    <span>Synchroniser les budgets 2027</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveView('portfolio')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Gérer les Projets ROI ({projets.length})</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Graphique comparatif par catégorie */}
              {chartData.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-emerald-600" />
                        <span>Comparatif par Domaine IT : Budget Alloué vs Coût Optimisé &amp; Économies 3 Ans (Ar)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Visualisation agrégée des budgets 2027 et du potentiel d&apos;économies cumulées en Ariary.
                      </p>
                    </div>
                    <span className="text-xs font-mono tabular-nums font-bold text-emerald-700">
                      ≈ +{simulationSummary.savings3YearsEur.toLocaleString('fr-FR')} € sur 3 ans
                    </span>
                  </div>

                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 16, left: 4, bottom: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="categorie"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                          tickFormatter={formatCompactAriaryAxis}
                          width={56}
                        />
                        <Tooltip
                          formatter={(value: unknown) => [formatAriary(Number(value) || 0), '']}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} iconType="circle" />
                        <Bar dataKey="Budget Alloué (Ar)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Coût Optimisé (Ar)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Économies 3 Ans (Ar)" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tableau détaillé des lignes budgétaires 2027 & projections */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Lignes Budgétaires SOGEDIPROMA &amp; Projections d&apos;Économies
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Modifiez le taux d&apos;optimisation ou le coût de mise en œuvre (en Ar, EUR ou USD) pour chaque ligne.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleBatchConvertMissingBudgets}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition whitespace-nowrap self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Projeter les lignes manquantes en ROI</span>
                  </button>
                </div>

                {simulatedRows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Aucune ligne budgétaire ne correspond à vos critères de recherche.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-4">Poste Budgétaire</th>
                          <th className="py-2.5 px-3 text-right">Alloué (Ar)</th>
                          <th className="py-2.5 px-3 text-right">Dépensé / Dispo</th>
                          <th className="py-2.5 px-3 text-right">Opt. %</th>
                          <th className="py-2.5 px-3">CapEx (Auto → Ar)</th>
                          <th className="py-2.5 px-3 text-right">Éco. An 1 (Ar)</th>
                          <th className="py-2.5 px-3 text-right">Gain 3 Ans (Ar)</th>
                          <th className="py-2.5 px-4 text-right">Action ROI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {simulatedRows.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 min-w-[220px]">
                              <div className="font-bold text-slate-900">{row.titre}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {row.exercice} · {row.categorie} · {row.responsable}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <div className="font-bold text-slate-900">
                                {formatAriary(row.allocatedAr)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                ≈ {convertFromAriary(row.allocatedAr, 'EUR', fxRates).toLocaleString('fr-FR')} €
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <div className="text-slate-700">
                                {formatCompactAriary(row.spentAr)} ({row.consumptionPct}%)
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Dispo : {formatCompactAriary(row.remainingAr)}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                max={80}
                                value={row.savingsPct}
                                onChange={(e) =>
                                  handleUpdateLineOverride(row.id, {
                                    savingsPct: Math.max(0, Math.min(80, Number(e.target.value) || 0)),
                                  })
                                }
                                className="w-16 px-2 py-1 rounded border border-slate-200 text-right font-mono tabular-nums font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>

                            <td className="py-3 px-3 min-w-[175px]">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  step={row.capexCurrency === 'Ar' ? 50000 : 50}
                                  value={row.capexRaw}
                                  onChange={(e) =>
                                    handleUpdateLineOverride(row.id, {
                                      capexRaw: Math.max(0, Number(e.target.value) || 0),
                                    })
                                  }
                                  className="w-24 px-2 py-1 rounded border border-slate-200 text-right font-mono tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                  aria-label={`Devise CapEx pour ${row.titre}`}
                                  value={row.capexCurrency}
                                  onChange={(e) => {
                                    const nextCur = e.target.value as RoiCurrency;
                                    handleUpdateLineOverride(row.id, {
                                      capexCurrency: nextCur,
                                      capexRaw: convertFromAriary(row.capexAr, nextCur, fxRates),
                                    });
                                  }}
                                  className="px-1.5 py-1 rounded border border-slate-200 bg-slate-50 font-mono text-[11px] font-bold text-slate-700"
                                >
                                  <option value="Ar">Ar</option>
                                  <option value="EUR">EUR</option>
                                  <option value="USD">USD</option>
                                </select>
                              </div>
                              {row.capexCurrency !== 'Ar' && (
                                <div className="text-[10px] font-mono tabular-nums text-slate-500 mt-0.5">
                                  = {formatAriary(row.capexAr)}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <div className="font-bold text-emerald-700">
                                +{formatAriary(row.totalBenefitYear1Ar)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                +{row.hoursSavedPerYear} h/an valorisées
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <div className="font-bold text-slate-900">
                                +{formatAriary(row.totalSavings3YearsAr)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Payback : {row.paybackMonths} mois
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleConvertRowToRoiProject(row)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                                  row.alreadyInPortfolio
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {row.alreadyInPortfolio ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Mettre à jour</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Projeter ROI</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <RoiProjectsSection
          projets={projets}
          onUpdateProjets={onUpdateProjets}
          objectifsAnnuels={data.objectifsAnnuels}
          fxRates={fxRates}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
