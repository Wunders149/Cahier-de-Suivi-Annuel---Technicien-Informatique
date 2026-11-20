import { Document, Paragraph } from 'docx';
import { getLocalTodayIso } from './coherenceUtils';
import {
  CahierSuiviData,
  FicheIntervention,
  IncidentReseau,
  IncidentSecurite,
  ItemMaintenance,
  RapportMensuel,
  TacheJournal,
} from '../types/it-tracker';
import { formatDuration } from './durationFormatter';
import { formatInterventionStatusLabel } from './interventionLabels';
import {
  formatGenerationDateFr,
  getDocumentTheme,
} from './docDesign/documentThemes';
import {
  PdfDocumentBuilder,
  PdfExportResult,
  PdfFooterHeaderMeta,
} from './docDesign/pdfLayoutEngine';
import {
  drawDonutSummaryChart,
  drawHorizontalBarChart,
} from './docDesign/pdfCharts';
import {
  A4_HEIGHT_DXA,
  A4_WIDTH_DXA,
  STANDARD_MARGIN_DXA,
  createDocxCalloutBox,
  createDocxDataTable,
  createDocxDocumentBanner,
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

export const MONTH_NAMES = [
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

export interface MonthlyActivitySnapshot {
  moisIndex: number;
  nomMois: string;
  annee: number;
  monthPrefix: string;
  rapport: RapportMensuel;
  taches: TacheJournal[];
  tachesTerminees: number;
  totalTaskMinutes: number;
  interventions: FicheIntervention[];
  interventionsTerminees: number;
  interventionsEnCours: number;
  tauxResolution: number;
  avgInterventionMinutes: number;
  maintenances: ItemMaintenance[];
  reseauIncidents: IncidentReseau[];
  incidentsSecurite: IncidentSecurite[];
}

export function getMonthPrefix(annee: number, moisIndex: number): string {
  const mm = moisIndex < 10 ? `0${moisIndex}` : `${moisIndex}`;
  return `${annee}-${mm}`;
}

export function getMonthlyActivitySnapshot(
  data: CahierSuiviData,
  moisIndex: number
): MonthlyActivitySnapshot {
  const annee = data.generalInfo.anneeReference || new Date().getFullYear();
  const nomMois = MONTH_NAMES[moisIndex - 1] || `Mois ${moisIndex}`;
  const monthPrefix = getMonthPrefix(annee, moisIndex);

  const rapport =
    data.rapportsMensuels.find((r) => r.moisIndex === moisIndex) || {
      moisIndex,
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
    };

  const taches = (data.journalTaches || []).filter((t) =>
    t.date?.startsWith(monthPrefix)
  );
  const tachesTerminees = taches.filter((t) => t.statut === 'Terminé').length;
  const totalTaskMinutes = taches.reduce(
    (sum, t) => sum + (t.dureeReelleMin || 0),
    0
  );

  const interventions = (data.interventions || []).filter((i) =>
    i.dateReception?.startsWith(monthPrefix)
  );
  const interventionsTerminees = interventions.filter(
    (i) => i.resultat === 'Résolu'
  ).length;
  const interventionsEnCours = interventions.length - interventionsTerminees;
  const tauxResolution =
    interventions.length > 0
      ? Math.round((interventionsTerminees / interventions.length) * 100)
      : rapport.tauxResolutionFCR || 100;
  const avgInterventionMinutes =
    interventions.length > 0
      ? Math.round(
          interventions.reduce((sum, i) => sum + (i.tempsConsacreMin || 0), 0) /
            interventions.length
        )
      : rapport.dureeMoyenneResolutionMin || 0;

  const maintenances = (data.maintenances || []).filter((m) =>
    m.dernierControle?.startsWith(monthPrefix)
  );
  const reseauIncidents = (data.reseauIncidents || []).filter((inc) =>
    inc.dateHeure?.startsWith(monthPrefix)
  );
  const incidentsSecurite = (data.incidentsSecurite || []).filter((sec) =>
    sec.dateHeure?.startsWith(monthPrefix)
  );

  return {
    moisIndex,
    nomMois,
    annee,
    monthPrefix,
    rapport,
    taches,
    tachesTerminees,
    totalTaskMinutes,
    interventions,
    interventionsTerminees,
    interventionsEnCours,
    tauxResolution,
    avgInterventionMinutes,
    maintenances,
    reseauIncidents,
    incidentsSecurite,
  };
}

function buildMonthlyDisplayContext(data: CahierSuiviData, moisIndex: number) {
  const snap = getMonthlyActivitySnapshot(data, moisIndex);
  const { generalInfo } = data;
  const { rapport } = snap;
  const genDate = formatGenerationDateFr();

  const techName =
    `${generalInfo.prenomTechnicien || ''} ${generalInfo.nomTechnicien || ''}`.trim() ||
    'Technicien Informatique';
  const companyName =
    generalInfo.entreprise?.trim() || "Direction des Systèmes d'Information";
  const departmentName = generalInfo.departement?.trim() || 'DSI';
  const managerName =
    generalInfo.responsableHierarchique?.trim() || 'Responsable Hiérarchique (RSI)';
  const recipientName = rapport.destinataireLivraison?.trim() || managerName;

  const totalIntervDisplay = Math.max(
    snap.interventions.length,
    rapport.totalInterventions || 0
  );
  const resolvedDisplay = Math.max(
    snap.interventionsTerminees,
    rapport.incidentsResolus || 0
  );
  const totalTaskHours = Math.round((snap.totalTaskMinutes / 60) * 10) / 10;

  const narrativeItems: Array<{ title: string; content: string }> = [
    { title: '1. Travaux & Projets réalisés', content: rapport.travauxRealises },
    { title: '2. Maintenance préventive effectuée', content: rapport.maintenanceEffectuee },
    { title: '3. Problèmes récurrents identifiés', content: rapport.problemesRecurrents },
    {
      title: '4. Difficultés techniques / organisationnelles',
      content: rapport.difficultesRencontrees,
    },
    { title: '5. Besoins matériels & logiciels', content: rapport.besoinsMaterielsLogiciels },
    { title: '6. Recommandations à la hiérarchie', content: rapport.recommandationsTechnicien },
    { title: '7. Priorités pour le mois suivant (M+1)', content: rapport.activitesMoisSuivant },
  ];

  const monthCode = `${snap.annee}-${String(snap.moisIndex).padStart(2, '0')}`;
  const deliveryDate = rapport.dateLivraison || getLocalTodayIso();
  const safeMonthSlug = snap.nomMois.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return {
    snap,
    rapport,
    genDate,
    techName,
    techRole: generalInfo.fonction || 'Technicien Informatique',
    companyName,
    departmentName,
    managerName,
    recipientName,
    totalIntervDisplay,
    resolvedDisplay,
    totalTaskHours,
    narrativeItems,
    monthCode,
    deliveryDate,
    safeMonthSlug,
  };
}

/**
 * Construit le Cahier de Suivi Mensuel PDF avec page de couverture, sommaire dynamique,
 * graphiques vectoriels et structuration éditoriale adaptée.
 */
export function buildMonthlyPdfDocument(
  data: CahierSuiviData,
  moisIndex: number
): {
  builder: PdfDocumentBuilder;
  filename: string;
  meta: PdfFooterHeaderMeta;
} {
  const ctx = buildMonthlyDisplayContext(data, moisIndex);
  const { snap, rapport } = ctx;
  const builder = new PdfDocumentBuilder('monthly_report');

  const lastDayOfMonth = new Date(snap.annee, snap.moisIndex, 0).getDate();
  const mm = String(snap.moisIndex).padStart(2, '0');
  const periodRange = `01/${mm}/${snap.annee} — ${String(lastDayOfMonth).padStart(2, '0')}/${mm}/${snap.annee}`;
  const docRef = `LIV-${ctx.monthCode}`;

  // --- PAGE 1 : COUVERTURE EXÉCUTIVE MENSUELLE ---
  builder.drawCoverPage({
    organization: ctx.companyName,
    department: ctx.departmentName,
    eyebrow: "CAHIER DE SUIVI MENSUEL · LIVRABLE D'ACTIVITÉ SI",
    mainTitle: `RAPPORT MENSUEL D'ACTIVITÉ IT`,
    subtitle: `${snap.nomMois.toUpperCase()} ${snap.annee}`,
    exerciseLabel: `PÉRIODE : ${snap.nomMois.toUpperCase()} ${snap.annee}`,
    periodLabel: `Période couverte : ${periodRange}`,
    tagline:
      "Synthèse opérationnelle des interventions techniques, exploitation quotidienne, maintenance préventive et recommandations",
    recipient: ctx.recipientName,
    metadataRows: [
      ['Référence document', docRef],
      ['Période concernée', `${snap.nomMois} ${snap.annee} (${periodRange})`],
      ['Auteur / Technicien', `${ctx.techName} (${ctx.techRole})`],
      ['Service / Direction', `${ctx.companyName} — ${ctx.departmentName}`],
      ['Destinataire officiel', ctx.recipientName],
      [
        'Statut de livraison',
        `${rapport.statutLivraison || 'Prêt à livrer'}${
          rapport.dateLivraison ? ` (${rapport.dateLivraison})` : ''
        }`,
      ],
      [
        'Visa hiérarchique RSI',
        rapport.valideParHierarchie
          ? `Approuvé & Validé le ${rapport.dateValidation || ctx.deliveryDate}`
          : 'En attente de validation RSI',
      ],
      ['Date d’édition', ctx.genDate],
    ],
    engagementTitle: 'PORTÉE DU LIVRABLE MENSUEL',
    engagementText:
      "Ce rapport compile fidèlement les fiches d'intervention, les tâches consignées au journal quotidien, les contrôles de maintenance préventive et les événements réseau ou sécurité relevés au cours du mois écoulé.",
    engagementFooter: `Document officiel remis par ${ctx.techName} · Destinataire : ${ctx.recipientName}`,
  });

  // --- PAGE 2 : SOMMAIRE DYNAMIQUE ---
  builder.addPage();
  builder.beginTableOfContents(
    'SOMMAIRE DU RAPPORT MENSUEL',
    `${snap.nomMois} ${snap.annee} — ${ctx.companyName}`
  );

  // --- 1. RÉSUMÉ EXÉCUTIF & KPI DU MOIS ---
  builder.drawSectionHeading(
    '1. RÉSUMÉ EXÉCUTIF & INDICATEURS CLÉS',
    `Bilan chiffré de l'activité informatique sur ${snap.nomMois} ${snap.annee}`
  );

  builder.drawExecutiveCard({
    title: `Vue d'Ensemble — ${snap.nomMois} ${snap.annee}`,
    leadParagraph: `Au cours du mois de ${snap.nomMois} ${snap.annee}, ${ctx.totalIntervDisplay} intervention(s) ont été suivies avec un taux de résolution de ${snap.tauxResolution}% (MTTR moyen de ${formatDuration(snap.avgInterventionMinutes)}). Le journal quotidien totalise ${snap.taches.length} activité(s) pour ${ctx.totalTaskHours} heure(s) d'exploitation consignée(s).`,
    highlights: [
      `Maintenances préventives / correctives exécutées sur la période : ${snap.maintenances.length}.`,
      `Incidents réseau / cybersécurité recensés : ${snap.reseauIncidents.length} réseau · ${snap.incidentsSecurite.length} sécurité.`,
    ],
    tone:
      snap.reseauIncidents.length + snap.incidentsSecurite.length === 0 &&
      snap.tauxResolution >= 85
        ? 'success'
        : 'info',
  });

  builder.drawKpiStrip([
    {
      label: 'Interventions IT',
      value: `${ctx.totalIntervDisplay}`,
      sub: `${ctx.resolvedDisplay} terminées`,
      tone: 'info',
    },
    {
      label: 'Taux Résolution FCR',
      value: `${snap.tauxResolution}%`,
      sub: `MTTR : ${formatDuration(snap.avgInterventionMinutes)}`,
      tone: snap.tauxResolution >= 85 ? 'success' : 'warning',
    },
    {
      label: 'Journal Quotidien',
      value: `${snap.taches.length}`,
      sub: `${snap.tachesTerminees} terminées (${ctx.totalTaskHours} h)`,
      tone: 'info',
    },
    {
      label: 'Maintenances & Inc.',
      value: `${snap.maintenances.length}`,
      sub: `${snap.reseauIncidents.length} rés. · ${snap.incidentsSecurite.length} sécu`,
      tone:
        snap.reseauIncidents.length + snap.incidentsSecurite.length === 0
          ? 'success'
          : 'warning',
    },
  ]);

  // Graphiques vectoriels du mois (basés strictement sur les données réelles)
  if (snap.interventions.length > 0) {
    const resolved = snap.interventionsTerminees;
    const pending = Math.max(0, snap.interventions.length - resolved);
    drawDonutSummaryChart(builder, {
      title: `Statut des Interventions — ${snap.nomMois} ${snap.annee}`,
      subtitle: 'Proportion des fiches clôturées par rapport aux tickets restant ouverts',
      caption: `Base réelle : ${snap.interventions.length} fiche(s) datée(s) sur ${snap.monthPrefix}.`,
      centerTopLabel: `${snap.tauxResolution}%`,
      centerBottomLabel: 'Résolus',
      slices: [
        { label: 'Résolues / Clôturées', value: resolved, colorRgb: builder.theme.successRgb },
        { label: 'En cours / Attente', value: pending, colorRgb: builder.theme.warningRgb },
      ],
    });
  }

  if (snap.taches.length >= 2) {
    const byCat = new Map<string, number>();
    snap.taches.forEach((t) => {
      const k = t.categorie || 'Autre';
      byCat.set(k, (byCat.get(k) || 0) + (t.dureeReelleMin || t.dureeEstimeeMin || 0));
    });
    const barItems = Array.from(byCat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, mins]) => ({
        label,
        value: Math.round((mins / 60) * 10) / 10,
        valueText: `${(Math.round((mins / 60) * 10) / 10).toString().replace('.', ',')} h`,
      }));
    if (barItems.some((i) => i.value > 0)) {
      drawHorizontalBarChart(builder, {
        title: 'Répartition Horaire du Journal Quotidien par Domaine',
        subtitle: `Cumul : ${ctx.totalTaskHours} h sur ${snap.taches.length} tâche(s) enregistrée(s)`,
        items: barItems,
      });
    }
  }

  // --- 2. COMPTE-RENDU D'ACTIVITÉ MENSUEL (ADAPTATIF) ---
  builder.drawSectionHeading(
    "2. COMPTE-RENDU D'ACTIVITÉ & ANALYSE",
    'Faits marquants, maintenance, points de vigilance et priorités'
  );

  const populatedNarratives = ctx.narrativeItems.filter((item) => item.content?.trim().length > 0);
  const emptyNarrativeLabels = ctx.narrativeItems
    .filter((item) => !item.content?.trim())
    .map((item) => item.title.replace(/^\d+\.\s*/, ''));

  if (populatedNarratives.length === 0) {
    builder.drawCalloutBox(
      'Synthèse Narrative Mensuelle',
      "Aucun commentaire narratif détaillé n'a encore été saisi pour ce mois ; les données quantitatives ci-après font foi.",
      'neutral'
    );
  } else {
    populatedNarratives.forEach((item) => {
      const tone = /problème|difficulté/i.test(item.title)
        ? 'warning'
        : /recommandation|priorité/i.test(item.title)
          ? 'success'
          : 'info';
      builder.drawCalloutBox(item.title, item.content.trim(), tone);
    });
    if (emptyNarrativeLabels.length > 0) {
      builder.drawStructuredText(
        `Rubriques sans mention particulière ce mois-ci : ${emptyNarrativeLabels.join(' · ')}.`,
        { fontSize: 8.1, color: builder.theme.textMutedRgb, justify: false }
      );
      builder.addSpacing(2);
    }
  }

  // --- 3. INTERVENTIONS TECHNIQUES DU MOIS ---
  builder.drawSectionHeading(
    `3. INTERVENTIONS TECHNIQUES DU MOIS (${snap.interventions.length})`,
    `Tickets et opérations enregistrés sur ${snap.nomMois} ${snap.annee}`
  );
  builder.drawDataTable(
    ['Référence', 'Date', 'Demandeur / Service', 'Problème & Solution Appliquée', 'Durée', 'Statut'],
    snap.interventions.map((it) => [
      it.numeroReference,
      it.dateReception,
      `${it.nomDemandeur}\n(${it.serviceDemandeur})`,
      `${it.descriptionPanne || '—'}\nSolution : ${it.solutionAppliquee || 'En cours'}`,
      formatDuration(it.tempsConsacreMin),
      formatInterventionStatusLabel(it.resultat, it.natureIntervention),
    ]),
    [13, 12, 19, 34, 10, 12],
    {
      boldColumns: [0],
      alignRightColumns: [4],
      statusColumns: [5],
      emptyMessage: `Aucune fiche d'intervention enregistrée sur ${snap.nomMois} ${snap.annee}.`,
    }
  );

  // --- 4. JOURNAL QUOTIDIEN DU MOIS ---
  builder.drawSectionHeading(
    `4. JOURNAL QUOTIDIEN DU MOIS (${snap.taches.length} tâches · ${ctx.totalTaskHours} h)`,
    "Chronologie des opérations d'exploitation courante"
  );
  const taskRows: string[][] = snap.taches.map((t) => [
    `${t.date}\n${t.heure || '—'}`,
    `${t.tache}${t.observations ? `\nObs : ${t.observations}` : ''}`,
    t.categorie,
    formatDuration(t.dureeReelleMin || t.dureeEstimeeMin || 0),
    t.statut,
  ]);
  if (taskRows.length > 0) {
    taskRows.push([
      'TOTAL MOIS',
      `${snap.taches.length} activité(s) consignée(s)`,
      '—',
      formatDuration(snap.totalTaskMinutes),
      `${snap.tachesTerminees} terminée(s)`,
    ]);
  }
  builder.drawDataTable(
    ['Date / Heure', 'Tâche / Activité', 'Catégorie', 'Durée', 'Statut'],
    taskRows,
    [15, 42, 19, 11, 13],
    {
      boldColumns: [0],
      alignRightColumns: [3],
      statusColumns: [4],
      totalRowIndices: taskRows.length > 0 ? [taskRows.length - 1] : [],
      emptyMessage: `Aucune activité journalière consignée sur ${snap.nomMois} ${snap.annee}.`,
    }
  );

  // --- 5. MAINTENANCES & INCIDENTS DU MOIS (SI PRÉSENTS) ---
  const hasExtraEvents =
    snap.maintenances.length > 0 ||
    snap.reseauIncidents.length > 0 ||
    snap.incidentsSecurite.length > 0;

  if (hasExtraEvents) {
    builder.drawSectionHeading(
      '5. MAINTENANCES & INCIDENTS RÉSEAU / SÉCURITÉ DU MOIS',
      'Synthèse des contrôles préventifs et événements notables de la période'
    );

    if (snap.maintenances.length > 0) {
      builder.drawSubHeading(`5.1. Contrôles de Maintenance (${snap.maintenances.length})`, {
        registerToc: true,
      });
      builder.drawDataTable(
        ['Domaine / Cible', 'Type', 'Contrôle Effectué', 'Date', 'Statut'],
        snap.maintenances.map((m) => [
          `${m.categorie}\n(${m.responsableOuEquipement || 'SI'})`,
          m.typeMaintenance,
          m.tacheControle,
          m.dernierControle,
          m.statut,
        ]),
        [23, 13, 38, 13, 13],
        { boldColumns: [0], statusColumns: [4] }
      );
    }

    if (snap.reseauIncidents.length > 0 || snap.incidentsSecurite.length > 0) {
      builder.drawSubHeading('5.2. Incidents Réseau & Cybersécurité', { registerToc: true });
      const combinedIncidents = [
        ...snap.reseauIncidents.map((inc) => [
          inc.dateHeure,
          `Réseau · ${inc.typeIncident}`,
          `${inc.equipementOuLiaison} — ${inc.actionCorrective || inc.cause}`,
          inc.statut,
        ]),
        ...snap.incidentsSecurite.map((sec) => [
          sec.dateHeure,
          `Sécurité · ${sec.typeIncident} (${sec.severite})`,
          `${sec.postesConcernes} — ${sec.actionsMenées}`,
          sec.statut,
        ]),
      ];
      builder.drawDataTable(
        ['Date / Heure', 'Nature', 'Détail & Action Corrective', 'Statut'],
        combinedIncidents,
        [17, 25, 43, 15],
        { boldColumns: [1], statusColumns: [3] }
      );
    }
  }

  // --- BORDEREAU DE LIVRAISON & VISA ---
  const finalSecNum = hasExtraEvents ? 6 : 5;
  builder.drawSectionHeading(
    `${finalSecNum}. BORDEREAU DE LIVRAISON & VISA HIÉRARCHIQUE`,
    'Validation officielle et remise du livrable mensuel'
  );

  if (rapport.noteLivraison?.trim()) {
    builder.drawCalloutBox('Note de Remise du Technicien', rapport.noteLivraison.trim(), 'info');
  }

  builder.drawSignatureGrid(
    {
      role: 'TECHNICIEN ÉMETTEUR',
      name: ctx.techName,
      dateLabel: ctx.deliveryDate,
      statusLabel: `Remis (${rapport.statutLivraison || 'Prêt à livrer'})`,
      signed: true,
    },
    {
      role: 'DESTINATAIRE / VALIDATION RSI',
      name: ctx.recipientName,
      dateLabel: rapport.dateValidation || undefined,
      statusLabel: rapport.valideParHierarchie ? 'Approuvé & Validé' : 'En attente de visa',
      signed: Boolean(rapport.valideParHierarchie),
    }
  );

  const meta: PdfFooterHeaderMeta = {
    organization: ctx.companyName,
    documentTitle: `Rapport Mensuel — ${snap.nomMois} ${snap.annee}`,
    shortTitle: `Rapport Mensuel ${snap.nomMois} ${snap.annee}`,
    reference: docRef,
    author: ctx.techName,
    subject: `Livrable mensuel d'activité IT — ${snap.nomMois} ${snap.annee}`,
    generationDate: ctx.genDate,
    hasCoverPage: true,
  };

  return {
    builder,
    filename: `Cahier_Suivi_Mensuel_${ctx.safeMonthSlug}_${snap.annee}.pdf`,
    meta,
  };
}

