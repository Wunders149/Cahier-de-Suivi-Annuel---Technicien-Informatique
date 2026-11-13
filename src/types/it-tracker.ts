/**
 * Types pour le Cahier de Suivi Annuel du Technicien Informatique
 */

export interface GeneralInfo {
  anneeReference: number;
  nomTechnicien: string;
  prenomTechnicien: string;
  fonction: string;
  departement: string;
  entreprise: string;
  responsableHierarchique: string;
  titreResponsable: string;
  datePriseFonction: string;
  telephonePro: string;
  emailPro: string;
  localisationBureau: string;
  charteAcceptee: boolean;
}

export interface ObjectifAnnuel {
  id: string;
  titre: string;
  description: string;
  missionsPrevue: string;
  resultatsAttendus: string;
  ressourcesNecessaires: string;
  echeance: string;
  priorite: 'Haute' | 'Moyenne' | 'Basse';
  kpi: string;
  avancement: number; // 0 à 100
  statut: 'Non démarré' | 'En cours' | 'Atteint' | 'Partiel' | 'Reporté';
}

export interface JalonCalendrier {
  id: string;
  mois: number; // 1 à 12
  titre: string;
  description: string;
  categorie: 'Projet' | 'Maintenance' | 'Audit' | 'Renouvellement' | 'Formation' | 'Inventaire';
  priorite: 'Haute' | 'Normale' | 'Basse';
  estComplete: boolean;
}

export interface TacheJournal {
  id: string;
  date: string;
  heure: string;
  tache: string;
  description: string;
  categorie: 'Support Utilisateur' | 'Déploiement Matériel' | 'Réseau & Wifi' | 'Système & Serveur' | 'Maintenance Préventive' | 'Sécurité & Sauvegarde' | 'Gestion des Stocks' | 'Autre';
  priorite: 'Urgente' | 'Élevée' | 'Normale' | 'Faible';
  dureeEstimeeMin: number;
  dureeReelleMin: number;
  statut: 'À faire' | 'En cours' | 'Terminé' | 'Reporté' | 'En attente';
  resultat: string;
  observations: string;
}

export type NatureIntervention =
  | 'Incident / Dépannage'
  | 'Déploiement / Installation'
  | 'Maintenance / Contrôle';

export interface InterventionEquipementDetail {
  id: string;
  equipement: string;
  titre: string;
  constatDiagnostic: string;
  actionsCorrectives: string[];
  operationsResume?: string;
  materielSpecifique: string;
  statut: 'Résolu' | 'En cours' | 'En attente pièce' | 'Escaladé N3' | 'Non résolu';
  resultatDetail?: string;
}

export interface FicheIntervention {
  id: string;
  numeroReference: string; // Ex: INT-2026-001
  dateReception: string;
  heureReception: string;
  nomDemandeur: string;
  serviceDemandeur: string;
  equipementConcerne: string;
  natureIntervention?: NatureIntervention;
  typeIntervention:
    | 'Matériel'
    | 'Logiciel'
    | 'Réseau'
    | 'Vidéosurveillance'
    | 'Infrastructure'
    | 'Déploiement'
    | 'Systèmes / IoT'
    | 'Compte/Accès'
    | 'Téléphonie';
  priorite: 'Critique' | 'Haute' | 'Normale' | 'Basse';
  domaineTitre?: string; // En-tête métier (ex: DÉPLOIEMENT & SÉCURISATION MARITIME)
  titreRapport?: string; // Sous-titre descriptif du rapport détaillé
  descriptionPanne: string;
  diagnosticTechnique: string;
  causeIdentifiee: string;
  analyseCauseRacine?: string; // Analyse technique approfondie ou étapes techniques réalisées (Section 2)
  solutionAppliquee: string;
  materielLogicielUtilise: string;
  recommandations?: string; // Recommandations d'exploitation et d'entretien
  tempsConsacreMin: number;
  resultat: 'Résolu' | 'En cours' | 'En attente pièce' | 'Escaladé N3' | 'Non résolu';
  validationDemandeur: boolean;
  dateValidation?: string;
  commentairesDemandeur?: string;
  detailEquipements?: InterventionEquipementDetail[];
}

export interface ItemMaintenance {
  id: string;
  categorie: 
    | 'Ordinateurs'
    | 'Imprimantes'
    | 'Périphériques'
    | 'Nettoyage physique'
    | 'Mise à jour OS'
    | 'Vérification Antivirus'
    | 'Disques et stockage'
    | 'Serveurs'
    | 'Équipements réseau'
    | 'Onduleurs'
    | 'Contrôle sauvegardes';
  typeMaintenance: 'Préventive' | 'Corrective';
  tacheControle: string;
  frequence: 'Quotidienne' | 'Hebdomadaire' | 'Mensuelle' | 'Trimestrielle' | 'Semestrielle' | 'Annuelle';
  dernierControle: string;
  prochainControle: string;
  statut: 'Conforme' | 'À traiter' | 'Critique' | 'Non applicable';
  responsableOuEquipement: string;
  observations: string;
  valide: boolean;
}

