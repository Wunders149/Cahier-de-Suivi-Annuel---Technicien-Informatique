import React, { useState, useMemo } from 'react';
import { BilanTrimestriel, BilanAnnuel, GeneralInfo } from '../../types/it-tracker';
import {
  Award,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  DollarSign,
  Check,
  ArrowRight,
  Clock,
  Sparkles,
  BarChart3,
  Edit3,
  X,
} from 'lucide-react';
import { RoiProjectsSection } from '../roi/RoiProjectsSection';

interface QuarterlyAnnualSectionProps {
  bilansTrimestriels: BilanTrimestriel[];
  bilanAnnuel: BilanAnnuel;
  generalInfo?: GeneralInfo;
  onUpdateTrimestriels: (bilans: BilanTrimestriel[]) => void;
  onUpdateBilanAnnuel: (bilan: BilanAnnuel) => void;
}

export const QuarterlyAnnualSection: React.FC<QuarterlyAnnualSectionProps> = ({
  bilansTrimestriels,
  bilanAnnuel,
  generalInfo,
  onUpdateTrimestriels,
  onUpdateBilanAnnuel,
}) => {
  const [activeTab, setActiveTab] = useState<'annuel' | 'roi' | 'trimestres'>('annuel');
  const [selectedTrimestre, setSelectedTrimestre] = useState<'T1' | 'T2' | 'T3' | 'T4'>('T4');
  const [isEditingAnnual, setIsEditingAnnual] = useState(false);
  const [annualForm, setAnnualForm] = useState<BilanAnnuel>(bilanAnnuel);
  const [isEditingQuarter, setIsEditingQuarter] = useState(false);

  const currentTrimestre =
    bilansTrimestriels.find((t) => t.trimestre === selectedTrimestre) ||
    bilansTrimestriels[0];

  const [quarterForm, setQuarterForm] = useState<BilanTrimestriel | null>(
    currentTrimestre || null
  );

  React.useEffect(() => {
    setAnnualForm(bilanAnnuel);
  }, [bilanAnnuel]);

  React.useEffect(() => {
    setQuarterForm(currentTrimestre || null);
  }, [currentTrimestre]);

  const handleSaveAnnual = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBilanAnnuel(annualForm);
    setIsEditingAnnual(false);
  };

  const handleSaveQuarter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quarterForm) return;
    onUpdateTrimestriels(
      bilansTrimestriels.map((bt) =>
        bt.trimestre === quarterForm.trimestre ? quarterForm : bt
      )
    );
    setIsEditingQuarter(false);
  };

  // Calcul du résumé ROI pour le Bilan Annuel
  const roiSummary = useMemo(() => {
    const list = bilanAnnuel.projetsRoi || [];
    let investTotal = 0;
    let ecoDirectes = 0;
    let heuresTotal = 0;

    list.forEach((p) => {
      investTotal += Number(p.coutInvestissementEuros) || 0;
      ecoDirectes += Number(p.economiesFinancieresAnnuellesEuros) || 0;
      heuresTotal += Number(p.gainTempsEstimeHeuresParAn) || 0;
    });

    const gainTempsVal = heuresTotal * 35; // 35€/h standard
    const beneficeTotal = ecoDirectes + gainTempsVal;
    const roi1An =
      investTotal > 0
        ? Math.round(((beneficeTotal - investTotal) / investTotal) * 100)
        : 0;

    return {
      count: list.length,
      investTotal,
      ecoDirectes,
      heuresTotal,
      beneficeTotal,
      roi1An,
    };
  }, [bilanAnnuel.projetsRoi]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center text-sm font-bold">
              12
            </span>
            Bilans Trimestriels, Bilan Annuel & Calculateur ROI
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Évaluation des objectifs, retour sur investissement des projets IT réalisés, gains de temps et trajectoire N+1.
          </p>
        </div>

        {/* Sélecteur de vue (3 onglets) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('annuel')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'annuel'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Bilan Annuel {bilanAnnuel.annee}
          </button>

          <button
            onClick={() => setActiveTab('roi')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'roi'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Calculateur ROI Projets</span>
            {roiSummary.count > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 text-[10px] font-mono">
                {roiSummary.count}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('trimestres')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'trimestres'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Synthèses Trimestrielles (T1-T4)
          </button>
        </div>
      </div>

      {/* Onglet 1 : VUE BILAN ANNUEL GLOBAL */}
      {activeTab === 'annuel' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-xl overflow-hidden space-y-6">
          {/* Bannière solennelle */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 border-b-2 border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-blue-400 font-bold block mb-1">
                  Clôture Officielle de l'Exercice
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  BILAN ANNUEL DU TECHNICIEN INFORMATIQUE {bilanAnnuel.annee}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Évaluation globale de la performance, disponibilité des infrastructures et trajectoire N+1.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAnnualForm(bilanAnnuel);
                    setIsEditingAnnual((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold transition"
                >
                  {isEditingAnnual ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                  <span>{isEditingAnnual ? 'Annuler' : 'Modifier le Bilan'}</span>
                </button>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                  <span className="text-[11px] text-slate-300 block uppercase font-medium">
                    Objectifs Annuels
                  </span>
                  <strong className="text-3xl font-black text-amber-400 font-mono tabular-nums">
                    {bilanAnnuel.objectifsAtteintsTaux}%
                  </strong>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    atteints & validés
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isEditingAnnual && (
            <form
              onSubmit={handleSaveAnnual}
              className="mx-6 sm:mx-8 p-5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <h4 className="font-bold text-blue-950 text-sm">
                  Éditer le Bilan Annuel {annualForm.annee}
                </h4>
                <div className="flex items-center gap-2">
                  <label className="font-medium text-slate-700">Taux d'objectifs atteints (%) :</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={annualForm.objectifsAtteintsTaux}
                    onChange={(e) =>
                      setAnnualForm({
                        ...annualForm,
                        objectifsAtteintsTaux: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-20 px-2 py-1 rounded border border-slate-300 bg-white text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">1. Synthèse générale de l'année</label>
                <textarea
                  rows={2}
                  value={annualForm.syntheseGenerale}
                  onChange={(e) => setAnnualForm({ ...annualForm, syntheseGenerale: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">2. Principales réalisations</label>
                  <textarea
                    rows={3}
                    value={annualForm.principalesRealisations}
                    onChange={(e) => setAnnualForm({ ...annualForm, principalesRealisations: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">3. Incidents majeurs de l'année</label>
                  <textarea
                    rows={3}
                    value={annualForm.incidentsMajeursAnnee}
                    onChange={(e) => setAnnualForm({ ...annualForm, incidentsMajeursAnnee: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">4. Améliorations apportées au SI</label>
                  <textarea
                    rows={2}
                    value={annualForm.ameliorationsApportees}
                    onChange={(e) => setAnnualForm({ ...annualForm, ameliorationsApportees: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">5. Difficultés rencontrées</label>
                  <textarea
                    rows={2}
                    value={annualForm.difficultesOrganisationnelles}
                    onChange={(e) => setAnnualForm({ ...annualForm, difficultesOrganisationnelles: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">6. Formations suivies & besoins</label>
                  <textarea
                    rows={2}
                    value={annualForm.formationsSuiviesEtBesoinsFuturs}
                    onChange={(e) => setAnnualForm({ ...annualForm, formationsSuiviesEtBesoinsFuturs: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">7. Investissements préconisés (N+1)</label>
                  <textarea
                    rows={2}
                    value={annualForm.investissementsInformatiquesPreconises}
                    onChange={(e) => setAnnualForm({ ...annualForm, investissementsInformatiquesPreconises: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">8. Objectifs stratégiques N+1</label>
                <textarea
                  rows={2}
                  value={annualForm.objectifsAnneeSuivante}
                  onChange={(e) => setAnnualForm({ ...annualForm, objectifsAnneeSuivante: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Appréciation du RSI</label>
                  <input
                    type="text"
                    value={annualForm.appreciationRsi}
                    onChange={(e) => setAnnualForm({ ...annualForm, appreciationRsi: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date signature Technicien</label>
                  <input
                    type="date"
                    value={annualForm.signatureTechnicienDate}
                    onChange={(e) => setAnnualForm({ ...annualForm, signatureTechnicienDate: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date validation RSI</label>
                  <input
                    type="date"
                    value={annualForm.signatureRsiDate}
                    onChange={(e) => setAnnualForm({ ...annualForm, signatureRsiDate: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
                <button
                  type="button"
                  onClick={() => setIsEditingAnnual(false)}
                  className="px-3.5 py-1.5 rounded text-slate-600 hover:bg-slate-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Enregistrer le Bilan Annuel
                </button>
              </div>
            </form>
          )}

          <div className="p-6 sm:p-8 space-y-6 text-xs">
            {/* Synthèse générale */}
            <div className="space-y-2">
              <strong className="text-blue-950 dark:text-blue-300 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                1. Synthèse Générale de l'Année Écoulée :
              </strong>
              <p className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                {bilanAnnuel.syntheseGenerale || (
                  <span className="text-slate-400 italic text-xs">
                    Non renseigné — cliquez sur « Modifier le Bilan » pour rédiger la synthèse annuelle.
                  </span>
                )}
              </p>
            </div>

            {/* Encadré d'impact : Retour sur Investissement (ROI) des Projets Clôturés */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 p-5 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700/60 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
                    <TrendingUp className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                      Bénéfices Économiques & Retour sur Investissement (ROI)
                    </h4>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">
                      Gains tangibles mesurés sur les projets informatiques déployés en {bilanAnnuel.annee}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('roi')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition self-start sm:self-auto"
                >
                  <span>Accéder au Calculateur ROI Détaillé</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-white/80 dark:bg-slate-850 p-3 rounded-xl border border-emerald-200/80 dark:border-slate-700">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                    Investissement Engagé
                  </span>
                  <strong className="text-slate-900 dark:text-white font-mono text-base font-bold">
                    {roiSummary.investTotal.toLocaleString('fr-FR')} €
                  </strong>
                </div>

                <div className="bg-white/80 dark:bg-slate-850 p-3 rounded-xl border border-emerald-200/80 dark:border-slate-700">
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase block">
                    Économies Directes
                  </span>
                  <strong className="text-emerald-700 dark:text-emerald-300 font-mono text-base font-bold">
                    +{roiSummary.ecoDirectes.toLocaleString('fr-FR')} €/an
                  </strong>
                </div>

                <div className="bg-white/80 dark:bg-slate-850 p-3 rounded-xl border border-emerald-200/80 dark:border-slate-700">
                  <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase block">
                    Temps Gagné
                  </span>
                  <strong className="text-blue-700 dark:text-blue-300 font-mono text-base font-bold">
                    {roiSummary.heuresTotal} h/an
                  </strong>
                </div>

                <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-xs">
                  <span className="text-[10px] font-semibold text-emerald-100 uppercase block">
                    Bénéfice Annuel Net
                  </span>
                  <strong className="font-mono text-base font-black">
                    +{roiSummary.beneficeTotal.toLocaleString('fr-FR')} €/an
                  </strong>
                </div>
              </div>
            </div>

            {/* Réalisations & Incidents majeurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <strong className="text-emerald-900 dark:text-emerald-300 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  2. Principales Réalisations & Chantiers Clôturés :
                </strong>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed min-h-[60px]">
                  {bilanAnnuel.principalesRealisations || (
                    <span className="text-slate-400 italic">Aucune réalisation renseignée.</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <strong className="text-amber-900 dark:text-amber-300 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  3. Incidents Majeurs de l'Année (Retours d'Expérience) :
                </strong>
                <div className="bg-amber-50/50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed min-h-[60px]">
                  {bilanAnnuel.incidentsMajeursAnnee || (
                    <span className="text-slate-400 italic">Aucun incident majeur consigné.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Améliorations & Difficultés */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <strong className="text-blue-900 dark:text-blue-300 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  4. Améliorations Apportées au Système d'Information :
                </strong>
                <div className="bg-blue-50/40 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed min-h-[60px]">
                  {bilanAnnuel.ameliorationsApportees || (
                    <span className="text-slate-400 italic">Non renseigné.</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <strong className="text-slate-900 dark:text-slate-200 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-600" />
                  5. Difficultés Organisationnelles ou Techniques :
                </strong>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed min-h-[60px]">
                  {bilanAnnuel.difficultesOrganisationnelles || (
                    <span className="text-slate-400 italic">Aucune difficulté signalée.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Formation & Investissements N+1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <strong className="text-indigo-900 dark:text-indigo-300 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  6. Formations Suivies & Besoins de Montée en Compétences :
                </strong>
                <div className="bg-indigo-50/40 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed min-h-[60px]">
                  {bilanAnnuel.formationsSuiviesEtBesoinsFuturs || (
                    <span className="text-slate-400 italic">Non renseigné.</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <strong className="text-emerald-900 dark:text-emerald-300 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  7. Investissements Informatiques Préconisés (Budget N+1) :
                </strong>
                <div className="bg-emerald-50/40 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-medium min-h-[60px]">
                  {bilanAnnuel.investissementsInformatiquesPreconises || (
                    <span className="text-slate-400 italic font-normal">Non renseigné.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Objectifs Année Suivante */}
            <div className="space-y-2">
              <strong className="text-blue-950 dark:text-blue-300 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                8. Objectifs Stratégiques pour l'Année Suivante (N+1) :
              </strong>
              <div className="bg-slate-900 text-white p-4 rounded-xl whitespace-pre-line leading-relaxed font-medium">
                {bilanAnnuel.objectifsAnneeSuivante || (
                  <span className="text-slate-400 italic font-normal">
                    Objectifs N+1 à définir lors de la revue annuelle.
                  </span>
                )}
              </div>
            </div>

            {/* Appréciation hiérarchique RSI & Signatures */}
            <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border-2 border-slate-300 dark:border-slate-700 space-y-4">
              <div>
                <strong className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wide block mb-1">
                  Appréciation Officielle du Responsable des Systèmes d'Information (RSI) :
                </strong>
                <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm leading-relaxed">
                  {bilanAnnuel.appreciationRsi
                    ? `« ${bilanAnnuel.appreciationRsi} »`
                    : 'Appréciation hiérarchique en attente de rédaction.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block font-medium">
                    Visa & Signature du Technicien IT :
                  </span>
                  <strong className="text-slate-900 dark:text-white text-sm block mt-1">
                    {generalInfo && `${generalInfo.prenomTechnicien} ${generalInfo.nomTechnicien}`.trim()
                      ? `${generalInfo.prenomTechnicien} ${generalInfo.nomTechnicien}`.trim()
                      : 'Technicien IT'}
                  </strong>
                  <span className={`font-semibold block mt-1 ${bilanAnnuel.signatureTechnicienDate ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {bilanAnnuel.signatureTechnicienDate
                      ? `✓ Signé électroniquement le ${bilanAnnuel.signatureTechnicienDate}`
                      : 'En attente de signature'}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 block font-medium">
                    Validation Hiérarchique du RSI :
                  </span>
                  <strong className="text-slate-900 dark:text-white text-sm block mt-1">
                    {generalInfo?.responsableHierarchique?.trim() || 'Responsable Hiérarchique (RSI)'}
                  </strong>
                  <span className={`font-semibold block mt-1 ${bilanAnnuel.signatureRsiDate ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {bilanAnnuel.signatureRsiDate
                      ? `✓ Approuvé et visé le ${bilanAnnuel.signatureRsiDate}`
                      : 'En attente de validation RSI'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet 2 : VUE CALCULATEUR ROI DES PROJETS IT */}
      {activeTab === 'roi' && (
        <RoiProjectsSection
          projets={bilanAnnuel.projetsRoi || []}
          onUpdateProjets={(projets) =>
            onUpdateBilanAnnuel({ ...bilanAnnuel, projetsRoi: projets })
          }
        />
      )}

      {/* Onglet 3 : VUE TRIMESTRIELLE (T1 - T4) */}
      {activeTab === 'trimestres' && currentTrimestre && (
        <div className="space-y-6">
          {/* Sélecteur de trimestre */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bilansTrimestriels.map((bt) => {
              const isSelected = bt.trimestre === selectedTrimestre;
              return (
                <button
                  key={bt.trimestre}
                  type="button"
                  onClick={() => {
                    setSelectedTrimestre(bt.trimestre);
                    setIsEditingQuarter(false);
                  }}
                  className={`p-4 rounded-xl border text-left transition ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md border-blue-700'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="text-base font-extrabold block">
                    {bt.trimestre}
                  </span>
                  <span
                    className={`text-xs block ${
                      isSelected
                        ? 'text-blue-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {bt.periode}
                  </span>
                  <div className="mt-2 pt-2 border-t border-white/20 text-[11px] flex items-center justify-between font-mono tabular-nums">
                    <span>Sat. {bt.tauxSatisfactionUtilisateurs}%</span>
                    <span>Dispo {bt.tauxDisponibiliteInfrastructure}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Fiche du trimestre sélectionné */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Bilan Synthétique du {currentTrimestre.trimestre} (
                  {currentTrimestre.periode})
                </h3>
                <span className="text-slate-500 dark:text-slate-400">
                  Revue trimestrielle des engagements et résultats.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full font-bold border border-emerald-200 dark:border-emerald-800 font-mono tabular-nums">
                  Satisfaction : {currentTrimestre.tauxSatisfactionUtilisateurs}%
                </span>
                <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full font-bold border border-blue-200 dark:border-blue-800 font-mono tabular-nums">
                  Disponibilité SI :{' '}
                  {currentTrimestre.tauxDisponibiliteInfrastructure}%
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setQuarterForm(currentTrimestre);
                    setIsEditingQuarter((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition"
                >
                  {isEditingQuarter ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                  <span>{isEditingQuarter ? 'Annuler' : `Modifier ${currentTrimestre.trimestre}`}</span>
                </button>
              </div>
            </div>

            {isEditingQuarter && quarterForm && (
              <form
                onSubmit={handleSaveQuarter}
                className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Satisfaction utilisateurs (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={quarterForm.tauxSatisfactionUtilisateurs}
                      onChange={(e) =>
                        setQuarterForm({
                          ...quarterForm,
                          tauxSatisfactionUtilisateurs: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Disponibilité infrastructure SI (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={quarterForm.tauxDisponibiliteInfrastructure}
                      onChange={(e) =>
                        setQuarterForm({
                          ...quarterForm,
                          tauxDisponibiliteInfrastructure: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Objectifs atteints & réalisations</label>
                    <textarea
                      rows={2}
                      value={quarterForm.objectifsAtteints}
                      onChange={(e) => setQuarterForm({ ...quarterForm, objectifsAtteints: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Résumé des performances</label>
                    <textarea
                      rows={2}
                      value={quarterForm.performancesResume}
                      onChange={(e) => setQuarterForm({ ...quarterForm, performancesResume: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Incidents majeurs du trimestre</label>
                    <textarea
                      rows={2}
                      value={quarterForm.incidentsMajeurs}
                      onChange={(e) => setQuarterForm({ ...quarterForm, incidentsMajeurs: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Améliorations concrètes apportées</label>
                    <textarea
                      rows={2}
                      value={quarterForm.ameliorationsApportees}
                      onChange={(e) => setQuarterForm({ ...quarterForm, ameliorationsApportees: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Difficultés rencontrées</label>
                    <input
                      type="text"
                      value={quarterForm.difficultesRencontrees}
                      onChange={(e) => setQuarterForm({ ...quarterForm, difficultesRencontrees: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Besoins en formation</label>
                    <input
                      type="text"
                      value={quarterForm.besoinsFormation}
                      onChange={(e) => setQuarterForm({ ...quarterForm, besoinsFormation: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Investissements préconisés</label>
                    <input
                      type="text"
                      value={quarterForm.investissementsNecessaires}
                      onChange={(e) => setQuarterForm({ ...quarterForm, investissementsNecessaires: e.target.value })}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-blue-200">
                  <button
                    type="button"
                    onClick={() => setIsEditingQuarter(false)}
                    className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-200 font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    Enregistrer {quarterForm.trimestre}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <strong className="text-blue-900 dark:text-blue-300 font-bold block text-sm">
                  Objectifs atteints & Réalisations :
                </strong>
                <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed min-h-[54px]">
                  {currentTrimestre.objectifsAtteints || (
                    <span className="text-slate-400 italic">Non renseigné.</span>
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <strong className="text-slate-900 dark:text-white font-bold block text-sm">
                  Résumé des performances du technicien :
                </strong>
                <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed min-h-[54px]">
                  {currentTrimestre.performancesResume || (
                    <span className="text-slate-400 italic">Non renseigné.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <strong className="text-amber-900 dark:text-amber-300 font-bold block text-sm">
                  Incidents majeurs du trimestre :
                </strong>
                <p className="bg-amber-50/50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-200 leading-relaxed min-h-[54px]">
                  {currentTrimestre.incidentsMajeurs || (
                    <span className="text-slate-400 italic">Aucun incident majeur signalé.</span>
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <strong className="text-emerald-900 dark:text-emerald-300 font-bold block text-sm">
                  Améliorations concrètes apportées :
                </strong>
                <p className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-200 leading-relaxed min-h-[54px]">
                  {currentTrimestre.ameliorationsApportees || (
                    <span className="text-slate-400 italic">Non renseigné.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <strong className="text-slate-900 dark:text-white font-bold block">
                  Difficultés rencontrées :
                </strong>
                <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 min-h-[44px]">
                  {currentTrimestre.difficultesRencontrees || (
                    <span className="text-slate-400 italic">Aucune.</span>
                  )}
                </p>
              </div>
              <div className="space-y-1.5">
                <strong className="text-slate-900 dark:text-white font-bold block">
                  Besoins en formation :
                </strong>
                <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 min-h-[44px]">
                  {currentTrimestre.besoinsFormation || (
                    <span className="text-slate-400 italic">Aucun.</span>
                  )}
                </p>
              </div>
              <div className="space-y-1.5">
                <strong className="text-slate-900 dark:text-white font-bold block">
                  Investissements préconisés :
                </strong>
                <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium min-h-[44px]">
                  {currentTrimestre.investissementsNecessaires || (
                    <span className="text-slate-400 italic font-normal">Non renseigné.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
