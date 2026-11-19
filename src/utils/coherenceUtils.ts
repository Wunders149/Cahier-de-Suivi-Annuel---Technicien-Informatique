import {
  FicheIntervention,
  IncidentReseau,
  ItemMaintenance,
  SuiviSauvegarde,
  TacheJournal,
  TestDebitReseau,
} from '../types/it-tracker';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Retourne la date locale du jour au format YYYY-MM-DD (sans décalage UTC).
 */
export function getLocalTodayIso(ref: Date = new Date()): string {
  return `${ref.getFullYear()}-${pad2(ref.getMonth() + 1)}-${pad2(ref.getDate())}`;
}

/**
 * Retourne l'heure locale courante au format HH:MM.
 */
export function getLocalNowTime(ref: Date = new Date()): string {
  return `${pad2(ref.getHours())}:${pad2(ref.getMinutes())}`;
}

/**
 * Retourne date + heure locales au format "YYYY-MM-DD HH:MM".
 */
export function getLocalDateTimeStamp(ref: Date = new Date()): string {
  return `${getLocalTodayIso(ref)} ${getLocalNowTime(ref)}`;
}

/**
 * Ajoute un nombre de jours à une date YYYY-MM-DD en restant sur le calendrier local.
 */
export function addDaysToIso(isoDate: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return getLocalTodayIso();
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days, 12, 0, 0);
  return getLocalTodayIso(dt);
}

/**
 * Calcule la prochaine échéance de contrôle à partir d'une date de réalisation et de la fréquence.
 */
export function computeNextControlDate(
  baseIso: string,
  frequence: ItemMaintenance['frequence']
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baseIso)) return baseIso;
  const [y, m, d] = baseIso.split('-').map(Number);
  let dt: Date;
  switch (frequence) {
    case 'Quotidienne':
      dt = new Date(y, m - 1, d + 1, 12, 0, 0);
      break;
    case 'Hebdomadaire':
      dt = new Date(y, m - 1, d + 7, 12, 0, 0);
      break;
    case 'Mensuelle':
      dt = new Date(y, m, d, 12, 0, 0);
      break;
    case 'Trimestrielle':
      dt = new Date(y, m + 2, d, 12, 0, 0);
      break;
    case 'Semestrielle':
      dt = new Date(y, m + 5, d, 12, 0, 0);
      break;
    case 'Annuelle':
      dt = new Date(y + 1, m - 1, d, 12, 0, 0);
      break;
    default:
      dt = new Date(y, m, d, 12, 0, 0);
  }
  return getLocalTodayIso(dt);
}

/**
 * Identifiant déterministe dans `journalTaches` associé à un ItemMaintenance.
 * Préserve le préfixe `sog-` pour les maintenances SOGEDIPROMA afin que le remplacement auto
 * (`replace-sog`) et la fusion Cloud/local restent 100% cohérents sans doublons.
 */
export function getLinkedJournalIdForMaintenance(maintenanceId: string): string {
  if (maintenanceId.startsWith('sog-')) {
    return `sog-jrn-${maintenanceId.slice(4)}`;
  }
  return `jrn-mnt-${maintenanceId}`;
}

export function mapMaintenanceCategoryToJournalCategory(
  categorie: ItemMaintenance['categorie']
): TacheJournal['categorie'] {
  switch (categorie) {
    case 'Contrôle sauvegardes':
    case 'Vérification Antivirus':
      return 'Sécurité & Sauvegarde';
    case 'Équipements réseau':
      return 'Réseau & Wifi';
    case 'Serveurs':
    case 'Onduleurs':
    case 'Disques et stockage':
      return 'Système & Serveur';
    default:
      return 'Maintenance Préventive';
  }
}