export interface EquipementReseau {
  id: string;
  nom: string;
  type: 'Routeur' | 'Switch' | 'Point d\'accès Wi-Fi' | 'Firewall' | 'Onduleur Réseau' | 'Serveur DHCP/DNS';
  marqueModele: string;
  adresseIp: string;
  adresseMac: string;
  localisation: string;
  vlan: string;
  portsPoE: string;
  firmwareVersion: string;
  etat: 'En ligne' | 'Alerte' | 'Hors ligne' | 'En maintenance';
  dernierReboot: string;
  observations: string;
}

export interface IncidentReseau {
  id: string;
  dateHeure: string;
  equipementOuLiaison: string;
  typeIncident: 'Coupure Internet' | 'Saturation bande passante' | 'Perte ping switch' | 'Panne Wi-Fi' | 'Conflit IP' | 'Câble défectueux';
  dureeInterruptionMin: number;
  impactUtilisateurs: 'Général' | 'Service complet' | 'Quelques postes' | 'Transparent';
  cause: string;
  actionCorrective: string;
  statut: 'Résolu' | 'En investigation' | 'Ticket FAI ouvert';
}

export interface TestDebitReseau {
  id: string;
  dateHeure: string;
  ligneConcernee: string;
  debitDescendantMbps: number;
  debitMontantMbps: number;
  latenceMs: number;
  gigueMs: number;
  statutConformite: 'Conforme SLA' | 'Dégradé' | 'Anormalement bas';
  observations: string;
}

export interface EquipementParc {
  id: string;
  numeroInventaire: string; // Ex: PARC-2026-PC-014
  designation: string;
  type: 'PC Portable' | 'PC Fixe' | 'Serveur' | 'Imprimante' | 'Écran' | 'Périphérique' | 'Smartphone' | 'Tablette' | 'Switch/Réseau';
  marqueModele: string;
  numeroSerie: string;
  configurationTechnique: string; // CPU, RAM, Stockage, OS
  dateAcquisition: string;
  etatMateriel: 'Neuf' | 'Très bon état' | 'Bon état' | 'Dégradé' | 'En réparation' | 'Rebut / Obsolète';
  utilisateurResponsable: string;
  service: string;
  localisation: string;
  finGarantie: string;
  dureeVieEstimeeAns: number;
  historiqueInterventions: string;
}

export interface LogicielLicence {
  id: string;
  nomLogiciel: string;
  editeur: string;
  version: string;
  typeLicence: 'Abonnement SaaS' | 'Perpétuelle' | 'OEM' | 'Open Source' | 'Volume VL';
  nombreLicencesAchetees: number;
  nombreLicencesAttribuees: number;
  dateExpiration: string;
  coutRenouvellementEstime: string;
  procedureInstallation: string;
  gestionComptesEtDroits: string; // Ex: Synchronisation Entra ID / Groupes RBAC
  statutConformite: 'Conforme' | 'Sous-licencié' | 'Sur-licencié' | 'Expire sous 30j';
  observations: string;
}

export interface SuiviSauvegarde {
  id: string;
  nomJob: string;
  serveurCible: string;
  typeSauvegarde: 'Quotidienne Incrémentale' | 'Hebdomadaire Différentielle' | 'Mensuelle Complète' | 'Snapshot Cloud';
  horaireExecution: string;
  tailleGo: number;
  dureeExecutionMin: number;
  destinationStockage: string; // Ex: NAS Local + Cloud Immuable (Règle 3-2-1)
  statut: 'Succès' | 'Avertissement' | 'Échec' | 'Non exécuté';
  dateDernierTestRestauration: string;
  resultatTestRestauration: 'Succès complet' | 'Succès partiel' | 'Échec' | 'À planifier';
  observations: string;
}

export interface IncidentSecurite {
  id: string;
  dateHeure: string;
  typeIncident: 'Tentative Phishing' | 'Alerte EDR / Malware' | 'Tentative Brute Force' | 'Périphérique USB non autorisé' | 'Perte / Vol matériel' | 'Faille vulnérabilité critique';
  severite: 'Critique' | 'Élevée' | 'Moyenne' | 'Faible';
  postesConcernes: string;
  description: string;
  actionsMenées: string;
  statut: 'Clôturé' | 'Sous surveillance' | 'Rapporté au RSSI';
  leconsApprises: string;
}

