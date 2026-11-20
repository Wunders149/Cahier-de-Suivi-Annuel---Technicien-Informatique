import { CahierSuiviData, ObjectifAnnuel } from '../types/it-tracker';
import {
  FxRates,
  detectCurrencyAndConvertToAr,
  loadFxRates,
} from './currencyConverter';
import {
  formatAriary,
  formatCompactAriaryPdf,
  formatGenerationDateFr,
} from './docDesign/documentThemes';
import {
  PdfDocumentBuilder,
  PdfExportResult,
  PdfFooterHeaderMeta,
} from './docDesign/pdfLayoutEngine';
import {
  drawHorizontalBarChart,
  drawVerticalBarChart,
} from './docDesign/pdfCharts';

function extractSegment(text: string, prefix: string): string {
  if (!text) return '';
  const parts = text.split('·').map((s) => s.trim());
  const match = parts.find((p) => p.toLowerCase().startsWith(prefix.toLowerCase()));
  if (!match) return '';
  return match.slice(prefix.length).trim();
}

function parseAriaryDigits(text?: string): number {
  if (!text) return 0;
  const digits = text.replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Construit le Rapport d'Analyse Budgétaire & Retour sur Investissement (ROI) IT au format PDF A4.
 */
export function buildRoiAnalysisPdfDocument(
  data: CahierSuiviData,
  fxRatesOverride?: FxRates
): {
  builder: PdfDocumentBuilder;
  filename: string;
  meta: PdfFooterHeaderMeta;
} {
  const fxRates = fxRatesOverride || loadFxRates();
  const builder = new PdfDocumentBuilder('invoice_quote');
  const genDate = formatGenerationDateFr();
  const annee = data.generalInfo.anneeReference || new Date().getFullYear();

  const entreprise = data.generalInfo.entreprise?.trim() || "Direction des Systèmes d'Information";
  const department = data.generalInfo.departement?.trim() || 'DSI';
  const techName =
    `${data.generalInfo.prenomTechnicien || ''} ${data.generalInfo.nomTechnicien || ''}`.trim() ||
    'Technicien Informatique';
  const rsiName = data.generalInfo.responsableHierarchique?.trim() || 'Responsable SI (RSI)';

  // 1. Extraction fidèle des lignes budgétaires SOGEDIPROMA
  const budgets = (data.objectifsAnnuels || [])
    .filter((o: ObjectifAnnuel) => o.id?.startsWith('sog-bdg-'))
    .map((o) => {
      const desc = o.description || '';
      const res = o.resultatsAttendus || '';
      const allocatedAr =
        parseAriaryDigits(extractSegment(res, 'Alloué :')) ||
        parseAriaryDigits(o.ressourcesNecessaires);
      const committedAr = parseAriaryDigits(extractSegment(res, 'Engagé :'));
      const spentAr = parseAriaryDigits(extractSegment(res, 'Dépensé :'));
      const remainingAr = Math.max(0, allocatedAr - Math.max(committedAr, spentAr));
      return {
        titre: o.titre.replace(/^Budget\s+\d{4}\s+—\s+/i, '').trim(),
        categorie: extractSegment(desc, 'Catégorie :') || 'Infrastructure IT',
        exercice: extractSegment(desc, 'Exercice budgétaire :') || String(annee),
        responsable: extractSegment(desc, 'Responsable :') || 'DSI',
        allocatedAr,
        committedAr,
        spentAr,
        remainingAr,
      };
    });

  const totalAllocated = budgets.reduce((s, b) => s + b.allocatedAr, 0);
  const totalCommitted = budgets.reduce((s, b) => s + b.committedAr, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spentAr, 0);
  const totalRemaining = budgets.reduce((s, b) => s + b.remainingAr, 0);

  // 2. Coûts logiciels & achats réels en Ariary
  let saasAnnualAr = 0;
  (data.logicielsLicences || []).forEach((lic) => {
    const parsed = detectCurrencyAndConvertToAr(lic.coutRenouvellementEstime, fxRates);
    if (parsed.annualizedAr > 0) saasAnnualAr += parsed.annualizedAr;
  });
  const purchasesTotalAr = (data.demandesAchat || []).reduce(
    (s, d) => s + (Number(d.montantEstimeTTC) || 0),
    0
  );

  // 3. Portefeuille Projets ROI
  const projets = data.bilanAnnuel?.projetsRoi || [];
  let totalRoiInvest = 0;
  let totalRoiEco = 0;
  let totalRoiHours = 0;
  let totalRoiValue = 0;
  projets.forEach((p) => {
    const inv = p.coutInvestissementEuros || 0;
    const eco = p.economiesFinancieresAnnuellesEuros || 0;
    const h = p.gainTempsEstimeHeuresParAn || 0;
    const val = eco + h * (p.tauxHoraireMoyenValorise || 25000);
    totalRoiInvest += inv;
    totalRoiEco += eco;
    totalRoiHours += h;
    totalRoiValue += val;
  });
  const portfolioRoiPct =
    totalRoiInvest > 0 ? Math.round(((totalRoiValue - totalRoiInvest) / totalRoiInvest) * 100) : 0;

  // --- PAGE 1 : COUVERTURE FINANCIÈRE ---
  builder.drawCoverPage({
    organization: entreprise,
    department,
    eyebrow: 'DOSSIER FINANCIER & PILOTAGE DES INVESTISSEMENTS IT',
    mainTitle: 'ANALYSE BUDGÉTAIRE & ROI IT',
    subtitle: 'ÉVALUATION DES COÛTS INFORMATIQUES & ÉCONOMIES PROJETÉES (ARIARY)',
    exerciseLabel: `EXERCICE ${annee} / 2027`,
    periodLabel: `Taux FX appliqués : 1 EUR = ${fxRates.EUR.toLocaleString('fr-FR')} Ar · 1 USD = ${fxRates.USD.toLocaleString('fr-FR')} Ar`,
    tagline:
      'Suivi des enveloppes budgétaires allouées, coûts récurrents SaaS/Achats et rentabilité des projets de modernisation IT',
    recipient: rsiName,
    metadataRows: [
      ['Organisation', `${entreprise} — ${department}`],
      ['Établi par', techName],
      ['Destinataire / Direction', rsiName],
      ['Devise de consolidation', 'Ariary Malagasy (Ar)'],
      [
        'Taux de change de référence',
        `1 EUR = ${fxRates.EUR.toLocaleString('fr-FR')} Ar  |  1 USD = ${fxRates.USD.toLocaleString('fr-FR')} Ar`,
      ],
      ['Enveloppes budgétaires suivies', `${budgets.length} ligne(s)`],
      ['Projets ROI enregistrés', `${projets.length} projet(s)`],
      ['Date d’édition', genDate],
    ],
    engagementTitle: 'MÉTHODOLOGIE DE CONSOLIDATION FINANCIÈRE',
    engagementText:
      "Les montants exprimés en devises étrangères (EUR/USD) sur les abonnements et licences sont convertis automatiquement en Ariary selon le référentiel FX indiqué ci-dessus. Le ROI An 1 intègre les économies financières directes et la valorisation du gain de temps opérationnel.",
    engagementFooter: `Document financier interne — ${entreprise} · Édition du ${genDate}`,
  });

  // --- PAGE 2 : SOMMAIRE ---
  builder.addPage();
  builder.beginTableOfContents(
    'SOMMAIRE — ANALYSE FINANCIÈRE & ROI',
    `${entreprise} · Consolidation en Ariary (Ar)`
  );

  // --- 1. SYNTHÈSE EXÉCUTIVE FINANCIÈRE ---
  builder.drawSectionHeading(
    '1. SYNTHÈSE EXÉCUTIVE FINANCIÈRE',
    'Indicateurs consolidés des budgets, coûts opérationnels et portefeuille ROI'
  );

  builder.drawExecutiveCard({
    title: 'Bilan Financier Consolidé (Ar)',
    leadParagraph: `Le suivi budgétaire couvre ${budgets.length} ligne(s) représentant un total alloué de ${formatAriary(totalAllocated, true)} (${formatAriary(totalSpent, true)} dépensés à date). Parallèlement, les engagements opérationnels regroupent ${formatAriary(saasAnnualAr, true)}/an d'abonnements logiciels annualisés et ${formatAriary(purchasesTotalAr, true)} TTC de demandes d'achat.`,
    highlights: [
      `Portefeuille ROI (${projets.length} projet(s)) : ${formatAriary(totalRoiInvest, true)} investis pour ${formatAriary(totalRoiValue, true)}/an de valeur créée (ROI net An 1 : ${portfolioRoiPct >= 0 ? `+${portfolioRoiPct}%` : `${portfolioRoiPct}%`}).`,
      `Disponibilité budgétaire résiduelle : ${formatAriary(totalRemaining, true)} sur l'ensemble des enveloppes suivies.`,
    ],
    tone: portfolioRoiPct >= 0 ? 'success' : 'info',
  });

  builder.drawKpiStrip([
    {
      label: 'Budgets Alloués',
      value: formatAriary(totalAllocated, true),
      sub: `${budgets.length} ligne(s) · Dép. ${formatAriary(totalSpent, true)}`,
      tone: 'info',
    },
    {
      label: 'Coûts SaaS / An',
      value: formatAriary(saasAnnualAr, true),
      sub: `${(data.logicielsLicences || []).length} licence(s) convertie(s)`,
      tone: 'info',
    },
    {
      label: 'Investissement ROI',
      value: formatAriary(totalRoiInvest, true),
      sub: `${projets.length} projet(s) IT`,
      tone: 'warning',
    },
    {
      label: 'ROI Global An 1',
      value: `${portfolioRoiPct >= 0 ? `+${portfolioRoiPct}%` : `${portfolioRoiPct}%`}`,
      sub: `+${formatAriary(totalRoiValue, true)}/an`,
      tone: portfolioRoiPct >= 0 ? 'success' : 'danger',
    },
  ]);

  // --- 2. SUIVI DES ENVELOPPES BUDGÉTAIRES ---
  builder.drawSectionHeading(
    `2. ENVELOPPES BUDGÉTAIRES INFORMATIQUES (${budgets.length})`,
    'Allocation, engagements, consommation réelle et reliquat disponible en Ariary'
  );

  if (budgets.length > 0) {
    drawHorizontalBarChart(builder, {
      title: 'Consommation vs Allocation par Poste Budgétaire (Ar)',
      subtitle: 'Comparaison entre le budget alloué (trait repère) et le montant engagé/dépensé',
      targetLegendLabel: 'Budget alloué',
      valueLegendLabel: 'Dépensé / Engagé',
      items: budgets.slice(0, 8).map((b) => ({
        label: b.titre,
        value: Math.max(b.spentAr, b.committedAr),
        maxOrTarget: b.allocatedAr,
        valueText: `${formatCompactAriaryPdf(Math.max(b.spentAr, b.committedAr))} / ${formatCompactAriaryPdf(b.allocatedAr)}`,
      })),
    });
  }

  const budgetRows = budgets.map((b) => [
    `${b.titre}\n[${b.categorie}] · ${b.exercice}`,
    formatAriary(b.allocatedAr, true),
    formatAriary(b.committedAr, true),
    formatAriary(b.spentAr, true),
    formatAriary(b.remainingAr, true),
  ]);
  if (budgetRows.length > 0) {
    budgetRows.push([
      `TOTAL CONSOLIDÉ (${budgets.length} postes)`,
      formatAriary(totalAllocated, true),
      formatAriary(totalCommitted, true),
      formatAriary(totalSpent, true),
      formatAriary(totalRemaining, true),
    ]);
  }
  builder.drawDataTable(
    ['Poste Budgétaire & Catégorie', 'Alloué (Ar)', 'Engagé (Ar)', 'Dépensé (Ar)', 'Reliquat (Ar)'],
    budgetRows,
    [36, 16, 16, 16, 16],
    {
      boldColumns: [0],
      alignRightColumns: [1, 2, 3, 4],
      totalRowIndices: budgetRows.length > 0 ? [budgetRows.length - 1] : [],
      emptyMessage: 'Aucune ligne budgétaire synchronisée pour le moment.',
    }
  );

  // --- 3. PORTEFEUILLE DES PROJETS ROI ---
  builder.drawSectionHeading(
    `3. PORTEFEUILLE DES PROJETS ROI (${projets.length})`,
    'Investissement initial, économies directes, gains de productivité et délai de retour'
  );

  if (projets.length > 0) {
    const chartProjets = projets.slice(0, 6);
    drawVerticalBarChart(builder, {
      title: 'Investissement vs Valeur Annuelle Créée par Projet (Ar)',
      subtitle: 'Comparaison entre CAPEX initial et gains cumulés sur 12 mois',
      categories: chartProjets.map((p) => p.nomProjet.slice(0, 14)),
      series: [
        {
          name: 'Investissement',
          values: chartProjets.map((p) => p.coutInvestissementEuros || 0),
          colorRgb: builder.theme.primaryRgb,
        },
        {
          name: 'Valeur annuelle (An 1)',
          values: chartProjets.map(
            (p) =>
              (p.economiesFinancieresAnnuellesEuros || 0) +
              (p.gainTempsEstimeHeuresParAn || 0) * (p.tauxHoraireMoyenValorise || 25000)
          ),
          colorRgb: builder.theme.successRgb,
        },
      ],
      valueFormatter: formatCompactAriaryPdf,
      heightMm: 35,
    });
  }

  const roiRows = projets.map((p) => {
    const inv = p.coutInvestissementEuros || 0;
    const eco = p.economiesFinancieresAnnuellesEuros || 0;
    const h = p.gainTempsEstimeHeuresParAn || 0;
    const val = eco + h * (p.tauxHoraireMoyenValorise || 25000);
    const roi = inv > 0 ? Math.round(((val - inv) / inv) * 100) : 0;
    const payback = val > 0 ? Math.round((inv / val) * 12 * 10) / 10 : 0;
    return [
      `${p.nomProjet}\n[${p.categorie}]`,
      formatAriary(inv, true),
      formatAriary(eco, true),
      `${h} h/an`,
      `${roi >= 0 ? `+${roi}%` : `${roi}%`} (${payback} m)`,
    ];
  });
  if (roiRows.length > 0) {
    roiRows.push([
      `TOTAL PORTEFEUILLE`,
      formatAriary(totalRoiInvest, true),
      formatAriary(totalRoiEco, true),
      `${totalRoiHours} h/an`,
      `${portfolioRoiPct >= 0 ? `+${portfolioRoiPct}%` : `${portfolioRoiPct}%`} global`,
    ]);
  }
  builder.drawDataTable(
    ['Projet IT & Catégorie', 'CAPEX (Ar)', 'Économies / An', 'Temps Gagné', 'ROI An 1 / Payback'],
    roiRows,
    [32, 18, 18, 13, 19],
    {
      boldColumns: [0],
      alignRightColumns: [1, 2, 3],
      statusColumns: [4],
      totalRowIndices: roiRows.length > 0 ? [roiRows.length - 1] : [],
      emptyMessage: 'Aucun projet ROI enregistré dans le portefeuille.',
    }
  );

  // --- 4. RECOMMANDATIONS & CONCLUSION ---
  builder.drawSectionHeading(
    '4. CONCLUSION FINANCIÈRE & VALIDATION',
    'Arbitrages budgétaires préconisés et visa hiérarchique'
  );
  builder.drawCalloutBox(
    'Synthèse & Arbitrages Recommandés',
    `• Prioriser les initiatives à délai d'amortissement inférieur à 12 mois.\n• Maintenir un suivi trimestriel de la conversion devises (EUR/USD -> Ar) sur les licences SaaS (${formatAriary(saasAnnualAr, true)}/an).\n• Consolider les reliquats disponibles (${formatAriary(totalRemaining, true)}) sur les postes critiques d'infrastructure et de sécurité.`,
    'info'
  );

  builder.drawSignatureGrid(
    {
      role: 'ÉTABLI PAR (SERVICE IT)',
      name: techName,
      dateLabel: genDate,
      statusLabel: 'Analyse consolidée',
      signed: true,
    },
    {
      role: 'VALIDATION DIRECTION / RSI',
      name: rsiName,
      statusLabel: 'Pour approbation budgétaire',
      signed: false,
    }
  );

  const meta: PdfFooterHeaderMeta = {
    organization: entreprise,
    documentTitle: `Analyse Budgétaire & ROI IT ${annee}`,
    shortTitle: `Analyse ROI IT ${annee}`,
    reference: `ROI-${annee}`,
    author: techName,
    subject: `Analyse financière et ROI IT — ${entreprise}`,
    generationDate: genDate,
    hasCoverPage: true,
  };

  return {
    builder,
    filename: `Analyse_Budget_ROI_IT_${annee}.pdf`,
    meta,
  };
}

/**
 * Génère et télécharge le rapport PDF d'analyse budgétaire et ROI en Ariary.
 */
export function generateRoiAnalysisPdf(
  data: CahierSuiviData,
  fxRatesOverride?: FxRates
): PdfExportResult {
  const { builder, filename, meta } = buildRoiAnalysisPdfDocument(data, fxRatesOverride);
  return builder.finalizeAndSave(filename, meta);
}
