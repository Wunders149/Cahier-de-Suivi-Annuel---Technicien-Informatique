import { CahierSuiviData } from '../types/it-tracker';
import { initialCahierData } from '../data/initialData';

function pickNonEmpty(candidate: unknown, fallback: string): string {
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }
  return fallback;
}

function mergeGeneralInfoWithFallback(
  primary: Partial<CahierSuiviData['generalInfo']> | undefined,
  fallback: CahierSuiviData['generalInfo']
): CahierSuiviData['generalInfo'] {
  const src = primary && typeof primary === 'object' ? primary : {};
  return {
    ...fallback,
    ...src,
    anneeReference:
      typeof src.anneeReference === 'number' && src.anneeReference > 2000
        ? src.anneeReference
        : fallback.anneeReference,
    nomTechnicien: pickNonEmpty(src.nomTechnicien, fallback.nomTechnicien),
    prenomTechnicien: pickNonEmpty(src.prenomTechnicien, fallback.prenomTechnicien),
    fonction: pickNonEmpty(src.fonction, fallback.fonction),
    departement: pickNonEmpty(src.departement, fallback.departement),
    entreprise: pickNonEmpty(src.entreprise, fallback.entreprise),
    responsableHierarchique: pickNonEmpty(
      src.responsableHierarchique,
      fallback.responsableHierarchique
    ),
    titreResponsable: pickNonEmpty(src.titreResponsable, fallback.titreResponsable),
    datePriseFonction: pickNonEmpty(src.datePriseFonction, fallback.datePriseFonction),
    telephonePro: pickNonEmpty(src.telephonePro, fallback.telephonePro),
    emailPro: pickNonEmpty(src.emailPro, fallback.emailPro),
    localisationBureau: pickNonEmpty(src.localisationBureau, fallback.localisationBureau),
    charteAcceptee:
      typeof src.charteAcceptee === 'boolean' ? src.charteAcceptee : fallback.charteAcceptee,
  };
}

/**
 * Normalise et complète un objet CahierSuiviData (issu du localStorage, Cloud ou JSON)
 * pour garantir l'intégrité de toutes les sections et éviter tout crash sur champ manquant.
 */
export function normalizeWorkbookData(raw: unknown): CahierSuiviData {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<CahierSuiviData>;
  const base = initialCahierData;

  const generalInfo = mergeGeneralInfoWithFallback(source.generalInfo, base.generalInfo);

  const rawRapports = Array.isArray(source.rapportsMensuels) ? source.rapportsMensuels : [];
  const rapportsMensuels = base.rapportsMensuels.map((defaultRep) => {
    const found = rawRapports.find((r) => r && r.moisIndex === defaultRep.moisIndex);
    const merged = found ? { ...defaultRep, ...found } : { ...defaultRep };
    const shouldAlignYear =
      !found ||
      !found.annee ||
      (found.annee === defaultRep.annee &&
        generalInfo.anneeReference !== base.generalInfo.anneeReference);
    return shouldAlignYear ? { ...merged, annee: generalInfo.anneeReference } : merged;
  });

  const rawTrimestres = Array.isArray(source.bilansTrimestriels) ? source.bilansTrimestriels : [];
  const bilansTrimestriels = base.bilansTrimestriels.map((defaultTri) => {
    const found = rawTrimestres.find((t) => t && t.trimestre === defaultTri.trimestre);
    return found ? { ...defaultTri, ...found } : { ...defaultTri };
  });

  const rawBilanAnnuel =
    source.bilanAnnuel && typeof source.bilanAnnuel === 'object' ? source.bilanAnnuel : {};
  const typedRawBilan = rawBilanAnnuel as Partial<CahierSuiviData['bilanAnnuel']>;
  const resolvedBilanYear =
    !typedRawBilan.annee ||
    (typedRawBilan.annee === base.bilanAnnuel.annee &&
      generalInfo.anneeReference !== base.generalInfo.anneeReference)
      ? generalInfo.anneeReference
      : typedRawBilan.annee;
  const bilanAnnuel = {
    ...base.bilanAnnuel,
    ...rawBilanAnnuel,
    annee: resolvedBilanYear,
    projetsRoi: Array.isArray(typedRawBilan.projetsRoi) ? typedRawBilan.projetsRoi : [],
  };

  return {
    generalInfo,
    objectifsAnnuels: Array.isArray(source.objectifsAnnuels) ? source.objectifsAnnuels : [],
    jalonsCalendrier: Array.isArray(source.jalonsCalendrier) ? source.jalonsCalendrier : [],
    journalTaches: Array.isArray(source.journalTaches) ? source.journalTaches : [],
    interventions: Array.isArray(source.interventions) ? source.interventions : [],
    maintenances: Array.isArray(source.maintenances) ? source.maintenances : [],
    reseauEquipements: Array.isArray(source.reseauEquipements) ? source.reseauEquipements : [],
    reseauIncidents: Array.isArray(source.reseauIncidents) ? source.reseauIncidents : [],
    reseauTestsDebit: Array.isArray(source.reseauTestsDebit) ? source.reseauTestsDebit : [],
    parcEquipements: Array.isArray(source.parcEquipements) ? source.parcEquipements : [],
    logicielsLicences: Array.isArray(source.logicielsLicences) ? source.logicielsLicences : [],
    sauvegardes: Array.isArray(source.sauvegardes) ? source.sauvegardes : [],
    incidentsSecurite: Array.isArray(source.incidentsSecurite) ? source.incidentsSecurite : [],
    consommables: Array.isArray(source.consommables) ? source.consommables : [],
    demandesAchat: Array.isArray(source.demandesAchat) ? source.demandesAchat : [],
    rapportsMensuels,
    bilansTrimestriels,
    bilanAnnuel,
  };
}