export interface ArticleConsommable {
  id: string;
  reference: string;
  designation: string;
  categorie: 'Toners & Cartouches' | 'Papier' | 'Câbles & Connectique' | 'Périphériques d\'entrée' | 'Stockage & Accessoires' | 'Pièces de rechange' | 'Nouveaux équipements';
  stockActuel: number;
  stockMinimumAlerte: number;
  quantiteRecommandeeAchat: number;
  unite: 'Unité' | 'Pack' | 'Carton' | 'Rouleau';
  emplacementStock: string;
  fournisseur: string;
  statut: 'En stock' | 'Stock bas' | 'Rupture' | 'Commande en cours';
}

export interface DemandeAchat {
  id: string;
  numeroCommande: string;
  dateDemande: string;
  demandeur: string;
  articlesDemandes: string;
  quantite: number;
  fournisseur: string;
  montantEstimeTTC: number;
  priorite: 'Urgente' | 'Normale' | 'Basse';
  statut: 'Brouillon' | 'Validé Direction' | 'Commandé' | 'Reçu / Contrôlé';
  dateReception?: string;
  observations: string;
}

export interface RapportMensuel {
  moisIndex: number; // 1 = Janvier, 12 = Décembre
  nomMois: string;
  annee: number;
  totalInterventions: number;
  incidentsResolus: number;
  incidentsEnCours: number;
  tauxResolutionFCR: number; // %
  dureeMoyenneResolutionMin: number;
  travauxRealises: string;
  maintenanceEffectuee: string;
  problemesRecurrents: string;
  difficultesRencontrees: string;
  besoinsMaterielsLogiciels: string;
  recommandationsTechnicien: string;
  activitesMoisSuivant: string;
  valideParHierarchie: boolean;
  dateValidation?: string;
  statutLivraison?: 'Non livré' | 'Prêt à livrer' | 'Livré';
  dateLivraison?: string;
  destinataireLivraison?: string;
  modeLivraison?: 'PDF (.pdf)' | 'Word (.docx)' | 'PDF & Word' | 'Remise directe / Email';
  noteLivraison?: string;
}

export interface BilanTrimestriel {
  trimestre: 'T1' | 'T2' | 'T3' | 'T4';
  periode: string; // Ex: Janvier - Mars
  objectifsAtteints: string;
  performancesResume: string;
  incidentsMajeurs: string;
  ameliorationsApportees: string;
  difficultesRencontrees: string;
  besoinsFormation: string;
  investissementsNecessaires: string;
  tauxSatisfactionUtilisateurs: number; // %
  tauxDisponibiliteInfrastructure: number; // %
}

export interface ProjetRoiIT {
  id: string;
  nomProjet: string;
  description: string;
  categorie: 'Infrastructure' | 'Sécurité & Sauvegarde' | 'Automatisation' | 'Bureautique & Postes' | 'Cloud & SaaS' | 'Réseau & Télécoms';
  coutInvestissementEuros: number; // Coût matériel, logiciels, prestation initiale (€)
  economiesFinancieresAnnuellesEuros: number; // Économies financières directes récurrentes (€ / an)
  gainTempsEstimeHeuresParAn: number; // Heures de travail économisées par an (équipe IT ou utilisateurs)
  tauxHoraireMoyenValorise: number; // Taux horaire de valorisation du temps (€ / h, ex: 35 €/h)
  impactQualitatif: string; // Ex: Fiabilité accrue, satisfaction utilisateurs, conformité ISO/RGPD
  dateMiseEnService: string;
  statut: 'En production' | 'En cours' | 'Clôturé avec succès';
}

export interface BilanAnnuel {
  annee: number;
  syntheseGenerale: string;
  objectifsAtteintsTaux: number; // %
  performancesTechnicien: string;
  principalesRealisations: string;
  incidentsMajeursAnnee: string;
  ameliorationsApportees: string;
  difficultesOrganisationnelles: string;
  formationsSuiviesEtBesoinsFuturs: string;
  investissementsInformatiquesPreconises: string;
  objectifsAnneeSuivante: string;
  signatureTechnicienDate: string;
  signatureRsiDate: string;
  appreciationRsi: string;
  projetsRoi?: ProjetRoiIT[];
}

export interface CahierSuiviData {
  generalInfo: GeneralInfo;
  objectifsAnnuels: ObjectifAnnuel[];
  jalonsCalendrier: JalonCalendrier[];
  journalTaches: TacheJournal[];
  interventions: FicheIntervention[];
  maintenances: ItemMaintenance[];
  reseauEquipements: EquipementReseau[];
  reseauIncidents: IncidentReseau[];
  reseauTestsDebit: TestDebitReseau[];
  parcEquipements: EquipementParc[];
  logicielsLicences: LogicielLicence[];
  sauvegardes: SuiviSauvegarde[];
  incidentsSecurite: IncidentSecurite[];
  consommables: ArticleConsommable[];
  demandesAchat: DemandeAchat[];
  rapportsMensuels: RapportMensuel[];
  bilansTrimestriels: BilanTrimestriel[];
  bilanAnnuel: BilanAnnuel;
}
