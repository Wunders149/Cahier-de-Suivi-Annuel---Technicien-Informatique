import React, { useMemo, useState } from 'react';
import { ObjectifAnnuel, JalonCalendrier } from '../../types/it-tracker';
import { Target, Calendar, Plus, CheckSquare, Clock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { FormField, FormSection } from '../ui/FormField';
import { CrudRowActions } from '../ui/CrudRowActions';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import {
  fieldInputClass,
  fieldSelectClass,
  fieldTextareaClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/formStyles';

interface AnnualPlanSectionProps {
  objectifs: ObjectifAnnuel[];
  jalons: JalonCalendrier[];
  onUpdateObjectifs: (objectifs: ObjectifAnnuel[]) => void;
  onUpdateJalons: (jalons: JalonCalendrier[]) => void;
  onShowToast?: (msg: string) => void;
}

const DEFAULT_OBJECTIF = (): Partial<ObjectifAnnuel> => ({
  titre: '',
  description: '',
  missionsPrevue: '',
  resultatsAttendus: '',
  ressourcesNecessaires: '',
  echeance: `${new Date().getFullYear()}-12-31`,
  priorite: 'Haute',
  kpi: '',
  avancement: 0,
  statut: 'Non démarré',
});

const DEFAULT_JALON = (): Partial<JalonCalendrier> => ({
  mois: new Date().getMonth() + 1,
  titre: '',
  description: '',
  categorie: 'Projet',
  priorite: 'Normale',
  estComplete: false,
});

const MOIS_NOMS = [
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

export const AnnualPlanSection: React.FC<AnnualPlanSectionProps> = ({
  objectifs,
  jalons,
  onUpdateObjectifs,
  onUpdateJalons,
  onShowToast,
}) => {
  // États CRUD Objectifs
  const [objModalOpen, setObjModalOpen] = useState(false);
  const [editingObjId, setEditingObjId] = useState<string | null>(null);
  const [isDuplicatingObj, setIsDuplicatingObj] = useState(false);
  const [objForm, setObjForm] = useState<Partial<ObjectifAnnuel>>(DEFAULT_OBJECTIF);
  const [inspectingObjId, setInspectingObjId] = useState<string | null>(null);
  const [deletingObjId, setDeletingObjId] = useState<string | null>(null);

  // États CRUD Jalons
  const [jalonModalOpen, setJalonModalOpen] = useState(false);
  const [editingJalonId, setEditingJalonId] = useState<string | null>(null);
  const [isDuplicatingJalon, setIsDuplicatingJalon] = useState(false);
  const [jalonForm, setJalonForm] = useState<Partial<JalonCalendrier>>(DEFAULT_JALON);
  const [inspectingJalonId, setInspectingJalonId] = useState<string | null>(null);
  const [deletingJalonId, setDeletingJalonId] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  const inspectingObj = useMemo(
    () => objectifs.find((o) => o.id === inspectingObjId) || null,
    [objectifs, inspectingObjId]
  );
  const deletingObj = useMemo(
    () => objectifs.find((o) => o.id === deletingObjId) || null,
    [objectifs, deletingObjId]
  );

  const inspectingJalon = useMemo(
    () => jalons.find((j) => j.id === inspectingJalonId) || null,
    [jalons, inspectingJalonId]
  );
  const deletingJalon = useMemo(
    () => jalons.find((j) => j.id === deletingJalonId) || null,
    [jalons, deletingJalonId]
  );

  const getNextObjId = () => {
    const maxObjNum = objectifs.reduce((max, obj) => {
      const m = obj.id?.match(/OBJ-(\d+)/i);
      const parsed = m ? parseInt(m[1], 10) : 0;
      return Number.isFinite(parsed) && parsed > max ? parsed : max;
    }, 0);
    const nextObjNum = Math.max(objectifs.length + 1, maxObjNum + 1);
    return `OBJ-${String(nextObjNum).padStart(2, '0')}`;
  };

  // Handlers Objectifs
  const openCreateObjective = () => {
    setEditingObjId(null);
    setIsDuplicatingObj(false);
    setObjForm(DEFAULT_OBJECTIF());
    setObjModalOpen(true);
  };

  const openEditObjective = (obj: ObjectifAnnuel) => {
    setEditingObjId(obj.id);
    setIsDuplicatingObj(false);
    setObjForm({ ...obj });
    setObjModalOpen(true);
  };

  const openDuplicateObjective = (obj: ObjectifAnnuel) => {
    setEditingObjId(null);
    setIsDuplicatingObj(true);
    setObjForm({
      ...obj,
      id: undefined,
      titre: `${obj.titre} (copie)`,
      avancement: 0,
      statut: 'Non démarré',
    });
    setObjModalOpen(true);
  };

  const handleSaveObjective = (e: React.FormEvent) => {
    e.preventDefault();
    const titre = objForm.titre?.trim();
    if (!titre) return;

    const avancement = Math.min(100, Math.max(0, Number(objForm.avancement) || 0));
    const derivedStatut: ObjectifAnnuel['statut'] =
      objForm.statut ||
      (avancement === 100 ? 'Atteint' : avancement > 0 ? 'En cours' : 'Non démarré');

    const payload: ObjectifAnnuel = {
      id: editingObjId || getNextObjId(),
      titre,
      description: objForm.description?.trim() || '',
      missionsPrevue: objForm.missionsPrevue?.trim() || '',
      resultatsAttendus: objForm.resultatsAttendus?.trim() || '',
      ressourcesNecessaires: objForm.ressourcesNecessaires?.trim() || '',
      echeance: objForm.echeance || `${new Date().getFullYear()}-12-31`,
      priorite: objForm.priorite || 'Moyenne',
      kpi: objForm.kpi?.trim() || '',
      avancement,
      statut: derivedStatut,
    };

    if (editingObjId) {
      onUpdateObjectifs(objectifs.map((o) => (o.id === editingObjId ? payload : o)));
      notify('Objectif annuel mis à jour.');
    } else {
      onUpdateObjectifs([...objectifs, payload]);
      notify(isDuplicatingObj ? 'Objectif annuel dupliqué.' : 'Nouvel objectif annuel ajouté.');
    }
    setObjModalOpen(false);
    setEditingObjId(null);
    setIsDuplicatingObj(false);
  };

  const handleUpdateAvancement = (id: string, delta: number) => {
    const updated = objectifs.map((obj) => {
      if (obj.id === id) {
        const newVal = Math.min(100, Math.max(0, obj.avancement + delta));
        let newStatut: ObjectifAnnuel['statut'] = obj.statut;
        if (newVal === 100) newStatut = 'Atteint';
        else if (newVal > 0) newStatut = 'En cours';
        else newStatut = 'Non démarré';
        return { ...obj, avancement: newVal, statut: newStatut };
      }
      return obj;
    });
    onUpdateObjectifs(updated);
  };

  const handleConfirmDeleteObjective = () => {
    if (!deletingObjId) return;
    onUpdateObjectifs(objectifs.filter((o) => o.id !== deletingObjId));
    if (inspectingObjId === deletingObjId) setInspectingObjId(null);
    setDeletingObjId(null);
    notify('Objectif annuel supprimé.');
  };

  // Handlers Jalons
  const openCreateJalon = () => {
    setEditingJalonId(null);
    setIsDuplicatingJalon(false);
    setJalonForm(DEFAULT_JALON());
    setJalonModalOpen(true);
  };

  const openEditJalon = (jalon: JalonCalendrier) => {
    setEditingJalonId(jalon.id);
    setIsDuplicatingJalon(false);
    setJalonForm({ ...jalon });
    setJalonModalOpen(true);
  };

  const openDuplicateJalon = (jalon: JalonCalendrier) => {
    setEditingJalonId(null);
    setIsDuplicatingJalon(true);
    setJalonForm({
      ...jalon,
      id: undefined,
      titre: `${jalon.titre} (copie)`,
      estComplete: false,
    });
    setJalonModalOpen(true);
  };

  const handleSaveJalon = (e: React.FormEvent) => {
    e.preventDefault();
    const titre = jalonForm.titre?.trim();
    if (!titre) return;

    const payload: JalonCalendrier = {
      id: editingJalonId || `JAL-${Date.now()}`,
      mois: Math.min(12, Math.max(1, Number(jalonForm.mois) || 1)),
      titre,
      description: jalonForm.description?.trim() || '',
      categorie: jalonForm.categorie || 'Projet',
      priorite: jalonForm.priorite || 'Normale',
      estComplete: Boolean(jalonForm.estComplete),
    };

    if (editingJalonId) {
      onUpdateJalons(jalons.map((j) => (j.id === editingJalonId ? payload : j)));
      notify('Jalon calendrier mis à jour.');
    } else {
      const nextList = [...jalons, payload].sort((a, b) => a.mois - b.mois);
      onUpdateJalons(nextList);
      notify(isDuplicatingJalon ? 'Jalon dupliqué.' : 'Nouveau jalon ajouté au calendrier.');
    }
    setJalonModalOpen(false);
    setEditingJalonId(null);
    setIsDuplicatingJalon(false);
  };

  const handleToggleJalon = (id: string) => {
    const updated = jalons.map((j) =>
      j.id === id ? { ...j, estComplete: !j.estComplete } : j
    );
    onUpdateJalons(updated);
  };

  const handleConfirmDeleteJalon = () => {
    if (!deletingJalonId) return;
    onUpdateJalons(jalons.filter((j) => j.id !== deletingJalonId));
    if (inspectingJalonId === deletingJalonId) setInspectingJalonId(null);
    setDeletingJalonId(null);
    notify('Jalon supprimé du calendrier.');
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
              2
            </span>
            <span>Planification Annuelle &amp; Calendrier d&apos;Activité</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Définition des objectifs stratégiques annuels, missions prévues, KPI et jalonnement mensuel de Janvier à Décembre.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openCreateJalon}
            className={secondaryButtonClass}
          >
            <Calendar className="w-4 h-4" />
            <span>Nouveau Jalon</span>
          </button>
          <button
            type="button"
            onClick={openCreateObjective}
            className={primaryButtonClass}
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Objectif Annuel</span>
          </button>
        </div>
      </div>

      {/* Modal Création / Édition Objectif */}
      <Modal
        isOpen={objModalOpen}
        onClose={() => setObjModalOpen(false)}
        title={
          editingObjId
            ? "Modifier l'Objectif Annuel"
            : isDuplicatingObj
            ? "Dupliquer l'Objectif Annuel"
            : 'Nouvel Objectif Annuel'
        }
        subtitle="Définition des missions, livrables attendus, avancement, échéance et KPI."
        icon={<Target className="w-4 h-4" />}
        size="lg"
        onSubmit={handleSaveObjective}
        footer={
          <>
            <button
              type="button"
              onClick={() => setObjModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              {editingObjId ? 'Enregistrer les modifications' : "Enregistrer l'objectif"}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection title="1. Définition de l'objectif">
            <FormField label="Intitulé de l'objectif" required>
              <input
                type="text"
                required
                value={objForm.titre || ''}
                onChange={(e) => setObjForm({ ...objForm, titre: e.target.value })}
                placeholder="Ex: Migration du parc vers Windows 11 Entreprise"
                className={fieldInputClass}
              />
            </FormField>

            <FormField label="Description & Contexte">
              <textarea
                rows={2}
                value={objForm.description || ''}
                onChange={(e) => setObjForm({ ...objForm, description: e.target.value })}
                placeholder="Objectif métier, périmètre concerné..."
                className={fieldTextareaClass}
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Missions et activités prévues">
                <textarea
                  value={objForm.missionsPrevue || ''}
                  onChange={(e) => setObjForm({ ...objForm, missionsPrevue: e.target.value })}
                  rows={2}
                  placeholder="Étapes clés, actions de terrain..."
                  className={fieldTextareaClass}
                />
              </FormField>
              <FormField label="Résultats attendus">
                <textarea
                  value={objForm.resultatsAttendus || ''}
                  onChange={(e) => setObjForm({ ...objForm, resultatsAttendus: e.target.value })}
                  rows={2}
                  placeholder="Livrables concrets, critères de succès..."
                  className={fieldTextareaClass}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="2. Moyens, KPI & Suivi d'avancement" separated>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Ressources nécessaires">
                <input
                  type="text"
                  value={objForm.ressourcesNecessaires || ''}
                  onChange={(e) =>
                    setObjForm({ ...objForm, ressourcesNecessaires: e.target.value })
                  }
                  placeholder="Matériel, licences, budget..."
                  className={fieldInputClass}
                />
              </FormField>
              <FormField label="Indicateur de Performance (KPI)">
                <input
                  type="text"
                  value={objForm.kpi || ''}
                  onChange={(e) => setObjForm({ ...objForm, kpi: e.target.value })}
                  placeholder="Ex: Taux de couverture > 98%"
                  className={fieldInputClass}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <FormField label="Échéance">
                <input
                  type="date"
                  value={objForm.echeance || ''}
                  onChange={(e) => setObjForm({ ...objForm, echeance: e.target.value })}
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Priorité">
                <select
                  value={objForm.priorite || 'Haute'}
                  onChange={(e) =>
                    setObjForm({
                      ...objForm,
                      priorite: e.target.value as ObjectifAnnuel['priorite'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Haute">Haute</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Basse">Basse</option>
                </select>
              </FormField>
              <FormField label="Avancement (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={objForm.avancement ?? 0}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                    const nextStatut: ObjectifAnnuel['statut'] =
                      val === 100 ? 'Atteint' : val > 0 ? 'En cours' : 'Non démarré';
                    setObjForm({ ...objForm, avancement: val, statut: nextStatut });
                  }}
                  className={`${fieldInputClass} font-mono tabular-nums`}
                />
              </FormField>
              <FormField label="Statut">
                <select
                  value={objForm.statut || 'Non démarré'}
                  onChange={(e) =>
                    setObjForm({
                      ...objForm,
                      statut: e.target.value as ObjectifAnnuel['statut'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Non démarré">Non démarré</option>
                  <option value="En cours">En cours</option>
                  <option value="Atteint">Atteint</option>
                  <option value="Partiel">Partiel</option>
                  <option value="Reporté">Reporté</option>
                </select>
              </FormField>
            </div>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Inspection Objectif */}
      <Modal
        isOpen={Boolean(inspectingObj)}
        onClose={() => setInspectingObjId(null)}
        title={inspectingObj?.titre || 'Détail de l’objectif'}
        subtitle={
          inspectingObj
            ? `${inspectingObj.id} · Priorité ${inspectingObj.priorite} · Échéance ${inspectingObj.echeance}`
            : undefined
        }
        icon={<Target className="w-4 h-4" />}
        size="md"
        footer={
          inspectingObj && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingObjId(inspectingObj.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                Supprimer
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const t = inspectingObj;
                    setInspectingObjId(null);
                    openDuplicateObjective(t);
                  }}
                  className={secondaryButtonClass}
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const t = inspectingObj;
                    setInspectingObjId(null);
                    openEditObjective(t);
                  }}
                  className={primaryButtonClass}
                >
                  Modifier
                </button>
              </div>
            </div>
          )
        }
      >
        {inspectingObj && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <div className="text-[11px] text-slate-500">Statut</div>
                <div className="font-bold text-slate-900 mt-0.5">{inspectingObj.statut}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Avancement</div>
                <div className="font-bold font-mono tabular-nums text-blue-700 mt-0.5">
                  {inspectingObj.avancement}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">KPI</div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {inspectingObj.kpi || '—'}
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Description
              </h4>
              <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                {inspectingObj.description || 'Aucune description.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">Missions prévues</div>
                <div className="text-slate-800 whitespace-pre-line">
                  {inspectingObj.missionsPrevue || '—'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">Résultats attendus</div>
                <div className="text-slate-800 whitespace-pre-line">
                  {inspectingObj.resultatsAttendus || '—'}
                </div>
              </div>
            </div>
            {inspectingObj.ressourcesNecessaires && (
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Ressources nécessaires
                </h4>
                <p className="text-slate-700">{inspectingObj.ressourcesNecessaires}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingObj)}
        onClose={() => setDeletingObjId(null)}
        onConfirm={handleConfirmDeleteObjective}
        title="Supprimer cet objectif annuel ?"
        itemLabel={deletingObj?.titre || ''}
        itemMeta={deletingObj ? `${deletingObj.id} · Échéance ${deletingObj.echeance}` : undefined}
      />

      {/* Modal Création / Édition Jalon */}
      <Modal
        isOpen={jalonModalOpen}
        onClose={() => setJalonModalOpen(false)}
        title={
          editingJalonId
            ? 'Modifier le jalon calendrier'
            : isDuplicatingJalon
            ? 'Dupliquer le jalon'
            : 'Nouveau jalon calendrier'
        }
        subtitle="Planification d'une opération majeure, audit, renouvellement ou maintenance annuelle."
        icon={<Calendar className="w-4 h-4" />}
        size="md"
        onSubmit={handleSaveJalon}
        footer={
          <>
            <button
              type="button"
              onClick={() => setJalonModalOpen(false)}
              className={secondaryButtonClass}
            >
              Annuler
            </button>
            <button type="submit" className={primaryButtonClass}>
              {editingJalonId ? 'Enregistrer les modifications' : 'Ajouter le jalon'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormSection title="1. Identification du jalon">
            <FormField label="Intitulé du jalon" required>
              <input
                type="text"
                required
                placeholder="Ex: Renouvellement contrat support Pare-feu"
                value={jalonForm.titre || ''}
                onChange={(e) => setJalonForm({ ...jalonForm, titre: e.target.value })}
                className={fieldInputClass}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="Mois cible">
                <select
                  value={jalonForm.mois || 1}
                  onChange={(e) =>
                    setJalonForm({ ...jalonForm, mois: parseInt(e.target.value, 10) || 1 })
                  }
                  className={fieldSelectClass}
                >
                  {MOIS_NOMS.map((nom, idx) => (
                    <option key={nom} value={idx + 1}>
                      {String(idx + 1).padStart(2, '0')} · {nom}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Catégorie">
                <select
                  value={jalonForm.categorie || 'Projet'}
                  onChange={(e) =>
                    setJalonForm({
                      ...jalonForm,
                      categorie: e.target.value as JalonCalendrier['categorie'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Projet">Projet</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Audit">Audit</option>
                  <option value="Renouvellement">Renouvellement</option>
                  <option value="Formation">Formation</option>
                  <option value="Inventaire">Inventaire</option>
                </select>
              </FormField>

              <FormField label="Priorité">
                <select
                  value={jalonForm.priorite || 'Normale'}
                  onChange={(e) =>
                    setJalonForm({
                      ...jalonForm,
                      priorite: e.target.value as JalonCalendrier['priorite'],
                    })
                  }
                  className={fieldSelectClass}
                >
                  <option value="Haute">Haute</option>
                  <option value="Normale">Normale</option>
                  <option value="Basse">Basse</option>
                </select>
              </FormField>
            </div>

            <FormField label="Description & Livraison attendue">
              <textarea
                rows={2}
                placeholder="Détails opérationnels..."
                value={jalonForm.description || ''}
                onChange={(e) => setJalonForm({ ...jalonForm, description: e.target.value })}
                className={fieldTextareaClass}
              />
            </FormField>

            <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(jalonForm.estComplete)}
                onChange={(e) =>
                  setJalonForm({ ...jalonForm, estComplete: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Marquer ce jalon comme validé / réalisé</span>
            </label>
          </FormSection>
        </div>
      </Modal>

      {/* Modal Inspection Jalon */}
      <Modal
        isOpen={Boolean(inspectingJalon)}
        onClose={() => setInspectingJalonId(null)}
        title={inspectingJalon?.titre || 'Détail du jalon'}
        subtitle={
          inspectingJalon
            ? `Mois ${String(inspectingJalon.mois).padStart(2, '0')} · ${
                MOIS_NOMS[inspectingJalon.mois - 1] || ''
              } · ${inspectingJalon.categorie}`
            : undefined
        }
        icon={<Clock className="w-4 h-4" />}
        size="sm"
        footer={
          inspectingJalon && (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeletingJalonId(inspectingJalon.id)}
                className="px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                Supprimer
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const t = inspectingJalon;
                    setInspectingJalonId(null);
                    openDuplicateJalon(t);
                  }}
                  className={secondaryButtonClass}
                >
                  Dupliquer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const t = inspectingJalon;
                    setInspectingJalonId(null);
                    openEditJalon(t);
                  }}
                  className={primaryButtonClass}
                >
                  Modifier
                </button>
              </div>
            </div>
          )
        }
      >
        {inspectingJalon && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-600">
                Priorité : <strong className="text-slate-900">{inspectingJalon.priorite}</strong>
              </span>
              <span
                className={`font-semibold ${
                  inspectingJalon.estComplete ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {inspectingJalon.estComplete ? 'Validé' : 'À planifier'}
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
              {inspectingJalon.description || 'Aucune description renseignée.'}
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deletingJalon)}
        onClose={() => setDeletingJalonId(null)}
        onConfirm={handleConfirmDeleteJalon}
        title="Supprimer ce jalon du calendrier ?"
        itemLabel={deletingJalon?.titre || ''}
        itemMeta={
          deletingJalon
            ? `Mois ${String(deletingJalon.mois).padStart(2, '0')} · ${deletingJalon.categorie}`
            : undefined
        }
      />

      {/* Cartes des objectifs annuels */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span>Tableau des Objectifs Annuels &amp; Indicateurs Clés ({objectifs.length})</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Moyenne d&apos;avancement globale :{' '}
            <strong className="text-blue-700">
              {Math.round(
                objectifs.reduce((acc, o) => acc + o.avancement, 0) / (objectifs.length || 1)
              )}
              %
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {objectifs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <Target className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs text-slate-600 font-medium">
                Aucun objectif annuel défini pour le moment.
              </div>
              <p className="text-[11px] text-slate-400">
                Cliquez sur « Nouvel Objectif Annuel » ci-dessus pour planifier vos missions, projets et indicateurs clés de performance (KPI).
              </p>
              <button
                type="button"
                onClick={openCreateObjective}
                className={primaryButtonClass}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer le premier objectif</span>
              </button>
            </div>
          ) : (
            objectifs.map((obj) => (
              <div
                key={obj.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {obj.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">
                        Priorité {obj.priorite}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-semibold ${
                          obj.statut === 'Atteint' ? 'text-emerald-700' : 'text-slate-800'
                        }`}
                      >
                        {obj.statut}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        Échéance {obj.echeance}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectingObjId(obj.id)}
                      className="text-left text-base font-bold text-slate-900 hover:text-blue-700 transition-colors tracking-tight"
                    >
                      {obj.titre}
                    </button>
                    {obj.description && (
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">
                        {obj.description}
                      </p>
                    )}
                  </div>

                  {/* Avancement rapide + Actions CRUD */}
                  <div className="flex items-center gap-2 self-start shrink-0">
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleUpdateAvancement(obj.id, -10)}
                        className="w-6 h-6 rounded bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-300 transition"
                        title="Diminuer 10%"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono tabular-nums font-bold text-slate-900 w-12 text-center">
                        {obj.avancement}%
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateAvancement(obj.id, 10)}
                        className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center transition"
                        title="Augmenter 10%"
                      >
                        +
                      </button>
                    </div>

                    <CrudRowActions
                      onView={() => setInspectingObjId(obj.id)}
                      onEdit={() => openEditObjective(obj)}
                      onDuplicate={() => openDuplicateObjective(obj)}
                      onDelete={() => setDeletingObjId(obj.id)}
                    />
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-300 ${
                      obj.avancement >= 80
                        ? 'bg-emerald-500'
                        : obj.avancement >= 40
                        ? 'bg-blue-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${obj.avancement}%` }}
                  />
                </div>

                {/* Détails complémentaires */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100 text-slate-600">
                  <div>
                    <strong className="text-slate-800 block">Missions prévues :</strong>
                    <span>{obj.missionsPrevue || '—'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800 block">Résultats attendus :</strong>
                    <span>{obj.resultatsAttendus || '—'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800 block">KPI &amp; Échéance :</strong>
                    <span className="text-blue-700 font-semibold">{obj.kpi || '—'}</span>
                    <span className="block text-slate-500 text-[11px] font-mono tabular-nums">
                      Échéance : {obj.echeance}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Calendrier Annuel Janvier - Décembre */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>
              Calendrier Annuel des Jalons &amp; Opérations Majeures (Janvier à Décembre)
            </span>
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {jalons.filter((j) => j.estComplete).length} / {jalons.length} jalons validés
            </span>
            <button
              type="button"
              onClick={openCreateJalon}
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
            >
              + Ajouter un jalon
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jalons.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs text-slate-600 font-medium">
                Aucun jalon ou opération planifiée dans le calendrier.
              </div>
              <p className="text-[11px] text-slate-400">
                Ajoutez vos jalons mensuels, audits et renouvellements de contrats pour suivre l&apos;année.
              </p>
              <button
                type="button"
                onClick={openCreateJalon}
                className={secondaryButtonClass}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter le premier jalon</span>
              </button>
            </div>
          ) : (
            jalons.map((jalon) => (
              <div
                key={jalon.id}
                className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                  jalon.estComplete
                    ? 'bg-emerald-50/70 border-emerald-300 text-slate-800'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      Mois {jalon.mois < 10 ? '0' + jalon.mois : jalon.mois} ·{' '}
                      {MOIS_NOMS[jalon.mois - 1]}
                    </span>
                    <CrudRowActions
                      compact
                      onView={() => setInspectingJalonId(jalon.id)}
                      onEdit={() => openEditJalon(jalon)}
                      onDuplicate={() => openDuplicateJalon(jalon)}
                      onDelete={() => setDeletingJalonId(jalon.id)}
                    />
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mb-1">
                    {jalon.categorie} · Priorité {jalon.priorite}
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingJalonId(jalon.id)}
                    className="text-left text-xs font-bold text-slate-900 hover:text-blue-700 leading-snug"
                  >
                    {jalon.titre}
                  </button>
                  {jalon.description && (
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {jalon.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleJalon(jalon.id)}
                    className={`inline-flex items-center gap-1.5 font-semibold text-xs px-2 py-1 rounded-md transition ${
                      jalon.estComplete
                        ? 'text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/70'
                        : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{jalon.estComplete ? 'Validé' : 'Marquer validé'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