/**
 * Estime la taille en octets (UTF-8) d'un document CahierSuiviData sérialisé pour anticiper la limite de 1 Mo de Firestore.
 */
export function estimateWorkbookSizeBytes(data: CahierSuiviData): number {
  try {
    const json = JSON.stringify(data);
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(json).length;
    }
    return json.length;
  } catch {
    return 0;
  }
}

/**
 * Fusionne une liste d'enregistrements identifiés par `id` en priorisant les entrées locales sur les collisions d'ID,
 * tout en conservant les entrées uniquement présentes côté Cloud (zéro perte silencieuse),
 * sauf pour les entrées `sog-*` lorsqu'une source SOGEDIPROMA fraîche fait autorité.
 */
function mergeArraysById<T extends { id: string }>(
  localArr: T[],
  cloudArr: T[],
  authoritativeSogSource: 'local' | 'cloud' | 'union' = 'union'
): T[] {
  const isSogItem = (item: T) => String(item?.id || '').startsWith('sog-');

  if (authoritativeSogSource === 'local') {
    const localHasSog = localArr.some(isSogItem);
    const byId = new Map<string, T>();
    cloudArr.forEach((item) => {
      if (!item || !item.id) return;
      // Si local dispose d'une synchro SOGEDIPROMA fraîche pour cette collection, ne pas ressusciter les sog-* absents du snapshot live
      if (localHasSog && isSogItem(item)) return;
      byId.set(item.id, item);
    });
    localArr.forEach((item) => {
      if (item && item.id) {
        byId.set(item.id, item);
      }
    });
    return Array.from(byId.values());
  }

  if (authoritativeSogSource === 'cloud') {
    const cloudHasSog = cloudArr.some(isSogItem);
    const byId = new Map<string, T>();
    cloudArr.forEach((item) => {
      if (item && item.id) {
        byId.set(item.id, item);
      }
    });
    localArr.forEach((item) => {
      if (!item || !item.id) return;
      if (cloudHasSog && isSogItem(item)) return;
      byId.set(item.id, item);
    });
    return Array.from(byId.values());
  }

  const byId = new Map<string, T>();
  cloudArr.forEach((item) => {
    if (item && item.id) {
      byId.set(item.id, item);
    }
  });
  localArr.forEach((item) => {
    if (item && item.id) {
      byId.set(item.id, item);
    }
  });
  return Array.from(byId.values());
}

export interface MergeWorkbookOptions {
  authoritativeSogSource?: 'local' | 'cloud' | 'union';
}

/**
 * Fusionne intelligemment un cahier local modifié hors ligne et un cahier Cloud divergent.
 */
