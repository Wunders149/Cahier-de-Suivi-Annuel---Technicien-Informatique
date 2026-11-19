import { CahierSuiviData } from '../types/it-tracker';
import { formatDuration } from './durationFormatter';
import { formatInterventionStatusLabel } from './interventionLabels';
import { formatAriary, formatGenerationDateFr } from './docDesign/documentThemes';
import { PdfDocumentBuilder } from './docDesign/pdfLayoutEngine';

/**
 * Déclenche l'aperçu avant impression et l'impression directe en PDF A4 vectoriel haute fidélité
 */
export function triggerPrintToPdf(): void {
  window.print();
}

/**
 * Génère et télécharge directement un fichier PDF A4 complet, paginé et structuré
 * couvrant l'ensemble des 12 rubriques du Cahier de Suivi Annuel.
 */
export function generateDirectPdf(data: CahierSuiviData): void {
  const {
    generalInfo,
    objectifsAnnuels = [],
    jalonsCalendrier = [],
    journalTaches = [],
    interventions = [],
    maintenances = [],
    reseauEquipements = [],
    reseauIncidents = [],
    reseauTestsDebit = [],
    parcEquipements = [],
    logicielsLicences = [],
    sauvegardes = [],
    incidentsSecurite = [],
    consommables = [],
    demandesAchat = [],
    rapportsMensuels = [],
    bilansTrimestriels = [],
    bilanAnnuel,
  } = data;

  const builder = new PdfDocumentBuilder('annual_workbook');
  const genDate = formatGenerationDateFr();

  const entrepriseLabel = generalInfo.entreprise?.trim() || "Direction des Systèmes d'Information";
  const techFullName =
    `${generalInfo.prenomTechnicien || ''} ${generalInfo.nomTechnicien || ''}`.trim() ||
    'Technicien Informatique';
  const responsableLabel = generalInfo.responsableHierarchique
    ? `${generalInfo.responsableHierarchique}${
        generalInfo.titreResponsable ? ` (${generalInfo.titreResponsable})` : ''
      }`
    : generalInfo.titreResponsable || 'Responsable SI (RSI)';

  // --- PAGE 1 : PAGE DE GARDE INSTITUTIONNELLE ---
  builder.drawCoverPage({
    organization: entrepriseLabel,
    department: generalInfo.departement || "Direction des Systèmes d'Information",
    eyebrow: "DIRECTION DES SYSTÈMES D'INFORMATION · DOCUMENT OFFICIEL",
    mainTitle: 'CAHIER DE SUIVI ANNUEL',
    subtitle: 'DU TECHNICIEN INFORMATIQUE',
    exerciseLabel: `EXERCICE ANNUEL ${generalInfo.anneeReference}`,
    tagline:
      "Pilotage Opérationnel, Traçabilité des Interventions, Maintenance Préventive, Infrastructure & Reporting",
    metadataRows: [
      ['Année de référence', `${generalInfo.anneeReference}`],
      ['Technicien titulaire', techFullName],
      ['Fonction', generalInfo.fonction || 'Technicien Informatique'],
      ['Département / Service', generalInfo.departement || 'DSI'],
      ['Entreprise / Organisation', entrepriseLabel],
      ['Responsable hiérarchique', responsableLabel],
      ['Date de prise de fonction', generalInfo.datePriseFonction || '—'],
      [
        'Coordonnées professionnelles',
        generalInfo.telephonePro || generalInfo.emailPro
          ? `${generalInfo.telephonePro || '—'}  |  ${generalInfo.emailPro || '—'}`
          : '—',
      ],
      ['Localisation atelier IT', generalInfo.localisationBureau || '—'],
    ],
    engagementTitle: 'ENGAGEMENT PROFESSIONNEL & DÉONTOLOGIE INFORMATIQUE',
    engagementText:
      "Le technicien soussigné certifie consigner avec rigueur, honnêteté et exactitude l'ensemble des travaux, maintenances, contrôles de sauvegarde et incidents techniques réalisés sur le système d'information. Il s'engage à appliquer les bonnes pratiques d'hygiène numérique et à ne jamais stocker de mot de passe en clair.",
    engagementFooter: `Prise d'effet le ${generalInfo.datePriseFonction || genDate} — Visa Technicien : ${
      generalInfo.charteAcceptee ? '[Lu et Approuvé]' : '[À valider]'
    }`,
  });

  // --- PAGE 2 : SOMMAIRE & TABLEAU DE BORD EXÉCUTIF ---
  builder.addPage();
  builder.drawSectionHeading(
    'SYNTHÈSE EXÉCUTIVE & SOMMAIRE DU CAHIER',
    `Vue consolidée des 12 domaines d'exploitation pour l'exercice ${generalInfo.anneeReference}`
  );

  const interventionsResolues = interventions.filter((i) => i.resultat === 'Résolu').length;
  const tauxFcrGlobal =
    interventions.length > 0
      ? Math.round((interventionsResolues / interventions.length) * 100)
      : 100;
  const tachesTerminees = journalTaches.filter((t) => t.statut === 'Terminé').length;
  const maintenancesConformes = maintenances.filter((m) => m.statut === 'Conforme').length;

  builder.drawKpiStrip([
    {
      label: 'Interventions IT',
      value: `${interventions.length}`,
      sub: `${interventionsResolues} résolues (${tauxFcrGlobal}%)`,
      tone: tauxFcrGlobal >= 85 ? 'success' : 'warning',
    },
    {
      label: 'Journal Quotidien',
      value: `${journalTaches.length}`,
      sub: `${tachesTerminees} tâches terminées`,
      tone: 'info',
    },
    {
      label: 'Maintenance SI',
      value: `${maintenances.length}`,
      sub: `${maintenancesConformes} contrôles conformes`,
      tone: maintenancesConformes === maintenances.length ? 'success' : 'warning',
    },
    {
      label: 'Parc & Réseau',
      value: `${parcEquipements.length + reseauEquipements.length}`,
      sub: `${parcEquipements.length} postes · ${reseauEquipements.length} actifs réseau`,
      tone: 'info',
    },
  ]);

  builder.drawDataTable(
    ['N°', 'Rubrique du Cahier de Suivi', 'Volume Consigné'],
    [
      ['01', 'Informations Générales & Cadre Déontologique', 'Charte & Profil vérifiés'],
      ['02', 'Planification Annuelle & Calendrier', `${objectifsAnnuels.length} objectifs · ${jalonsCalendrier.length} jalons`],
      ['03', 'Journal Quotidien des Activités', `${journalTaches.length} tâches consignées`],
      ['04', 'Registre des Interventions Informatiques', `${interventions.length} fiches d'intervention`],
      ['05', 'Maintenance Préventive & Corrective', `${maintenances.length} points de contrôle`],
      ['06', 'Infrastructure Réseau & Tests de Débit', `${reseauEquipements.length} actifs · ${reseauIncidents.length} incidents · ${reseauTestsDebit.length} tests`],
      ['07', 'Gestion du Parc Informatique (CMDB)', `${parcEquipements.length} équipements inventoriés`],
      ['08', 'Logiciels, Licences & Droits d\'Accès', `${logicielsLicences.length} licences suivies`],
      ['09', 'Sauvegardes 3-2-1 (PRA) & Cybersécurité', `${sauvegardes.length} jobs PRA · ${incidentsSecurite.length} incidents`],
      ['10', 'Consommables, Stocks & Demandes d\'Achat', `${consommables.length} articles · ${demandesAchat.length} demandes`],
      ['11', 'Rapports Mensuels d\'Activité', `${rapportsMensuels.length} mois documentés`],
      ['12', 'Bilans Trimestriels, Bilan Annuel & Projets ROI', `${bilansTrimestriels.length} trimestres · ${bilanAnnuel.projetsRoi?.length || 0} projets ROI`],
    ],
    [10, 58, 32],
    { boldColumns: [0], centerColumns: [0], fontSize: 7.9 }
  );

  // --- SECTION 1 : CADRE DE RÉFÉRENCE ---
  builder.drawSectionHeading(
    '1. INFORMATIONS GÉNÉRALES & DÉONTOLOGIE',
    'Cadre officiel de pilotage et règles de sécurité applicables'
  );
  builder.drawCalloutBox(
    'Règles de Tenue du Registre & Hygiène Informatique',
    "Le présent cahier constitue le registre officiel de traçabilité du technicien informatique.\n• Consigner chronologiquement chaque tâche quotidienne, maintenance et ticket d'intervention.\n• Appliquer les règles de confidentialité et d'hygiène numérique (aucun mot de passe en clair).\n• Mettre ce document à disposition du Responsable SI (RSI) lors des revues mensuelles et trimestrielles.",
    'info'
  );

  // --- SECTION 2 : PLANIFICATION ANNUELLE ---
  builder.drawSectionHeading(
    '2. PLANIFICATION ANNUELLE & CALENDRIER',
    `Objectifs stratégiques, indicateurs de performance (KPI) et jalons clés ${generalInfo.anneeReference}`,
    { pageBreakBefore: true }
  );

  builder.drawSubHeading(`2.1. Objectifs Annuels & KPI (${objectifsAnnuels.length})`);
  builder.drawDataTable(
    ['Réf.', 'Objectif & Missions', 'Résultats Attendus', 'Échéance / Prio', 'KPI Cible', 'Avanc.'],
    objectifsAnnuels.map((obj) => [
      obj.id,
      `${obj.titre}\nMissions : ${obj.missionsPrevue || '—'}`,
      obj.resultatsAttendus || '—',
      `${obj.echeance || '—'}\n[${obj.priorite}]`,
      obj.kpi || '—',
      `${obj.avancement || 0}%\n(${obj.statut})`,
    ]),
    [8, 31, 21, 13, 15, 12],
    { boldColumns: [0], statusColumns: [5], emptyMessage: 'Aucun objectif annuel enregistré.' }
  );

  builder.drawSubHeading(`2.2. Calendrier des Jalons Clés (${jalonsCalendrier.length})`);
  builder.drawDataTable(
    ['Mois', 'Jalon / Opération Majeure', 'Catégorie', 'Priorité', 'Statut'],
    jalonsCalendrier.map((j) => [
      `Mois ${j.mois < 10 ? `0${j.mois}` : j.mois}`,
      `${j.titre}${j.description ? `\n${j.description}` : ''}`,
      j.categorie,
      j.priorite,
      j.estComplete ? 'Réalisé' : 'À réaliser',
    ]),
    [11, 42, 16, 13, 18],
    { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun jalon calendaire planifié.' }
  );

  // --- SECTION 3 : JOURNAL QUOTIDIEN ---
  builder.drawSectionHeading(
    '3. GESTION QUOTIDIENNE DES ACTIVITÉS',
    `Journal de bord chronologique complet (${journalTaches.length} tâches)`
  );
  builder.drawDataTable(
    ['Date & Heure', 'Tâche & Description', 'Catégorie / Prio', 'Durée', 'Statut', 'Résultat & Observations'],
    journalTaches.map((t) => [
      `${t.date}\n${t.heure || '—'}`,
      `${t.tache}${t.description ? `\n${t.description}` : ''}`,
      `${t.categorie}\n[${t.priorite}]`,
      formatDuration(t.dureeReelleMin || t.dureeEstimeeMin || 0),
      t.statut,
      `${t.resultat || '—'}${t.observations ? `\nObs : ${t.observations}` : ''}`,
    ]),
    [13, 29, 17, 10, 11, 20],
    { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucune tâche consignée dans le journal quotidien.' }
  );

  // --- SECTION 4 : REGISTRE DES INTERVENTIONS ---
  builder.drawSectionHeading(
    '4. REGISTRE DES INTERVENTIONS INFORMATIQUES',
    `Traçabilité complète des tickets et opérations techniques (${interventions.length} fiches)`
  );

  builder.drawDataTable(
    ['Réf. / Date', 'Demandeur / Service', 'Équipement & Type', 'Problème & Solution Appliquée', 'Durée', 'Statut'],
    interventions.map((it) => [
      `${it.numeroReference}\n${it.dateReception}`,
      `${it.nomDemandeur}\n(${it.serviceDemandeur})`,
      `${it.equipementConcerne}\n[${it.type || it.typeIntervention}]`,
      `Objet : ${it.descriptionPanne || '—'}\nAction : ${it.solutionAppliquee || 'En cours'}`,
      formatDuration(it.tempsConsacreMin),
      formatInterventionStatusLabel(it.resultat, it.natureIntervention),
    ]),
    [13, 17, 18, 32, 9, 11],
    {
      boldColumns: [0],
      statusColumns: [5],
      emptyMessage: "Aucune fiche d'intervention enregistrée.",
    }
  );

  // --- SECTION 5 : MAINTENANCE PRÉVENTIVE & CORRECTIVE ---
  builder.drawSectionHeading(
    '5. MAINTENANCE PRÉVENTIVE ET CORRECTIVE',
    `Grilles de contrôle des domaines d'infrastructure (${maintenances.length} contrôles)`
  );
  builder.drawDataTable(
    ['Domaine & Cible', 'Type', 'Tâche de Contrôle', 'Fréquence', 'Dernier / Prochain', 'Statut'],
    maintenances.map((m) => [
      `${m.categorie}\n(${m.responsableOuEquipement || 'SI'})`,
      m.typeMaintenance,
      `${m.tacheControle}${m.observations ? `\nObs : ${m.observations}` : ''}`,
      m.frequence,
      `${m.dernierControle || '—'}\n-> ${m.prochainControle || '—'}`,
      `${m.statut}${m.valide ? ' (Validé)' : ''}`,
    ]),
    [19, 11, 31, 12, 15, 12],
    { boldColumns: [0], statusColumns: [5], emptyMessage: 'Aucun contrôle de maintenance enregistré.' }
  );

  // --- SECTION 6 : INFRASTRUCTURE RÉSEAU ---
  builder.drawSectionHeading(
    '6. INFRASTRUCTURE RÉSEAU & PERFORMANCE',
    "Équipements actifs LAN/WAN, registre des incidents et mesures de bande passante"
  );

  builder.drawSubHeading(`6.1. Équipements Réseau (${reseauEquipements.length})`);
  builder.drawDataTable(
    ['Équipement', 'Type & Modèle', 'IP / MAC', 'Localisation / VLAN', 'Firmware / État'],
    reseauEquipements.map((eq) => [
      eq.nom,
      `${eq.type}\n${eq.marqueModele}`,
      `IP : ${eq.adresseIp}\nMAC : ${eq.adresseMac || '—'}`,
      `${eq.localisation}\nVLAN : ${eq.vlan || '—'}`,
      `${eq.firmwareVersion || '—'}\n${eq.etat}`,
    ]),
    [17, 22, 22, 21, 18],
    { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun équipement réseau inventorié.' }
  );

  builder.drawSubHeading(`6.2. Incidents Réseau (${reseauIncidents.length})`);
  builder.drawDataTable(
    ['Date / Heure', 'Liaison / Équipement', 'Type & Cause', 'Durée & Impact', 'Action Corrective / Statut'],
    reseauIncidents.map((inc) => [
      inc.dateHeure,
      inc.equipementOuLiaison,
      `${inc.typeIncident}\nCause : ${inc.cause || '—'}`,
      `${inc.dureeInterruptionMin} min\n${inc.impactUtilisateurs}`,
      `${inc.actionCorrective || '—'}\nStatut : ${inc.statut}`,
    ]),
    [15, 20, 27, 16, 22],
    { boldColumns: [1], statusColumns: [4], emptyMessage: 'Aucun incident réseau déclaré.' }
  );

  builder.drawSubHeading(`6.3. Tests de Débit & SLA (${reseauTestsDebit.length})`);
  builder.drawDataTable(
    ['Date / Heure', 'Ligne / Accès', 'Débit Down / Up', 'Latence / Gigue', 'Conformité'],
    reseauTestsDebit.map((tst) => [
      tst.dateHeure,
      tst.ligneConcernee,
      `Down : ${tst.debitDescendantMbps} Mbps\nUp : ${tst.debitMontantMbps} Mbps`,
      `Ping : ${tst.latenceMs} ms\nGigue : ${tst.gigueMs} ms`,
      tst.statutConformite,
    ]),
    [18, 25, 24, 17, 16],
    { boldColumns: [1], statusColumns: [4], emptyMessage: 'Aucun test de débit enregistré.' }
  );

  // --- SECTION 7 : PARC INFORMATIQUE ---
  builder.drawSectionHeading(
    '7. GESTION DU PARC INFORMATIQUE (CMDB)',
    `Inventaire matériel exhaustif et affectations (${parcEquipements.length} équipements)`
  );
  builder.drawDataTable(
    ['N° Inv. / Type', 'Désignation & S/N', 'Configuration', 'Affectation & Lieu', 'Garantie & État'],
    parcEquipements.map((p) => [
      `${p.numeroInventaire}\n[${p.type}]`,
      `${p.designation}\n${p.marqueModele}\nS/N : ${p.numeroSerie || '—'}`,
      p.configurationTechnique || '—',
      `${p.utilisateurResponsable || '—'}\n${p.service || ''} · ${p.localisation || ''}`,
      `Fin gar. : ${p.finGarantie || '—'}\n${p.etatMateriel}`,
    ]),
    [15, 24, 23, 21, 17],
    { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun équipement dans le parc CMDB.' }
  );

  // --- SECTION 8 : LOGICIELS & LICENCES ---
  builder.drawSectionHeading(
    '8. LOGICIELS, LICENCES & CONTRÔLE D\'ACCÈS',
    `Suivi de conformité logicielle (${logicielsLicences.length} références)`
  );
  builder.drawCalloutBox(
    'Politique Sécurité — Absence de Mots de Passe en Clair',
    "Conformément aux recommandations ANSSI, aucun mot de passe ou secret d'accès n'est consigné dans ce document. Les accès sont administrés via annuaire centralisé (RBAC) et coffre-fort chiffré.",
    'warning'
  );
  builder.drawDataTable(
    ['Logiciel & Éditeur', 'Version / Type', 'Allocations & Statut', 'Expiration / Coût', 'Droits & Procédure'],
    logicielsLicences.map((lic) => [
      `${lic.nomLogiciel}\n(${lic.editeur})`,
      `${lic.version || '—'}\n${lic.typeLicence}`,
      `${lic.nombreLicencesAttribuees} / ${lic.nombreLicencesAchetees}\n${lic.statutConformite}`,
      `Exp : ${lic.dateExpiration || '—'}\n${lic.coutRenouvellementEstime || '—'}`,
      `${lic.gestionComptesEtDroits || '—'}`,
    ]),
    [21, 17, 19, 19, 24],
    { boldColumns: [0], statusColumns: [2], emptyMessage: 'Aucune licence logicielle enregistrée.' }
  );

  // --- SECTION 9 : SAUVEGARDES 3-2-1 & CYBERSÉCURITÉ ---
  builder.drawSectionHeading(
    '9. SAUVEGARDES (PRA) & CYBERSÉCURITÉ',
    'Stratégie 3-2-1, tests de restauration et registre des incidents de sécurité'
  );

  builder.drawSubHeading(`9.1. Matrice des Sauvegardes & Tests PRA (${sauvegardes.length})`);
  builder.drawDataTable(
    ['Job & Serveur Cible', 'Type & Horaire', 'Taille / Durée', 'Destination (3-2-1)', 'Test Restauration & Statut'],
    sauvegardes.map((s) => [
      `${s.nomJob}\nCible : ${s.serveurCible}`,
      `${s.typeSauvegarde}\n${s.horaireExecution}`,
      `${s.tailleGo} Go\n${s.dureeExecutionMin} min`,
      s.destinationStockage,
      `${s.statut}\nTest (${s.dateDernierTestRestauration || '—'}) : ${s.resultatTestRestauration}`,
    ]),
    [22, 19, 13, 22, 24],
    { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun job de sauvegarde configuré.' }
  );

  builder.drawSubHeading(`9.2. Incidents Cybersécurité (${incidentsSecurite.length})`);
  builder.drawDataTable(
    ['Date / Heure', 'Type & Sévérité', 'Postes & Description', 'Actions Menées', 'Statut & Leçons'],
    incidentsSecurite.map((sec) => [
      sec.dateHeure,
      `${sec.typeIncident}\nSévérité : ${sec.severite}`,
      `Postes : ${sec.postesConcernes}\n${sec.description}`,
      sec.actionsMenées,
      `${sec.statut}\n${sec.leconsApprises || ''}`,
    ]),
    [15, 19, 27, 21, 18],
    { boldColumns: [1], statusColumns: [4], emptyMessage: 'Aucun incident de sécurité enregistré.' }
  );

  // --- SECTION 10 : CONSOMMABLES & DEMANDES D'ACHAT ---
  builder.drawSectionHeading(
    '10. CONSOMMABLES & DEMANDES D\'ACHAT',
    "Suivi des stocks critiques d'atelier et engagements budgétaires (en Ariary)"
  );

  builder.drawSubHeading(`10.1. État des Stocks (${consommables.length})`);
  builder.drawDataTable(
    ['Réf. / Désignation', 'Catégorie', 'Stock Actuel / Min', 'Emplacement & Fourn.', 'Statut'],
    consommables.map((c) => [
      `${c.reference}\n${c.designation}`,
      c.categorie,
      `${c.stockActuel} ${c.unite} (Min ${c.stockMinimumAlerte})\nÀ cmd : ${c.quantiteRecommandeeAchat}`,
      `${c.emplacementStock}\n${c.fournisseur}`,
      c.statut,
    ]),
    [26, 19, 20, 21, 14],
    { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun article consommable référencé.' }
  );

  builder.drawSubHeading(`10.2. Demandes d'Achat (${demandesAchat.length})`);
  builder.drawDataTable(
    ['N° Commande & Date', 'Articles & Quantité', 'Fournisseur & Montant TTC', 'Statut', 'Réception / Obs'],
    demandesAchat.map((da) => [
      `${da.numeroCommande}\n${da.dateDemande}`,
      `${da.articlesDemandes} (x${da.quantite})`,
      `${da.fournisseur}\n${formatAriary(da.montantEstimeTTC, true)}`,
      da.statut,
      `${da.dateReception || 'En attente'}${da.observations ? `\n${da.observations}` : ''}`,
    ]),
    [17, 30, 21, 16, 16],
    { boldColumns: [0], statusColumns: [3], emptyMessage: "Aucune demande d'achat enregistrée." }
  );

  // --- SECTION 11 : SYNTHÈSE DES 12 RAPPORTS MENSUELS ---
  builder.drawSectionHeading(
    '11. RAPPORTS MENSUELS D\'ACTIVITÉ',
    'Tableau récapitulatif des indicateurs et livrables sur les 12 mois'
  );
  builder.drawDataTable(
    ['Mois', 'Tickets (Rés./Tot.)', 'FCR / MTTR', 'Travaux & Faits Marquants', 'Visa RSI'],
    rapportsMensuels.map((rep) => [
      `${rep.nomMois}\n${rep.annee}`,
      `${rep.incidentsResolus} / ${rep.totalInterventions}\n(${rep.incidentsEnCours} en cours)`,
      `${rep.tauxResolutionFCR}%\n${formatDuration(rep.dureeMoyenneResolutionMin)}`,
      `${rep.travauxRealises || 'RAS'}${rep.recommandationsTechnicien ? `\nReco : ${rep.recommandationsTechnicien}` : ''}`,
      rep.valideParHierarchie
        ? `Validé\n${rep.dateValidation || ''}`
        : `${rep.statutLivraison || 'En attente'}`,
    ]),
    [13, 15, 13, 44, 15],
    { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun rapport mensuel disponible.' }
  );

  // --- SECTION 12 : BILANS TRIMESTRIELS, BILAN ANNUEL & ROI ---
  builder.drawSectionHeading(
    '12. BILANS TRIMESTRIELS, BILAN ANNUEL & ROI',
    `Consolidation de l'exercice ${bilanAnnuel.annee}, projets ROI et clôture hiérarchique`,
    { pageBreakBefore: true }
  );

  builder.drawSubHeading('12.1. Synthèse des Trimestres (T1 à T4)');
  builder.drawDataTable(
    ['Trimestre', 'Objectifs & Réalisations', 'Satisfaction / Dispo', 'Difficultés & Formation', 'Investissements'],
    bilansTrimestriels.map((bt) => [
      `${bt.trimestre}\n(${bt.periode})`,
      `${bt.objectifsAtteints || '—'}\n${bt.performancesResume || ''}`,
      `Satisf. : ${bt.tauxSatisfactionUtilisateurs}%\nDispo : ${bt.tauxDisponibiliteInfrastructure}%`,
      `${bt.difficultesRencontrees || '—'}\nForm. : ${bt.besoinsFormation || '—'}`,
      bt.investissementsNecessaires || '—',
    ]),
    [13, 30, 16, 22, 19],
    { boldColumns: [0], emptyMessage: 'Aucun bilan trimestriel renseigné.' }
  );

  builder.drawSubHeading(`12.2. Bilan Annuel Consolidé (${bilanAnnuel.annee})`);
  builder.drawKeyValueTable(
    [
      { label: "Synthèse générale de l'année", value: bilanAnnuel.syntheseGenerale || '—' },
      {
        label: "Taux d'objectifs atteints",
        value: `${bilanAnnuel.objectifsAtteintsTaux || 0}% des objectifs annuels validés`,
        isStatus: true,
        tone: (bilanAnnuel.objectifsAtteintsTaux || 0) >= 80 ? 'success' : 'warning',
      },
      { label: 'Principales réalisations', value: bilanAnnuel.principalesRealisations || '—' },
      { label: "Incidents majeurs de l'année", value: bilanAnnuel.incidentsMajeursAnnee || '—' },
      { label: 'Améliorations apportées au SI', value: bilanAnnuel.ameliorationsApportees || '—' },
      { label: 'Formations & besoins futurs', value: bilanAnnuel.formationsSuiviesEtBesoinsFuturs || '—' },
      { label: 'Investissements N+1 préconisés', value: bilanAnnuel.investissementsInformatiquesPreconises || '—' },
      { label: 'Objectifs stratégiques N+1', value: bilanAnnuel.objectifsAnneeSuivante || '—' },
      {
        label: 'Appréciation du RSI',
        value: bilanAnnuel.appreciationRsi?.trim() || 'En attente de revue hiérarchique.',
      },
    ],
    { headerLeft: 'Rubrique de Bilan', headerRight: 'Synthèse & Constats Consolidés', labelWidthMm: 56 }
  );

  if (bilanAnnuel.projetsRoi && bilanAnnuel.projetsRoi.length > 0) {
    builder.drawSubHeading(`12.3. Retour sur Investissement (ROI) des Projets IT (${bilanAnnuel.projetsRoi.length})`);
    builder.drawDataTable(
      ['Projet IT & Catégorie', 'Investissement', 'Économies / An', 'Temps Gagné / An', 'ROI An 1 & Payback'],
      bilanAnnuel.projetsRoi.map((p) => {
        const invest = p.coutInvestissementEuros || 0;
        const eco = p.economiesFinancieresAnnuellesEuros || 0;
        const heures = p.gainTempsEstimeHeuresParAn || 0;
        const taux = p.tauxHoraireMoyenValorise || 25000;
        const val = eco + heures * taux;
        const roi = invest > 0 ? Math.round(((val - invest) / invest) * 100) : 0;
        const payback = val > 0 ? Math.round((invest / val) * 12 * 10) / 10 : 0;
        return [
          `${p.nomProjet}\n[${p.categorie}] · ${p.statut}`,
          formatAriary(invest, true),
          `+${formatAriary(eco, true)}`,
          `${heures} h/an\n(+${formatAriary(heures * taux, true)})`,
          `${roi >= 0 ? `+${roi}%` : `${roi}%`}\n(Amorti ${payback} mois)`,
        ];
      }),
      [29, 17, 18, 19, 17],
      {
        boldColumns: [0],
        alignRightColumns: [1, 2],
        statusColumns: [4],
      }
    );
  }

  builder.drawSubHeading('12.4. Signatures & Clôture Officielle');
  builder.drawSignatureGrid(
    {
      role: 'TECHNICIEN INFORMATIQUE TITULAIRE',
      name: techFullName,
      dateLabel: bilanAnnuel.signatureTechnicienDate || undefined,
      statusLabel: bilanAnnuel.signatureTechnicienDate ? 'Signé & Certifié' : 'En attente de signature',
      signed: Boolean(bilanAnnuel.signatureTechnicienDate),
    },
    {
      role: 'RESPONSABLE SYSTÈMES D\'INFORMATION (RSI)',
      name: responsableLabel,
      dateLabel: bilanAnnuel.signatureRsiDate || undefined,
      statusLabel: bilanAnnuel.signatureRsiDate ? 'Approuvé & Validé' : 'En attente de visa',
      signed: Boolean(bilanAnnuel.signatureRsiDate),
    }
  );

  // En-têtes & pieds de page homogènes avec pagination "Page X sur Y"
  builder.finalizeHeadersAndFooters({
    organization: entrepriseLabel,
    documentTitle: `Cahier de Suivi Annuel IT ${generalInfo.anneeReference}`,
    reference: `CAHIER-${generalInfo.anneeReference}`,
    generationDate: genDate,
    hasCoverPage: true,
  });

  builder.docInstance.save(`cahier_suivi_annuel_technicien_it_${generalInfo.anneeReference}.pdf`);
}
