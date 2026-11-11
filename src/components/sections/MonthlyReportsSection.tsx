import React, { useState } from 'react';
import { RapportMensuel } from '../../types/it-tracker';
import { CalendarRange, CheckCircle2, Clock, AlertCircle, FileText, Check, Edit3, ArrowRight } from 'lucide-react';

interface MonthlyReportsSectionProps {
  rapports: RapportMensuel[];
  onUpdateRapports: (rapports: RapportMensuel[]) => void;
}

export const MonthlyReportsSection: React.FC<MonthlyReportsSectionProps> = ({
  rapports,
  onUpdateRapports,
}) => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(11); // Mois de Novembre par défaut
  const [isEditing, setIsEditing] = useState(false);

  const currentReport = rapports.find((r) => r.moisIndex === selectedMonthIndex) || rapports[0];
  const [formData, setFormData] = useState<RapportMensuel>(currentReport);

  const handleSelectMonth = (index: number) => {
    setSelectedMonthIndex(index);
    const rep = rapports.find((r) => r.moisIndex === index) || rapports[0];
    setFormData(rep);
    setIsEditing(false);
  };

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = rapports.map((r) => (r.moisIndex === formData.moisIndex ? formData : r));
    onUpdateRapports(updated);
    setIsEditing(false);
  };

  const handleToggleValidation = () => {
    const nextVal = !currentReport.valideParHierarchie;
    const updated = rapports.map((r) =>
      r.moisIndex === currentReport.moisIndex
        ? {
            ...r,
            valideParHierarchie: nextVal,
            dateValidation: nextVal ? new Date().toISOString().split('T')[0] : undefined,
          }
        : r
    );
    onUpdateRapports(updated);
    setFormData({
      ...formData,
      valideParHierarchie: nextVal,
      dateValidation: nextVal ? new Date().toISOString().split('T')[0] : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">11</span>
            Rapports Mensuels d'Activité (12 Mois Complets)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Bilan périodique mensuel adressé à la hiérarchie : indicateurs, maintenances, difficultés et priorités N+1.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Annuler modification' : 'Modifier le rapport du mois'}</span>
          </button>
        </div>
      </div>

      {/* Barre de navigation des 12 mois */}
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 bg-slate-100 p-2 rounded-xl border border-slate-200 text-xs">
        {rapports.map((rep) => {
          const isSelected = rep.moisIndex === selectedMonthIndex;
          return (
            <button
              key={rep.moisIndex}
              onClick={() => handleSelectMonth(rep.moisIndex)}
              className={`p-2 rounded-lg font-bold flex flex-col items-center justify-center gap-0.5 transition ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider">
                {rep.nomMois.slice(0, 3)}
              </span>
              <span className={`text-[10px] font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                {rep.totalInterventions} tck
              </span>
              {rep.valideParHierarchie && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" title="Validé par le RSI" />
              )}
            </button>
          );
        })}
      </div>

      {/* Formulaire de modification */}
      {isEditing ? (
        <form onSubmit={handleSaveReport} className="bg-white rounded-2xl border-2 border-blue-400 p-6 shadow-md space-y-4 text-xs">
          <h3 className="text-base font-bold text-blue-900 pb-2 border-b border-blue-100">
            Modifier le Rapport de {formData.nomMois} {formData.annee}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Total interventions</label>
              <input
                type="number"
                value={formData.totalInterventions}
                onChange={(e) => setFormData({ ...formData, totalInterventions: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Incidents résolus</label>
              <input
                type="number"
                value={formData.incidentsResolus}
                onChange={(e) => setFormData({ ...formData, incidentsResolus: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Incidents en cours</label>
              <input
                type="number"
                value={formData.incidentsEnCours}
                onChange={(e) => setFormData({ ...formData, incidentsEnCours: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Temps moyen résolution (min)</label>
              <input
                type="number"
                value={formData.dureeMoyenneResolutionMin}
                onChange={(e) => setFormData({ ...formData, dureeMoyenneResolutionMin: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Travaux & Projets réalisés</label>
            <textarea
              rows={2}
              value={formData.travauxRealises}
              onChange={(e) => setFormData({ ...formData, travauxRealises: e.target.value })}
              className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Maintenance effectuée</label>
            <textarea
              rows={2}
              value={formData.maintenanceEffectuee}
              onChange={(e) => setFormData({ ...formData, maintenanceEffectuee: e.target.value })}
              className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Problèmes récurrents</label>
              <textarea
                rows={2}
                value={formData.problemesRecurrents}
                onChange={(e) => setFormData({ ...formData, problemesRecurrents: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Difficultés rencontrées</label>
              <textarea
                rows={2}
                value={formData.difficultesRencontrees}
                onChange={(e) => setFormData({ ...formData, difficultesRencontrees: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Besoins matériels & logiciels</label>
              <input
                type="text"
                value={formData.besoinsMaterielsLogiciels}
                onChange={(e) => setFormData({ ...formData, besoinsMaterielsLogiciels: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Recommandations du technicien</label>
              <input
                type="text"
                value={formData.recommandationsTechnicien}
                onChange={(e) => setFormData({ ...formData, recommandationsTechnicien: e.target.value })}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Activités prévues pour le mois suivant (M+1)</label>
            <input
              type="text"
              value={formData.activitesMoisSuivant}
              onChange={(e) => setFormData({ ...formData, activitesMoisSuivant: e.target.value })}
              className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      ) : null}

      {/* Fiche de rapport mensuel sélectionné */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-lg overflow-hidden">
        {/* En-tête du rapport */}
        <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-4 border-blue-600">
          <div>
            <span className="text-xs uppercase tracking-widest text-blue-300 font-bold block">
              Direction des Systèmes d'Information • Rapport d'Activité
            </span>
            <h3 className="text-2xl font-extrabold text-white">
              {currentReport.nomMois.toUpperCase()} {currentReport.annee}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleValidation}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition ${
                currentReport.valideParHierarchie
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {currentReport.valideParHierarchie
                  ? `Validé RSI (${currentReport.dateValidation})`
                  : 'Approuver par le RSI'}
              </span>
            </button>
          </div>
        </div>

        {/* Métriques clés */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
            <span className="text-xs text-slate-400 block uppercase font-medium">Interventions</span>
            <strong className="text-2xl font-black text-slate-900">{currentReport.totalInterventions}</strong>
            <span className="text-[11px] text-slate-500 block">tickets traités</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
            <span className="text-xs text-slate-400 block uppercase font-medium">Résolus / En cours</span>
            <strong className="text-2xl font-black text-emerald-600">
              {currentReport.incidentsResolus}
            </strong>
            <span className="text-[11px] text-slate-500 block">
              {currentReport.incidentsEnCours} en cours
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
            <span className="text-xs text-slate-400 block uppercase font-medium">Taux 1er Contact</span>
            <strong className="text-2xl font-black text-blue-600">{currentReport.tauxResolutionFCR}%</strong>
            <span className="text-[11px] text-slate-500 block">résolution directe (FCR)</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
            <span className="text-xs text-slate-400 block uppercase font-medium">Délai Moyen (MTTR)</span>
            <strong className="text-2xl font-black text-indigo-600">
              {currentReport.dureeMoyenneResolutionMin}m
            </strong>
            <span className="text-[11px] text-slate-500 block">temps de traitement</span>
          </div>
        </div>

        {/* Contenu détaillé du rapport */}
        <div className="p-6 space-y-6 text-xs">
          {/* Travaux réalisés & Maintenance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <strong className="text-blue-900 font-bold block text-sm uppercase tracking-wide">
                1. Travaux & Projets réalisés durant le mois :
              </strong>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed min-h-[70px]">
                {currentReport.travauxRealises}
              </div>
            </div>

            <div className="space-y-1.5">
              <strong className="text-blue-900 font-bold block text-sm uppercase tracking-wide">
                2. Maintenance préventive effectuée :
              </strong>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed min-h-[70px]">
                {currentReport.maintenanceEffectuee}
              </div>
            </div>
          </div>

          {/* Problèmes récurrents & Difficultés */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <strong className="text-amber-900 font-bold block text-sm uppercase tracking-wide">
                3. Problèmes récurrents identifiés :
              </strong>
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 text-slate-800 leading-relaxed min-h-[60px]">
                {currentReport.problemesRecurrents}
              </div>
            </div>

            <div className="space-y-1.5">
              <strong className="text-slate-900 font-bold block text-sm uppercase tracking-wide">
                4. Difficultés techniques ou organisationnelles :
              </strong>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed min-h-[60px]">
                {currentReport.difficultesRencontrees}
              </div>
            </div>
          </div>

          {/* Besoins & Recommandations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <strong className="text-blue-900 font-bold block text-sm uppercase tracking-wide">
                5. Besoins matériels & logiciels :
              </strong>
              <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-200 text-slate-800 leading-relaxed min-h-[50px]">
                {currentReport.besoinsMaterielsLogiciels}
              </div>
            </div>

            <div className="space-y-1.5">
              <strong className="text-blue-900 font-bold block text-sm uppercase tracking-wide">
                6. Recommandations à la hiérarchie :
              </strong>
              <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-200 text-slate-800 leading-relaxed min-h-[50px]">
                {currentReport.recommandationsTechnicien}
              </div>
            </div>
          </div>

          {/* Activités prévues M+1 */}
          <div className="space-y-1.5">
            <strong className="text-slate-900 font-bold block text-sm uppercase tracking-wide flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4 text-blue-600" />
              7. Activités et priorités programmées pour le mois suivant :
            </strong>
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 text-slate-800 font-medium leading-relaxed">
              {currentReport.activitesMoisSuivant}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