export function mergeWorkbookData(
  localRaw: CahierSuiviData,
  cloudRaw: CahierSuiviData,
  options: MergeWorkbookOptions = {}
): CahierSuiviData {
  const local = normalizeWorkbookData(localRaw);
  const cloud = normalizeWorkbookData(cloudRaw);
  const sogAuth = options.authoritativeSogSource || 'union';

  const mergedRapports = local.rapportsMensuels.map((lRep) => {
    const cRep = cloud.rapportsMensuels.find((r) => r.moisIndex === lRep.moisIndex);
    if (!cRep) return lRep;
    return {
      ...cRep,
      ...lRep,
      travauxRealises: lRep.travauxRealises?.trim() ? lRep.travauxRealises : cRep.travauxRealises,
      maintenanceEffectuee: lRep.maintenanceEffectuee?.trim()
        ? lRep.maintenanceEffectuee
        : cRep.maintenanceEffectuee,
      problemesRecurrents: lRep.problemesRecurrents?.trim()
        ? lRep.problemesRecurrents
        : cRep.problemesRecurrents,
      difficultesRencontrees: lRep.difficultesRencontrees?.trim()
        ? lRep.difficultesRencontrees
        : cRep.difficultesRencontrees,
      besoinsMaterielsLogiciels: lRep.besoinsMaterielsLogiciels?.trim()
        ? lRep.besoinsMaterielsLogiciels
        : cRep.besoinsMaterielsLogiciels,
      recommandationsTechnicien: lRep.recommandationsTechnicien?.trim()
        ? lRep.recommandationsTechnicien
        : cRep.recommandationsTechnicien,
      activitesMoisSuivant: lRep.activitesMoisSuivant?.trim()
        ? lRep.activitesMoisSuivant
        : cRep.activitesMoisSuivant,
      valideParHierarchie: Boolean(lRep.valideParHierarchie || cRep.valideParHierarchie),
    };
  });

  const mergedTrimestres = local.bilansTrimestriels.map((lTri) => {
    const cTri = cloud.bilansTrimestriels.find((t) => t.trimestre === lTri.trimestre);
    if (!cTri) return lTri;
    return {
      ...cTri,
      ...lTri,
      objectifsAtteints: lTri.objectifsAtteints?.trim()
        ? lTri.objectifsAtteints
        : cTri.objectifsAtteints,
      performancesResume: lTri.performancesResume?.trim()
        ? lTri.performancesResume
        : cTri.performancesResume,
      incidentsMajeurs: lTri.incidentsMajeurs?.trim()
        ? lTri.incidentsMajeurs
        : cTri.incidentsMajeurs,
      ameliorationsApportees: lTri.ameliorationsApportees?.trim()
        ? lTri.ameliorationsApportees
        : cTri.ameliorationsApportees,
    };
  });

  const mergedProjetsRoi = mergeArraysById(
    local.bilanAnnuel?.projetsRoi || [],
    cloud.bilanAnnuel?.projetsRoi || [],
    sogAuth
  );

  return normalizeWorkbookData({
    generalInfo: mergeGeneralInfoWithFallback(local.generalInfo, cloud.generalInfo),
    objectifsAnnuels: mergeArraysById(local.objectifsAnnuels, cloud.objectifsAnnuels, sogAuth),
    jalonsCalendrier: mergeArraysById(local.jalonsCalendrier, cloud.jalonsCalendrier, sogAuth),
    journalTaches: mergeArraysById(local.journalTaches, cloud.journalTaches, sogAuth),
    interventions: mergeArraysById(local.interventions, cloud.interventions, sogAuth),
    maintenances: mergeArraysById(local.maintenances, cloud.maintenances, sogAuth),
    reseauEquipements: mergeArraysById(local.reseauEquipements, cloud.reseauEquipements, sogAuth),
    reseauIncidents: mergeArraysById(local.reseauIncidents, cloud.reseauIncidents, sogAuth),
    reseauTestsDebit: mergeArraysById(local.reseauTestsDebit, cloud.reseauTestsDebit, sogAuth),
    parcEquipements: mergeArraysById(local.parcEquipements, cloud.parcEquipements, sogAuth),
    logicielsLicences: mergeArraysById(local.logicielsLicences, cloud.logicielsLicences, sogAuth),
    sauvegardes: mergeArraysById(local.sauvegardes, cloud.sauvegardes, sogAuth),
    incidentsSecurite: mergeArraysById(local.incidentsSecurite, cloud.incidentsSecurite, sogAuth),
    consommables: mergeArraysById(local.consommables, cloud.consommables, sogAuth),
    demandesAchat: mergeArraysById(local.demandesAchat, cloud.demandesAchat, sogAuth),
    rapportsMensuels: mergedRapports,
    bilansTrimestriels: mergedTrimestres,
    bilanAnnuel: {
      ...cloud.bilanAnnuel,
      ...local.bilanAnnuel,
      projetsRoi: mergedProjetsRoi,
    },
  });
}