/**
 * Génère et télécharge un Cahier de Suivi Mensuel complet au format PDF A4 vectoriel.
 */
export function generateMonthlyPdf(data: CahierSuiviData, moisIndex: number): PdfExportResult {
  const { builder, filename, meta } = buildMonthlyPdfDocument(data, moisIndex);
  return builder.finalizeAndSave(filename, meta);
}

/**
 * Génère et télécharge un Cahier de Suivi Mensuel éditable au format Word (.docx)
 */
export async function generateMonthlyDocx(
  data: CahierSuiviData,
  moisIndex: number
): Promise<void> {
  const ctx = buildMonthlyDisplayContext(data, moisIndex);
  const { snap, rapport } = ctx;
  const theme = getDocumentTheme('monthly_report');

  const hasExtraEvents =
    snap.maintenances.length > 0 ||
    snap.reseauIncidents.length > 0 ||
    snap.incidentsSecurite.length > 0;
  const finalSecNum = hasExtraEvents ? 6 : 5;

  const combinedIncidents = [
    ...snap.reseauIncidents.map((inc) => [
      inc.dateHeure,
      `Réseau · ${inc.typeIncident}`,
      `${inc.equipementOuLiaison} — ${inc.actionCorrective || inc.cause}`,
      inc.statut,
    ]),
    ...snap.incidentsSecurite.map((sec) => [
      sec.dateHeure,
      `Sécurité · ${sec.typeIncident} (${sec.severite})`,
      `${sec.postesConcernes} — ${sec.actionsMenées}`,
      sec.statut,
    ]),
  ];

  const children = [
    createDocxDocumentBanner({
      theme,
      organization: ctx.companyName,
      eyebrow: 'CAHIER DE SUIVI MENSUEL DU TECHNICIEN INFORMATIQUE',
      title: `${snap.nomMois.toUpperCase()} ${snap.annee}`,
      subtitle: `${ctx.companyName} (${ctx.departmentName}) · ${
        rapport.statutLivraison || 'Prêt à livrer'
      }${rapport.dateLivraison ? ` (${rapport.dateLivraison})` : ''}`,
      rightBadge: `Réf. LIV-${ctx.monthCode} · Édité le ${ctx.genDate}`,
    }),
    new Paragraph({ text: '', spacing: { before: 120, after: 0 } }),
    createDocxKeyValueGridTable(
      theme,
      [
        {
          kind: 'pair',
          label: 'Entreprise / Direction',
          value: `${ctx.companyName} (${ctx.departmentName})`,
        },
        { kind: 'pair', label: 'Technicien titulaire', value: `${ctx.techName} — ${ctx.techRole}` },
        { kind: 'pair', label: 'Destinataire hiérarchique', value: ctx.recipientName },
        {
          kind: 'pair',
          label: 'Statut de livraison & Visa',
          value: `${rapport.statutLivraison || 'Prêt à livrer'} · ${
            rapport.valideParHierarchie
              ? `Validé le ${rapport.dateValidation || ctx.deliveryDate}`
              : 'En attente de visa RSI'
          }`,
          isStatus: true,
        },
      ],
      { labelWidthPct: 32 }
    ),

    ...createDocxSectionHeading(theme, '1. SYNTHÈSE & INDICATEURS CLÉS DU MOIS'),
    createDocxKpiStripTable(theme, [
      {
        label: 'Interventions IT',
        value: `${ctx.totalIntervDisplay}`,
        sub: `${ctx.resolvedDisplay} terminées`,
        tone: 'info',
      },
      {
        label: 'Taux Résolution FCR',
        value: `${snap.tauxResolution}%`,
        sub: `MTTR : ${formatDuration(snap.avgInterventionMinutes)}`,
        tone: snap.tauxResolution >= 85 ? 'success' : 'warning',
      },
      {
        label: 'Journal Quotidien',
        value: `${snap.taches.length}`,
        sub: `${snap.tachesTerminees} terminées (${ctx.totalTaskHours} h)`,
        tone: 'info',
      },
      {
        label: 'Maintenances & Inc.',
        value: `${snap.maintenances.length}`,
        sub: `${snap.reseauIncidents.length} rés. · ${snap.incidentsSecurite.length} sécu`,
        tone:
          snap.reseauIncidents.length + snap.incidentsSecurite.length === 0
            ? 'success'
            : 'warning',
      },
    ]),

    ...createDocxSectionHeading(theme, "2. COMPTE-RENDU D'ACTIVITÉ MENSUEL"),
    ...ctx.narrativeItems.flatMap((item) => [
      createDocxCalloutBox(
        theme,
        item.title,
        item.content?.trim() || 'Aucune observation particulière consignée pour cette rubrique.',
        'info'
      ),
      new Paragraph({ text: '', spacing: { before: 0, after: 80 } }),
    ]),

    ...createDocxSectionHeading(
      theme,
      `3. INTERVENTIONS TECHNIQUES DU MOIS (${snap.interventions.length})`,
      `Tickets et opérations enregistrés sur ${snap.nomMois} ${snap.annee}`
    ),
    createDocxDataTable(
      theme,
      ['Référence', 'Date', 'Demandeur / Service', 'Problème & Solution Appliquée', 'Durée', 'Statut'],
      snap.interventions.map((it) => [
        it.numeroReference,
        it.dateReception,
        `${it.nomDemandeur}\n(${it.serviceDemandeur})`,
        `${it.descriptionPanne || '—'}\nSolution : ${it.solutionAppliquee || 'En cours'}`,
        formatDuration(it.tempsConsacreMin),
        formatInterventionStatusLabel(it.resultat, it.natureIntervention),
      ]),
      [13, 12, 19, 34, 10, 12],
      {
        boldColumns: [0],
        statusColumns: [5],
        emptyMessage: `Aucune fiche d'intervention enregistrée pour ${snap.nomMois} ${snap.annee}.`,
      }
    ),

    ...createDocxSectionHeading(
      theme,
      `4. JOURNAL QUOTIDIEN DU MOIS (${snap.taches.length} tâches · ${ctx.totalTaskHours} h)`,
      "Chronologie des opérations d'exploitation courante"
    ),
    createDocxDataTable(
      theme,
      ['Date / Heure', 'Tâche / Activité', 'Catégorie', 'Durée', 'Statut'],
      snap.taches.map((t) => [
        `${t.date}\n${t.heure || '—'}`,
        `${t.tache}${t.observations ? `\nObs : ${t.observations}` : ''}`,
        t.categorie,
        formatDuration(t.dureeReelleMin || t.dureeEstimeeMin || 0),
        t.statut,
      ]),
      [15, 42, 19, 11, 13],
      {
        boldColumns: [0],
        statusColumns: [4],
        emptyMessage: `Aucune tâche journalière enregistrée pour ${snap.nomMois} ${snap.annee}.`,
      }
    ),

    ...(hasExtraEvents
      ? [
          ...createDocxSectionHeading(
            theme,
            '5. MAINTENANCES & INCIDENTS RÉSEAU / SÉCURITÉ DU MOIS',
            'Synthèse des contrôles préventifs et événements notables de la période'
          ),
          ...(snap.maintenances.length > 0
            ? [
                createDocxSubHeading(`5.1. Contrôles de Maintenance (${snap.maintenances.length})`),
                createDocxDataTable(
                  theme,
                  ['Domaine / Cible', 'Type', 'Contrôle Effectué', 'Date', 'Statut'],
                  snap.maintenances.map((m) => [
                    `${m.categorie}\n(${m.responsableOuEquipement || 'SI'})`,
                    m.typeMaintenance,
                    m.tacheControle,
                    m.dernierControle,
                    m.statut,
                  ]),
                  [23, 13, 38, 13, 13],
                  { boldColumns: [0], statusColumns: [4] }
                ),
              ]
            : []),
          ...(combinedIncidents.length > 0
            ? [
                createDocxSubHeading('5.2. Incidents Réseau & Cybersécurité'),
                createDocxDataTable(
                  theme,
                  ['Date / Heure', 'Nature', 'Détail & Action Corrective', 'Statut'],
                  combinedIncidents,
                  [17, 25, 43, 15],
                  { boldColumns: [1], statusColumns: [3] }
                ),
              ]
            : []),
        ]
      : []),

    ...createDocxSectionHeading(
      theme,
      `${finalSecNum}. BORDEREAU DE LIVRAISON & VISA HIÉRARCHIQUE`
    ),
    ...(rapport.noteLivraison?.trim()
      ? [
          createDocxCalloutBox(
            theme,
            'Note de Remise du Technicien',
            rapport.noteLivraison.trim(),
            'info'
          ),
          new Paragraph({ text: '', spacing: { before: 0, after: 100 } }),
        ]
      : []),
    createDocxSignatureTable(
      theme,
      {
        role: 'TECHNICIEN ÉMETTEUR',
        name: ctx.techName,
        dateLabel: ctx.deliveryDate,
        statusLabel: `Remis (${rapport.statutLivraison || 'Prêt à livrer'})`,
        signed: true,
      },
      {
        role: 'DESTINATAIRE / VALIDATION RSI',
        name: ctx.recipientName,
        dateLabel: rapport.dateValidation || undefined,
        statusLabel: rapport.valideParHierarchie
          ? 'Approuvé & Validé'
          : 'En attente de visa hiérarchique',
        signed: Boolean(rapport.valideParHierarchie),
      }
    ),
  ];

  const doc = new Document({
    title: `Cahier de Suivi Mensuel — ${snap.nomMois} ${snap.annee}`,
    subject: `Rapport mensuel d'activité IT — ${ctx.companyName}`,
    creator: ctx.techName,
    styles: createEditorialDocStyles(theme),
    sections: [
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
        headers: {
          default: createDocxRunningHeader({
            theme,
            organization: ctx.companyName,
            documentTitle: `Rapport Mensuel — ${snap.nomMois} ${snap.annee}`,
            reference: `LIV-${ctx.monthCode}`,
            generationDate: ctx.genDate,
          }),
        },
        footers: {
          first: createDocxRunningFooter({
            theme,
            organization: ctx.companyName,
            confidentialityText: `Livrable Mensuel Officiel · ${snap.nomMois} ${snap.annee}`,
            generationDate: ctx.genDate,
          }),
          default: createDocxRunningFooter({
            theme,
            organization: ctx.companyName,
            confidentialityText: `Livrable Mensuel Officiel · ${snap.nomMois} ${snap.annee}`,
            generationDate: ctx.genDate,
          }),
        },
        children,
      },
    ],
  });

  await packAndSaveDocx(
    doc,
    `Cahier_Suivi_Mensuel_${ctx.safeMonthSlug}_${snap.annee}.docx`
  );
}
