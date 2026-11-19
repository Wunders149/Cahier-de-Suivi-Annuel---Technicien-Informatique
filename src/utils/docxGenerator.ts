import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { CahierSuiviData } from '../types/it-tracker';
import { formatDuration } from './durationFormatter';
import { formatInterventionStatusLabel } from './interventionLabels';
import {
  formatAriary,
  formatGenerationDateFr,
  getDocumentTheme,
  getOrganizationMonogram,
  sanitizeDocxText,
} from './docDesign/documentThemes';
import {
  A4_HEIGHT_DXA,
  A4_WIDTH_DXA,
  CONTENT_WIDTH_DXA,
  NO_BORDERS,
  STANDARD_MARGIN_DXA,
  createDocxCalloutBox,
  createDocxDataTable,
  createDocxKeyValueGridTable,
  createDocxKpiStripTable,
  createDocxRunningFooter,
  createDocxRunningHeader,
  createDocxSectionHeading,
  createDocxSignatureTable,
  createDocxSubHeading,
  createEditorialDocStyles,
  packAndSaveDocx,
} from './docDesign/docxLayoutEngine';

export async function generateDocx(data: CahierSuiviData): Promise<void> {
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

  const theme = getDocumentTheme('annual_workbook');
  const genDate = formatGenerationDateFr();
  const entrepriseLabel = generalInfo.entreprise?.trim() || "Direction des Systèmes d'Information";
  const departmentLabel = generalInfo.departement?.trim() || "Direction des Systèmes d'Information";
  const techFullName =
    `${generalInfo.prenomTechnicien || ''} ${generalInfo.nomTechnicien || ''}`.trim() ||
    'Technicien Informatique';
  const responsableLabel = generalInfo.responsableHierarchique
    ? `${generalInfo.responsableHierarchique}${
        generalInfo.titreResponsable ? ` (${generalInfo.titreResponsable})` : ''
      }`
    : generalInfo.titreResponsable || 'Responsable SI (RSI)';
  const monogram = getOrganizationMonogram(entrepriseLabel);

  const interventionsResolues = interventions.filter((i) => i.resultat === 'Résolu').length;
  const tauxFcrGlobal =
    interventions.length > 0
      ? Math.round((interventionsResolues / interventions.length) * 100)
      : 100;
  const tachesTerminees = journalTaches.filter((t) => t.statut === 'Terminé').length;
  const maintenancesConformes = maintenances.filter((m) => m.statut === 'Conforme').length;

  // --- EN-TÊTE ET PIED DE PAGE ---
  const runningHeader = createDocxRunningHeader({
    theme,
    organization: entrepriseLabel,
    documentTitle: `Cahier de Suivi Annuel IT ${generalInfo.anneeReference}`,
    reference: `CAHIER-${generalInfo.anneeReference}`,
    generationDate: genDate,
  });

  const runningFooter = createDocxRunningFooter({
    theme,
    organization: entrepriseLabel,
    confidentialityText: "Cahier de Suivi Annuel IT — Document Confidentiel Interne",
    generationDate: genDate,
  });

  // Pied de page minimaliste pour la couverture (titlePage: true)
  const coverFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: `${sanitizeDocxText(entrepriseLabel)} · Exercice ${generalInfo.anneeReference} · Document confidentiel interne — Édité le ${genDate}`,
            size: 15,
            color: theme.textMutedHex,
          }),
        ],
      }),
    ],
  });

  // --- BANDEAU IDENTITÉ COUVERTURE ---
  const coverHeaderStrip = new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [1100, 6246, 2400],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 1100, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: theme.primaryHex },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              ...NO_BORDERS,
              top: { style: BorderStyle.SINGLE, size: 18, color: theme.accentHex },
            },
            margins: { top: 120, bottom: 120, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: monogram,
                    bold: true,
                    size: monogram.length >= 3 ? 26 : 30,
                    color: 'FFFFFF',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 6246, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              ...NO_BORDERS,
              bottom: { style: BorderStyle.SINGLE, size: 8, color: theme.borderHex },
            },
            margins: { top: 80, bottom: 80, left: 160, right: 100 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(entrepriseLabel).toUpperCase(),
                    bold: true,
                    size: 22,
                    color: theme.primaryHex,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(departmentLabel),
                    size: 17,
                    color: theme.textMutedHex,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              ...NO_BORDERS,
              bottom: { style: BorderStyle.SINGLE, size: 8, color: theme.borderHex },
            },
            margins: { top: 80, bottom: 80, left: 80, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: `Édition du ${genDate}`,
                    size: 16,
                    color: theme.textMutedHex,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Badge exercice centré sur la couverture
  const exerciseBadgeTable = new Table({
    width: { size: 3800, type: WidthType.DXA },
    columnWidths: [3800],
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 3800, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: theme.primaryHex },
            borders: NO_BORDERS,
            margins: { top: 90, bottom: 90, left: 160, right: 160 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: `EXERCICE ANNUEL ${generalInfo.anneeReference}`,
                    bold: true,
                    size: 22,
                    color: 'FFFFFF',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    title: `Cahier de Suivi Annuel IT ${generalInfo.anneeReference} — ${entrepriseLabel}`,
    subject: 'Suivi Opérationnel, Interventions, Maintenance & Infrastructure SI',
    creator: techFullName,
    styles: createEditorialDocStyles(theme),
    sections: [
      // ==================== SECTION 0 : PAGE DE GARDE ====================
      {
        properties: {
          titlePage: true,
          page: {
            size: { width: A4_WIDTH_DXA, height: A4_HEIGHT_DXA },
            margin: {
              top: STANDARD_MARGIN_DXA,
              right: STANDARD_MARGIN_DXA,
              bottom: STANDARD_MARGIN_DXA,
              left: STANDARD_MARGIN_DXA,
            },
          },
        },
        footers: {
          first: coverFooter,
          default: runningFooter,
        },
        children: [
          coverHeaderStrip,
          new Paragraph({ text: '', spacing: { before: 520, after: 0 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 120 },
            children: [
              new TextRun({
                text: "DIRECTION DES SYSTÈMES D'INFORMATION · DOCUMENT OFFICIEL",
                bold: true,
                color: theme.accentHex,
                size: 19,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 60 },
            children: [
              new TextRun({
                text: 'CAHIER DE SUIVI ANNUEL',
                bold: true,
                color: theme.primaryHex,
                size: 48,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 220 },
            children: [
              new TextRun({
                text: 'DU TECHNICIEN INFORMATIQUE',
                bold: true,
                color: theme.secondaryHex,
                size: 30,
              }),
            ],
          }),
          exerciseBadgeTable,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 420 },
            children: [
              new TextRun({
                text: "Outil de Pilotage Opérationnel, Traçabilité des Interventions, Maintenance Préventive & Reporting SI",
                italics: true,
                size: 19,
                color: theme.textMutedHex,
              }),
            ],
          }),

          // Fiche d'identification
          createDocxKeyValueGridTable(
            theme,
            [
              { kind: 'pair', label: 'ANNÉE DE RÉFÉRENCE', value: `${generalInfo.anneeReference}` },
              { kind: 'pair', label: 'TECHNICIEN TITULAIRE', value: techFullName },
              {
                kind: 'pair',
                label: 'FONCTION',
                value: generalInfo.fonction || 'Technicien Informatique',
              },
              {
                kind: 'pair',
                label: 'DÉPARTEMENT / SERVICE',
                value: departmentLabel,
              },
              { kind: 'pair', label: 'ENTREPRISE / ORGANISATION', value: entrepriseLabel },
              { kind: 'pair', label: 'RESPONSABLE HIÉRARCHIQUE', value: responsableLabel },
              {
                kind: 'pair',
                label: 'DATE DE PRISE DE FONCTION',
                value: generalInfo.datePriseFonction || '—',
              },
              {
                kind: 'pair',
                label: 'COORDONNÉES PRO',
                value: `Tél : ${generalInfo.telephonePro || '—'}  |  Email : ${generalInfo.emailPro || '—'}`,
              },
              {
                kind: 'pair',
                label: 'LOCALISATION ATELIER IT',
                value: generalInfo.localisationBureau || '—',
              },
            ],
            { labelWidthPct: 35 }
          ),

          new Paragraph({ text: '', spacing: { before: 320, after: 0 } }),
          createDocxCalloutBox(
            theme,
            'ENGAGEMENT PROFESSIONNEL & DÉONTOLOGIE INFORMATIQUE',
            `Le technicien soussigné certifie consigner avec rigueur, honnêteté et exactitude l'ensemble des travaux, maintenances, contrôles de sauvegarde et incidents techniques réalisés sur le système d'information. Il garantit la stricte confidentialité des données et l'absence totale de mots de passe en clair.\nPrise d'effet : ${generalInfo.datePriseFonction || genDate} — Visa Technicien : ${
              generalInfo.charteAcceptee ? '[Lu et Approuvé]' : '[En attente de validation]'
            }`,
            'info'
          ),
        ],
      },

      // ==================== SECTION 1+ : CORPS COMPLET DU CAHIER ====================
      {
        properties: {
          page: {
            size: { width: A4_WIDTH_DXA, height: A4_HEIGHT_DXA },
            margin: {
              top: STANDARD_MARGIN_DXA,
              right: STANDARD_MARGIN_DXA,
              bottom: STANDARD_MARGIN_DXA,
              left: STANDARD_MARGIN_DXA,
            },
          },
        },
        headers: {
          default: runningHeader,
        },
        footers: {
          default: runningFooter,
        },
        children: [
          // --- SOMMAIRE & KPI EXÉCUTIFS ---
          ...createDocxSectionHeading(
            theme,
            'SYNTHÈSE EXÉCUTIVE & TABLE DES MATIÈRES',
            `Vue consolidée des 12 domaines d'exploitation pour l'exercice ${generalInfo.anneeReference}`
          ),
          createDocxKpiStripTable(theme, [
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
          ]),
          new Paragraph({ text: '', spacing: { before: 120, after: 0 } }),
          createDocxDataTable(
            theme,
            ['N°', 'Rubrique du Cahier de Suivi', 'Périmètre Consigné'],
            [
              ['01', 'Informations Générales & Engagement Déontologique', 'Charte & Profil vérifiés'],
              [
                '02',
                "Planification Annuelle & Calendrier d'Activité",
                `${objectifsAnnuels.length} objectifs · ${jalonsCalendrier.length} jalons`,
              ],
              [
                '03',
                'Gestion Quotidienne des Activités (Journal de Bord)',
                `${journalTaches.length} tâches consignées`,
              ],
              [
                '04',
                "Registre des Interventions Informatiques & Fiches Détaillées",
                `${interventions.length} fiches d'intervention`,
              ],
              [
                '05',
                'Maintenance Préventive et Corrective',
                `${maintenances.length} points de contrôle`,
              ],
              [
                '06',
                'Infrastructure Réseau, Incidents & Tests de Débit',
                `${reseauEquipements.length} actifs · ${reseauIncidents.length} incidents · ${reseauTestsDebit.length} tests`,
              ],
              [
                '07',
                'Gestion du Parc Informatique (CMDB & Inventaire)',
                `${parcEquipements.length} équipements inventoriés`,
              ],
              [
                '08',
                'Gestion des Logiciels, Licences et Droits d\'Accès',
                `${logicielsLicences.length} licences suivies`,
              ],
              [
                '09',
                'Sauvegardes 3-2-1, Tests PRA & Cybersécurité',
                `${sauvegardes.length} jobs PRA · ${incidentsSecurite.length} incidents`,
              ],
              [
                '10',
                'Consommables, Stocks & Demandes d\'Achat',
                `${consommables.length} articles · ${demandesAchat.length} demandes`,
              ],
              [
                '11',
                "Rapports Mensuels d'Activité (12 Mois Complets)",
                `${rapportsMensuels.length} mois documentés`,
              ],
              [
                '12',
                'Bilans Trimestriels, Bilan Annuel, Projets ROI & Clôture',
                `${bilansTrimestriels.length} trimestres · ${bilanAnnuel.projetsRoi?.length || 0} projets ROI`,
              ],
            ],
            [10, 60, 30],
            { boldColumns: [0], centerColumns: [0] }
          ),

          // --- SECTION 1 ---
          ...createDocxSectionHeading(
            theme,
            '1. INFORMATIONS GÉNÉRALES & DÉONTOLOGIE',
            'Cadre de référence, engagement professionnel et règles de tenue du cahier',
            { pageBreakBefore: true }
          ),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: "Le présent cahier constitue l'outil officiel de travail, de traçabilité et de reporting du technicien informatique. Il est tenu à jour au fil de l'eau et mis à disposition du Responsable des Systèmes d'Information (RSI) pour revue et validation.",
              }),
            ],
          }),
          createDocxCalloutBox(
            theme,
            'ENGAGEMENT DÉONTOLOGIQUE & RÈGLES ANSSI',
            "• Consigner avec exactitude toute intervention matérielle, logicielle, réseau ou de sauvegarde effectuée sur le SI.\n• Respecter scrupuleusement la confidentialité des données traitées et le principe du moindre privilège.\n• Ne jamais stocker ni transmettre de mot de passe en clair dans ce document ou en dehors du coffre-fort dédié.",
            'info'
          ),

          // --- SECTION 2 ---
          ...createDocxSectionHeading(
            theme,
            '2. PLANIFICATION ANNUELLE & CALENDRIER',
            `Objectifs stratégiques ${generalInfo.anneeReference} et jalons mensuels`
          ),
          createDocxSubHeading('2.1. Tableau des Objectifs Annuels & KPI'),
          createDocxDataTable(
            theme,
            ['Réf.', 'Objectif Annuel & Missions', 'Résultats Attendus', 'Échéance / Prio', 'KPI Cible', 'Avancement'],
            objectifsAnnuels.map((obj) => [
              obj.id,
              `${obj.titre}\nMissions : ${obj.missionsPrevue || '—'}\nRessources : ${obj.ressourcesNecessaires || '—'}`,
              obj.resultatsAttendus || '—',
              `${obj.echeance || '—'}\n[Prio : ${obj.priorite}]`,
              obj.kpi || '—',
              `${obj.avancement || 0}%\n(${obj.statut})`,
            ]),
            [9, 32, 21, 13, 14, 11],
            { boldColumns: [0], statusColumns: [5], emptyMessage: 'Aucun objectif annuel enregistré.' }
          ),

          createDocxSubHeading('2.2. Calendrier Annuel des Jalons Clés (Janvier à Décembre)'),
          createDocxDataTable(
            theme,
            ['Mois', 'Jalon / Opération Majeure', 'Catégorie', 'Priorité', 'Statut'],
            jalonsCalendrier.map((j) => [
              `Mois ${j.mois < 10 ? `0${j.mois}` : j.mois}`,
              `${j.titre}${j.description ? `\n${j.description}` : ''}`,
              j.categorie,
              j.priorite,
              j.estComplete ? 'Réalisé' : 'À réaliser',
            ]),
            [12, 42, 17, 13, 16],
            { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun jalon calendaire planifié.' }
          ),

          // --- SECTION 3 ---
          ...createDocxSectionHeading(
            theme,
            '3. GESTION QUOTIDIENNE DES ACTIVITÉS',
            'Journal de bord chronologique des travaux réalisés'
          ),
          createDocxDataTable(
            theme,
            ['Date & Heure', 'Tâche / Description', 'Catégorie & Prio', 'Durée Est./Réelle', 'Statut', 'Résultat & Observations'],
            journalTaches.map((t) => [
              `${t.date}\n${t.heure || '—'}`,
              `${t.tache}${t.description ? `\n${t.description}` : ''}`,
              `${t.categorie}\nPrio : ${t.priorite}`,
              `${formatDuration(t.dureeEstimeeMin || 0)} / ${formatDuration(t.dureeReelleMin || 0)}`,
              t.statut,
              `${t.resultat || '—'}${t.observations ? `\nObs : ${t.observations}` : ''}`,
            ]),
            [12, 29, 17, 13, 10, 19],
            { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucune tâche consignée.' }
          ),

          // --- SECTION 4 ---
          ...createDocxSectionHeading(
            theme,
            '4. REGISTRE DES INTERVENTIONS INFORMATIQUES',
            "Fiches d'intervention détaillées et traçabilité complète des tickets"
          ),
          ...(interventions.length === 0
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Aucune fiche d'intervention enregistrée pour cet exercice.",
                      italics: true,
                      color: theme.textMutedHex,
                    }),
                  ],
                }),
              ]
            : interventions.flatMap((it) => [
                createDocxSubHeading(
                  `Fiche ${it.numeroReference} — ${it.nomDemandeur} (${it.serviceDemandeur})`,
                  'h3'
                ),
                createDocxKeyValueGridTable(
                  theme,
                  [
                    {
                      kind: 'quad',
                      label1: 'RÉFÉRENCE TICKET',
                      value1: it.numeroReference,
                      label2: 'DATE & HEURE RÉCEPTION',
                      value2: `${it.dateReception} à ${it.heureReception}`,
                    },
                    {
                      kind: 'quad',
                      label1: 'DEMANDEUR',
                      value1: `${it.nomDemandeur} (${it.serviceDemandeur})`,
                      label2: 'ÉQUIPEMENT CONCERNÉ',
                      value2: it.equipementConcerne || '—',
                    },
                    {
                      kind: 'quad',
                      label1: 'TYPE & PRIORITÉ',
                      value1: `${it.type || it.typeIntervention} | Prio : ${it.priorite}`,
                      label2: 'DURÉE CONSACRÉE',
                      value2: formatDuration(it.tempsConsacreMin, true),
                    },
                    {
                      kind: 'pair',
                      label: 'OBJET / PANNE SIGNALÉE',
                      value: it.descriptionPanne || '—',
                    },
                    {
                      kind: 'pair',
                      label: 'DIAGNOSTIC & CAUSE',
                      value: `Diagnostic : ${it.diagnosticTechnique || '—'}\nCause : ${it.causeIdentifiee || '—'}`,
                    },
                    {
                      kind: 'pair',
                      label: 'SOLUTION APPLIQUÉE',
                      value: `${it.solutionAppliquee || '—'}\nOutils / Matériel : ${it.materielLogicielUtilise || '—'}`,
                    },
                    ...(it.recommandations?.trim()
                      ? [
                          {
                            kind: 'pair' as const,
                            label: 'RECOMMANDATIONS',
                            value: it.recommandations.trim(),
                          },
                        ]
                      : []),
                    {
                      kind: 'pair',
                      label: 'RÉSULTAT & VALIDATION',
                      value: `Statut : ${formatInterventionStatusLabel(
                        it.resultat,
                        it.natureIntervention
                      )} | Validation demandeur : ${
                        it.validationDemandeur
                          ? `OUI (${it.dateValidation || 'Validé'})`
                          : 'En attente'
                      }${it.commentairesDemandeur ? `\nAvis : ${it.commentairesDemandeur}` : ''}`,
                      isStatus: true,
                    },
                  ],
                  { hasQuadRows: true }
                ),
                new Paragraph({ text: '', spacing: { before: 0, after: 110 } }),
              ])),

          // --- SECTION 5 ---
          ...createDocxSectionHeading(
            theme,
            '5. MAINTENANCE PRÉVENTIVE ET CORRECTIVE',
            "Checklists et grilles de contrôle sur les 11 domaines d'infrastructure"
          ),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: "La maintenance préventive anticipe les défaillances et garantit la disponibilité continue du SI. La maintenance corrective traite les anomalies avérées avec documentation des actions menées.",
              }),
            ],
          }),
          createDocxDataTable(
            theme,
            ['Domaine / Équipement', 'Type', 'Tâche de Contrôle', 'Fréquence', 'Dernier / Prochain', 'Statut'],
            maintenances.map((m) => [
              `${m.categorie}\n(${m.responsableOuEquipement || 'SI'})`,
              m.typeMaintenance,
              `${m.tacheControle}${m.observations ? `\nObs : ${m.observations}` : ''}`,
              m.frequence,
              `${m.dernierControle || '—'}\n-> ${m.prochainControle || '—'}`,
              `${m.statut}${m.valide ? '\nValidé' : '\nNon validé'}`,
            ]),
            [19, 10, 32, 12, 15, 12],
            { boldColumns: [0], statusColumns: [5], emptyMessage: 'Aucun contrôle enregistré.' }
          ),

          // --- SECTION 6 ---
          ...createDocxSectionHeading(
            theme,
            '6. GESTION DES RÉSEAUX INFORMATIQUES',
            "Architecture LAN/WAN, équipements d'interconnexion, incidents et tests de performance"
          ),
          createDocxSubHeading('6.1. Inventaire des Équipements Réseau & Configuration'),
          createDocxDataTable(
            theme,
            ['Nom Équipement', 'Type & Modèle', 'Adresse IP / MAC', 'Localisation / VLAN', 'Firmware / État'],
            reseauEquipements.map((eq) => [
              eq.nom,
              `${eq.type}\n${eq.marqueModele}`,
              `IP : ${eq.adresseIp}\nMAC : ${eq.adresseMac || '—'}`,
              `${eq.localisation}\nVLAN : ${eq.vlan || '—'}`,
              `${eq.firmwareVersion || '—'}\n${eq.etat}`,
            ]),
            [17, 22, 21, 21, 19],
            { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun équipement réseau inventorié.' }
          ),

          createDocxSubHeading('6.2. Registre des Incidents Réseau'),
          createDocxDataTable(
            theme,
            ['Date / Heure', 'Liaison / Équipement', "Type d'Incident & Cause", 'Durée & Impact', 'Action Corrective / Statut'],
            reseauIncidents.map((inc) => [
              inc.dateHeure,
              inc.equipementOuLiaison,
              `${inc.typeIncident}\nCause : ${inc.cause || '—'}`,
              `${inc.dureeInterruptionMin} min\nImpact : ${inc.impactUtilisateurs}`,
              `${inc.actionCorrective || '—'}\nStatut : ${inc.statut}`,
            ]),
            [14, 21, 29, 16, 20],
            { boldColumns: [1], statusColumns: [4], emptyMessage: 'Aucun incident réseau enregistré.' }
          ),

          createDocxSubHeading('6.3. Tests de Débit & Performance Réseau (SLA)'),
          createDocxDataTable(
            theme,
            ['Date & Heure', 'Ligne / Accès', 'Débit Down / Up', 'Latence / Gigue', 'Conformité SLA'],
            reseauTestsDebit.map((tst) => [
              tst.dateHeure,
              tst.ligneConcernee,
              `Down : ${tst.debitDescendantMbps} Mbps\nUp : ${tst.debitMontantMbps} Mbps`,
              `Ping : ${tst.latenceMs} ms\nGigue : ${tst.gigueMs} ms`,
              tst.statutConformite,
            ]),
            [18, 25, 25, 16, 16],
            { boldColumns: [1], statusColumns: [4], emptyMessage: 'Aucun test de débit enregistré.' }
          ),

          // --- SECTION 7 ---
          ...createDocxSectionHeading(
            theme,
            '7. GESTION DU PARC INFORMATIQUE (CMDB)',
            'Inventaire matériel exhaustif, affectations, état et garanties'
          ),
          createDocxDataTable(
            theme,
            ['N° Inv. / Type', 'Désignation, Marque & S/N', 'Configuration Technique', 'Affectation & Lieu', 'Garantie & État'],
            parcEquipements.map((p) => [
              `${p.numeroInventaire}\n[${p.type}]`,
              `${p.designation}\n${p.marqueModele}\nS/N : ${p.numeroSerie || '—'}`,
              p.configurationTechnique || '—',
              `${p.utilisateurResponsable || '—'}\n${p.service || ''} · ${p.localisation || ''}`,
              `Garantie : ${p.finGarantie || '—'}\n${p.etatMateriel}`,
            ]),
            [15, 24, 23, 21, 17],
            { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun équipement inventorié.' }
          ),

          // --- SECTION 8 ---
          ...createDocxSectionHeading(
            theme,
            '8. GESTION DES LOGICIELS ET DES LICENCES',
            "Suivi de la conformité des licences, versions et gestion des droits d'accès"
          ),
          createDocxCalloutBox(
            theme,
            'AVERTISSEMENT SÉCURITÉ & GESTION DES ACCÈS',
            "Conformément aux exigences de cybersécurité, aucun mot de passe n'est consigné dans ce cahier. Les identifiants sont gérés via un gestionnaire d'entreprise chiffré et des politiques d'accès basées sur les rôles (RBAC).",
            'warning'
          ),
          new Paragraph({ text: '', spacing: { before: 0, after: 80 } }),
          createDocxDataTable(
            theme,
            ['Logiciel & Éditeur', 'Version & Type', 'Licences & Conformité', 'Expiration / Coût', 'Droits & Procédure'],
            logicielsLicences.map((lic) => [
              `${lic.nomLogiciel}\n(${lic.editeur})`,
              `${lic.version || '—'}\nType : ${lic.typeLicence}`,
              `${lic.nombreLicencesAchetees} achetées / ${lic.nombreLicencesAttribuees} allouées\n${lic.statutConformite}`,
              `Exp : ${lic.dateExpiration || '—'}\nCoût : ${lic.coutRenouvellementEstime || '—'}`,
              `${lic.gestionComptesEtDroits || '—'}${
                lic.procedureInstallation ? `\nProc : ${lic.procedureInstallation}` : ''
              }`,
            ]),
            [20, 17, 19, 18, 26],
            { boldColumns: [0], statusColumns: [2], emptyMessage: 'Aucune licence enregistrée.' }
          ),

          // --- SECTION 9 ---
          ...createDocxSectionHeading(
            theme,
            '9. SAUVEGARDE ET SÉCURITÉ INFORMATIQUE',
            'Stratégie de sauvegarde 3-2-1, tests de restauration (PRA) et registre cybersécurité'
          ),
          createDocxSubHeading('9.1. Matrice des Sauvegardes & Tests de Restauration (PRA)'),
          createDocxDataTable(
            theme,
            ['Nom du Job / Cible', 'Type & Horaire', 'Taille / Durée', 'Destination (3-2-1)', 'Test Restauration & Statut'],
            sauvegardes.map((s) => [
              `${s.nomJob}\nCible : ${s.serveurCible}`,
              `${s.typeSauvegarde}\n${s.horaireExecution}`,
              `${s.tailleGo} Go\n${s.dureeExecutionMin} min`,
              s.destinationStockage,
              `${s.statut}\nDernier test (${s.dateDernierTestRestauration || '—'}) : ${s.resultatTestRestauration}`,
            ]),
            [22, 18, 13, 22, 25],
            { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun job de sauvegarde enregistré.' }
          ),

          createDocxSubHeading('9.2. Registre des Incidents de Sécurité Informatique'),
          createDocxDataTable(
            theme,
            ['Date / Heure', 'Type & Sévérité', 'Postes & Description', 'Actions Menées', 'Statut & Retours'],
            incidentsSecurite.map((sec) => [
              sec.dateHeure,
              `${sec.typeIncident}\nSévérité : ${sec.severite}`,
              `Postes : ${sec.postesConcernes}\n${sec.description}`,
              sec.actionsMenées,
              `${sec.statut}${sec.leconsApprises ? `\nLeçons : ${sec.leconsApprises}` : ''}`,
            ]),
            [14, 18, 29, 21, 18],
            { boldColumns: [1], statusColumns: [4], emptyMessage: 'Aucun incident de sécurité déclaré.' }
          ),

          // --- SECTION 10 ---
          ...createDocxSectionHeading(
            theme,
            '10. GESTION DES CONSOMMABLES ET BESOINS',
            "Suivi des stocks d'atelier, seuils d'alerte et demandes d'achat (en Ariary)"
          ),
          createDocxSubHeading('10.1. Registre des Stocks de Consommables'),
          createDocxDataTable(
            theme,
            ['Réf. / Désignation', 'Catégorie', 'Stock Actuel / Min', 'Emplacement & Fournisseur', 'Statut'],
            consommables.map((c) => [
              `${c.reference}\n${c.designation}`,
              c.categorie,
              `${c.stockActuel} ${c.unite} (Min ${c.stockMinimumAlerte})\nÀ commander : ${c.quantiteRecommandeeAchat}`,
              `${c.emplacementStock}\n${c.fournisseur}`,
              c.statut,
            ]),
            [26, 18, 20, 22, 14],
            { boldColumns: [0], statusColumns: [4], emptyMessage: 'Aucun article en stock.' }
          ),

          createDocxSubHeading("10.2. Registre des Demandes d'Achat (DA)"),
          createDocxDataTable(
            theme,
            ['N° Commande & Date', 'Articles Demandés', 'Fournisseur & Montant TTC', 'Statut Approbation', 'Date Réception / Obs'],
            demandesAchat.map((da) => [
              `${da.numeroCommande}\n${da.dateDemande}`,
              `${da.articlesDemandes}\nQté : ${da.quantite}`,
              `${da.fournisseur}\n${formatAriary(da.montantEstimeTTC, false)}`,
              da.statut,
              `${da.dateReception || 'En attente'}${da.observations ? `\n${da.observations}` : ''}`,
            ]),
            [16, 31, 21, 16, 16],
            { boldColumns: [0], statusColumns: [3], emptyMessage: "Aucune demande d'achat enregistrée." }
          ),

          // --- SECTION 11 ---
          ...createDocxSectionHeading(
            theme,
            "11. RAPPORTS MENSUELS D'ACTIVITÉ (12 MOIS)",
            'Synthèse mensuelle des indicateurs, travaux, difficultés et recommandations',
            { pageBreakBefore: true }
          ),
          ...rapportsMensuels.flatMap((rep) => [
            createDocxSubHeading(`Rapport Mensuel : ${rep.nomMois.toUpperCase()} ${rep.annee}`, 'h3'),
            createDocxKeyValueGridTable(
              theme,
              [
                {
                  kind: 'quad',
                  label1: 'TOTAL INTERVENTIONS',
                  value1: `${rep.totalInterventions} tickets`,
                  label2: 'RÉSOLUS / EN COURS',
                  value2: `${rep.incidentsResolus} résolus / ${rep.incidentsEnCours} en cours`,
                },
                {
                  kind: 'quad',
                  label1: 'TAUX FCR (1ER CONTACT)',
                  value1: `${rep.tauxResolutionFCR}%`,
                  label2: 'TEMPS MOYEN (MTTR)',
                  value2: formatDuration(rep.dureeMoyenneResolutionMin, true),
                },
                { kind: 'pair', label: 'TRAVAUX RÉALISÉS', value: rep.travauxRealises || '—' },
                { kind: 'pair', label: 'MAINTENANCE EFFECTUÉE', value: rep.maintenanceEffectuee || '—' },
                { kind: 'pair', label: 'PROBLÈMES RÉCURRENTS', value: rep.problemesRecurrents || '—' },
                { kind: 'pair', label: 'DIFFICULTÉS RENCONTRÉES', value: rep.difficultesRencontrees || '—' },
                {
                  kind: 'pair',
                  label: 'BESOINS & RECOMMANDATIONS',
                  value: `Besoins : ${rep.besoinsMaterielsLogiciels || '—'}\nRecommandations : ${rep.recommandationsTechnicien || '—'}`,
                },
                {
                  kind: 'pair',
                  label: 'ACTIVITÉS MOIS SUIVANT',
                  value: rep.activitesMoisSuivant || '—',
                },
                {
                  kind: 'pair',
                  label: 'VALIDATION HIÉRARCHIQUE',
                  value: rep.valideParHierarchie
                    ? `Approuvé par le RSI le ${rep.dateValidation || '—'}`
                    : 'En attente de revue hiérarchique',
                  isStatus: true,
                },
              ],
              { hasQuadRows: true }
            ),
            new Paragraph({ text: '', spacing: { before: 0, after: 110 } }),
          ]),

          // --- SECTION 12 ---
          ...createDocxSectionHeading(
            theme,
            '12. BILANS TRIMESTRIELS, BILAN ANNUEL & ROI',
            "Évaluation consolidée de l'exercice, retour sur investissement et clôture officielle",
            { pageBreakBefore: true }
          ),
          createDocxSubHeading('12.1. Synthèse des 4 Trimestres (T1 à T4)'),
          createDocxDataTable(
            theme,
            ['Trimestre', 'Objectifs Atteints & Réalisations', 'Indicateurs Clés', 'Difficultés & Formation', 'Investissements Préconisés'],
            bilansTrimestriels.map((bt) => [
              `${bt.trimestre}\n(${bt.periode})`,
              `${bt.objectifsAtteints || '—'}\n\nPerformances : ${bt.performancesResume || '—'}`,
              `Satisfaction : ${bt.tauxSatisfactionUtilisateurs}%\nDisponibilité : ${bt.tauxDisponibiliteInfrastructure}%`,
              `Difficultés : ${bt.difficultesRencontrees || '—'}\nFormation : ${bt.besoinsFormation || '—'}`,
              bt.investissementsNecessaires || '—',
            ]),
            [12, 32, 18, 20, 18],
            { boldColumns: [0], emptyMessage: 'Aucun bilan trimestriel saisi.' }
          ),

          createDocxSubHeading(`12.2. Bilan Annuel Consolidé de l'Exercice ${bilanAnnuel.annee}`),
          createDocxKeyValueGridTable(
            theme,
            [
              {
                kind: 'pair',
                label: "SYNTHÈSE GÉNÉRALE DE L'ANNÉE",
                value: bilanAnnuel.syntheseGenerale || '—',
              },
              {
                kind: 'pair',
                label: "TAUX D'OBJECTIFS ATTEINTS",
                value: `${bilanAnnuel.objectifsAtteintsTaux || 0}% des objectifs annuels validés`,
                isStatus: true,
                tone: (bilanAnnuel.objectifsAtteintsTaux || 0) >= 80 ? 'success' : 'warning',
              },
              {
                kind: 'pair',
                label: 'PRINCIPALES RÉALISATIONS',
                value: bilanAnnuel.principalesRealisations || '—',
              },
              {
                kind: 'pair',
                label: "INCIDENTS MAJEURS DE L'ANNÉE",
                value: bilanAnnuel.incidentsMajeursAnnee || '—',
              },
              {
                kind: 'pair',
                label: 'AMÉLIORATIONS APPORTÉES AU SI',
                value: bilanAnnuel.ameliorationsApportees || '—',
              },
              {
                kind: 'pair',
                label: 'BESOINS EN FORMATION',
                value: bilanAnnuel.formationsSuiviesEtBesoinsFuturs || '—',
              },
              {
                kind: 'pair',
                label: 'INVESTISSEMENTS N+1 PRÉCONISÉS',
                value: bilanAnnuel.investissementsInformatiquesPreconises || '—',
              },
              {
                kind: 'pair',
                label: 'OBJECTIFS STRATÉGIQUES N+1',
                value: bilanAnnuel.objectifsAnneeSuivante || '—',
              },
              {
                kind: 'pair',
                label: 'APPRÉCIATION DU RSI',
                value: bilanAnnuel.appreciationRsi?.trim() || 'En attente de revue hiérarchique.',
              },
            ],
            {
              headerLeft: 'Rubrique de Bilan',
              headerRight: 'Synthèse & Constats Consolidés',
              labelWidthPct: 33,
            }
          ),

          ...(bilanAnnuel.projetsRoi && bilanAnnuel.projetsRoi.length > 0
            ? [
                createDocxSubHeading(
                  `12.3. Retour sur Investissement (ROI) des Projets Informatiques (${bilanAnnuel.projetsRoi.length})`
                ),
                createDocxDataTable(
                  theme,
                  ['Projet IT & Catégorie', 'Investissement Initial', 'Économies Directes', 'Temps Gagné (h/an)', 'ROI An 1 & Payback'],
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
                      formatAriary(invest, false),
                      `+${formatAriary(eco, false)} / an`,
                      `${heures} h / an\n(+${formatAriary(heures * taux, false)})`,
                      `${roi >= 0 ? `+${roi}%` : `${roi}%`}\n(Amorti en ${payback} mois)`,
                    ];
                  }),
                  [29, 17, 18, 19, 17],
                  { boldColumns: [0], alignRightColumns: [1, 2], statusColumns: [4] }
                ),
              ]
            : []),

          createDocxSubHeading('12.4. Signatures & Clôture Officielle'),
          createDocxSignatureTable(
            theme,
            {
              role: 'TECHNICIEN INFORMATIQUE TITULAIRE',
              name: techFullName,
              dateLabel: bilanAnnuel.signatureTechnicienDate || undefined,
              statusLabel: bilanAnnuel.signatureTechnicienDate
                ? 'Signé & Certifié'
                : 'En attente de signature',
              signed: Boolean(bilanAnnuel.signatureTechnicienDate),
            },
            {
              role: "RESPONSABLE SYSTÈMES D'INFORMATION (RSI)",
              name: responsableLabel,
              dateLabel: bilanAnnuel.signatureRsiDate || undefined,
              statusLabel: bilanAnnuel.signatureRsiDate
                ? 'Approuvé & Validé'
                : 'En attente de visa',
              signed: Boolean(bilanAnnuel.signatureRsiDate),
            }
          ),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 320, after: 0 },
            children: [
              new TextRun({
                text: '— FIN DU CAHIER DE SUIVI ANNUEL DU TECHNICIEN INFORMATIQUE —',
                bold: true,
                color: theme.secondaryHex,
                size: 18,
              }),
            ],
          }),
        ],
      },
    ],
  });

  await packAndSaveDocx(
    doc,
    `cahier_suivi_annuel_technicien_it_${data.generalInfo.anneeReference}.docx`
  );
}