/**
 * Initialise le cahier pour l'année suivante en reconduisant optionnellement les référentiels durables
 * (Parc CMDB, Licences, Équipements Réseau, Plans de Maintenance, Stock Consommables, Jobs de sauvegarde).
 */
export function createNextYearWorkbook(
  currentData: CahierSuiviData,
  nextYear: number,
  carryOverAssets: boolean = true
): CahierSuiviData {
  const cleanNext = createCleanProductionWorkbook(
    nextYear,
    currentData.generalInfo.nomTechnicien,
    currentData.generalInfo.prenomTechnicien,
    currentData.generalInfo.entreprise,
    currentData.generalInfo.responsableHierarchique
  );

  cleanNext.generalInfo = {
    ...currentData.generalInfo,
    anneeReference: nextYear,
  };

  if (!carryOverAssets) {
    return cleanNext;
  }

  return {
    ...cleanNext,
    parcEquipements: [...(currentData.parcEquipements || [])],
    logicielsLicences: [...(currentData.logicielsLicences || [])],
    reseauEquipements: [...(currentData.reseauEquipements || [])],
    maintenances: (currentData.maintenances || []).map((m) => ({
      ...m,
      valide: false,
      statut: 'À traiter',
    })),
    consommables: [...(currentData.consommables || [])],
    sauvegardes: [...(currentData.sauvegardes || [])],
  };
}

/**
 * Structure d'une archive de sauvegarde officielle avec métadonnées d'intégrité
 */
export interface BackupArchive {
  version: string;
  timestamp: string;
  app: string;
  environment: 'production' | 'staging' | 'backup';
  checksumItemsCount: number;
  data: CahierSuiviData;
}

/**
 * Exporte et télécharge une sauvegarde complète au format JSON
 */
export function exportFullBackupJson(data: CahierSuiviData): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archive: BackupArchive = {
    version: '1.2.0',
    timestamp: new Date().toISOString(),
    app: 'Cahier de Suivi Annuel du Technicien Informatique',
    environment: 'production',
    checksumItemsCount:
      (data.journalTaches?.length || 0) +
      (data.interventions?.length || 0) +
      (data.parcEquipements?.length || 0) +
      (data.consommables?.length || 0),
    data,
  };

  const jsonStr = JSON.stringify(archive, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cahier_suivi_sauvegarde_complete_${data.generalInfo.anneeReference}_${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Valide et restaure un fichier JSON de sauvegarde
 */
export async function parseBackupFile(file: File): Promise<{ success: boolean; data?: CahierSuiviData; error?: string }> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Vérifier si le JSON est une archive BackupArchive ou un objet CahierSuiviData direct
    const workbookData: Partial<CahierSuiviData> =
      parsed && typeof parsed === 'object' && parsed.data && parsed.data.generalInfo
        ? parsed.data
        : parsed;

    if (!workbookData || !workbookData.generalInfo || !workbookData.generalInfo.anneeReference) {
      return {
        success: false,
        error: 'Le fichier ne contient pas une structure valide de Cahier de Suivi Informatique (champ generalInfo manquant).',
      };
    }

    return {
      success: true,
      data: normalizeWorkbookData(workbookData),
    };
  } catch (err) {
    return {
      success: false,
      error: `Erreur lors de la lecture du fichier : ${(err as Error).message}`,
    };
  }
}

/**
 * Crée un cahier de suivi 100% vierge, prêt pour la production (zéro fausses données)
 */
