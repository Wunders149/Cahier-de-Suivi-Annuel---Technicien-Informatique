import { CahierSuiviData } from '../types/it-tracker';

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
    const workbookData: CahierSuiviData = parsed.data && parsed.data.generalInfo ? parsed.data : parsed;

    if (!workbookData.generalInfo || !workbookData.generalInfo.anneeReference) {
      return {
        success: false,
        error: 'Le fichier ne contient pas une structure valide de Cahier de Suivi Informatique (champ generalInfo manquant).',
      };
    }

    return {
      success: true,
      data: workbookData,
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
  technicienNom: string = '',
  technicienPrenom: string = '',
  entreprise: string = '',
  responsableHierarchique: string = ''
): CahierSuiviData {
  return {
    generalInfo: {
      anneeReference: annee,
      nomTechnicien: technicienNom,
      prenomTechnicien: technicienPrenom,
      fonction: 'Technicien Informatique',
      departement: 'Direction des Systèmes d\'Information (DSI)',
      entreprise: entreprise || 'Votre Entreprise',
      responsableHierarchique: responsableHierarchique,
      titreResponsable: 'Responsable des Systèmes d\'Information (RSI)',
      datePriseFonction: new Date().toISOString().split('T')[0],
      telephonePro: '',
      emailPro: '',
      localisationBureau: 'Atelier / Support IT',
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
