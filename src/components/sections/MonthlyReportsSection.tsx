import React, { useState, useMemo, useEffect } from 'react';
import { CahierSuiviData, RapportMensuel } from '../../types/it-tracker';
import {
  Check,
  Edit3,
  ArrowRight,
  Send,
  Download,
  FileText,
  RefreshCw,
  CheckCircle2,
  Clock,
  X,
  PackageCheck,
  FileDown,
} from 'lucide-react';
import {
  generateMonthlyDocx,
  generateMonthlyPdf,
  getMonthlyActivitySnapshot,
} from '../../utils/monthlyDeliverableGenerator';

interface MonthlyReportsSectionProps {
  data: CahierSuiviData;
  rapports: RapportMensuel[];
  onUpdateRapports: (rapports: RapportMensuel[]) => void;
  onShowToast?: (msg: string) => void;
}

export const MonthlyReportsSection: React.FC<MonthlyReportsSectionProps> = ({
  data,
  rapports,
  onUpdateRapports,
  onShowToast,
}) => {
  const currentCalendarMonth = new Date().getMonth() + 1;
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentCalendarMonth);
  const [isEditing, setIsEditing] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState<number | null>(null);

  // Modal de livraison pour un mois spécifique (1..12)
  const [deliveryModalMonth, setDeliveryModalMonth] = useState<number | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<RapportMensuel['modeLivraison']>('PDF (.pdf)');
  const [deliveryRecipient, setDeliveryRecipient] = useState<string>(
    data.generalInfo.responsableHierarchique || 'Responsable des Systèmes d\'Information (RSI)'
  );
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [deliveryNote, setDeliveryNote] = useState<string>('');
  const [autoDownloadOnDeliver, setAutoDownloadOnDeliver] = useState<boolean>(true);

  const currentReport =
    rapports.find((r) => r.moisIndex === selectedMonthIndex) || rapports[0];
  const [formData, setFormData] = useState<RapportMensuel>(currentReport);

  useEffect(() => {
    if (currentReport) {
      setFormData(currentReport);
    }
  }, [currentReport]);

  const monthSnapshot = useMemo(
    () => getMonthlyActivitySnapshot(data, selectedMonthIndex),
    [data, selectedMonthIndex]
  );

  const allMonthsSnapshots = useMemo(
    () =>
      rapports.map((rep) => ({
        rapport: rep,
        snapshot: getMonthlyActivitySnapshot(data, rep.moisIndex),
      })),
    [data, rapports]
  );

  const deliveredTotalCount = rapports.filter(
    (r) => r.statutLivraison === 'Livré'
  ).length;

  if (!currentReport) {
    return null;
  }

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const handleSelectMonth = (index: number) => {
    setSelectedMonthIndex(index);
    const rep = rapports.find((r) => r.moisIndex === index) || rapports[0];
    if (rep) setFormData(rep);
    setIsEditing(false);
  };

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = rapports.map((r) =>
      r.moisIndex === formData.moisIndex ? formData : r
    );
    onUpdateRapports(updated);
    setIsEditing(false);
    notify(`Rapport de ${formData.nomMois} enregistré.`);
  };

  const handleSyncStatsFromMonth = () => {
    const syncedTotal = monthSnapshot.interventions.length;
    const syncedResolved = monthSnapshot.interventionsTerminees;
    const syncedPending = monthSnapshot.interventionsEnCours;
    const syncedFcr = monthSnapshot.tauxResolution;
    const syncedMttr = monthSnapshot.avgInterventionMinutes;

    const updatedReport: RapportMensuel = {
      ...currentReport,
      totalInterventions: syncedTotal,
      incidentsResolus: syncedResolved,
      incidentsEnCours: syncedPending,
      tauxResolutionFCR: syncedFcr,
      dureeMoyenneResolutionMin: syncedMttr,
    };

    const updated = rapports.map((r) =>
      r.moisIndex === currentReport.moisIndex ? updatedReport : r
    );
    onUpdateRapports(updated);
    setFormData(updatedReport);
    notify(
      `Indicateurs de ${currentReport.nomMois} synchronisés (${syncedTotal} interventions, ${syncedResolved} terminées).`
    );
  };

  const handleGenerateMonthlyReport = () => {
    const targetMonth = currentCalendarMonth;
    const baseReport =
      rapports.find((r) => r.moisIndex === targetMonth) || currentReport;
    const snap = getMonthlyActivitySnapshot(data, targetMonth);

    const interventionSummaries = snap.interventions.map(
      (it) =>
        `• ${it.numeroReference} (${it.dateReception}) — ${it.equipementConcerne} [${it.resultat}] : ${
          it.solutionAppliquee?.trim() || it.descriptionPanne
        }`
    );

    const taskHours = Math.round((snap.totalTaskMinutes / 60) * 10) / 10;
    const taskLines = snap.taches.map(
      (t) => `• ${t.date} — ${t.tache} (${t.categorie}, ${t.statut})`
    );

    const generatedTravauxParts: string[] = [
      `Synthèse ${snap.nomMois} ${snap.annee} : ${snap.interventionsTerminees} intervention(s) terminée(s) sur ${snap.interventions.length} ticket(s) enregistré(s) ; ${snap.tachesTerminees}/${snap.taches.length} tâche(s) journal terminée(s) (${taskHours} h).`,
    ];
    if (interventionSummaries.length > 0) {
      generatedTravauxParts.push(
        `Interventions du mois :\n${interventionSummaries.slice(0, 8).join('\n')}${
          interventionSummaries.length > 8
            ? `\n... et ${interventionSummaries.length - 8} autre(s) intervention(s).`
            : ''
        }`
      );
    }
    if (taskLines.length > 0) {
      generatedTravauxParts.push(
        `Activités du journal quotidien :\n${taskLines.slice(0, 6).join('\n')}${
          taskLines.length > 6
            ? `\n... et ${taskLines.length - 6} autre(s) tâche(s).`
            : ''
        }`
      );
    }

    const generatedMaintenance =
      snap.maintenances.length > 0
        ? snap.maintenances
            .map(
              (m) =>
                `• ${m.dernierControle} — ${m.tacheControle} (${m.responsableOuEquipement}, ${m.frequence}) : ${m.statut}`
            )
            .join('\n')
        : baseReport.maintenanceEffectuee ||
          `Aucun contrôle de maintenance daté sur ${snap.nomMois} ${snap.annee}.`;

    const unresolvedInterventions = snap.interventions.filter(
      (it) => it.resultat !== 'Résolu'
    );
    const problemLines: string[] = [
      ...unresolvedInterventions.map(
        (it) =>
          `• Intervention ${it.numeroReference} (${it.resultat}) : ${it.descriptionPanne}`
      ),
      ...snap.reseauIncidents.map(
        (inc) =>
          `• Incident réseau (${inc.dateHeure}) — ${inc.equipementOuLiaison} [${inc.impactUtilisateurs}] : ${inc.cause || inc.typeIncident}`
      ),
      ...snap.incidentsSecurite.map(
        (sec) =>
          `• Sécurité (${sec.dateHeure}) — ${sec.typeIncident} [${sec.statut}] : ${sec.postesConcernes} (${sec.description})`
      ),
    ];

    const generatedProblems =
      problemLines.length > 0
        ? problemLines.join('\n')
        : baseReport.problemesRecurrents ||
          `Aucun incident ouvert ou récurrent signalé sur ${snap.nomMois} ${snap.annee}.`;

    const updatedReport: RapportMensuel = {
      ...baseReport,
      totalInterventions: snap.interventions.length,
      incidentsResolus: snap.interventionsTerminees,
      incidentsEnCours: snap.interventionsEnCours,
      tauxResolutionFCR: snap.tauxResolution,
      dureeMoyenneResolutionMin: snap.avgInterventionMinutes,
      travauxRealises: generatedTravauxParts.join('\n\n'),
      maintenanceEffectuee: generatedMaintenance,
      problemesRecurrents: generatedProblems,
    };

    const nextRapports = rapports.map((r) =>
      r.moisIndex === targetMonth ? updatedReport : r
    );
    const nextDataSnapshot: CahierSuiviData = {
      ...data,
      rapportsMensuels: nextRapports,
    };

    onUpdateRapports(nextRapports);
    setSelectedMonthIndex(targetMonth);
    setFormData(updatedReport);
    setIsEditing(false);

    generateMonthlyPdf(nextDataSnapshot, targetMonth);
    notify(
      `Rapport mensuel de ${snap.nomMois} ${snap.annee} généré (${snap.interventionsTerminees}/${snap.interventions.length} interventions terminées) et téléchargé en PDF.`
    );
  };

  const handleToggleValidation = () => {
    const nextVal = !currentReport.valideParHierarchie;
    const today = new Date().toISOString().split('T')[0];
    const updated = rapports.map((r) => {
      if (r.moisIndex !== currentReport.moisIndex) return r;
      const { dateValidation: _removed, ...rest } = r;
      return {
        ...rest,
        valideParHierarchie: nextVal,
        ...(nextVal ? { dateValidation: today } : {}),
      };
    });
    onUpdateRapports(updated);
    const { dateValidation: _removedForm, ...restForm } = formData;
    setFormData({
      ...restForm,
      valideParHierarchie: nextVal,
      ...(nextVal ? { dateValidation: today } : {}),
    });
    notify(
      nextVal
        ? `Rapport de ${currentReport.nomMois} validé par le RSI.`
        : `Validation retirée pour ${currentReport.nomMois}.`
    );
  };

  const handleDownloadMonthlyPdf = (moisIndex: number) => {
    const rep = rapports.find((r) => r.moisIndex === moisIndex);
    generateMonthlyPdf(data, moisIndex);
    notify(
      `Cahier de suivi mensuel (${rep?.nomMois || `Mois ${moisIndex}`}) téléchargé en PDF.`
    );
  };

  const handleDownloadMonthlyDocx = async (moisIndex: number) => {
    const rep = rapports.find((r) => r.moisIndex === moisIndex);
    try {
      setIsExportingDocx(moisIndex);
      await generateMonthlyDocx(data, moisIndex);
      notify(
        `Cahier de suivi mensuel (${rep?.nomMois || `Mois ${moisIndex}`}) téléchargé en Word (.docx).`
      );
    } catch (err) {
      console.error('Erreur export Word mensuel:', err);
      notify('Erreur lors de la génération du cahier mensuel Word.');
    } finally {
      setIsExportingDocx(null);
    }
  };

  const openDeliveryModal = (moisIndex: number) => {
    const rep = rapports.find((r) => r.moisIndex === moisIndex);
    setDeliveryModalMonth(moisIndex);
    setDeliveryMode(rep?.modeLivraison || 'PDF (.pdf)');
    setDeliveryRecipient(
      rep?.destinataireLivraison ||
        data.generalInfo.responsableHierarchique ||
        "Responsable des Systèmes d'Information (RSI)"
    );
    setDeliveryDate(
      rep?.dateLivraison || new Date().toISOString().split('T')[0]
    );
    setDeliveryNote(rep?.noteLivraison || '');
    setAutoDownloadOnDeliver(true);
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deliveryModalMonth === null) return;

    const targetMonth = deliveryModalMonth;
    const targetReport = rapports.find((r) => r.moisIndex === targetMonth);
    if (!targetReport) return;

    const snap = getMonthlyActivitySnapshot(data, targetMonth);

    // Mettre à jour le statut de livraison et synchroniser les compteurs si encore à 0
    const { noteLivraison: _removedNote, ...restTarget } = targetReport;
    const trimmedNote = deliveryNote.trim();
    const nextReport: RapportMensuel = {
      ...restTarget,
      totalInterventions:
        targetReport.totalInterventions > 0
          ? targetReport.totalInterventions
          : snap.interventions.length,
      incidentsResolus:
        targetReport.incidentsResolus > 0
          ? targetReport.incidentsResolus
          : snap.interventionsTerminees,
      incidentsEnCours:
        targetReport.incidentsEnCours > 0
          ? targetReport.incidentsEnCours
          : snap.interventionsEnCours,
      statutLivraison: 'Livré',
      dateLivraison: deliveryDate,
      destinataireLivraison: deliveryRecipient,
      modeLivraison: deliveryMode,
      ...(trimmedNote ? { noteLivraison: trimmedNote } : {}),
    };

    const nextDataSnapshot: CahierSuiviData = {
      ...data,
      rapportsMensuels: rapports.map((r) =>
        r.moisIndex === targetMonth ? nextReport : r
      ),
    };

    if (autoDownloadOnDeliver) {
      if (deliveryMode === 'PDF (.pdf)' || deliveryMode === 'PDF & Word') {
        generateMonthlyPdf(nextDataSnapshot, targetMonth);
      }
      if (deliveryMode === 'Word (.docx)' || deliveryMode === 'PDF & Word') {
        await generateMonthlyDocx(nextDataSnapshot, targetMonth);
      }
    }

    onUpdateRapports(nextDataSnapshot.rapportsMensuels);
    setDeliveryModalMonth(null);
    notify(
      `Cahier de suivi de ${targetReport.nomMois} ${targetReport.annee} marqué comme livré (${deliveryMode}).`
    );
  };

  const handleResetDeliveryStatus = (moisIndex: number) => {
    const updated = rapports.map((r) => {
      if (r.moisIndex !== moisIndex) return r;
      const { dateLivraison: _dl, noteLivraison: _nl, ...rest } = r;
      return {
        ...rest,
        statutLivraison: 'Non livré' as const,
      };
    });
    onUpdateRapports(updated);
    setDeliveryModalMonth(null);
    notify('Statut de livraison réinitialisé.');
  };

  const modalTargetReport =
    deliveryModalMonth !== null
      ? rapports.find((r) => r.moisIndex === deliveryModalMonth)
      : null;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
              11
            </span>
            Rapports & Livraison des Cahiers Mensuels (12 Mois)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Établissez, exportez (PDF / Word) et livrez un cahier de suivi mensuel dédié pour chaque mois de l'année.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono tabular-nums font-semibold text-slate-600 mr-1">
            Livrés : {deliveredTotalCount} / {rapports.length}
          </span>
          <button
            type="button"
            onClick={handleGenerateMonthlyReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs whitespace-nowrap"
            title="Compiler un résumé filtré sur le mois en cours et télécharger le PDF mensuel"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Générer rapport mensuel</span>
          </button>
          <button
            type="button"
            onClick={handleSyncStatsFromMonth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition shadow-xs whitespace-nowrap"
            title="Calculer automatiquement les compteurs depuis les fiches d'intervention de ce mois"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Synchroniser le mois</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-xs whitespace-nowrap"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Annuler modification' : 'Modifier le rapport'}</span>
          </button>
        </div>
      </div>

      {/* Barre de navigation des 12 mois */}
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 bg-slate-100 p-2 rounded-xl border border-slate-200 text-xs">
        {rapports.map((rep) => {
          const isSelected = rep.moisIndex === selectedMonthIndex;
          const snap = getMonthlyActivitySnapshot(data, rep.moisIndex);
          const countDisplay = Math.max(
            rep.totalInterventions,
            snap.interventions.length
          );
          const isDelivered = rep.statutLivraison === 'Livré';

          return (
            <button
              key={rep.moisIndex}
              type="button"
              onClick={() => handleSelectMonth(rep.moisIndex)}
              className={`p-2 rounded-lg font-bold flex flex-col items-center justify-center gap-0.5 transition ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md'
                  : isDelivered
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200'
                  : 'bg-white hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider">
                {rep.nomMois.slice(0, 3)}
              </span>
              <span
                className={`text-[10px] font-mono tabular-nums font-semibold ${
                  isSelected
                    ? 'text-blue-100'
                    : isDelivered
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                {countDisplay} int.
              </span>
              <span
                className={`text-[9px] font-medium ${
                  isSelected
                    ? 'text-white/90'
                    : isDelivered
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                {isDelivered
                  ? 'Livré'
                  : rep.valideParHierarchie
                  ? 'Validé'
                  : 'À livrer'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Formulaire de modification */}
      {isEditing ? (
        <form
          onSubmit={handleSaveReport}
          className="bg-white rounded-2xl border-2 border-blue-400 p-6 shadow-md space-y-4 text-xs"
        >
          <h3 className="text-base font-bold text-blue-900 pb-2 border-b border-blue-100">
            Modifier le Rapport de {formData.nomMois} {formData.annee}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Total interventions
              </label>
              <input
                type="number"
                value={formData.totalInterventions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    totalInterventions: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Interventions terminées
              </label>
              <input
                type="number"
                value={formData.incidentsResolus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    incidentsResolus: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                En cours / ouvertes
              </label>
              <input
                type="number"
                value={formData.incidentsEnCours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    incidentsEnCours: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Temps moyen résolution (min)
              </label>
              <input
                type="number"
                value={formData.dureeMoyenneResolutionMin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dureeMoyenneResolutionMin: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Travaux & Projets réalisés
            </label>
            <textarea
              rows={2}
              value={formData.travauxRealises}
              onChange={(e) =>
                setFormData({ ...formData, travauxRealises: e.target.value })
              }
              className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Maintenance effectuée
            </label>
            <textarea
              rows={2}
              value={formData.maintenanceEffectuee}
              onChange={(e) =>
                setFormData({ ...formData, maintenanceEffectuee: e.target.value })
              }
              className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Problèmes récurrents
              </label>
              <textarea
                rows={2}
                value={formData.problemesRecurrents}
                onChange={(e) =>
                  setFormData({ ...formData, problemesRecurrents: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Difficultés rencontrées
              </label>
              <textarea
                rows={2}
                value={formData.difficultesRencontrees}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    difficultesRencontrees: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Besoins matériels & logiciels
              </label>
              <input
                type="text"
                value={formData.besoinsMaterielsLogiciels}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    besoinsMaterielsLogiciels: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Recommandations du technicien
              </label>
              <input
                type="text"
                value={formData.recommandationsTechnicien}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recommandationsTechnicien: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Activités prévues pour le mois suivant (M+1)
            </label>
            <input
              type="text"
              value={formData.activitesMoisSuivant}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  activitesMoisSuivant: e.target.value,
                })
              }
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

      {/* Fiche de rapport & livraison du mois sélectionné */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* En-tête du rapport + Actions de livraison mensuelle */}
        <div className="bg-slate-900 text-white p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800">
          <div>
            <div className="text-xs text-blue-300 font-medium flex flex-wrap items-center gap-2">
              <span>Direction des Systèmes d'Information</span>
              <span aria-hidden="true">·</span>
              <span>Cahier de Suivi Mensuel</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  currentReport.statutLivraison === 'Livré'
                    ? 'text-emerald-400 font-semibold'
                    : 'text-amber-300 font-semibold'
                }
              >
                {currentReport.statutLivraison === 'Livré'
                  ? `Livré le ${currentReport.dateLivraison}`
                  : 'Non encore livré'}
              </span>
            </div>
            <h3 className="text-2xl font-extrabold text-white mt-1">
              {currentReport.nomMois.toUpperCase()} {currentReport.annee}
            </h3>
            {currentReport.statutLivraison === 'Livré' && (
              <p className="text-[11px] text-slate-300 mt-1">
                Remis à <strong className="text-white">{currentReport.destinataireLivraison}</strong> ({currentReport.modeLivraison})
                {currentReport.noteLivraison ? ` — « ${currentReport.noteLivraison} »` : ''}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadMonthlyPdf(currentReport.moisIndex)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-medium transition whitespace-nowrap"
              title="Télécharger le cahier mensuel au format PDF"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>PDF Mensuel</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadMonthlyDocx(currentReport.moisIndex)}
              disabled={isExportingDocx === currentReport.moisIndex}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-medium transition whitespace-nowrap disabled:opacity-60"
              title="Télécharger le cahier mensuel au format Word (.docx)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {isExportingDocx === currentReport.moisIndex ? 'Génération...' : 'Word (.docx)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openDeliveryModal(currentReport.moisIndex)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {currentReport.statutLivraison === 'Livré'
                  ? 'Re-livrer ce mois'
                  : 'Livrer le cahier mensuel'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleValidation}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                currentReport.valideParHierarchie
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {currentReport.valideParHierarchie
                  ? `Validé RSI (${currentReport.dateValidation})`
                  : 'Visa RSI'}
              </span>
            </button>
          </div>
        </div>

        {/* Bandeau d'activités terrain compilées automatiquement pour ce mois */}
        <div className="px-6 py-3 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-950">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">
              Données compilées pour {currentReport.nomMois} {currentReport.annee} :
            </span>
            <span className="font-mono tabular-nums text-blue-800">
              {monthSnapshot.interventions.length} fiche(s) d'intervention ({monthSnapshot.interventionsTerminees} terminée(s))
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-blue-800">
              {monthSnapshot.taches.length} tâche(s) journal
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-blue-800">
              {monthSnapshot.maintenances.length} contrôle(s) maintenance
            </span>
          </div>
        </div>

        {/* Métriques clés */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 block font-medium">
              Interventions
            </span>
            <strong className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              {Math.max(
                currentReport.totalInterventions,
                monthSnapshot.interventions.length
              )}
            </strong>
            <span className="text-[11px] text-slate-500 block">
              tickets sur le mois
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 block font-medium">
              Terminées / En cours
            </span>
            <strong className="text-2xl font-black text-emerald-600 font-mono tabular-nums">
              {Math.max(
                currentReport.incidentsResolus,
                monthSnapshot.interventionsTerminees
              )}
            </strong>
            <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
              {Math.max(
                currentReport.incidentsEnCours,
                monthSnapshot.interventionsEnCours
              )}{' '}
              en cours
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 block font-medium">
              Taux 1er Contact
            </span>
            <strong className="text-2xl font-black text-blue-600 font-mono tabular-nums">
              {currentReport.tauxResolutionFCR}%
            </strong>
            <span className="text-[11px] text-slate-500 block">
              résolution directe (FCR)
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 block font-medium">
              Délai Moyen (MTTR)
            </span>
            <strong className="text-2xl font-black text-indigo-600 font-mono tabular-nums">
              {currentReport.dureeMoyenneResolutionMin ||
                monthSnapshot.avgInterventionMinutes}
              m
            </strong>
            <span className="text-[11px] text-slate-500 block">
              temps de traitement
            </span>
          </div>
        </div>

        {/* Contenu détaillé du rapport */}
        <div className="p-6 space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <strong className="text-blue-900 font-bold block text-sm">
                1. Travaux & Projets réalisés durant le mois
              </strong>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed min-h-[70px]">
                {currentReport.travauxRealises || (
                  <span className="text-slate-400 italic">
                    Non renseigné — cliquez sur « Modifier le rapport » pour compléter.
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <strong className="text-blue-900 font-bold block text-sm">
                2. Maintenance préventive effectuée
              </strong>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed min-h-[70px]">
                {currentReport.maintenanceEffectuee || (
                  <span className="text-slate-400 italic">
                    Non renseigné — cliquez sur « Modifier le rapport » pour compléter.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <strong className="text-amber-900 font-bold block text-sm">
                3. Problèmes récurrents identifiés
              </strong>
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 text-slate-800 leading-relaxed min-h-[60px]">
                {currentReport.problemesRecurrents || (
                  <span className="text-slate-400 italic">Aucun signalement enregistré.</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <strong className="text-slate-900 font-bold block text-sm">
                4. Difficultés techniques ou organisationnelles
              </strong>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed min-h-[60px]">
                {currentReport.difficultesRencontrees || (
                  <span className="text-slate-400 italic">Aucune difficulté signalée.</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <strong className="text-blue-900 font-bold block text-sm">
                5. Besoins matériels & logiciels
              </strong>
              <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-200 text-slate-800 leading-relaxed min-h-[50px]">
                {currentReport.besoinsMaterielsLogiciels || (
                  <span className="text-slate-400 italic">Aucun besoin identifié.</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <strong className="text-blue-900 font-bold block text-sm">
                6. Recommandations à la hiérarchie
              </strong>
              <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-200 text-slate-800 leading-relaxed min-h-[50px]">
                {currentReport.recommandationsTechnicien || (
                  <span className="text-slate-400 italic">Aucune recommandation ajoutée.</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <strong className="text-slate-900 font-bold text-sm flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4 text-blue-600" />
              7. Activités et priorités programmées pour le mois suivant
            </strong>
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 text-slate-800 font-medium leading-relaxed">
              {currentReport.activitesMoisSuivant || (
                <span className="text-slate-400 italic font-normal">
                  Priorités du mois suivant non renseignées.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau récapitulatif : Livraison des Cahiers de Suivi Mensuels sur les 12 Mois */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-blue-600" />
              <span>Registre de Livraison des Cahiers Mensuels (Janvier – Décembre)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Exportez ou livrez officiellement le cahier de suivi mensuel pour n'importe quel mois de l'exercice.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 font-semibold">Mois</th>
                  <th className="p-3 font-semibold">Activité consolidée</th>
                  <th className="p-3 font-semibold">Statut de livraison</th>
                  <th className="p-3 font-semibold">Validation RSI</th>
                  <th className="p-3 font-semibold text-right">Livrer / Exporter le mois</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {allMonthsSnapshots.map(({ rapport: rep, snapshot: snap }) => {
                  const isDelivered = rep.statutLivraison === 'Livré';
                  const intTotal = Math.max(
                    rep.totalInterventions,
                    snap.interventions.length
                  );
                  const intDone = Math.max(
                    rep.incidentsResolus,
                    snap.interventionsTerminees
                  );

                  return (
                    <tr
                      key={rep.moisIndex}
                      className={`hover:bg-slate-50 transition ${
                        rep.moisIndex === selectedMonthIndex ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSelectMonth(rep.moisIndex)}
                          className="font-bold text-slate-900 hover:text-blue-600 transition text-left"
                        >
                          {rep.nomMois} {rep.annee}
                        </button>
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono tabular-nums text-[11px]">
                        <span className="font-semibold text-slate-900">
                          {intDone}/{intTotal}
                        </span>{' '}
                        <span className="text-slate-500 font-sans">
                          interv. terminées
                        </span>
                        <span className="text-slate-300 mx-1.5">·</span>
                        <span className="text-slate-600 font-sans">
                          {snap.taches.length} tâche(s)
                        </span>
                      </td>
                      <td className="p-3 text-[11px]">
                        {isDelivered ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Livré le {rep.dateLivraison} ({rep.modeLivraison || 'PDF'})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span>En attente de livraison</span>
                          </div>
                        )}
                        {rep.destinataireLivraison && isDelivered && (
                          <span className="text-[10px] text-slate-500 block pl-5">
                            Dest. : {rep.destinataireLivraison}
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-[11px]">
                        {rep.valideParHierarchie ? (
                          <span className="text-emerald-700 font-semibold">
                            Validé ({rep.dateValidation})
                          </span>
                        ) : (
                          <span className="text-slate-400">Non visé</span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadMonthlyPdf(rep.moisIndex)}
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium transition"
                            title={`Télécharger le cahier de ${rep.nomMois} en PDF`}
                          >
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadMonthlyDocx(rep.moisIndex)}
                            disabled={isExportingDocx === rep.moisIndex}
                            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium transition disabled:opacity-50"
                            title={`Télécharger le cahier de ${rep.nomMois} en Word`}
                          >
                            {isExportingDocx === rep.moisIndex ? '...' : 'Word'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeliveryModal(rep.moisIndex)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition ${
                              isDelivered
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <Send className="w-3 h-3" />
                            <span>{isDelivered ? 'Re-livrer' : 'Livrer'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de livraison du cahier mensuel */}
      {deliveryModalMonth !== null && modalTargetReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4 text-blue-400" />
                <div>
                  <h4 className="text-sm font-bold">
                    Livrer le Cahier Mensuel — {modalTargetReport.nomMois} {modalTargetReport.annee}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Génération du livrable mensuel et enregistrement officiel de la remise.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeliveryModalMonth(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelivery} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Format / Mode de livraison
                  </label>
                  <select
                    value={deliveryMode}
                    onChange={(e) =>
                      setDeliveryMode(
                        e.target.value as RapportMensuel['modeLivraison']
                      )
                    }
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  >
                    <option value="PDF (.pdf)">PDF (.pdf)</option>
                    <option value="Word (.docx)">Word (.docx)</option>
                    <option value="PDF & Word">PDF & Word</option>
                    <option value="Remise directe / Email">Remise directe / Email</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Date de livraison
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Destinataire (RSI / Direction)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: M. le Responsable des Systèmes d'Information"
                  value={deliveryRecipient}
                  onChange={(e) => setDeliveryRecipient(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Observation / Commentaire de remise (optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Transmis par mail avec synthèse des maintenances préventives et demandes d'achat..."
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 text-slate-900"
                />
              </div>

              {(deliveryMode === 'PDF (.pdf)' ||
                deliveryMode === 'Word (.docx)' ||
                deliveryMode === 'PDF & Word') && (
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={autoDownloadOnDeliver}
                    onChange={(e) => setAutoDownloadOnDeliver(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Télécharger automatiquement le cahier mensuel ({deliveryMode}) lors de la validation
                  </span>
                </label>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div>
                  {modalTargetReport.statutLivraison === 'Livré' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleResetDeliveryStatus(modalTargetReport.moisIndex)
                      }
                      className="text-red-600 hover:underline font-medium"
                    >
                      Annuler le statut livré
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryModalMonth(null)}
                    className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirmer et livrer</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