export function createCleanProductionWorkbook(
  annee: number = new Date().getFullYear(),
  technicienNom: string = 'RAZAFIMAHEFA',
  technicienPrenom: string = 'Philibert',
  entreprise: string = 'SOGEDIPROMA',
  responsableHierarchique: string = ''
): CahierSuiviData {
  return {
    generalInfo: {
      anneeReference: annee,
      nomTechnicien: technicienNom || 'RAZAFIMAHEFA',
      prenomTechnicien: technicienPrenom || 'Philibert',
      fonction: 'Technicien Informatique',
      departement: 'Direction des Systèmes d\'Information (DSI)',
      entreprise: entreprise || 'SOGEDIPROMA',
      responsableHierarchique: responsableHierarchique,
      titreResponsable: 'Responsable des Systèmes d\'Information (RSI)',
      datePriseFonction: `${annee}-01-01`,
      telephonePro: '',
      emailPro: 'razafimahefaphilibert7@gmail.com',
      localisationBureau: 'Siège SOGEDIPROMA — Atelier DSI',
      charteAcceptee: true,
    },
    objectifsAnnuels: [],
    jalonsCalendrier: [],
    journalTaches: [],
    interventions: [],
    maintenances: [],
    reseauEquipements: [],
    reseauIncidents: [],
    reseauTestsDebit: [],
    parcEquipements: [],
    logicielsLicences: [],
    sauvegardes: [],
    incidentsSecurite: [],
    consommables: [],
    demandesAchat: [],
    rapportsMensuels: [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ].map((nomMois, i) => ({
      moisIndex: i + 1,
      nomMois,
      annee,
      totalInterventions: 0,
      incidentsResolus: 0,
      incidentsEnCours: 0,
      tauxResolutionFCR: 100,
      dureeMoyenneResolutionMin: 0,
      travauxRealises: '',
      maintenanceEffectuee: '',
      problemesRecurrents: '',
      difficultesRencontrees: '',
      besoinsMaterielsLogiciels: '',
      recommandationsTechnicien: '',
      activitesMoisSuivant: '',
      valideParHierarchie: false,
    })),
    bilansTrimestriels: [
      {
        trimestre: 'T1',
        periode: 'Janvier - Mars',
        objectifsAtteints: '',
        performancesResume: '',
        incidentsMajeurs: '',
        ameliorationsApportees: '',
        difficultesRencontrees: '',
        besoinsFormation: '',
        investissementsNecessaires: '',
        tauxSatisfactionUtilisateurs: 100,
        tauxDisponibiliteInfrastructure: 100,
      },
      {
        trimestre: 'T2',
        periode: 'Avril - Juin',
        objectifsAtteints: '',
        performancesResume: '',
        incidentsMajeurs: '',
        ameliorationsApportees: '',
        difficultesRencontrees: '',
        besoinsFormation: '',
        investissementsNecessaires: '',
        tauxSatisfactionUtilisateurs: 100,
        tauxDisponibiliteInfrastructure: 100,
      },
      {
        trimestre: 'T3',
        periode: 'Juillet - Septembre',
        objectifsAtteints: '',
        performancesResume: '',
        incidentsMajeurs: '',
        ameliorationsApportees: '',
        difficultesRencontrees: '',
        besoinsFormation: '',
        investissementsNecessaires: '',
        tauxSatisfactionUtilisateurs: 100,
        tauxDisponibiliteInfrastructure: 100,
      },
      {
        trimestre: 'T4',
        periode: 'Octobre - Décembre',
        objectifsAtteints: '',
        performancesResume: '',
        incidentsMajeurs: '',
        ameliorationsApportees: '',
        difficultesRencontrees: '',
        besoinsFormation: '',
        investissementsNecessaires: '',
        tauxSatisfactionUtilisateurs: 100,
        tauxDisponibiliteInfrastructure: 100,
      },
    ],
    bilanAnnuel: {
      annee: annee,
      syntheseGenerale: '',
      objectifsAtteintsTaux: 0,
      performancesTechnicien: '',
      principalesRealisations: '',
      incidentsMajeursAnnee: '',
      ameliorationsApportees: '',
      difficultesOrganisationnelles: '',
      formationsSuiviesEtBesoinsFuturs: '',
      investissementsInformatiquesPreconises: '',
      objectifsAnneeSuivante: '',
      signatureTechnicienDate: '',
      signatureRsiDate: '',
      appreciationRsi: '',
      projetsRoi: [],
    },
  };
}
