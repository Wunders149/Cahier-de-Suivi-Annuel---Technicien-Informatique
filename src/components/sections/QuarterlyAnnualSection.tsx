import React, { useState } from 'react';
import { BilanTrimestriel, BilanAnnuel } from '../../types/it-tracker';
import { Award, CheckCircle2, TrendingUp, AlertTriangle, Lightbulb, GraduationCap, DollarSign, PenTool, Check } from 'lucide-react';

interface QuarterlyAnnualSectionProps {
  bilansTrimestriels: BilanTrimestriel[];
  bilanAnnuel: BilanAnnuel;
  onUpdateTrimestriels: (bilans: BilanTrimestriel[]) => void;
  onUpdateBilanAnnuel: (bilan: BilanAnnuel) => void;
}

export const QuarterlyAnnualSection: React.FC<QuarterlyAnnualSectionProps> = ({
  bilansTrimestriels,
  bilanAnnuel,
  onUpdateTrimestriels,
  onUpdateBilanAnnuel,
}) => {
  const [activeTab, setActiveTab] = useState<'annuel' | 'trimestres'>('annuel');
  const [selectedTrimestre, setSelectedTrimestre] = useState<'T1' | 'T2' | 'T3' | 'T4'>('T4');

  const currentTrimestre = bilansTrimestriels.find((t) => t.trimestre === selectedTrimestre) || bilansTrimestriels[0];

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">12</span>
            Bilans Trimestriels (T1-T4) & Bilan Annuel Consolidé
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Évaluation des objectifs atteints, performances, retours d'expérience, besoins en formation et investissements N+1.
          </p>
        </div>

        {/* Sélecteur de vue */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-300 text-xs">
          <button
            onClick={() => setActiveTab('annuel')}
            className={`px-3 py-1.5 rounded-md font-bold transition ${
              activeTab === 'annuel' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Bilan Annuel Global {bilanAnnuel.annee}
          </button>
          <button
            onClick={() => setActiveTab('trimestres')}
            className={`px-3 py-1.5 rounded-md font-bold transition ${
              activeTab === 'trimestres' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Synthèses Trimestrielles (T1-T4)
          </button>
        </div>
      </div>

      {activeTab === 'annuel' ? (
        /* VUE BILAN ANNUEL GLOBAL */
        <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-xl overflow-hidden space-y-6">
          {/* Bannière solennelle */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 border-b-4 border-amber-500">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-amber-400 font-bold block mb-1">
                  Clôture Officielle de l'Exercice
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  BILAN ANNUEL DU TECHNICIEN INFORMATIQUE {bilanAnnuel.annee}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Évaluation globale de la performance, disponibilité des infrastructures et trajectoire N+1.
                </p>
              </div>

              <div className="bg-white/10 p-4 rounded-xl border border-white/20 text-center shrink-0">
                <span className="text-[11px] text-blue-200 block uppercase font-medium">Objectifs Annuels</span>
                <strong className="text-3xl font-black text-amber-300">{bilanAnnuel.objectifsAtteintsTaux}%</strong>
                <span className="text-[10px] text-slate-300 block">atteints & validés</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 text-xs">
            {/* Synthèse générale */}
            <div className="space-y-2">
              <strong className="text-blue-950 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                1. Synthèse Générale de l'Année Écoulée :
              </strong>
              <p className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 text-sm leading-relaxed">
                {bilanAnnuel.syntheseGenerale}
              </p>
            </div>

            {/* Réalisations & Incidents majeurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <strong className="text-emerald-900 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  2. Principales Réalisations & Chantiers Clôturés :
                </strong>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 text-slate-800 whitespace-pre-line leading-relaxed">
                  {bilanAnnuel.principalesRealisations}
                </div>
              </div>

              <div className="space-y-2">
                <strong className="text-amber-900 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  3. Incidents Majeurs de l'Année (Retours d'Expérience) :
                </strong>
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 text-slate-800 whitespace-pre-line leading-relaxed">
                  {bilanAnnuel.incidentsMajeursAnnee}
                </div>
              </div>
            </div>

            {/* Améliorations & Difficultés */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <strong className="text-blue-900 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  4. Améliorations Apportées au Système d'Information :
                </strong>
                <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200 text-slate-800 whitespace-pre-line leading-relaxed">
                  {bilanAnnuel.ameliorationsApportees}
                </div>
              </div>

              <div className="space-y-2">
                <strong className="text-slate-900 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                  5. Difficultés Organisationnelles ou Techniques :
                </strong>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed">
                  {bilanAnnuel.difficultesOrganisationnelles}
                </div>
              </div>
            </div>

            {/* Formation & Investissements N+1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <strong className="text-indigo-900 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  6. Formations Suivies & Besoins de Montée en Compétences :
                </strong>
                <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200 text-slate-800 whitespace-pre-line leading-relaxed">
                  {bilanAnnuel.formationsSuiviesEtBesoinsFuturs}
                </div>
              </div>

              <div className="space-y-2">
                <strong className="text-emerald-900 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  7. Investissements Informatiques Préconisés (Budget N+1) :
                </strong>
                <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 text-slate-800 whitespace-pre-line leading-relaxed font-medium">
                  {bilanAnnuel.investissementsInformatiquesPreconises}
                </div>
              </div>
            </div>

            {/* Objectifs Année Suivante */}
            <div className="space-y-2">
              <strong className="text-blue-950 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                8. Objectifs Stratégiques pour l'Année Suivante (N+1) :
              </strong>
              <div className="bg-slate-900 text-white p-4 rounded-xl whitespace-pre-line leading-relaxed font-medium">
                {bilanAnnuel.objectifsAnneeSuivante}
              </div>
            </div>

            {/* Appréciation hiérarchique RSI & Signatures */}
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-300 space-y-4">
              <div>
                <strong className="text-slate-900 font-bold text-sm uppercase tracking-wide block mb-1">
                  Appréciation Officielle du Responsable des Systèmes d'Information (RSI) :
                </strong>
                <p className="text-slate-700 italic bg-white p-3.5 rounded-xl border border-slate-200 text-sm leading-relaxed">
                  « {bilanAnnuel.appreciationRsi} »
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Visa & Signature du Technicien IT :</span>
                  <strong className="text-slate-900 text-sm block mt-1">Alexandre DUBOIS</strong>
                  <span className="text-emerald-700 font-semibold block mt-1">
                    ✓ Signé électroniquement le {bilanAnnuel.signatureTechnicienDate}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-medium">Validation Hiérarchique du RSI :</span>
                  <strong className="text-slate-900 text-sm block mt-1">Marc LEFEBVRE (RSI)</strong>
                  <span className="text-emerald-700 font-semibold block mt-1">
                    ✓ Approuvé et visé le {bilanAnnuel.signatureRsiDate}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VUE TRIMESTRIELLE (T1 - T4) */
        <div className="space-y-6">
          {/* Sélecteur de trimestre */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bilansTrimestriels.map((bt) => {
              const isSelected = bt.trimestre === selectedTrimestre;
              return (
                <button
                  key={bt.trimestre}
                  onClick={() => setSelectedTrimestre(bt.trimestre)}
                  className={`p-4 rounded-xl border text-left transition ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md border-blue-700'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-base font-extrabold block">{bt.trimestre}</span>
                  <span className={`text-xs block ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {bt.periode}
                  </span>
                  <div className="mt-2 pt-2 border-t border-white/20 text-[11px] flex items-center justify-between">
                    <span>Sat. {bt.tauxSatisfactionUtilisateurs}%</span>
                    <span>Dispo {bt.tauxDisponibiliteInfrastructure}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Fiche du trimestre sélectionné */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Bilan Synthétique du {currentTrimestre.trimestre} ({currentTrimestre.periode})
                </h3>
                <span className="text-slate-500">Revue trimestrielle des engagements et résultats.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full font-bold border border-emerald-200">
                  Satisfaction : {currentTrimestre.tauxSatisfactionUtilisateurs}%
                </span>
                <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full font-bold border border-blue-200">
                  Disponibilité SI : {currentTrimestre.tauxDisponibiliteInfrastructure}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <strong className="text-blue-900 font-bold block text-sm">Objectifs atteints & Réalisations :</strong>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
                  {currentTrimestre.objectifsAtteints}
                </p>
              </div>

              <div className="space-y-1.5">
                <strong className="text-slate-900 font-bold block text-sm">Résumé des performances du technicien :</strong>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
                  {currentTrimestre.performancesResume}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <strong className="text-amber-900 font-bold block text-sm">Incidents majeurs du trimestre :</strong>
                <p className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 text-slate-800 leading-relaxed">
                  {currentTrimestre.incidentsMajeurs}
                </p>
              </div>

              <div className="space-y-1.5">
                <strong className="text-emerald-900 font-bold block text-sm">Améliorations concrètes apportées :</strong>
                <p className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 text-slate-800 leading-relaxed">
                  {currentTrimestre.ameliorationsApportees}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <strong className="text-slate-900 font-bold block">Difficultés rencontrées :</strong>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                  {currentTrimestre.difficultesRencontrees}
                </p>
              </div>
              <div className="space-y-1.5">
                <strong className="text-slate-900 font-bold block">Besoins en formation :</strong>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                  {currentTrimestre.besoinsFormation}
                </p>
              </div>
              <div className="space-y-1.5">
                <strong className="text-slate-900 font-bold block">Investissements préconisés :</strong>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 font-medium">
                  {currentTrimestre.investissementsNecessaires}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
