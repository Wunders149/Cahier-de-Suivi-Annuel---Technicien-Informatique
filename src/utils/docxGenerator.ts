import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  ShadingType,
  HeightRule,
} from 'docx';
import { saveAs } from 'file-saver';
import { CahierSuiviData } from '../types/it-tracker';
import { formatDuration } from './durationFormatter';

// Couleurs de la charte
const COLOR_PRIMARY = '0F2A4A'; // Bleu Marine profond
const COLOR_SECONDARY = '1E3A8A'; // Bleu Corporate
const COLOR_ACCENT = '0284C7'; // Bleu Ciel / Azur
const COLOR_LIGHT_BG = 'F1F5F9'; // Gris très clair
const COLOR_BORDER = 'CBD5E1'; // Gris bordure
const COLOR_WHITE = 'FFFFFF';
const COLOR_TEXT = '1E293B'; // Ardoise foncée

const tableBorder = {
  top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
  left: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
  right: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
};

function createSectionHeading(title: string, subtitle?: string): Paragraph[] {
  const paras: Paragraph[] = [
    new Paragraph({
      text: title.toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 120 },
      border: {
        bottom: { color: COLOR_SECONDARY, space: 6, style: BorderStyle.SINGLE, size: 18 },
      },
    }),
  ];

  if (subtitle) {
    paras.push(
      new Paragraph({
        children: [
          new TextRun({
            text: subtitle,
            italics: true,
            color: '64748B',
            size: 20,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  return paras;
}

function createSubHeading(title: string): Paragraph {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
  });
}

function createHeaderCell(text: string, widthPercent?: number): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            color: COLOR_WHITE,
            size: 18,
          }),
        ],
      }),
    ],
    shading: {
      type: ShadingType.CLEAR,
      fill: COLOR_PRIMARY,
    },
    borders: tableBorder,
    width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
  });
}

function createTextCell(
  text: string,
  options?: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bg?: string; widthPercent?: number; size?: number }
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: options?.align || AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text || '—',
            bold: options?.bold || false,
            color: COLOR_TEXT,
            size: options?.size || 18,
          }),
        ],
      }),
    ],
    shading: options?.bg
      ? {
          type: ShadingType.CLEAR,
          fill: options.bg,
        }
      : undefined,
    borders: tableBorder,
    width: options?.widthPercent ? { size: options.widthPercent, type: WidthType.PERCENTAGE } : undefined,
  });
}

