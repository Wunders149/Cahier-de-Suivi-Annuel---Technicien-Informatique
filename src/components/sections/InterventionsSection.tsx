import React, { useState, useEffect } from 'react';
import {
  FicheIntervention,
  GeneralInfo,
  InterventionEquipementDetail,
  NatureIntervention,
} from '../../types/it-tracker';
import {
  Plus,
  Wrench,
  Search,
  Check,
  UserCheck,
  Download,
  FileText,
  Edit3,
  Trash2,
  X,
  Layers,
  Clock,
  User,
  Cpu,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import {
  combineDurationToMinutes,
  formatDuration,
  splitDurationMinutes,
} from '../../utils/durationFormatter';
import {
  formatInterventionStatusLabel,
  getInterventionVocabulary,
} from '../../utils/interventionLabels';

interface InterventionsSectionProps {
  interventions: FicheIntervention[];
  onUpdateInterventions: (interventions: FicheIntervention[]) => void;
  generalInfo?: GeneralInfo;
  onShowToast?: (msg: string) => void;
}

const NATURE_OPTIONS: NatureIntervention[] = [
  'Incident / Dépannage',
  'Déploiement / Installation',
  'Maintenance / Contrôle',
];

const DEFAULT_NEW_TICKET = (): Partial<FicheIntervention> => ({
  dateReception: new Date().toISOString().split('T')[0],
  heureReception: '10:00',
  nomDemandeur: '',
  serviceDemandeur: '',
  equipementConcerne: '',
  natureIntervention: 'Incident / Dépannage',
  typeIntervention: 'Matériel',
  priorite: 'Normale',
  domaineTitre: '',
  titreRapport: '',
  descriptionPanne: '',
  diagnosticTechnique: '',
  causeIdentifiee: '',
  analyseCauseRacine: '',
  solutionAppliquee: '',
  materielLogicielUtilise: '',
  recommandations: '',
  tempsConsacreMin: 30,
  resultat: 'Résolu',
  validationDemandeur: true,
  commentairesDemandeur: '',
  detailEquipements: [],
});

export const InterventionsSection: React.FC<InterventionsSectionProps> = ({
  interventions,
  onUpdateInterventions,
  generalInfo,
  onShowToast,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    interventions[0]?.id || null
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const [formTicket, setFormTicket] = useState<Partial<FicheIntervention>>(
    DEFAULT_NEW_TICKET
  );

  const selectedIntervention =
    interventions.find((it) => it.id === selectedId) || interventions[0] || null;

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormTicket(DEFAULT_NEW_TICKET());
    setShowModal(true);
  };

  const openEditModal = (it: FicheIntervention) => {
    setEditingId(it.id);
    setFormTicket({
      ...it,
      detailEquipements: (it.detailEquipements || []).map((eq) => ({
        ...eq,
        actionsCorrectives: [...(eq.actionsCorrectives || [])],
      })),
    });
    setShowModal(true);
  };

  const handleAddEquipementRow = () => {
    const current = formTicket.detailEquipements || [];
    const nextRow: InterventionEquipementDetail = {
      id: `EQ-${Date.now()}-${current.length + 1}`,
      equipement: '',
      titre: '',
      constatDiagnostic: '',
      actionsCorrectives: [''],
      operationsResume: '',
      materielSpecifique: '',
      statut: 'Résolu',
      resultatDetail: '',
    };
    setFormTicket({
      ...formTicket,
      detailEquipements: [...current, nextRow],
    });
  };

  const handleUpdateEquipementRow = (
    eqId: string,
    patch: Partial<InterventionEquipementDetail>
  ) => {
    const current = formTicket.detailEquipements || [];
    setFormTicket({
      ...formTicket,
      detailEquipements: current.map((row) =>
        row.id === eqId ? { ...row, ...patch } : row
      ),
    });
  };

  const handleRemoveEquipementRow = (eqId: string) => {
    const current = formTicket.detailEquipements || [];
    setFormTicket({
      ...formTicket,
      detailEquipements: current.filter((row) => row.id !== eqId),
    });
  };

  const handleSaveTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTicket.nomDemandeur?.trim() || !formTicket.descriptionPanne?.trim()) {
      return;
    }

    const cleanedDetails: InterventionEquipementDetail[] = (
      formTicket.detailEquipements || []
    )
      .filter((d) => d.equipement.trim() || d.titre.trim() || d.constatDiagnostic.trim())
      .map((d) => {
        const trimmedOps = d.operationsResume?.trim();
        const trimmedRes = d.resultatDetail?.trim();
        return {
          id: d.id,
          equipement: d.equipement.trim() || 'Équipement',
          titre: d.titre.trim() || 'Intervention technique',
          constatDiagnostic: d.constatDiagnostic.trim(),
          actionsCorrectives: (d.actionsCorrectives || [])
            .map((a) => a.trim())
            .filter(Boolean),
          materielSpecifique: d.materielSpecifique.trim(),
          statut: d.statut || 'Résolu',
          ...(trimmedOps ? { operationsResume: trimmedOps } : {}),
          ...(trimmedRes ? { resultatDetail: trimmedRes } : {}),
        };
      });

    const refYear = generalInfo?.anneeReference || new Date().getFullYear();
    const maxExistingNum = interventions.reduce((max, it) => {
      const match = it.numeroReference?.match(/INT-\d+-(\d+)/i);
      const parsed = match ? parseInt(match[1], 10) : 0;
      return Number.isFinite(parsed) && parsed > max ? parsed : max;
    }, 0);
    const numIndex = Math.max(interventions.length + 1, maxExistingNum + 1);
    const defaultRef = `INT-${refYear}-${String(numIndex).padStart(3, '0')}`;

    const existing = editingId
      ? interventions.find((it) => it.id === editingId)
      : undefined;

    const dateRec =
      formTicket.dateReception || new Date().toISOString().split('T')[0];
    const heureRec = formTicket.heureReception || '10:00';
    const isValidated = Boolean(formTicket.validationDemandeur);

    const domaineTrimmed = formTicket.domaineTitre?.trim();
    const titreTrimmed = formTicket.titreRapport?.trim();
    const analyseTrimmed = formTicket.analyseCauseRacine?.trim();
    const recommandationsTrimmed = formTicket.recommandations?.trim();
    const commentTrimmed = formTicket.commentairesDemandeur?.trim();
    const validDate = existing?.dateValidation || `${dateRec} ${heureRec}`;
    const nature = formTicket.natureIntervention || 'Incident / Dépannage';
    const saveVocab = getInterventionVocabulary(nature);

    const item: FicheIntervention = {
      id: existing?.id || `INT-${Date.now()}`,
      numeroReference: existing?.numeroReference || defaultRef,
      dateReception: dateRec,
      heureReception: heureRec,
      nomDemandeur: formTicket.nomDemandeur.trim(),
      serviceDemandeur: formTicket.serviceDemandeur?.trim() || 'Général',
      equipementConcerne:
        formTicket.equipementConcerne?.trim() || 'Poste de travail',
      natureIntervention: nature,
      typeIntervention:
        (formTicket.typeIntervention as FicheIntervention['typeIntervention']) ||
        'Matériel',
      priorite:
        (formTicket.priorite as FicheIntervention['priorite']) || 'Normale',
      descriptionPanne: formTicket.descriptionPanne.trim(),
      diagnosticTechnique:
        formTicket.diagnosticTechnique?.trim() || saveVocab.defaultDiagnostic,
      causeIdentifiee:
        formTicket.causeIdentifiee?.trim() || saveVocab.defaultCause,
      solutionAppliquee:
        formTicket.solutionAppliquee?.trim() || saveVocab.defaultSolution,
      materielLogicielUtilise:
        formTicket.materielLogicielUtilise?.trim() || 'Outillage standard',
      tempsConsacreMin: Math.max(0, Number(formTicket.tempsConsacreMin ?? 30) || 0),
      resultat:
        (formTicket.resultat as FicheIntervention['resultat']) || 'Résolu',
      validationDemandeur: isValidated,
      ...(isValidated ? { dateValidation: validDate } : {}),
      ...(commentTrimmed ? { commentairesDemandeur: commentTrimmed } : {}),
      ...(domaineTrimmed ? { domaineTitre: domaineTrimmed } : {}),
      ...(titreTrimmed ? { titreRapport: titreTrimmed } : {}),
      ...(analyseTrimmed ? { analyseCauseRacine: analyseTrimmed } : {}),
      ...(recommandationsTrimmed ? { recommandations: recommandationsTrimmed } : {}),
      ...(cleanedDetails.length > 0 ? { detailEquipements: cleanedDetails } : {}),
    };

    const updated = editingId
      ? interventions.map((it) => (it.id === editingId ? item : it))
      : [item, ...interventions];

    onUpdateInterventions(updated);
    setSelectedId(item.id);
    setShowModal(false);
    setEditingId(null);
    notify(
      editingId
        ? `Fiche ${item.numeroReference} mise à jour.`
        : `Fiche ${item.numeroReference} enregistrée.`
    );
  };

  const handleDeleteTicket = (id: string) => {
    const updated = interventions.filter((it) => it.id !== id);
    onUpdateInterventions(updated);
    setConfirmDeleteId(null);
    if (selectedId === id) {
      setSelectedId(updated[0]?.id || null);
    }
    notify("Fiche d'intervention supprimée.");
  };

  const handleToggleValidation = (id: string) => {
    const nowStamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updated = interventions.map((it) => {
      if (it.id !== id) return it;
      const nextVal = !it.validationDemandeur;
      const { dateValidation: _removed, ...rest } = it;
      return {
        ...rest,
        validationDemandeur: nextVal,
        ...(nextVal ? { dateValidation: nowStamp } : {}),
      };
    });
    onUpdateInterventions(updated);
  };

  const handleExportPdfReport = async (it: FicheIntervention) => {
    try {
      const { generateInterventionReportPdf } = await import(
        '../../utils/interventionReportGenerator'
      );
      generateInterventionReportPdf(it, generalInfo);
      notify(`Rapport PDF (${it.numeroReference}) téléchargé.`);
    } catch (err) {
      console.error('Erreur export PDF intervention:', err);
      notify('Erreur lors de la génération du rapport PDF.');
    }
  };

  const handleExportDocxReport = async (it: FicheIntervention) => {
    try {
      setIsExportingDocx(true);
      const { generateInterventionReportDocx } = await import(
        '../../utils/interventionReportGenerator'
      );
      await generateInterventionReportDocx(it, generalInfo);
      notify(`Rapport Word (${it.numeroReference}) téléchargé.`);
    } catch (err) {
      console.error('Erreur export DOCX intervention:', err);
      notify('Erreur lors de la génération du rapport Word.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const filtered = interventions.filter(
    (i) =>
      i.numeroReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.nomDemandeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.serviceDemandeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.equipementConcerne.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.descriptionPanne.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
              4
            </span>
            Registre des Interventions Informatiques
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Fiches d'intervention détaillées, diagnostic technique, analyse cause racine et exports PDF / Word.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Fiche d'Intervention</span>
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° ticket, demandeur, service, équipement..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 shrink-0 font-medium px-1">
          {filtered.length} fiche(s)
        </div>
      </div>

      {/* Modal de création / édition de fiche */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                <span>
                  {editingId
                    ? `Modifier la Fiche ${formTicket.numeroReference}`
                    : "Nouvelle Fiche d'Intervention"}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveTicket}
              className="p-6 space-y-5 text-xs overflow-y-auto flex-1"
            >
              {(() => {
                const modalVocab = getInterventionVocabulary(
                  formTicket.natureIntervention
                );
                return (
                  <>
                    {/* Bloc 1 : Contexte & Identification */}
                    <div className="space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        1. Contexte & Identification
                      </div>

                      {/* Sélecteur de nature d'intervention */}
                      <div>
                        <label className="block font-medium text-slate-700 mb-1.5">
                          Nature de l'intervention
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {NATURE_OPTIONS.map((opt) => {
                            const active =
                              (formTicket.natureIntervention ||
                                'Incident / Dépannage') === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() =>
                                  setFormTicket({
                                    ...formTicket,
                                    natureIntervention: opt,
                                  })
                                }
                                className={`px-3 py-2 rounded-lg border text-left font-semibold transition ${
                                  active
                                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-400/50'
                                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Date de l'intervention
                          </label>
                          <input
                            type="date"
                            required
                            value={formTicket.dateReception || ''}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                dateReception: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Heure
                          </label>
                          <input
                            type="time"
                            required
                            value={formTicket.heureReception || '10:00'}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                heureReception: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Domaine / Type
                          </label>
                          <select
                            value={formTicket.typeIntervention || 'Matériel'}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                typeIntervention: e.target
                                  .value as FicheIntervention['typeIntervention'],
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="Matériel">Matériel</option>
                            <option value="Logiciel">Logiciel</option>
                            <option value="Réseau">Réseau</option>
                            <option value="Déploiement">Déploiement</option>
                            <option value="Systèmes / IoT">Systèmes / IoT</option>
                            <option value="Vidéosurveillance">Vidéosurveillance</option>
                            <option value="Infrastructure">Infrastructure</option>
                            <option value="Compte/Accès">Compte/Accès</option>
                            <option value="Téléphonie">Téléphonie</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Priorité
                          </label>
                          <select
                            value={formTicket.priorite || 'Normale'}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                priorite: e.target
                                  .value as FicheIntervention['priorite'],
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="Critique">Critique</option>
                            <option value="Haute">Haute</option>
                            <option value="Normale">Normale</option>
                            <option value="Basse">Basse</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Nom du demandeur *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Jean DUPONT, Direction Flotte..."
                            value={formTicket.nomDemandeur || ''}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                nomDemandeur: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Service / Département concerné
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Opérations Maritimes, Sûreté..."
                            value={formTicket.serviceDemandeur || ''}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                serviceDemandeur: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            {modalVocab.equipmentsRowLabel}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Navires FANJAVA 7 & 5, PC Portable..."
                            value={formTicket.equipementConcerne || ''}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                equipementConcerne: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Intitulé du domaine rapport (optionnel)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: GÉOLOCALISATION SATELLITE & SÉCURITÉ FLOTTE"
                            value={formTicket.domaineTitre || ''}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                domaineTitre: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Objet / Sous-titre du rapport (optionnel)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Installation des balises GPS SPOT Trace..."
                            value={formTicket.titreRapport || ''}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                titreRapport: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bloc 2 : Détails techniques, Étapes & Recommandations */}
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        2. {modalVocab.summaryHeading.replace(/^\d+\.\s*/, '')} & Réalisation
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          {modalVocab.descriptionLabel}
                        </label>
                        <textarea
                          rows={2}
                          required
                          placeholder={modalVocab.descriptionPlaceholder}
                          value={formTicket.descriptionPanne || ''}
                          onChange={(e) =>
                            setFormTicket({
                              ...formTicket,
                              descriptionPanne: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            {modalVocab.diagnosticLabel}
                          </label>
                          <textarea
                            rows={2}
                            placeholder={modalVocab.diagnosticPlaceholder}
                            value={formTicket.diagnosticTechnique || ''}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                diagnosticTechnique: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            {modalVocab.causeLabel}
                          </label>
                          <textarea
                            rows={2}
                            placeholder={modalVocab.causePlaceholder}
                            value={formTicket.causeIdentifiee || ''}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                causeIdentifiee: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          {modalVocab.solutionLabel}
                        </label>
                        <textarea
                          rows={2}
                          placeholder={modalVocab.solutionPlaceholder}
                          value={formTicket.solutionAppliquee || ''}
                          onChange={(e) =>
                            setFormTicket({
                              ...formTicket,
                              solutionAppliquee: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          {modalVocab.analysisFieldLabel}
                        </label>
                        <textarea
                          rows={3}
                          placeholder={modalVocab.analysisPlaceholder}
                          value={formTicket.analyseCauseRacine || ''}
                          onChange={(e) =>
                            setFormTicket({
                              ...formTicket,
                              analyseCauseRacine: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          {modalVocab.recommandationsTitle} (optionnel)
                        </label>
                        <textarea
                          rows={2}
                          placeholder={modalVocab.recommandationsPlaceholder}
                          value={formTicket.recommandations || ''}
                          onChange={(e) =>
                            setFormTicket({
                              ...formTicket,
                              recommandations: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-5">
                          <label className="block font-medium text-slate-700 mb-1">
                            {modalVocab.materialLabel}
                          </label>
                          <input
                            type="text"
                            placeholder={modalVocab.materialPlaceholder}
                            value={formTicket.materielLogicielUtilise || ''}
                            onChange={(e) =>
                              setFormTicket({
                                ...formTicket,
                                materielLogicielUtilise: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                  <div className="sm:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-medium text-slate-700">
                        Temps de résolution
                      </label>
                      <span className="text-[11px] font-mono font-semibold text-blue-700">
                        {formatDuration(formTicket.tempsConsacreMin ?? 30)}
                      </span>
                    </div>
                    {(() => {
                      const parts = splitDurationMinutes(
                        formTicket.tempsConsacreMin ?? 30
                      );
                      return (
                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              value={parts.days}
                              onChange={(e) => {
                                const nextDays = Math.max(
                                  0,
                                  parseInt(e.target.value, 10) || 0
                                );
                                setFormTicket({
                                  ...formTicket,
                                  tempsConsacreMin: combineDurationToMinutes(
                                    nextDays,
                                    parts.hours,
                                    parts.minutes
                                  ),
                                });
                              }}
                              aria-label="Jours"
                              className="w-full pl-2.5 pr-6 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <span className="absolute right-2 top-2 text-[11px] text-slate-400 pointer-events-none">
                              j
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={23}
                              value={parts.hours}
                              onChange={(e) => {
                                const nextHours = Math.max(
                                  0,
                                  parseInt(e.target.value, 10) || 0
                                );
                                setFormTicket({
                                  ...formTicket,
                                  tempsConsacreMin: combineDurationToMinutes(
                                    parts.days,
                                    nextHours,
                                    parts.minutes
                                  ),
                                });
                              }}
                              aria-label="Heures"
                              className="w-full pl-2.5 pr-6 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <span className="absolute right-2 top-2 text-[11px] text-slate-400 pointer-events-none">
                              h
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={59}
                              value={parts.minutes}
                              onChange={(e) => {
                                const nextMins = Math.max(
                                  0,
                                  parseInt(e.target.value, 10) || 0
                                );
                                setFormTicket({
                                  ...formTicket,
                                  tempsConsacreMin: combineDurationToMinutes(
                                    parts.days,
                                    parts.hours,
                                    nextMins
                                  ),
                                });
                              }}
                              aria-label="Minutes"
                              className="w-full pl-2.5 pr-8 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <span className="absolute right-2 top-2 text-[11px] text-slate-400 pointer-events-none">
                              min
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block font-medium text-slate-700 mb-1">
                      Statut / Résultat
                    </label>
                    <select
                      value={formTicket.resultat || 'Résolu'}
                      onChange={(e) =>
                        setFormTicket({
                          ...formTicket,
                          resultat: e.target.value as FicheIntervention['resultat'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Résolu">
                        {formTicket.natureIntervention ===
                        'Déploiement / Installation'
                          ? 'Opérationnel / Terminé'
                          : 'Résolu'}
                      </option>
                      <option value="En cours">En cours</option>
                      <option value="En attente pièce">En attente pièce</option>
                      <option value="Escaladé N3">Escaladé N3</option>
                      <option value="Non résolu">Non résolu</option>
                    </select>
                  </div>
                </div>
              </div>

                      {/* Bloc 3 : Détail par équipement / unité (Optionnel) */}
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-blue-600" />
                              <span>
                                {modalVocab.equipmentsHeading.replace(/^\d+\.\s*/, '')} (optionnel)
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              {modalVocab.equipmentsSubtitle}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddEquipementRow}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold transition"
                          >
                            <Plus className="w-3.5 h-3.5 text-blue-600" />
                            <span>Ajouter une unité / équipement</span>
                          </button>
                        </div>

                        {(formTicket.detailEquipements || []).map((eq, idx) => (
                          <div
                            key={eq.id}
                            className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-blue-600 p-3.5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-blue-900">
                                {modalVocab.equipmentItemPrefix} #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveEquipementRow(eq.id)}
                                className="text-red-600 hover:text-red-700 text-[11px] font-medium inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Retirer</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                placeholder="Ex: Navire FANJAVA 7, Caméra 01..."
                                value={eq.equipement}
                                onChange={(e) =>
                                  handleUpdateEquipementRow(eq.id, {
                                    equipement: e.target.value,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900 font-semibold"
                              />
                              <input
                                type="text"
                                placeholder="Équipement installé / Objet sur cette unité"
                                value={eq.titre}
                                onChange={(e) =>
                                  handleUpdateEquipementRow(eq.id, { titre: e.target.value })
                                }
                                className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900"
                              />
                            </div>

                            <textarea
                              rows={2}
                              placeholder={modalVocab.equipmentDiagPlaceholder}
                              value={eq.constatDiagnostic}
                              onChange={(e) =>
                                handleUpdateEquipementRow(eq.id, {
                                  constatDiagnostic: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900"
                            />

                            <textarea
                              rows={2}
                              placeholder={modalVocab.equipmentActionsPlaceholder}
                              value={(eq.actionsCorrectives || []).join('\n')}
                              onChange={(e) =>
                                handleUpdateEquipementRow(eq.id, {
                                  actionsCorrectives: e.target.value.split('\n'),
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                placeholder="Résumé opérations (tableau)"
                                value={eq.operationsResume || ''}
                                onChange={(e) =>
                                  handleUpdateEquipementRow(eq.id, {
                                    operationsResume: e.target.value,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900"
                              />
                              <input
                                type="text"
                                placeholder={modalVocab.comparisonMatCol}
                                value={eq.materielSpecifique}
                                onChange={(e) =>
                                  handleUpdateEquipementRow(eq.id, {
                                    materielSpecifique: e.target.value,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900"
                              />
                              <select
                                value={eq.statut}
                                onChange={(e) =>
                                  handleUpdateEquipementRow(eq.id, {
                                    statut: e.target
                                      .value as InterventionEquipementDetail['statut'],
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900"
                              >
                                <option value="Résolu">
                                  {formTicket.natureIntervention ===
                                  'Déploiement / Installation'
                                    ? 'Opérationnel / Validé'
                                    : 'Résolu'}
                                </option>
                                <option value="En cours">En cours</option>
                                <option value="En attente pièce">En attente pièce</option>
                                <option value="Escaladé N3">Escaladé N3</option>
                                <option value="Non résolu">Non résolu</option>
                              </select>
                            </div>

                            <input
                              type="text"
                              placeholder="Résultat des tests / validation sur cette unité"
                              value={eq.resultatDetail || ''}
                              onChange={(e) =>
                                handleUpdateEquipementRow(eq.id, {
                                  resultatDetail: e.target.value,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-900"
                            />
                          </div>
                        ))}
                      </div>
                  </>
                );
              })()}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  {editingId
                    ? 'Enregistrer les modifications'
                    : 'Créer la fiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disposition principale : Liste à gauche + Fiche agréable à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Liste des fiches (gauche) */}
        <div className="lg:col-span-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2.5">
              <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs text-slate-700 font-semibold">
                {interventions.length === 0
                  ? "Aucune fiche d'intervention enregistrée."
                  : 'Aucune intervention ne correspond à votre recherche.'}
              </div>
              <p className="text-[11px] text-slate-400">
                {interventions.length === 0
                  ? "Cliquez sur « Nouvelle Fiche d'Intervention » pour commencer."
                  : 'Essayez un autre mot-clé.'}
              </p>
            </div>
          ) : (
            filtered.map((it) => {
              const isSelected = selectedIntervention?.id === it.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(it.id);
                    setConfirmDeleteId(null);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition text-xs space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-400/50'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono tabular-nums font-bold text-blue-800 text-[11px]">
                      {it.numeroReference}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        it.resultat === 'Résolu'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {formatInterventionStatusLabel(it.resultat, it.natureIntervention)}
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 truncate text-[13px]">
                    {it.equipementConcerne}
                  </div>

                  <div className="text-slate-500 text-[11px] truncate">
                    {it.nomDemandeur} · {it.serviceDemandeur}
                  </div>

                  <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">
                    {it.titreRapport || it.descriptionPanne}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono tabular-nums">
                    <span>{it.dateReception}</span>
                    <span className="flex items-center gap-2">
                      <span>{formatDuration(it.tempsConsacreMin)}</span>
                      <span
                        className={`font-sans font-semibold ${
                          it.priorite === 'Critique'
                            ? 'text-red-600'
                            : it.priorite === 'Haute'
                            ? 'text-amber-600'
                            : 'text-slate-500'
                        }`}
                      >
                        · {it.priorite}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Fiche d'intervention détaillée (droite) */}
        <div className="lg:col-span-8">
          {selectedIntervention ? (() => {
            const viewVocab = getInterventionVocabulary(
              selectedIntervention.natureIntervention
            );
            const statusDisplay = formatInterventionStatusLabel(
              selectedIntervention.resultat,
              selectedIntervention.natureIntervention
            );

            return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Bandeau d'accent supérieur */}
              <div className="h-1.5 bg-gradient-to-r from-blue-700 via-sky-500 to-emerald-500" />

              {/* En-tête épuré et lisible */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/60 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="font-bold uppercase tracking-wider text-sky-700">
                        {selectedIntervention.domaineTitre ||
                          selectedIntervention.typeIntervention}
                      </span>
                      {selectedIntervention.natureIntervention &&
                        selectedIntervention.natureIntervention !==
                          'Incident / Dépannage' && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="font-semibold text-blue-700">
                              {selectedIntervention.natureIntervention}
                            </span>
                          </>
                        )}
                      <span className="text-slate-300">·</span>
                      <span className="font-mono font-semibold text-slate-600">
                        {selectedIntervention.numeroReference}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">
                        {selectedIntervention.dateReception} à{' '}
                        {selectedIntervention.heureReception}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                      {selectedIntervention.titreRapport ||
                        `Intervention — ${selectedIntervention.equipementConcerne}`}
                    </h3>
                  </div>

                  {/* Statut & Priorité */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        selectedIntervention.resultat === 'Résolu'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {statusDisplay}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        selectedIntervention.priorite === 'Critique'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : selectedIntervention.priorite === 'Haute'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      Priorité {selectedIntervention.priorite}
                    </span>
                  </div>
                </div>

                {/* Barre d'actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/80 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportPdfReport(selectedIntervention)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exporter PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportDocxReport(selectedIntervention)}
                      disabled={isExportingDocx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs transition disabled:opacity-60"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>
                        {isExportingDocx ? 'Génération...' : 'Exporter Word'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedIntervention)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                    {confirmDeleteId === selectedIntervention.id ? (
                      <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteTicket(selectedIntervention.id)
                          }
                          className="text-red-700 hover:text-red-900 font-bold"
                        >
                          Confirmer
                        </button>
                        <span className="text-red-200">|</span>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDeleteId(selectedIntervention.id)
                        }
                        className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-300 transition"
                        title="Supprimer cette fiche"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Corps de la fiche */}
              <div className="p-6 space-y-6 text-xs">
                {/* 3 Tuiles de repère rapide */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block">
                        Demandeur
                      </span>
                      <strong className="text-slate-900 block truncate">
                        {selectedIntervention.nomDemandeur}
                      </strong>
                      <span className="text-[11px] text-slate-600 block truncate">
                        {selectedIntervention.serviceDemandeur}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block">
                        {viewVocab.equipmentsRowLabel}
                      </span>
                      <strong className="text-slate-900 block">
                        {selectedIntervention.equipementConcerne}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">
                        Temps consacré
                      </span>
                      <strong className="text-slate-900 text-sm font-mono tabular-nums block">
                        {formatDuration(selectedIntervention.tempsConsacreMin)}
                      </strong>
                      <span className="text-[11px] text-slate-500 block">
                        {selectedIntervention.typeIntervention}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Synthèse / Objet & Solution / Travaux côte à côte */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`rounded-xl border p-4 space-y-1.5 ${
                      selectedIntervention.natureIntervention ===
                      'Déploiement / Installation'
                        ? 'border-sky-200/80 bg-sky-50/40'
                        : 'border-rose-200/80 bg-rose-50/40'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1.5 font-bold ${
                        selectedIntervention.natureIntervention ===
                        'Déploiement / Installation'
                          ? 'text-sky-900'
                          : 'text-rose-900'
                      }`}
                    >
                      <AlertCircle
                        className={`w-4 h-4 ${
                          selectedIntervention.natureIntervention ===
                          'Déploiement / Installation'
                            ? 'text-sky-600'
                            : 'text-rose-600'
                        }`}
                      />
                      <span>{viewVocab.descriptionCardTitle}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedIntervention.descriptionPanne}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{viewVocab.solutionCardTitle}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedIntervention.solutionAppliquee}
                    </p>
                  </div>
                </div>

                {/* Diagnostic / Préparation, Contexte & Matériel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4 space-y-1.5 bg-white">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {viewVocab.diagnosticLabel}
                    </span>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedIntervention.diagnosticTechnique}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 space-y-1.5 bg-white">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {viewVocab.causeLabel}
                    </span>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedIntervention.causeIdentifiee}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 space-y-1.5 bg-white">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      {viewVocab.materialLabel}
                    </span>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedIntervention.materielLogicielUtilise}
                    </p>
                  </div>
                </div>

                {/* Analyse Technique / Étapes Techniques Réalisées (si renseignée) */}
                {selectedIntervention.analyseCauseRacine && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {viewVocab.analysisHeading.replace(/^\d+\.\s*/, '')}
                    </h4>
                    <div className="text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {selectedIntervention.analyseCauseRacine}
                    </div>
                  </div>
                )}

                {/* Détail par Équipement / Unité (si présent) */}
                {selectedIntervention.detailEquipements &&
                  selectedIntervention.detailEquipements.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-900">
                        {viewVocab.equipmentsHeading.replace(/^\d+\.\s*/, '')} (
                        {selectedIntervention.detailEquipements.length})
                      </h4>

                      <div className="space-y-3">
                        {selectedIntervention.detailEquipements.map((eq, idx) => (
                          <div
                            key={eq.id}
                            className="rounded-xl border border-slate-200 border-l-4 border-l-sky-600 p-4 bg-white space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h5 className="font-bold text-sky-900 text-xs">
                                {idx + 1}. {eq.equipement} — {eq.titre}
                              </h5>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  eq.statut === 'Résolu'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {formatInterventionStatusLabel(
                                  eq.statut,
                                  selectedIntervention.natureIntervention
                                )}
                              </span>
                            </div>

                            {eq.constatDiagnostic && (
                              <p className="text-slate-700 leading-relaxed">
                                <strong className="text-slate-900">
                                  {viewVocab.equipmentDiagLabel} :
                                </strong>{' '}
                                {eq.constatDiagnostic}
                              </p>
                            )}

                            {eq.actionsCorrectives &&
                              eq.actionsCorrectives.length > 0 && (
                                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                                  {eq.actionsCorrectives.map((act, aIdx) => (
                                    <li key={aIdx}>{act}</li>
                                  ))}
                                </ul>
                              )}

                            {(eq.materielSpecifique || eq.resultatDetail) && (
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                                {eq.materielSpecifique && (
                                  <span>
                                    <strong className="text-slate-800">
                                      {viewVocab.comparisonMatCol} :
                                    </strong>{' '}
                                    {eq.materielSpecifique}
                                  </span>
                                )}
                                {eq.resultatDetail && (
                                  <span className="font-semibold text-emerald-700">
                                    {eq.resultatDetail}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Récapitulatif comparatif */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-900 text-white">
                              <th className="p-2.5 font-semibold">
                                {viewVocab.comparisonEquipCol}
                              </th>
                              <th className="p-2.5 font-semibold">
                                {viewVocab.comparisonDiagCol}
                              </th>
                              <th className="p-2.5 font-semibold">
                                {viewVocab.comparisonOpsCol}
                              </th>
                              <th className="p-2.5 font-semibold">
                                {viewVocab.comparisonMatCol}
                              </th>
                              <th className="p-2.5 font-semibold">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-700">
                            {selectedIntervention.detailEquipements.map((eq) => (
                              <tr key={eq.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                                  {eq.equipement}
                                </td>
                                <td className="p-2.5">{eq.constatDiagnostic}</td>
                                <td className="p-2.5">
                                  {eq.operationsResume ||
                                    eq.actionsCorrectives.join(' + ')}
                                </td>
                                <td className="p-2.5">{eq.materielSpecifique}</td>
                                <td
                                  className={`p-2.5 font-bold whitespace-nowrap ${
                                    eq.statut === 'Résolu'
                                      ? 'text-emerald-700'
                                      : 'text-amber-700'
                                  }`}
                                >
                                  {formatInterventionStatusLabel(
                                    eq.statut,
                                    selectedIntervention.natureIntervention
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Recommandations d'exploitation (si renseignées) */}
                {selectedIntervention.recommandations && (
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/50 p-4 space-y-2">
                    <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{viewVocab.recommandationsTitle}</span>
                    </h4>
                    <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedIntervention.recommandations}
                    </div>
                  </div>
                )}

                {/* Validation du demandeur */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-700" />
                      Validation & Clôture par le demandeur
                    </span>
                    <p className="text-slate-600 italic">
                      «{' '}
                      {selectedIntervention.commentairesDemandeur ||
                        'Intervention validée sans réserve.'}{' '}
                      »
                    </p>
                    {selectedIntervention.dateValidation && (
                      <span className="text-[10px] text-slate-500 block">
                        Signé le {selectedIntervention.dateValidation}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleValidation(selectedIntervention.id)
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                      selectedIntervention.validationDemandeur
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedIntervention.validationDemandeur
                      ? 'Validé par demandeur'
                      : 'Marquer comme validé'}
                  </button>
                </div>
              </div>
            </div>
            );
          })() : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 italic">
              {interventions.length === 0
                ? 'Le registre des interventions est vierge et prêt à recevoir vos fiches techniques.'
                : "Sélectionnez une fiche d'intervention dans la liste pour afficher tous les détails."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
