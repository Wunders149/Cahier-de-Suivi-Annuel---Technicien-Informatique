import React, { useState, useMemo } from 'react';
import { ProjetRoiIT } from '../../types/it-tracker';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  BarChart2,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  Calendar,
  Layers,
  ChevronRight
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
  Cell
} from 'recharts';

interface RoiProjectsSectionProps {
  projets: ProjetRoiIT[];
  onUpdateProjets: (projets: ProjetRoiIT[]) => void;
}

export const RoiProjectsSection: React.FC<RoiProjectsSectionProps> = ({
  projets = [],
  onUpdateProjets,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulaire d'édition / création
  const [formData, setFormData] = useState<Partial<ProjetRoiIT>>({
    nomProjet: '',
    description: '',
    categorie: 'Automatisation',
    coutInvestissementEuros: 2500,
    economiesFinancieresAnnuellesEuros: 1500,
    gainTempsEstimeHeuresParAn: 60,
    tauxHoraireMoyenValorise: 35,
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
      const taux = Number(p.tauxHoraireMoyenValorise) || 35;
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
      const taux = Number(p.tauxHoraireMoyenValorise) || 35;
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
    const taux = Number(formData.tauxHoraireMoyenValorise) || 35;

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
    setFormData({
      nomProjet: '',
      description: '',
      categorie: 'Automatisation',
      coutInvestissementEuros: 2000,
      economiesFinancieresAnnuellesEuros: 1200,
      gainTempsEstimeHeuresParAn: 50,
      tauxHoraireMoyenValorise: 35,
      impactQualitatif: '',
      dateMiseEnService: new Date().toISOString().split('T')[0],
      statut: 'En production',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (proj: ProjetRoiIT) => {
    setEditingId(proj.id);
    setFormData({ ...proj });
    setShowModal(true);
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce projet du calcul de ROI ?')) {
      onUpdateProjets(projets.filter((p) => p.id !== id));
    }
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
        tauxHoraireMoyenValorise: Number(formData.tauxHoraireMoyenValorise) || 35,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Calcul du Retour sur Investissement (ROI) des Projets IT
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Valorisation économique des chantiers réalisés, économies directes récurrentes et gains de productivité opérationnels.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Projet au Bilan ROI</span>
        </button>
      </div>

      {/* Cartes KPI Consolidées du Retour sur Investissement */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Investissement engagé */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Investissement Total</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {summary.totalInvestissement.toLocaleString('fr-FR')} €
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Matériel, licences & prestations
          </span>
        </div>

        {/* Économies financières directes */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Économies Directes</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            +{summary.totalEconomiesDirectes.toLocaleString('fr-FR')} €/an
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Contrats résiliés & coûts évités
          </span>
        </div>

        {/* Gain de temps valorisé */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Temps Économisé</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {summary.totalHeuresGagnees} h/an
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
            Valorisé à <strong>+{summary.totalValorisationTemps.toLocaleString('fr-FR')} €/an</strong>
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
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                Comparatif Financier : Investissement initial vs Gains générés (€)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Mise en regard du coût d'engagement avec la création de valeur annuelle et la projection à 3 ans.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Bénéfice Net Annuel : +{summary.beneficeAnnuelTotal.toLocaleString('fr-FR')} €/an
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 15, left: 0, bottom: 20 }}
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
                  tickFormatter={(val) => `${val} €`}
                />
                <Tooltip
                  formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} €`, '']}
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            Fiches Détaillées des Projets & Amortissement
          </h4>
          <span className="text-xs text-slate-500 font-mono">
            {projets.length} {projets.length > 1 ? 'projets analysés' : 'projet analysé'}
          </span>
        </div>

        {projets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucun projet informatique n'est pour l'instant consigné. Cliquez sur "Ajouter un Projet au Bilan ROI" pour commencer.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {projets.map((proj) => {
              const invest = Number(proj.coutInvestissementEuros) || 0;
              const eco = Number(proj.economiesFinancieresAnnuellesEuros) || 0;
              const heures = Number(proj.gainTempsEstimeHeuresParAn) || 0;
              const taux = Number(proj.tauxHoraireMoyenValorise) || 35;
              const valTemps = heures * taux;
              const gainAnnuelTotal = eco + valTemps;
              const roiProjet = invest > 0 ? Math.round(((gainAnnuelTotal - invest) / invest) * 100) : 0;
              const paybackProjet = gainAnnuelTotal > 0 ? Math.round((invest / gainAnnuelTotal) * 12 * 10) / 10 : 0;

              return (
                <div
                  key={proj.id}
                  className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-xs"
                >
                  {/* Titre & Description */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                        {proj.categorie}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          proj.statut === 'En production'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : proj.statut === 'Clôturé avec succès'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {proj.statut}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Mise en service : {proj.dateMiseEnService}
                      </span>
                    </div>

                    <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {proj.nomProjet}
                    </h5>
                    <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Investissement</span>
                      <strong className="text-slate-900 dark:text-white font-mono text-xs font-bold">
                        {invest.toLocaleString('fr-FR')} €
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Économies directes</span>
                      <strong className="text-emerald-600 font-mono text-xs font-bold">
                        +{eco.toLocaleString('fr-FR')} €/an
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Temps gagné</span>
                      <strong className="text-blue-600 font-mono text-xs font-bold">
                        {heures} h/an
                      </strong>
                      <span className="text-[9px] text-slate-400 block">
                        (+{valTemps.toLocaleString('fr-FR')} €)
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">ROI An 1 / Délai</span>
                      <div className="flex items-center justify-center gap-1">
                        <strong className="text-emerald-700 dark:text-emerald-300 font-mono text-xs font-extrabold">
                          {roiProjet > 0 ? `+${roiProjet}%` : `${roiProjet}%`}
                        </strong>
                      </div>
                      <span className="text-[9px] text-slate-500 block">
                        Amorti en {paybackProjet} mois
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 self-end lg:self-center">
                    <button
                      onClick={() => handleOpenEditModal(proj)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                      title="Modifier le projet"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(proj.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                      title="Supprimer le projet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Ajout / Édition de Projet ROI */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-xs max-h-[90vh] overflow-y-auto">
            <h4 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>{editingId ? 'Modifier le Projet & Calcul de ROI' : 'Ajouter un Projet au Calcul de ROI'}</span>
            </h4>

            <form onSubmit={handleSaveProject} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nom du Projet informatique
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Automatisation des Masters PC Autopilot"
                    value={formData.nomProjet}
                    onChange={(e) => setFormData({ ...formData, nomProjet: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Infrastructure">Infrastructure (Serveurs, Virtualisation, Baies)</option>
                    <option value="Sécurité & Sauvegarde">Sécurité & Sauvegarde (PRA, EDR, Immuable)</option>
                    <option value="Automatisation">Automatisation (Scripts, Déploiements, API)</option>
                    <option value="Bureautique & Postes">Bureautique & Postes de travail (PC, Écrans)</option>
                    <option value="Cloud & SaaS">Cloud & SaaS (Microsoft 365, Outils métiers)</option>
                    <option value="Réseau & Télécoms">Réseau & Télécoms (Fibre, Wi-Fi, Switches)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description succincte & Objectif opérationnel
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Remplacement du processus manuel d'installation par une stratégie Intune..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Champs financiers & gain de temps */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Données financières & métriques d'efficience
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Coût d'investissement (€ HT)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      value={formData.coutInvestissementEuros}
                      onChange={(e) => setFormData({ ...formData, coutInvestissementEuros: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Matériel, licences, formation, prestation</span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Économies financières directes (€ / an)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      value={formData.economiesFinancieresAnnuellesEuros}
                      onChange={(e) => setFormData({ ...formData, economiesFinancieresAnnuellesEuros: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Coûts de licences résiliées, baisse facture élec, maintenance évitée</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Gain de temps estimé (heures / an)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={5}
                      value={formData.gainTempsEstimeHeuresParAn}
                      onChange={(e) => setFormData({ ...formData, gainTempsEstimeHeuresParAn: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Heures économisées pour le technicien ou les salariés</span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Taux horaire moyen valorisé (€ / heure)
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      step={5}
                      value={formData.tauxHoraireMoyenValorise}
                      onChange={(e) => setFormData({ ...formData, tauxHoraireMoyenValorise: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Coût horaire moyen standard d'entreprise (défaut : 35 €/h)</span>
                  </div>
                </div>

                {/* Calcul en direct dans le modal */}
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                      Bénéfice Annuel Total Projeté :
                    </span>
                    <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-mono">
                      +{liveFormMetrics.gainAnnuelTotal.toLocaleString('fr-FR')} € / an
                    </strong>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                      Amortissement & ROI 1 an :
                    </span>
                    <strong className="text-slate-900 dark:text-white font-mono text-sm">
                      {liveFormMetrics.roi1An > 0 ? `+${liveFormMetrics.roi1An}%` : `${liveFormMetrics.roi1An}%`}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">
                      Payback : {liveFormMetrics.paybackMois} mois
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Impacts qualitatifs & Retours utilisateurs
                </label>
                <input
                  type="text"
                  placeholder="Ex: Diminution des sollicitations au helpdesk, conformité audit..."
                  value={formData.impactQualitatif}
                  onChange={(e) => setFormData({ ...formData, impactQualitatif: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date de mise en service
                  </label>
                  <input
                    type="date"
                    value={formData.dateMiseEnService}
                    onChange={(e) => setFormData({ ...formData, dateMiseEnService: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Statut du projet
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="En production">En production</option>
                    <option value="Clôturé avec succès">Clôturé avec succès</option>
                    <option value="En cours">En cours de déploiement</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 shadow transition"
                >
                  {editingId ? 'Mettre à jour le projet' : 'Enregistrer le projet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