export async function generateDocx(data: CahierSuiviData): Promise<void> {
  const {
    generalInfo,
    objectifsAnnuels,
    jalonsCalendrier,
    journalTaches,
    interventions,
    maintenances,
    reseauEquipements,
    reseauIncidents,
    reseauTestsDebit,
    parcEquipements,
    logicielsLicences,
    sauvegardes,
    incidentsSecurite,
    consommables,
    demandesAchat,
    rapportsMensuels,
    bilansTrimestriels,
    bilanAnnuel,
  } = data;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 20, // 10pt
            color: COLOR_TEXT,
          },
        },
        heading1: {
          run: {
            font: 'Calibri',
            size: 28, // 14pt
            bold: true,
            color: COLOR_PRIMARY,
          },
        },
        heading2: {
          run: {
            font: 'Calibri',
            size: 24, // 12pt
            bold: true,
            color: COLOR_SECONDARY,
          },
        },
      },
    },
    sections: [
      // PAGE DE GARDE
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${generalInfo.entreprise?.trim() || 'Cahier de Suivi IT'} — Direction des Systèmes d'Information`,
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Cahier de Suivi Annuel du Technicien Informatique — Document Confidentiel Interne',
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ text: '', spacing: { before: 800 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'DIRECTION DES SYSTÈMES D\'INFORMATION',
                bold: true,
                color: COLOR_SECONDARY,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'CAHIER DE SUIVI ANNUEL',
                bold: true,
                color: COLOR_PRIMARY,
                size: 44, // 22pt
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'DU TECHNICIEN INFORMATIQUE',
                bold: true,
                color: COLOR_ACCENT,
                size: 32, // 16pt
              }),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `EXERCICE ANNUEL ${generalInfo.anneeReference}`,
                bold: true,
                color: COLOR_SECONDARY,
                size: 24,
              }),
            ],
            spacing: { after: 600 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Outil de Pilotage Opérationnel, Traçabilité des Interventions, Maintenance Préventive & Reporting',
                italics: true,
                size: 20,
                color: '64748B',
              }),
            ],
            spacing: { after: 800 },
          }),

          // Cadre d'identification
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTextCell('ANNÉE DE RÉFÉRENCE', { bold: true, bg: COLOR_LIGHT_BG, widthPercent: 35 }),
                  createTextCell(`${generalInfo.anneeReference}`, { bold: true, widthPercent: 65 }),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('TECHNICIEN TITULAIRE', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(
                    `${generalInfo.prenomTechnicien || ''} ${generalInfo.nomTechnicien || ''}`.trim() || 'Non renseigné'
                  ),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('FONCTION', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(generalInfo.fonction || 'Technicien Informatique'),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('DÉPARTEMENT / SERVICE', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(generalInfo.departement || 'DSI'),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('ENTREPRISE / ORGANISATION', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(generalInfo.entreprise || 'Non renseignée'),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('RESPONSABLE HIÉRARCHIQUE', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(
                    generalInfo.responsableHierarchique
                      ? `${generalInfo.responsableHierarchique}${generalInfo.titreResponsable ? ` (${generalInfo.titreResponsable})` : ''}`
                      : generalInfo.titreResponsable || 'Non renseigné'
                  ),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('DATE DE PRISE DE FONCTION', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(generalInfo.datePriseFonction || '—'),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('CONTACT PROFESSIONNEL', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(`Tél : ${generalInfo.telephonePro || '—'} | Email : ${generalInfo.emailPro || '—'}`),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('LOCALISATION BUREAU / ATELIER', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(generalInfo.localisationBureau || '—'),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 800 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '« La rigueur de la traçabilité garantit la pérennité, la sécurité et la conformité du Système d\'Information. »',
                italics: true,
                size: 18,
                color: '475569',
              }),
            ],
          }),
        ],
      },

      // SECTIONS SUIVANTES (Corps complet du document)
      {
        properties: {
          page: {
            margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Cahier de Suivi Annuel IT ${generalInfo.anneeReference} | ${
                      `${generalInfo.prenomTechnicien || ''} ${generalInfo.nomTechnicien || ''}`.trim() || 'Technicien IT'
                    }`,
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Page ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                  new TextRun({ text: ' sur ', size: 16, color: '94A3B8' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // SOMMAIRE
          ...createSectionHeading('TABLE DES MATIÈRES & SOMMAIRE'),
          new Paragraph({
            text: '1. Informations Générales & Cadre de Référence\n2. Planification Annuelle & Calendrier d\'Activité\n3. Gestion Quotidienne des Activités (Journal de Bord)\n4. Registre des Interventions Informatiques & Fiches d\'Intervention\n5. Maintenance Préventive et Corrective (11 Domaines)\n6. Gestion de l\'Infrastructure Réseau & Registre des Incidents\n7. Gestion du Parc Informatique (CMDB & Inventaire Matériel)\n8. Gestion des Logiciels, Licences et Comptes d\'Accès\n9. Sauvegarde, Cybersécurité & Tests de Résilience (PRA)\n10. Gestion des Consommables, Stocks et Demandes d\'Achat\n11. Rapports Mensuels d\'Activité (12 Mois Complets)\n12. Bilans Trimestriels & Bilan Annuel d\'Évaluation',
            spacing: { line: 360, after: 400 },
          }),

          // SECTION 1
          ...createSectionHeading('1. INFORMATIONS GÉNÉRALES & ENGAGEMENT DU TECHNICIEN', 'Cadre de référence, engagement professionnel et déontologie informatique'),
          new Paragraph({
            text: 'Le présent cahier constitue l\'outil officiel de travail et de reporting du technicien informatique. Il est tenu à jour au fil de l\'eau et mis à disposition du Responsable des Systèmes d\'Information (RSI) pour audit et suivi.',
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTextCell('ENGAGEMENT DÉONTOLOGIQUE & CONFIDENTIALITÉ', { bold: true, bg: COLOR_LIGHT_BG }),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell(
                    'Le technicien s\'engage à respecter scrupuleusement la confidentialité des données traitées, à appliquer les règles d\'hygiène informatique de l\'ANSSI, à ne jamais stocker ni transmettre de mot de passe en clair, et à consigner avec exactitude toute intervention matérielle, logicielle ou réseau effectuée sur le système d\'information de l\'organisation.\n\nDate d\'engagement : ' +
                      generalInfo.datePriseFonction +
                      '               Signature du Technicien : [VALIDÉ / SIGNÉ]'
                  ),
                ],
              }),
            ],
          }),

          // SECTION 2
          ...createSectionHeading('2. PLANIFICATION ANNUELLE & CALENDRIER'),
          createSubHeading('2.1. Tableau des Objectifs Annuels & KPI'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Réf.', 8),
                  createHeaderCell('Objectif Annuel & Missions', 32),
                  createHeaderCell('Résultats Attendus', 22),
                  createHeaderCell('Échéance', 12),
                  createHeaderCell('KPI Cible', 16),
                  createHeaderCell('Avancement', 10),
                ],
              }),
              ...objectifsAnnuels.map(
                (obj) =>
                  new TableRow({
                    children: [
                      createTextCell(obj.id, { bold: true }),
                      createTextCell(`${obj.titre}\n• Missions : ${obj.missionsPrevue}\n• Ressources : ${obj.ressourcesNecessaires}`),
                      createTextCell(obj.resultatsAttendus),
                      createTextCell(`${obj.echeance}\n[Prio: ${obj.priorite}]`),
                      createTextCell(obj.kpi),
                      createTextCell(`${obj.avancement}%\n(${obj.statut})`, { bold: true }),
                    ],
                  })
              ),
            ],
          }),

          createSubHeading('2.2. Calendrier Annuel des Jalons Clés (Janvier à Décembre)'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Mois', 12),
                  createHeaderCell('Jalon / Opération Majeure', 38),
                  createHeaderCell('Catégorie', 18),
                  createHeaderCell('Priorité', 12),
                  createHeaderCell('Statut', 20),
                ],
              }),
              ...jalonsCalendrier.map(
                (j) =>
                  new TableRow({
                    children: [
                      createTextCell(`Mois ${j.mois < 10 ? '0' + j.mois : j.mois}`, { bold: true }),
                      createTextCell(`${j.titre}\n${j.description}`),
                      createTextCell(j.categorie),
                      createTextCell(j.priorite),
                      createTextCell(j.estComplete ? '[X] Réalisé' : '[ ] À réaliser', { bold: true }),
                    ],
                  })
              ),
            ],
          }),

          // SECTION 3
          ...createSectionHeading('3. GESTION QUOTIDIENNE DES ACTIVITÉS', 'Journal de bord chronologique des travaux réalisés'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Date & Heure', 12),
                  createHeaderCell('Tâche / Description', 30),
                  createHeaderCell('Catégorie & Prio', 18),
                  createHeaderCell('Durée Est./Réelle', 14),
                  createHeaderCell('Statut', 10),
                  createHeaderCell('Résultat & Observations', 16),
                ],
              }),
              ...journalTaches.map(
                (t) =>
                  new TableRow({
                    children: [
                      createTextCell(`${t.date}\n${t.heure}`),
                      createTextCell(`${t.tache}\n${t.description}`),
                      createTextCell(`${t.categorie}\nPrio: ${t.priorite}`),
                      createTextCell(`${t.dureeEstimeeMin}m / ${t.dureeReelleMin}m`),
                      createTextCell(t.statut, { bold: true }),
                      createTextCell(`${t.resultat}\nObs: ${t.observations}`),
                    ],
                  })
              ),
            ],
          }),

          // SECTION 4
          ...createSectionHeading('4. REGISTRE DES INTERVENTIONS INFORMATIQUES', 'Fiches d\'intervention détaillées et traçabilité des tickets'),
          ...interventions.map((it) => [
            createSubHeading(`Fiche d'Intervention : ${it.numeroReference} — ${it.nomDemandeur} (${it.serviceDemandeur})`),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    createTextCell('RÉFÉRENCE TICKET', { bold: true, bg: COLOR_LIGHT_BG, widthPercent: 25 }),
                    createTextCell(it.numeroReference, { bold: true, widthPercent: 25 }),
                    createTextCell('DATE & HEURE RÉCEPTION', { bold: true, bg: COLOR_LIGHT_BG, widthPercent: 25 }),
                    createTextCell(`${it.dateReception} à ${it.heureReception}`, { widthPercent: 25 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('DEMANDEUR', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(`${it.nomDemandeur} (${it.serviceDemandeur})`),
                    createTextCell('ÉQUIPEMENT CONCERNÉ', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(it.equipementConcerne),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('TYPE & PRIORITÉ', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(`${it.typeIntervention} | Priorité: ${it.priorite}`),
                    createTextCell('DURÉE CONSACRÉE', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(formatDuration(it.tempsConsacreMin, true)),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('DESCRIPTION PANNE', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(it.descriptionPanne, { widthPercent: 75 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('DIAGNOSTIC & CAUSE', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(`Diagnostic : ${it.diagnosticTechnique}\nCause : ${it.causeIdentifiee}`, { widthPercent: 75 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('SOLUTION APPLIQUÉE', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(`${it.solutionAppliquee}\nOutils/Composants : ${it.materielLogicielUtilise}`, { widthPercent: 75 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('RÉSULTAT & VALIDATION', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(`Statut : ${it.resultat} | Validation demandeur : ${it.validationDemandeur ? '[X] OUI (' + (it.dateValidation || '') + ')' : '[ ] NON'}\nAvis : ${it.commentairesDemandeur || 'N/A'}`, { widthPercent: 75 }),
                  ],
                }),
              ],
            }),
            new Paragraph({ text: '', spacing: { after: 180 } }),
          ]).flat(),

          // SECTION 5
          ...createSectionHeading('5. MAINTENANCE PRÉVENTIVE ET CORRECTIVE', 'Checklists et grilles de contrôle sur les 11 domaines d\'infrastructure'),
          new Paragraph({
            text: 'La maintenance préventive vise à anticiper les défaillances et maintenir un haut niveau de disponibilité. La maintenance corrective traite les pannes avérées avec analyse des causes racines.',
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Domaine / Équipement', 20),
                  createHeaderCell('Type', 10),
                  createHeaderCell('Tâche de Contrôle & Procédure', 32),
                  createHeaderCell('Fréquence', 12),
                  createHeaderCell('Dernier / Prochain', 14),
                  createHeaderCell('Statut & Valid.', 12),
                ],
              }),
              ...maintenances.map(
                (m) =>
                  new TableRow({
                    children: [
                      createTextCell(`${m.categorie}\n(${m.responsableOuEquipement})`, { bold: true }),
                      createTextCell(m.typeMaintenance),
                      createTextCell(`${m.tacheControle}\nObs: ${m.observations}`),
                      createTextCell(m.frequence),
                      createTextCell(`${m.dernierControle}\n-> ${m.prochainControle}`),
                      createTextCell(`${m.statut}\n${m.valide ? '[X] Conforme' : '[ ] Non validé'}`, { bold: true }),
                    ],
                  })
              ),
            ],
          }),

          // SECTION 6
          ...createSectionHeading('6. GESTION DES RÉSEAUX INFORMATIQUES', 'Architecture LAN/WAN, équipements d\'interconnexion et registre des incidents'),
          createSubHeading('6.1. Inventaire des Équipements Réseau & Configuration'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Nom Équipement', 16),
                  createHeaderCell('Type & Modèle', 22),
                  createHeaderCell('Adresse IP / MAC', 20),
                  createHeaderCell('Localisation / VLAN', 22),
                  createHeaderCell('Firmware / État', 20),
                ],
              }),
              ...reseauEquipements.map(
                (eq) =>
                  new TableRow({
                    children: [
                      createTextCell(eq.nom, { bold: true }),
                      createTextCell(`${eq.type}\n${eq.marqueModele}`),
                      createTextCell(`IP: ${eq.adresseIp}\nMAC: ${eq.adresseMac}`),
                      createTextCell(`${eq.localisation}\nVLAN: ${eq.vlan}`),
                      createTextCell(`${eq.firmwareVersion}\nÉtat: ${eq.etat}`),
                    ],
                  })
              ),
            ],
          }),

          createSubHeading('6.2. Registre des Incidents Réseau'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Date/Heure', 14),
                  createHeaderCell('Liaison / Équipement', 22),
                  createHeaderCell('Type d\'Incident & Cause', 30),
                  createHeaderCell('Durée & Impact', 16),
                  createHeaderCell('Action Corrective / Statut', 18),
                ],
              }),
              ...reseauIncidents.map(
                (inc) =>
                  new TableRow({
                    children: [
                      createTextCell(inc.dateHeure),
                      createTextCell(inc.equipementOuLiaison, { bold: true }),
                      createTextCell(`${inc.typeIncident}\nCause: ${inc.cause}`),
                      createTextCell(`${inc.dureeInterruptionMin} min\nImpact: ${inc.impactUtilisateurs}`),
                      createTextCell(`${inc.actionCorrective}\nStatut: ${inc.statut}`, { bold: true }),
                    ],
                  })
              ),
            ],
          }),

          createSubHeading('6.3. Tests de Débit & Performance Réseau'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Date & Heure', 18),
                  createHeaderCell('Ligne / Accès', 26),
                  createHeaderCell('Débit Descendant / Montant', 26),
                  createHeaderCell('Latence / Gigue', 15),
                  createHeaderCell('Conformité SLA', 15),
                ],
              }),
              ...reseauTestsDebit.map(
                (tst) =>
                  new TableRow({
                    children: [
                      createTextCell(tst.dateHeure),
                      createTextCell(tst.ligneConcernee, { bold: true }),
                      createTextCell(`Down: ${tst.debitDescendantMbps} Mbps\nUp: ${tst.debitMontantMbps} Mbps`),
                      createTextCell(`Ping: ${tst.latenceMs} ms\nJitter: ${tst.gigueMs} ms`),
                      createTextCell(tst.statutConformite, { bold: true }),
                    ],
                  })
              ),
            ],
          }),

          // SECTION 7
          ...createSectionHeading('7. GESTION DU PARC INFORMATIQUE (CMDB)', 'Inventaire matériel exhaustif, affectations, état et garanties'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('N° Inv. / Type', 14),
                  createHeaderCell('Désignation, Marque & Modèle', 24),
                  createHeaderCell('Configuration Technique', 24),
                  createHeaderCell('Affectation & Lieu', 20),
                  createHeaderCell('Garantie & État', 18),
                ],
              }),
              ...parcEquipements.map(
                (p) =>
                  new TableRow({
                    children: [
                      createTextCell(`${p.numeroInventaire}\n[${p.type}]`, { bold: true }),
                      createTextCell(`${p.designation}\n${p.marqueModele}\nS/N: ${p.numeroSerie}`),
                      createTextCell(p.configurationTechnique),
                      createTextCell(`${p.utilisateurResponsable}\n${p.service}\n${p.localisation}`),
                      createTextCell(`Garantie: ${p.finGarantie}\nÉtat: ${p.etatMateriel}`),
                    ],
                  })
              ),
            ],
          }),

          // SECTION 8
          ...createSectionHeading('8. GESTION DES LOGICIELS ET DES LICENCES', 'Suivi de la conformité des licences, versions et gestion des droits d\'accès'),
          new Paragraph({
            children: [
              new TextRun({
                text: 'AVERTISSEMENT SÉCURITÉ : Conformément aux exigences de cybersécurité, aucun mot de passe n\'est consigné dans ce cahier. Les mots de passe sont générés aléatoirement et gérés via un gestionnaire de mots de passe professionnel chiffré.',
                italics: true,
              }),
            ],
            spacing: { after: 180 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Logiciel & Éditeur', 20),
                  createHeaderCell('Version & Type', 18),
                  createHeaderCell('Licences (Achetées / Allouées)', 18),
                  createHeaderCell('Expiration / Coût', 18),
                  createHeaderCell('Gestion des Droits & Comptes', 26),
                ],
              }),
              ...logicielsLicences.map(
                (lic) =>
                  new TableRow({
                    children: [
                      createTextCell(`${lic.nomLogiciel}\n(${lic.editeur})`, { bold: true }),
                      createTextCell(`${lic.version}\nType: ${lic.typeLicence}`),
                      createTextCell(`${lic.nombreLicencesAchetees} achetées\n${lic.nombreLicencesAttribuees} allouées\nStatut: ${lic.statutConformite}`),
                      createTextCell(`Exp: ${lic.dateExpiration}\nCoût: ${lic.coutRenouvellementEstime}`),
                      createTextCell(`${lic.gestionComptesEtDroits}\nProcédure: ${lic.procedureInstallation}`),
                    ],
                  })
              ),
            ],
          }),

          // SECTION 9
          ...createSectionHeading('9. SAUVEGARDE ET SÉCURITÉ INFORMATIQUE', 'Stratégie de sauvegarde 3-2-1, tests de restauration et registre des incidents cybersécurité'),
          createSubHeading('9.1. Matrice des Sauvegardes & Tests de Restauration (PRA)'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Nom du Job / Cible', 22),
                  createHeaderCell('Type & Horaire', 18),
                  createHeaderCell('Taille / Durée', 14),
                  createHeaderCell('Destination (3-2-1)', 22),
                  createHeaderCell('Test Restauration & Statut', 24),
                ],
              }),
              ...sauvegardes.map(
                (s) =>
                  new TableRow({
                    children: [
                      createTextCell(`${s.nomJob}\nCible: ${s.serveurCible}`, { bold: true }),
                      createTextCell(`${s.typeSauvegarde}\n${s.horaireExecution}`),
                      createTextCell(`${s.tailleGo} Go\n${s.dureeExecutionMin} min`),
                      createTextCell(s.destinationStockage),
                      createTextCell(`Statut: ${s.statut}\nDernier test: ${s.dateDernierTestRestauration}\nRésultat: ${s.resultatTestRestauration}`),
                    ],
                  })
              ),
            ],
          }),

          createSubHeading('9.2. Registre des Incidents de Sécurité Informatique'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Date/Heure', 14),
                  createHeaderCell('Type & Sévérité', 18),
                  createHeaderCell('Postes & Description', 30),
                  createHeaderCell('Actions Menées', 22),
                  createHeaderCell('Statut & Retours', 16),
                ],
              }),
              ...incidentsSecurite.map(
                (sec) =>
                  new TableRow({
                    children: [
                      createTextCell(sec.dateHeure),
                      createTextCell(`${sec.typeIncident}\nSévérité: ${sec.severite}`, { bold: true }),
                      createTextCell(`Postes: ${sec.postesConcernes}\n${sec.description}`),
                      createTextCell(sec.actionsMenées),
                      createTextCell(`Statut: ${sec.statut}\nLeçons: ${sec.leconsApprises}`),
                    ],
                  })
              ),
            ],
          }),

          // SECTION 10
          ...createSectionHeading('10. GESTION DES CONSOMMABLES ET BESOINS', 'Suivi des stocks d\'atelier, seuils d\'alerte et demandes d\'achat'),
          createSubHeading('10.1. Registre des Stocks de Consommables'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Réf. / Désignation', 28),
                  createHeaderCell('Catégorie', 18),
                  createHeaderCell('Stock Actuel / Min', 18),
                  createHeaderCell('Emplacement & Fournisseur', 22),
                  createHeaderCell('Statut', 14),
                ],
              }),
              ...consommables.map(
                (c) =>
                  new TableRow({
                    children: [
                      createTextCell(`${c.reference}\n${c.designation}`, { bold: true }),
                      createTextCell(c.categorie),
                      createTextCell(`${c.stockActuel} ${c.unite} (Alerte si < ${c.stockMinimumAlerte})\nÀ commander: ${c.quantiteRecommandeeAchat}`),
                      createTextCell(`${c.emplacementStock}\nFourn: ${c.fournisseur}`),
                      createTextCell(c.statut, { bold: true }),
                    ],
                  })
              ),
            ],
          }),

          createSubHeading('10.2. Registre des Demandes d\'Achat (DA)'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('N° Commande & Date', 16),
                  createHeaderCell('Articles Demandés', 32),
                  createHeaderCell('Fournisseur & Montant', 20),
                  createHeaderCell('Statut Approbation', 18),
                  createHeaderCell('Date Réception / Obs', 14),
                ],
              }),
              ...demandesAchat.map(
                (da) =>
                  new TableRow({
                    children: [
                      createTextCell(`${da.numeroCommande}\n${da.dateDemande}`, { bold: true }),
                      createTextCell(`${da.articlesDemandes}\nQté: ${da.quantite}`),
                      createTextCell(`${da.fournisseur}\n${da.montantEstimeTTC.toFixed(2)} € TTC`),
                      createTextCell(da.statut, { bold: true }),
                      createTextCell(`${da.dateReception || 'En attente'}\n${da.observations}`),
                    ],
                  })
              ),
            ],
          }),

          // SECTION 11
          ...createSectionHeading('11. RAPPORTS MENSUELS D\'ACTIVITÉ (12 MOIS)', 'Synthèse mensuelle des indicateurs, difficultés et recommandations'),
          ...rapportsMensuels.map((rep) => [
            createSubHeading(`Rapport Mensuel : ${rep.nomMois.toUpperCase()} ${rep.annee}`),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    createTextCell('TOTAL INTERVENTIONS', { bold: true, bg: COLOR_LIGHT_BG, widthPercent: 25 }),
                    createTextCell(`${rep.totalInterventions} tickets`, { bold: true, widthPercent: 25 }),
                    createTextCell('RÉSOLUS / EN COURS', { bold: true, bg: COLOR_LIGHT_BG, widthPercent: 25 }),
                    createTextCell(`${rep.incidentsResolus} résolus / ${rep.incidentsEnCours} en cours`, { widthPercent: 25 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('TAUX RÉSOLUTION 1ER CONTACT (FCR)', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(`${rep.tauxResolutionFCR}%`),
                    createTextCell('TEMPS MOYEN DE RÉSOLUTION (MTTR)', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(formatDuration(rep.dureeMoyenneResolutionMin, true)),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('TRAVAUX RÉALISÉS', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(rep.travauxRealises, { widthPercent: 75 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('MAINTENANCE EFFECTUÉE', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(rep.maintenanceEffectuee, { widthPercent: 75 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('PROBLÈMES RÉCURRENTS', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(rep.problemesRecurrents, { widthPercent: 75 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('DIFFICULTÉS RENCONTRÉES', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(rep.difficultesRencontrees, { widthPercent: 75 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('BESOINS & RECOMMANDATIONS', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(`Besoins : ${rep.besoinsMaterielsLogiciels}\nRecommandations : ${rep.recommandationsTechnicien}`, { widthPercent: 75 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('ACTIVITÉS PRÉVUES MOIS SUIVANT', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(rep.activitesMoisSuivant, { widthPercent: 75 }),
                  ],
                }),
                new TableRow({
                  children: [
                    createTextCell('VALIDATION HIÉRARCHIQUE (RSI)', { bold: true, bg: COLOR_LIGHT_BG }),
                    createTextCell(rep.valideParHierarchie ? `[X] Approuvé par le RSI le ${rep.dateValidation}` : '[ ] En attente de revue hiérarchique', { widthPercent: 75, bold: true }),
                  ],
                }),
              ],
            }),
            new Paragraph({ text: '', spacing: { after: 180 } }),
          ]).flat(),

          // SECTION 12
          ...createSectionHeading('12. BILANS TRIMESTRIELS ET BILAN ANNUEL', 'Évaluation de fin d\'exercice, investissements N+1 et perspectives'),
          createSubHeading('12.1. Synthèse des 4 Trimestres (T1 à T4)'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Trimestre', 12),
                  createHeaderCell('Objectifs Atteints & Réalisations', 32),
                  createHeaderCell('Indicateurs Clés', 18),
                  createHeaderCell('Difficultés & Besoins Formation', 20),
                  createHeaderCell('Investissements Préconisés', 18),
                ],
              }),
              ...bilansTrimestriels.map(
                (bt) =>
                  new TableRow({
                    children: [
                      createTextCell(`${bt.trimestre}\n(${bt.periode})`, { bold: true }),
                      createTextCell(`${bt.objectifsAtteints}\n\nPerformances : ${bt.performancesResume}`),
                      createTextCell(`Satisfaction: ${bt.tauxSatisfactionUtilisateurs}%\nDisponibilité infra: ${bt.tauxDisponibiliteInfrastructure}%`),
                      createTextCell(`Difficultés: ${bt.difficultesRencontrees}\n\nFormation: ${bt.besoinsFormation}`),
                      createTextCell(bt.investissementsNecessaires),
                    ],
                  })
              ),
            ],
          }),

          createSubHeading(`12.2. Bilan Annuel Consolidé de l'Exercice ${bilanAnnuel.annee}`),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTextCell('SYNTHÈSE GÉNÉRALE DE L\'ANNÉE', { bold: true, bg: COLOR_LIGHT_BG, widthPercent: 30 }),
                  createTextCell(bilanAnnuel.syntheseGenerale, { widthPercent: 70 }),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('TAUX D\'OBJECTIFS ATTEINTS', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(`${bilanAnnuel.objectifsAtteintsTaux}% des objectifs annuels validés`, { bold: true }),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('PRINCIPALES RÉALISATIONS', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(bilanAnnuel.principalesRealisations),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('INCIDENTS MAJEURS DE L\'ANNÉE', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(bilanAnnuel.incidentsMajeursAnnee),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('AMÉLIORATIONS APPORTÉES AU SI', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(bilanAnnuel.ameliorationsApportees),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('BESOINS EN FORMATION DU TECHNICIEN', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(bilanAnnuel.formationsSuiviesEtBesoinsFuturs),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('INVESTISSEMENTS N+1 PRÉCONISÉS', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(bilanAnnuel.investissementsInformatiquesPreconises),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('OBJECTIFS STRATÉGIQUES ANNÉE SUIVANTE', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(bilanAnnuel.objectifsAnneeSuivante),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('APPRÉCIATION DU RESPONSABLE SI (RSI)', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(bilanAnnuel.appreciationRsi || 'En attente de revue hiérarchique.', { bold: true }),
                ],
              }),
              new TableRow({
                children: [
                  createTextCell('SIGNATURES & CLÔTURE', { bold: true, bg: COLOR_LIGHT_BG }),
                  createTextCell(
                    `Date de signature Technicien : ${
                      bilanAnnuel.signatureTechnicienDate
                        ? `${bilanAnnuel.signatureTechnicienDate}  [Signé]`
                        : '—  [En attente]'
                    }\nDate de signature RSI : ${
                      bilanAnnuel.signatureRsiDate
                        ? `${bilanAnnuel.signatureRsiDate}  [Approuvé et validé]`
                        : '—  [En attente]'
                    }`
                  ),
                ],
              }),
            ],
          }),

          ...(bilanAnnuel.projetsRoi && bilanAnnuel.projetsRoi.length > 0
            ? [
                new Paragraph({ text: '', spacing: { before: 200 } }),
                createSubHeading(`12.3. Retour sur Investissement (ROI) des Projets Informatiques Déployés`),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: [
                        createHeaderCell('Projet IT & Catégorie', 30),
                        createHeaderCell('Investissement Initial', 18),
                        createHeaderCell('Économies Directes', 18),
                        createHeaderCell('Temps Gagné (h/an)', 18),
                        createHeaderCell('ROI An 1 & Payback', 16),
                      ],
                    }),
                    ...bilanAnnuel.projetsRoi.map((p) => {
                      const invest = p.coutInvestissementEuros || 0;
                      const eco = p.economiesFinancieresAnnuellesEuros || 0;
                      const heures = p.gainTempsEstimeHeuresParAn || 0;
                      const val = eco + heures * (p.tauxHoraireMoyenValorise || 35);
                      const roi = invest > 0 ? Math.round(((val - invest) / invest) * 100) : 0;
                      const payback = val > 0 ? Math.round((invest / val) * 12 * 10) / 10 : 0;

                      return new TableRow({
                        children: [
                          createTextCell(`${p.nomProjet}\n[${p.categorie}] - ${p.statut}`, { bold: true }),
                          createTextCell(`${invest.toLocaleString('fr-FR')} €`),
                          createTextCell(`+${eco.toLocaleString('fr-FR')} € / an`, { bold: true }),
                          createTextCell(`${heures} h / an\n(+${(heures * 35).toLocaleString('fr-FR')} € valorisés)`),
                          createTextCell(`${roi > 0 ? `+${roi}%` : `${roi}%`}\n(Amorti en ${payback} mois)`, { bold: true }),
                        ],
                      });
                    }),
                  ],
                }),
              ]
            : []),

          new Paragraph({ text: '', spacing: { before: 400 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '— FIN DU CAHIER DE SUIVI ANNUEL DU TECHNICIEN INFORMATIQUE —',
                bold: true,
                color: COLOR_SECONDARY,
                size: 20,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `cahier_suivi_annuel_technicien_it_${data.generalInfo.anneeReference}.docx`);
}