export function buildJournalTaskFromMaintenance(
  m: ItemMaintenance,
  existing?: TacheJournal
): TacheJournal {
  const id = getLinkedJournalIdForMaintenance(m.id);
  const date = m.dernierControle || existing?.date || getLocalTodayIso();
  const estDuration =
    existing?.dureeEstimeeMin ||
    (m.frequence === 'Quotidienne' ? 20 : m.typeMaintenance === 'Corrective' ? 45 : 30);
  const isSogCamCheck = m.id.startsWith('sog-camchk-');
  const isCompletedOrDoneCheck = m.valide || (isSogCamCheck && Boolean(m.dernierControle));
  const statut: TacheJournal['statut'] = m.valide
    ? 'Terminé'
    : isSogCamCheck
    ? 'En cours'
    : 'À faire';

  return {
    id,
    date,
    heure: existing?.heure || '09:00',
    tache: `[Maintenance] ${m.tacheControle}`,
    description: `${m.typeMaintenance} (${m.categorie} · ${m.frequence}) — Périmètre : ${m.responsableOuEquipement}`,
    categorie: mapMaintenanceCategoryToJournalCategory(m.categorie),
    priorite:
      m.statut === 'Critique'
        ? 'Urgente'
        : m.typeMaintenance === 'Corrective'
        ? 'Élevée'
        : 'Normale',
    dureeEstimeeMin: estDuration,
    dureeReelleMin: isCompletedOrDoneCheck ? existing?.dureeReelleMin || estDuration : 0,
    statut,
    resultat: m.valide
      ? `Contrôle ${m.statut}${m.observations ? ` — ${m.observations}` : ''}`
      : m.observations || `Statut : ${m.statut} (en attente de validation)`,
    observations: [
      `Origine : Maintenance (${m.id})`,
      m.prochainControle ? `Prochain contrôle : ${m.prochainControle}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  };
}

export function upsertJournalTask(
  journal: TacheJournal[],
  task: TacheJournal
): TacheJournal[] {
  const idx = journal.findIndex((t) => t.id === task.id);
  if (idx >= 0) {
    return journal.map((t, i) => (i === idx ? task : t));
  }
  return [task, ...journal];
}

/**
 * Réconcilie automatiquement les changements de `maintenances` vers `journalTaches` :
 * - Toute maintenance validée avec une date (`dernierControle`) est consignée/mise à jour au jour indiqué.
 * - Si une maintenance liée est décochée (`valide = false`), sa tâche journal passe à "À faire".
 * - Si une maintenance est supprimée manuellement, son entrée auto `jrn-mnt-*` est retirée.
 */
export function reconcileMaintenancesUpdate(
  prevMaintenances: ItemMaintenance[],
  nextMaintenances: ItemMaintenance[],
  currentJournal: TacheJournal[]
): {
  journalTaches: TacheJournal[];
  added: number;
  updated: number;
  removed: number;
} {
  const prevMap = new Map(prevMaintenances.map((m) => [m.id, m]));
  const nextIds = new Set(nextMaintenances.map((m) => m.id));

  // Retirer les entrées journal liées à des maintenances supprimées
  const removedJournalIds = new Set<string>();
  prevMaintenances.forEach((pm) => {
    if (!nextIds.has(pm.id)) {
      removedJournalIds.add(getLinkedJournalIdForMaintenance(pm.id));
    }
  });

  let nextJournal = currentJournal.filter((t) => !removedJournalIds.has(t.id));
  const removed = currentJournal.length - nextJournal.length;

  let added = 0;
  let updated = 0;

  nextMaintenances.forEach((m) => {
    const linkedId = getLinkedJournalIdForMaintenance(m.id);
    const existingTask = nextJournal.find((t) => t.id === linkedId);
    const prevItem = prevMap.get(m.id);
    const hasChanged =
      !prevItem || JSON.stringify(prevItem) !== JSON.stringify(m);

    if (m.valide && m.dernierControle) {
      if (!existingTask) {
        nextJournal = [
          buildJournalTaskFromMaintenance(m),
          ...nextJournal,
        ];
        added += 1;
      } else if (hasChanged) {
        const rebuilt = buildJournalTaskFromMaintenance(m, existingTask);
        if (JSON.stringify(rebuilt) !== JSON.stringify(existingTask)) {
          nextJournal = nextJournal.map((t) => (t.id === linkedId ? rebuilt : t));
          updated += 1;
        }
      }
    } else if (existingTask && hasChanged) {
      const rebuilt = buildJournalTaskFromMaintenance(m, existingTask);
      if (JSON.stringify(rebuilt) !== JSON.stringify(existingTask)) {
        nextJournal = nextJournal.map((t) => (t.id === linkedId ? rebuilt : t));
        updated += 1;
      }
    }
  });

  return { journalTaches: nextJournal, added, updated, removed };
}

/**
 * Rattrape et consigne dans `journalTaches` toutes les maintenances déjà marquées conformes/validées
 * qui n'auraient pas encore d'entrée correspondante dans le journal quotidien.
 */
export function reconcileAllValidatedMaintenancesToJournal(
  maintenances: ItemMaintenance[],
  currentJournal: TacheJournal[]
): { journalTaches: TacheJournal[]; syncedCount: number } {
  const existingIds = new Set(currentJournal.map((t) => t.id));
  const toAdd: TacheJournal[] = [];

  maintenances.forEach((m) => {
    if (!m.valide || !m.dernierControle) return;
    const linkedId = getLinkedJournalIdForMaintenance(m.id);
    if (!existingIds.has(linkedId)) {
      toAdd.push(buildJournalTaskFromMaintenance(m));
      existingIds.add(linkedId);
    }
  });

  if (toAdd.length === 0) {
    return { journalTaches: currentJournal, syncedCount: 0 };
  }
  return {
    journalTaches: [...toAdd, ...currentJournal],
    syncedCount: toAdd.length,
  };
}

export function buildJournalTaskFromIntervention(
  it: FicheIntervention
): TacheJournal {
  const isDone = it.resultat === 'Résolu';
  const duration = Math.max(15, Number(it.tempsConsacreMin) || 30);
  return {
    id: `jrn-int-${it.id}`,
    date: it.dateReception || getLocalTodayIso(),
    heure: it.heureReception || getLocalNowTime(),
    tache: `[Intervention ${it.numeroReference}] ${it.titreRapport || it.equipementConcerne}`,
    description: `${it.descriptionPanne} (Demandeur : ${it.nomDemandeur} · ${it.serviceDemandeur})`,
    categorie:
      it.typeIntervention === 'Réseau'
        ? 'Réseau & Wifi'
        : it.typeIntervention === 'Systèmes / IoT' || it.typeIntervention === 'Infrastructure'
        ? 'Système & Serveur'
        : it.typeIntervention === 'Sécurité' || it.typeIntervention === 'Vidéosurveillance'
        ? 'Sécurité & Sauvegarde'
        : it.typeIntervention === 'Déploiement'
        ? 'Déploiement Matériel'
        : 'Support Utilisateur',
    priorite:
      it.priorite === 'Critique'
        ? 'Urgente'
        : it.priorite === 'Haute'
        ? 'Élevée'
        : it.priorite === 'Basse'
        ? 'Faible'
        : 'Normale',
    dureeEstimeeMin: duration,
    dureeReelleMin: isDone ? duration : 0,
    statut: isDone ? 'Terminé' : it.resultat === 'En attente pièce' ? 'En attente' : 'En cours',
    resultat: it.solutionAppliquee || it.resultat,
    observations: `Origine : Fiche ${it.numeroReference}`,
  };
}

export function buildJournalTaskFromBackup(bak: SuiviSauvegarde): TacheJournal {
  const datePart = /^\d{4}-\d{2}-\d{2}/.test(bak.dateDernierTestRestauration || '')
    ? bak.dateDernierTestRestauration
    : getLocalTodayIso();
  const isOk = bak.statut === 'Succès' && bak.resultatTestRestauration !== 'Échec';
  const duration = Math.max(15, Number(bak.dureeExecutionMin) || 30);
  return {
    id: `jrn-bak-${bak.id}`,
    date: datePart,
    heure: bak.horaireExecution || getLocalNowTime(),
    tache: `[Sauvegarde & PRA] ${bak.nomJob}`,
    description: `${bak.typeSauvegarde} sur ${bak.serveurCible} → ${bak.destinationStockage} (${bak.tailleGo} Go)`,
    categorie: 'Sécurité & Sauvegarde',
    priorite: bak.statut === 'Échec' || bak.resultatTestRestauration === 'Échec' ? 'Urgente' : 'Normale',
    dureeEstimeeMin: duration,
    dureeReelleMin: isOk ? duration : 0,
    statut: isOk ? 'Terminé' : bak.statut === 'Non exécuté' ? 'À faire' : 'En cours',
    resultat: `Job : ${bak.statut} · Test PRA : ${bak.resultatTestRestauration}`,
    observations: bak.observations || `Origine : Sauvegarde (${bak.id})`,
  };
}

export function buildJournalTaskFromNetworkIncident(
  inc: IncidentReseau
): TacheJournal {
  const datePart = /^\d{4}-\d{2}-\d{2}/.test(inc.dateHeure || '')
    ? inc.dateHeure.slice(0, 10)
    : getLocalTodayIso();
  const timePart = /\d{2}:\d{2}/.test(inc.dateHeure || '')
    ? inc.dateHeure.slice(11, 16)
    : getLocalNowTime();
  const isDone = inc.statut === 'Résolu';
  const duration = Math.max(15, Number(inc.dureeInterruptionMin) || 20);
  return {
    id: `jrn-net-inc-${inc.id}`,
    date: datePart,
    heure: timePart,
    tache: `[Incident Réseau] ${inc.equipementOuLiaison} — ${inc.typeIncident}`,
    description: `Impact : ${inc.impactUtilisateurs} · Cause : ${inc.cause}`,
    categorie: 'Réseau & Wifi',
    priorite:
      inc.impactUtilisateurs === 'Général' || inc.impactUtilisateurs === 'Service complet'
        ? 'Urgente'
        : 'Élevée',
    dureeEstimeeMin: duration,
    dureeReelleMin: isDone ? duration : 0,
    statut: isDone ? 'Terminé' : 'En cours',
    resultat: inc.actionCorrective || inc.statut,
    observations: `Origine : Réseau (${inc.id})`,
  };
}

export function buildJournalTaskFromNetworkSpeedtest(
  test: TestDebitReseau
): TacheJournal {
  const datePart = /^\d{4}-\d{2}-\d{2}/.test(test.dateHeure || '')
    ? test.dateHeure.slice(0, 10)
    : getLocalTodayIso();
  const timePart = /\d{2}:\d{2}/.test(test.dateHeure || '')
    ? test.dateHeure.slice(11, 16)
    : getLocalNowTime();
  return {
    id: `jrn-net-spd-${test.id}`,
    date: datePart,
    heure: timePart,
    tache: `[Test Débit WAN] ${test.ligneConcernee}`,
    description: `Download ${test.debitDescendantMbps} Mbps · Upload ${test.debitMontantMbps} Mbps · Ping ${test.latenceMs} ms · Gigue ${test.gigueMs} ms`,
    categorie: 'Réseau & Wifi',
    priorite: test.statutConformite === 'Anormalement bas' ? 'Élevée' : 'Faible',
    dureeEstimeeMin: 15,
    dureeReelleMin: 15,
    statut: 'Terminé',
    resultat: `${test.statutConformite}${test.observations ? ` — ${test.observations}` : ''}`,
    observations: `Origine : Test débit (${test.id})`,
  };
}
