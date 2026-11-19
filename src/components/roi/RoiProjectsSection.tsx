import React, { useState, useMemo } from 'react';
import { ObjectifAnnuel, ProjetRoiIT } from '../../types/it-tracker';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  BarChart2,
  ArrowUpRight,
  Percent,
  Layers,
  Download,
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
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import {
  emeraldButtonClass,
  fieldInputClass,
  fieldSelectClass,
  fieldTextareaClass,
  secondaryButtonClass,
} from '../ui/formStyles';

import {
  DEFAULT_FX_RATES,
  FxRates,
  RoiCurrency,
  convertFromAriary,
  convertToAriary,
  formatCompactAriaryAxis,
  loadFxRates,
} from '../../utils/currencyConverter';

interface RoiProjectsSectionProps {
  projets: ProjetRoiIT[];
  onUpdateProjets: (projets: ProjetRoiIT[]) => void;
  objectifsAnnuels?: ObjectifAnnuel[];
  fxRates?: FxRates;
  onShowToast?: (msg: string) => void;
}

const DEFAULT_HOURLY_RATE_AR = 25000;

function parseAmountAr(text?: string): number {
  if (!text) return 0;
  const digits = text.replace(/[^\d]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapBudgetCategoryToRoi(titre: string, desc: string): ProjetRoiIT['categorie'] {
  const hay = `${titre} ${desc}`.toLowerCase();
  if (/sécur|sauvegard|antivirus|pare-feu|caméra|cctv|vidéo/.test(hay)) {
    return 'Sécurité & Sauvegarde';
  }
  if (/réseau|fibre|starlink|switch|wifi|routeur|télécom/.test(hay)) {
    return 'Réseau & Télécoms';
  }
  if (/cloud|saas|licence|odoo|m365|abonnement|logiciel/.test(hay)) {
    return 'Cloud & SaaS';
  }
  if (/automat|script|api/.test(hay)) {
    return 'Automatisation';
  }
  if (/poste|pc|laptop|imprimante|bureautique|écran/.test(hay)) {
    return 'Bureautique & Postes';
  }
  return 'Infrastructure';
}

export const RoiProjectsSection: React.FC<RoiProjectsSectionProps> = ({
  projets = [],
  onUpdateProjets,
  objectifsAnnuels = [],
  fxRates,
  onShowToast,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [investCurrency, setInvestCurrency] = useState<RoiCurrency>('Ar');
  const [investRawInput, setInvestRawInput] = useState<number>(1500000);
  const [savingsCurrency, setSavingsCurrency] = useState<RoiCurrency>('Ar');
  const [savingsRawInput, setSavingsRawInput] = useState<number>(900000);

  const activeRates = fxRates || loadFxRates() || DEFAULT_FX_RATES;

  const sogBudgets = useMemo(() => {
    return (objectifsAnnuels || [])
      .filter((o) => o.id?.startsWith('sog-bdg-') || /Ar/i.test(o.ressourcesNecessaires || ''))
      .map((o) => ({
        id: o.id,
        titre: o.titre.replace(/^Budget\s+\d{4}\s+—\s+/i, '').trim(),
        fullTitre: o.titre,
        description: o.description,
        resultatsAttendus: o.resultatsAttendus,
        allocatedAr: parseAmountAr(o.ressourcesNecessaires),
        categorie: mapBudgetCategoryToRoi(o.titre, o.description),
      }));
  }, [objectifsAnnuels]);

  // Formulaire d'édition / création
  const [formData, setFormData] = useState<Partial<ProjetRoiIT>>({
    nomProjet: '',
    description: '',
    categorie: 'Automatisation',
    coutInvestissementEuros: 1500000,
    economiesFinancieresAnnuellesEuros: 900000,
    gainTempsEstimeHeuresParAn: 60,
    tauxHoraireMoyenValorise: DEFAULT_HOURLY_RATE_AR,
    impactQualitatif: '',
    dateMiseEnService: new Date().toISOString().split('T')[0],
    statut: 'En production',
  });

  // Calculs financiers consolidés
  const summary = useMemo(() => {
    let totalInvestissement = 0;
    let totalEconomiesDirectes = 0;
    let totalHeuresGagnees = 0;
    let totalValorisationTemps = 0;

    projets.forEach((p) => {
      const invest = Number(p.coutInvestissementEuros) || 0;
      const eco = Number(p.economiesFinancieresAnnuellesEuros) || 0;
      const heures = Number(p.gainTempsEstimeHeuresParAn) || 0;
      const taux = Number(p.tauxHoraireMoyenValorise) || DEFAULT_HOURLY_RATE_AR;
      const valTemps = heures * taux;

      totalInvestissement += invest;
      totalEconomiesDirectes += eco;
      totalHeuresGagnees += heures;
      totalValorisationTemps += valTemps;
    });

    const beneficeAnnuelTotal = totalEconomiesDirectes + totalValorisationTemps;
    const beneficeNetAnnuel = beneficeAnnuelTotal - totalInvestissement;

    // ROI 1 an (%)
    const roi1An = totalInvestissement > 0
      ? Math.round(((beneficeAnnuelTotal - totalInvestissement) / totalInvestissement) * 100)
      : 0;

    // ROI 3 ans (%) : Bénéfice sur 3 ans par rapport à l'investissement initial
    const benefice3Ans = (beneficeAnnuelTotal * 3) - totalInvestissement;
    const roi3Ans = totalInvestissement > 0
      ? Math.round((benefice3Ans / totalInvestissement) * 100)
      : 0;

    // Délai d'amortissement moyen (Payback period en mois)
    const paybackMois = beneficeAnnuelTotal > 0
      ? Math.round((totalInvestissement / beneficeAnnuelTotal) * 12 * 10) / 10
      : 0;

    return {
      totalInvestissement,
      totalEconomiesDirectes,
      totalHeuresGagnees,
      totalValorisationTemps,
      beneficeAnnuelTotal,
      beneficeNetAnnuel,
      roi1An,
      roi3Ans,
      paybackMois,
    };
  }, [projets]);

  // Données pour le graphique Recharts
  const chartData = useMemo(() => {
    return projets.map((p) => {
      const invest = Number(p.coutInvestissementEuros) || 0;
      const eco = Number(p.economiesFinancieresAnnuellesEuros) || 0;
      const heures = Number(p.gainTempsEstimeHeuresParAn) || 0;
      const taux = Number(p.tauxHoraireMoyenValorise) || DEFAULT_HOURLY_RATE_AR;
      const gainAnnuel = eco + (heures * taux);
      const gain3Ans = gainAnnuel * 3;

      return {
        nom: p.nomProjet.length > 25 ? p.nomProjet.substring(0, 22) + '...' : p.nomProjet,
        Investissement: invest,
        'Gain Annuel Total': gainAnnuel,
        'Gains sur 3 Ans': gain3Ans,
      };
    });
  }, [projets]);

  // Calcul du ROI en direct dans le formulaire modal
  const liveFormMetrics = useMemo(() => {
    const invest = Number(formData.coutInvestissementEuros) || 0;
    const eco = Number(formData.economiesFinancieresAnnuellesEuros) || 0;
    const heures = Number(formData.gainTempsEstimeHeuresParAn) || 0;
    const taux = Number(formData.tauxHoraireMoyenValorise) || DEFAULT_HOURLY_RATE_AR;

    const valTemps = heures * taux;
    const gainAnnuelTotal = eco + valTemps;
    const roi1An = invest > 0 ? Math.round(((gainAnnuelTotal - invest) / invest) * 100) : 0;
    const paybackMois = gainAnnuelTotal > 0 ? Math.round((invest / gainAnnuelTotal) * 12 * 10) / 10 : 0;

    return {
      valTemps,
      gainAnnuelTotal,
      roi1An,
      paybackMois,
    };
  }, [formData]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setInvestCurrency('Ar');
    setInvestRawInput(1500000);
    setSavingsCurrency('Ar');
    setSavingsRawInput(900000);
    setFormData({
      nomProjet: '',
      description: '',
      categorie: 'Automatisation',
      coutInvestissementEuros: 1500000,
      economiesFinancieresAnnuellesEuros: 900000,
      gainTempsEstimeHeuresParAn: 50,
      tauxHoraireMoyenValorise: DEFAULT_HOURLY_RATE_AR,
      impactQualitatif: '',
      dateMiseEnService: new Date().toISOString().split('T')[0],
      statut: 'En production',
    });
    setShowModal(true);
  };

  const handleImportBudgetAsRoi = (budget: (typeof sogBudgets)[number]) => {
    const allocatedAr = budget.allocatedAr || 0;
    const ecoAr = Math.round(allocatedAr * 0.25);
    setEditingId(null);
    setShowBudgetModal(false);
    setInvestCurrency('Ar');
    setInvestRawInput(allocatedAr);
    setSavingsCurrency('Ar');
    setSavingsRawInput(ecoAr);
    setFormData({
      nomProjet: budget.titre,
      description: `${budget.description}\n${budget.resultatsAttendus}`.trim(),
      categorie: budget.categorie,
      coutInvestissementEuros: allocatedAr,
      economiesFinancieresAnnuellesEuros: ecoAr,
      gainTempsEstimeHeuresParAn: 40,
      tauxHoraireMoyenValorise: DEFAULT_HOURLY_RATE_AR,
      impactQualitatif: `Ligne budgétaire SOGEDIPROMA importée (${allocatedAr.toLocaleString('fr-FR')} Ar).`,
      dateMiseEnService: new Date().toISOString().split('T')[0],
      statut: 'En cours',
    });
    setShowModal(true);
    if (onShowToast) {
      onShowToast(`Budget "${budget.titre}" chargé dans le simulateur ROI.`);
    }
  };

  const handleOpenEditModal = (proj: ProjetRoiIT) => {
    setEditingId(proj.id);
    setInvestCurrency('Ar');
    setInvestRawInput(Number(proj.coutInvestissementEuros) || 0);
    setSavingsCurrency('Ar');
    setSavingsRawInput(Number(proj.economiesFinancieresAnnuellesEuros) || 0);
    setFormData({ ...proj });
    setShowModal(true);
  };

  const handleDeleteProject = (id: string) => {
    onUpdateProjets(projets.filter((p) => p.id !== id));
    setConfirmDeleteId(null);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomProjet) return;

    if (editingId) {
      // Modification
      const updated = projets.map((p) =>
        p.id === editingId ? ({ ...p, ...formData } as ProjetRoiIT) : p
      );
      onUpdateProjets(updated);
    } else {
      // Création
      const newProj: ProjetRoiIT = {
        id: `ROI-${Date.now()}`,
        nomProjet: formData.nomProjet || 'Projet IT',
        description: formData.description || '',
        categorie: formData.categorie as any || 'Infrastructure',
        coutInvestissementEuros: Number(formData.coutInvestissementEuros) || 0,
        economiesFinancieresAnnuellesEuros: Number(formData.economiesFinancieresAnnuellesEuros) || 0,
        gainTempsEstimeHeuresParAn: Number(formData.gainTempsEstimeHeuresParAn) || 0,
        tauxHoraireMoyenValorise: Number(formData.tauxHoraireMoyenValorise) || DEFAULT_HOURLY_RATE_AR,
        impactQualitatif: formData.impactQualitatif || '',
        dateMiseEnService: formData.dateMiseEnService || new Date().toISOString().split('T')[0],
        statut: (formData.statut as any) || 'En production',
      };
      onUpdateProjets([...projets, newProj]);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              Calcul du Retour sur Investissement (ROI) des Projets IT (Ar)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Valorisation économique en Ariary (Ar) des chantiers réalisés, économies directes et gains de productivité opérationnels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {sogBudgets.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBudgetModal(true)}
              className={secondaryButtonClass}
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Importer Budget SOGEDIPROMA ({sogBudgets.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un Projet au Bilan ROI</span>
          </button>
        </div>
      </div>

      {/* Cartes KPI Consolidées du Retour sur Investissement */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Investissement engagé */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Investissement Total</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 font-mono tabular-nums">
            {Math.round(summary.totalInvestissement).toLocaleString('fr-FR')} Ar
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Matériel, licences & prestations
          </span>
        </div>

        {/* Économies financières directes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Économies Directes</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 font-mono tabular-nums">
            +{Math.round(summary.totalEconomiesDirectes).toLocaleString('fr-FR')} Ar/an
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Contrats résiliés & coûts évités
          </span>
        </div>

        {/* Gain de temps valorisé */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Temps Économisé</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-600 font-mono tabular-nums">
            {summary.totalHeuresGagnees} h/an
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">
            Valorisé à <strong className="font-mono tabular-nums">+{Math.round(summary.totalValorisationTemps).toLocaleString('fr-FR')} Ar/an</strong>
          </span>
        </div>

        {/* ROI 1 An & Payback */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-100 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">ROI & Rentabilité</span>
            <Percent className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono">
              {summary.roi1An > 0 ? `+${summary.roi1An}%` : `${summary.roi1An}%`}
            </span>
            <span className="text-xs text-emerald-100">
              (1 an)
            </span>
          </div>
          <div className="text-[11px] text-emerald-100 mt-1 flex items-center justify-between">
            <span>Amorti en : <strong>{summary.paybackMois} mois</strong></span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
              3 ans : +{summary.roi3Ans}%
            </span>
          </div>
        </div>
      </div>

      {/* Graphique de rentabilité comparative Recharts */}
      {projets.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                Comparatif Financier : Investissement initial vs Gains générés (Ar)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Mise en regard du coût d'engagement avec la création de valeur annuelle et la projection à 3 ans.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Bénéfice Annuel : +{Math.round(summary.beneficeAnnuelTotal).toLocaleString('fr-FR')} Ar/an
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 15, left: 6, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="nom"
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
                  formatter={(value: any) => [`${Math.round(Number(value)).toLocaleString('fr-FR')} Ar`, '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  iconType="circle"
                />
                <Bar dataKey="Investissement" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gain Annuel Total" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gains sur 3 Ans" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Liste détaillée des Projets et de leur ROI unitaire */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            Fiches Détaillées des Projets & Amortissement
          </h4>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {projets.length} {projets.length > 1 ? 'projets analysés' : 'projet analysé'}
          </span>
        </div>

        {projets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucun projet informatique n'est pour l'instant consigné. Cliquez sur "Ajouter un Projet au Bilan ROI" pour commencer.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {projets.map((proj) => {
              const invest = Number(proj.coutInvestissementEuros) || 0;
              const eco = Number(proj.economiesFinancieresAnnuellesEuros) || 0;
              const heures = Number(proj.gainTempsEstimeHeuresParAn) || 0;
              const taux = Number(proj.tauxHoraireMoyenValorise) || DEFAULT_HOURLY_RATE_AR;
              const valTemps = heures * taux;
              const gainAnnuelTotal = eco + valTemps;
              const roiProjet = invest > 0 ? Math.round(((gainAnnuelTotal - invest) / invest) * 100) : 0;
              const paybackProjet = gainAnnuelTotal > 0 ? Math.round((invest / gainAnnuelTotal) * 12 * 10) / 10 : 0;

              return (
                <div
                  key={proj.id}
                  className="p-5 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-xs"
                >
                  {/* Titre & Description */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[10px]">
                        {proj.categorie}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          proj.statut === 'En production'
                            ? 'bg-emerald-100 text-emerald-800'
                            : proj.statut === 'Clôturé avec succès'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {proj.statut}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                        Mise en service : {proj.dateMiseEnService}
                      </span>
                    </div>

                    <h5 className="text-sm font-bold text-slate-900 truncate">
                      {proj.nomProjet}
                    </h5>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {proj.description}
                    </p>

                    {proj.impactQualitatif && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 italic pt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{proj.impactQualitatif}</span>
                      </div>
                    )}
                  </div>

                  {/* Indicateurs chiffrés du projet */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Investissement</span>
                      <strong className="text-slate-900 font-mono tabular-nums text-xs font-bold">
                        {Math.round(invest).toLocaleString('fr-FR')} Ar
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Économies directes</span>
                      <strong className="text-emerald-600 font-mono tabular-nums text-xs font-bold">
                        +{Math.round(eco).toLocaleString('fr-FR')} Ar/an
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Temps gagné</span>
                      <strong className="text-blue-600 font-mono tabular-nums text-xs font-bold">
                        {heures} h/an
                      </strong>
                      <span className="text-[9px] text-slate-400 block font-mono tabular-nums">
                        (+{Math.round(valTemps).toLocaleString('fr-FR')} Ar)
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">ROI An 1 / Délai</span>
                      <div className="flex items-center justify-center gap-1">
                        <strong className="text-emerald-700 font-mono tabular-nums text-xs font-extrabold">
                          {roiProjet > 0 ? `+${roiProjet}%` : `${roiProjet}%`}
                        </strong>
                      </div>
                      <span className="text-[9px] text-slate-500 block font-mono tabular-nums">
                        Amorti en {paybackProjet} mois
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 self-end lg:self-center">
                    {confirmDeleteId === proj.id ? (
                      <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(proj.id)}
                          className="text-[11px] font-semibold text-red-700 hover:underline"
                        >
                          Supprimer
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] text-slate-600 hover:underline"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(proj)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                          title="Modifier le projet"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(proj.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition"
                          title="Supprimer le projet"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Ajout / Édition de Projet ROI */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          editingId
            ? 'Modifier le Projet & Calcul de ROI'
            : 'Ajouter un Projet au Calcul de ROI'
        }
        subtitle="Estimation financière des économies directes, gains de temps et délai d'amortissement."
        icon={<TrendingUp className="w-4 h-4" />}
        tone="emerald"
        size="xl"
        onSubmit={handleSaveProject}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={emeraldButtonClass}>
              {editingId ? 'Mettre à jour le projet' : 'Enregistrer le projet'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Identification du projet">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Nom du Projet informatique" required>
                <input
                  type="text"
                  required
                  placeholder="Ex: Automatisation des Masters PC Autopilot"
                  value={formData.nomProjet || ''}
                  onChange={(e) => setFormData({ ...formData, nomProjet: e.target.value })}
                  className={fieldInputClass}
                />
              </FormField>

              <FormField label="Catégorie">
                <select
                  value={formData.categorie || 'Automatisation'}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value as any })}
                  className={fieldSelectClass}
                >
                  <option value="Infrastructure">Infrastructure (Serveurs, Virtualisation, Baies)</option>
                  <option value="Sécurité & Sauvegarde">Sécurité & Sauvegarde (PRA, EDR, Immuable)</option>
                  <option value="Automatisation">Automatisation (Scripts, Déploiements, API)</option>
                  <option value="Bureautique & Postes">Bureautique & Postes de travail (PC, Écrans)</option>
                  <option value="Cloud & SaaS">Cloud & SaaS (Microsoft 365, Outils métiers)</option>
                  <option value="Réseau & Télécoms">Réseau & Télécoms (Fibre, Wi-Fi, Switches)</option>
                </select>
              </FormField>
            </div>

            <FormField label="Description succincte & Objectif opérationnel">
              <textarea
                rows={2}
                placeholder="Ex: Remplacement du processus manuel d'installation par une stratégie Intune..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={fieldTextareaClass}
              />
            </FormField>
          </FormSection>

          <FormSection
            title="2. Données financières & métriques d'efficience"
            separated
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Coût d'investissement (converti auto en Ar)"
                required
                hint={`Matériel, licences, prestation · Équivaut à ${Math.round(formData.coutInvestissementEuros || 0).toLocaleString('fr-FR')} Ar`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={0}
                    step={investCurrency === 'Ar' ? 50000 : 10}
                    value={investRawInput}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setInvestRawInput(val);
                      setFormData({
                        ...formData,
                        coutInvestissementEuros: convertToAriary(val, investCurrency, activeRates),
                      });
                    }}
                    className={`${fieldInputClass} font-mono tabular-nums flex-1`}
                  />
                  <select
                    aria-label="Devise du coût d'investissement"
                    value={investCurrency}
                    onChange={(e) => {
                      const nextCur = e.target.value as RoiCurrency;
                      const currentAr = Number(formData.coutInvestissementEuros) || 0;
                      setInvestCurrency(nextCur);
                      setInvestRawInput(convertFromAriary(currentAr, nextCur, activeRates));
                    }}
                    className={`${fieldSelectClass} w-24 shrink-0 font-mono font-bold`}
                  >
                    <option value="Ar">Ar</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </FormField>

              <FormField
                label="Économies financières directes / an (converti auto en Ar)"
                required
                hint={`Contrats résiliés, coûts évités · Équivaut à ${Math.round(formData.economiesFinancieresAnnuellesEuros || 0).toLocaleString('fr-FR')} Ar/an`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={0}
                    step={savingsCurrency === 'Ar' ? 50000 : 10}
                    value={savingsRawInput}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSavingsRawInput(val);
                      setFormData({
                        ...formData,
                        economiesFinancieresAnnuellesEuros: convertToAriary(
                          val,
                          savingsCurrency,
                          activeRates
                        ),
                      });
                    }}
                    className={`${fieldInputClass} font-mono tabular-nums flex-1`}
                  />
                  <select
                    aria-label="Devise des économies annuelles"
                    value={savingsCurrency}
                    onChange={(e) => {
                      const nextCur = e.target.value as RoiCurrency;
                      const currentAr = Number(formData.economiesFinancieresAnnuellesEuros) || 0;
                      setSavingsCurrency(nextCur);
                      setSavingsRawInput(convertFromAriary(currentAr, nextCur, activeRates));
                    }}
                    className={`${fieldSelectClass} w-24 shrink-0 font-mono font-bold`}
                  >
                    <option value="Ar">Ar</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Gain de temps estimé (heures / an)"
                required
                hint="Heures économisées pour le technicien ou les salariés"
              >
                <input
                  type="number"
                  required
                  min={0}
                  step={5}
                  value={formData.gainTempsEstimeHeuresParAn ?? 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gainTempsEstimeHeuresParAn: Number(e.target.value),
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>

              <FormField
                label="Taux horaire moyen valorisé (Ar / heure)"
                required
                hint="Coût horaire moyen standard (défaut : 25 000 Ar/h)"
              >
                <input
                  type="number"
                  required
                  min={1000}
                  step={1000}
                  value={formData.tauxHoraireMoyenValorise ?? DEFAULT_HOURLY_RATE_AR}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tauxHoraireMoyenValorise: Number(e.target.value),
                    })
                  }
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
            </div>

            {/* Aperçu du calcul en direct */}
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-600 block text-[11px]">
                  Bénéfice Annuel Total Projeté
                </span>
                <strong className="text-emerald-800 text-sm font-mono tabular-nums">
                  +{Math.round(liveFormMetrics.gainAnnuelTotal).toLocaleString('fr-FR')} Ar / an
                </strong>
                <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                  dont +{Math.round(liveFormMetrics.valTemps).toLocaleString('fr-FR')} Ar de temps valorisé
                </span>
              </div>

              <div className="text-right">
                <span className="text-slate-600 block text-[11px]">
                  Amortissement & ROI 1 an
                </span>
                <strong className="text-slate-900 font-mono tabular-nums text-sm">
                  {liveFormMetrics.roi1An > 0
                    ? `+${liveFormMetrics.roi1An}%`
                    : `${liveFormMetrics.roi1An}%`}
                </strong>
                <span className="text-[11px] text-slate-600 block font-mono tabular-nums">
                  Payback : {liveFormMetrics.paybackMois} mois
                </span>
              </div>
            </div>
          </FormSection>

          <FormSection title="3. Retour qualitatif & Suivi" separated>
            <FormField label="Impacts qualitatifs & Retours utilisateurs">
              <input
                type="text"
                placeholder="Ex: Diminution des sollicitations au helpdesk, conformité audit..."
                value={formData.impactQualitatif || ''}
                onChange={(e) => setFormData({ ...formData, impactQualitatif: e.target.value })}
                className={fieldInputClass}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Date de mise en service">
                <input
                  type="date"
                  value={formData.dateMiseEnService || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, dateMiseEnService: e.target.value })
                  }
                  className={`${fieldInputClass} font-mono`}
                />
              </FormField>

              <FormField label="Statut du projet">
                <select
                  value={formData.statut || 'En production'}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
                  className={fieldSelectClass}
                >
                  <option value="En production">En production</option>
                  <option value="Clôturé avec succès">Clôturé avec succès</option>
                  <option value="En cours">En cours de déploiement</option>
                </select>
              </FormField>
            </div>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Import Budget SOGEDIPROMA vers Calculateur ROI */}
      <Modal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title="Importer un Budget SOGEDIPROMA vers le ROI"
        subtitle="Sélectionnez une ligne budgétaire synchronisée pour pré-remplir une simulation de rentabilité en Ariary (Ar)."
        icon={<Download className="w-4 h-4" />}
        size="lg"
        footer={
          <button
            type="button"
            onClick={() => setShowBudgetModal(false)}
            className={secondaryButtonClass}
          >
            Fermer
          </button>
        }
      >
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {sogBudgets.map((b) => (
            <div
              key={b.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0 space-y-1">
                <div className="font-bold text-slate-900 truncate">{b.fullTitre}</div>
                <div className="text-[11px] text-slate-500 line-clamp-2">{b.description}</div>
                <div className="text-[11px] font-mono tabular-nums text-blue-700 font-semibold">
                  Enveloppe : {b.allocatedAr.toLocaleString('fr-FR')} Ar
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleImportBudgetAsRoi(b)}
                className={`${emeraldButtonClass} shrink-0`}
              >
                Pré-remplir ROI
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
