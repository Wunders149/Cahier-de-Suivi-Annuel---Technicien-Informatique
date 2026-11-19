import {
  BorderStyle,
  Document,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import {
  FicheIntervention,
  GeneralInfo,
  NatureIntervention,
} from '../types/it-tracker';
import { formatDuration } from './durationFormatter';
import {
  formatInterventionStatusLabel,
  getInterventionVocabulary,
} from './interventionLabels';
import {
  DocumentCategory,
  formatGenerationDateFr,
  getDocumentTheme,
  getStatusTone,
  getToneColors,
  sanitizeDocxText,
  sanitizeFileSlug,
  sanitizePdfText,
} from './docDesign/documentThemes';
import { PdfDocumentBuilder } from './docDesign/pdfLayoutEngine';
import {
  A4_HEIGHT_DXA,
  A4_WIDTH_DXA,
  CONTENT_WIDTH_DXA,
  STANDARD_MARGIN_DXA,
  createDocxCalloutBox,
  createDocxDataTable,
  createDocxDocumentBanner,
  createDocxKeyValueGridTable,
  createDocxRunningFooter,
  createDocxRunningHeader,
  createDocxSectionHeading,
  createDocxSignatureTable,
  createDocxStructuredParagraphs,
  createEditorialDocStyles,
  packAndSaveDocx,
} from './docDesign/docxLayoutEngine';

function resolveTechnicalCategory(nature?: NatureIntervention): {
  category: DocumentCategory;
  reportMainTitle: string;
} {
  if (nature === 'Déploiement / Installation') {
    return {
      category: 'technical_deployment',
      reportMainTitle: 'Procès-Verbal de Déploiement & Mise en Service',
    };
  }
  if (nature === 'Maintenance / Contrôle') {
    return {
      category: 'technical_maintenance',
      reportMainTitle: 'Rapport de Maintenance & Contrôle Technique',
    };
  }
  return {
    category: 'technical_incident',
    reportMainTitle: "Rapport Détaillé d'Intervention Technique",
  };
}

function buildInterventionContext(
  intervention: FicheIntervention,
  generalInfo?: GeneralInfo
) {
  const { category, reportMainTitle } = resolveTechnicalCategory(
    intervention.natureIntervention
  );
  const vocab = getInterventionVocabulary(intervention.natureIntervention);
  const statusDisplay = formatInterventionStatusLabel(
    intervention.resultat,
    intervention.natureIntervention
  );
  const genDate = formatGenerationDateFr();

  const companyName =
    generalInfo?.entreprise?.trim() || "Direction des Systèmes d'Information";
  const techLine = generalInfo
    ? `${generalInfo.prenomTechnicien || ''} ${generalInfo.nomTechnicien || ''}`.trim() ||
      'Technicien Informatique'
    : 'Technicien Informatique';

  const domaineText = (
    intervention.domaineTitre?.trim() ||
    `${vocab.domainPrefix} · ${(intervention.type || intervention.typeIntervention).toUpperCase()}`
  ).toUpperCase();

  const subtitleText =
    intervention.titreRapport?.trim() ||
    `${intervention.numeroReference} — ${intervention.equipementConcerne} (${intervention.dateReception})`;

  const resultLabel = `${statusDisplay}${
    intervention.solutionAppliquee?.trim()
      ? ` — ${intervention.solutionAppliquee.trim()}`
      : ''
  }`;

  const summaryRows: Array<{ label: string; value: string; isStatus?: boolean }> = [
    {
      label: 'Référence & Date',
      value: `${intervention.numeroReference} · Le ${intervention.dateReception} à ${
        intervention.heureReception
      }${techLine ? ` · Intervenant : ${techLine}` : ''}`,
    },
    {
      label: 'Demandeur / Service',
      value: `${intervention.nomDemandeur} (${intervention.serviceDemandeur})`,
    },
    {
      label: 'Priorité & Type',
      value: `${intervention.priorite} · ${intervention.type || intervention.typeIntervention}`,
    },
    {
      label: vocab.equipmentsRowLabel,
      value: intervention.equipementConcerne || '—',
    },
    {
      label: vocab.descriptionCardTitle,
      value: intervention.descriptionPanne || '—',
    },
    {
      label: vocab.diagnosticLabel,
      value: intervention.diagnosticTechnique || '—',
    },
    {
      label: vocab.causeLabel,
      value: intervention.causeIdentifiee || '—',
    },
    {
      label: vocab.materialLabel,
      value: intervention.materielLogicielUtilise || '—',
    },
    {
      label: 'Temps total consacré',
      value: formatDuration(intervention.tempsConsacreMin, true),
    },
    {
      label: 'Statut final',
      value: resultLabel,
      isStatus: true,
    },
  ];

  const analysisText =
    intervention.analyseCauseRacine?.trim() ||
    `${intervention.diagnosticTechnique}\n\n${vocab.causeLabel} : ${intervention.causeIdentifiee}\n\n${vocab.solutionCardTitle} : ${intervention.solutionAppliquee}`;

  const details = intervention.detailEquipements || [];
  const slug = sanitizeFileSlug(
    `${intervention.numeroReference}_${intervention.equipementConcerne}`
  );

  return {
    category,
    reportMainTitle,
    vocab,
    statusDisplay,
    genDate,
    companyName,
    techLine,
    domaineText,
    subtitleText,
    summaryRows,
    analysisText,
    details,
    slug,
  };
}

/**
 * Génère un Rapport Détaillé d'Intervention Technique en PDF A4 vectoriel
 * adapté dynamiquement à la nature de l'opération (Incident, Déploiement/PV, Maintenance).
 */
export function generateInterventionReportPdf(
  intervention: FicheIntervention,
  generalInfo?: GeneralInfo
): void {
  const ctx = buildInterventionContext(intervention, generalInfo);
  const builder = new PdfDocumentBuilder(ctx.category);
  const { doc, theme } = builder;

  // --- EN-TÊTE EXÉCUTIF ---
  builder.drawDocumentBanner({
    organization: ctx.companyName,
    eyebrow: ctx.domaineText,
    title: ctx.reportMainTitle,
    subtitle: ctx.subtitleText,
    rightBadge: `Réf. ${intervention.numeroReference} · Édité le ${ctx.genDate}`,
    subMeta: `Demandeur : ${intervention.nomDemandeur} (${intervention.serviceDemandeur}) · Intervenant : ${ctx.techLine}`,
  });

  // --- 1. SYNTHÈSE ---
  builder.drawSectionHeading(ctx.vocab.summaryHeading);
  builder.drawKeyValueTable(
    ctx.summaryRows.map((r) => ({
      label: r.label,
      value: r.value,
      isStatus: r.isStatus,
      tone: r.isStatus ? getStatusTone(intervention.resultat) : undefined,
    })),
    {
      headerLeft: "Paramètre d'intervention",
      headerRight: 'Détail technique constaté',
      labelWidthMm: 48,
    }
  );

  // --- 2. ANALYSE TECHNIQUE / ÉTAPES RÉALISÉES ---
  builder.drawSectionHeading(ctx.vocab.analysisHeading);
  builder.drawStructuredText(ctx.analysisText, { fontSize: 8.8 });
  builder.addSpacing(3);

  // --- 3. RAPPORT DÉTAILLÉ PAR ÉQUIPEMENT / UNITÉ ---
  if (ctx.details.length > 0) {
    builder.drawSectionHeading(ctx.vocab.equipmentsHeading);

    ctx.details.forEach((item, idx) => {
      const actions = (item.actionsCorrectives || []).filter((a) => a.trim().length > 0);
      const toneColors = getToneColors(getStatusTone(item.statut), theme);

      // Estimation pour éviter un sous-titre isolé
      builder.ensureSpace(34);
      const startPage = doc.getCurrentPageInfo().pageNumber;
      const startY = builder.y;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.8);
      doc.setTextColor(...theme.secondaryRgb);
      const subTitle = sanitizePdfText(
        `3.${idx + 1}. ${ctx.vocab.equipmentItemPrefix} : ${item.equipement} — ${item.titre}`
      );
      const subLines = doc.splitTextToSize(subTitle, builder.contentWidth - 8);
      doc.text(subLines, builder.margin + 4.5, builder.y + 3);
      builder.y += subLines.length * 4.3 + 3;

      // Constat / Emplacement
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...theme.textDarkRgb);
      doc.text(sanitizePdfText(`${ctx.vocab.equipmentDiagLabel} :`), builder.margin + 4.5, builder.y);
      builder.y += 4;
      builder.drawStructuredText(item.constatDiagnostic || '—', {
        indentMm: 4.5,
        fontSize: 8.4,
      });

      // Actions / Opérations
      if (actions.length > 0) {
        builder.ensureSpace(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...theme.textDarkRgb);
        doc.text(
          sanitizePdfText(`${ctx.vocab.equipmentActionsLabel} :`),
          builder.margin + 4.5,
          builder.y
        );
        builder.y += 4.2;
        builder.drawStructuredText(actions.map((a) => `• ${a}`).join('\n'), {
          indentMm: 4.5,
          fontSize: 8.4,
        });
      }

      // Matériel spécifique si présent
      if (item.materielSpecifique?.trim()) {
        builder.ensureSpace(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(...theme.textMutedRgb);
        const matLines = doc.splitTextToSize(
          sanitizePdfText(`Matériel : ${item.materielSpecifique.trim()}`),
          builder.contentWidth - 8
        );
        doc.text(matLines, builder.margin + 4.5, builder.y);
        builder.y += matLines.length * 3.8 + 1.5;
      }

      // Résultat
      const resText = sanitizePdfText(
        `Résultat : ${item.resultatDetail?.trim() || item.statut} (${item.statut}).`
      );
      const resLines = doc.splitTextToSize(resText, builder.contentWidth - 8);
      builder.ensureSpace(resLines.length * 4 + 3);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...toneColors.rgb);
      doc.text(resLines, builder.margin + 4.5, builder.y);
      builder.y += resLines.length * 4 + 2;

      // Barre latérale d'accentuation si le bloc est resté sur la même page
      if (doc.getCurrentPageInfo().pageNumber === startPage && builder.y > startY) {
        doc.setDrawColor(...theme.accentRgb);
        doc.setLineWidth(1);
        doc.line(builder.margin, startY, builder.margin, builder.y - 1.5);
      }

      builder.addSpacing(4.5);
    });

    // --- 4. RÉCAPITULATIF COMPARATIF ---
    builder.drawSectionHeading(ctx.vocab.comparisonHeading);
    builder.drawDataTable(
      [
        ctx.vocab.comparisonEquipCol,
        ctx.vocab.comparisonDiagCol,
        ctx.vocab.comparisonOpsCol,
        ctx.vocab.comparisonMatCol,
        'Statut',
      ],
      ctx.details.map((item) => [
        item.equipement || '—',
        item.constatDiagnostic || '—',
        item.operationsResume?.trim() || item.actionsCorrectives.join(' + ') || '—',
        item.materielSpecifique || '—',
        item.statut || '—',
      ]),
      [16, 22, 28, 21, 13],
      { boldColumns: [0], statusColumns: [4], fontSize: 7.7 }
    );
  }

  // --- RECOMMANDATIONS D'EXPLOITATION ---
  if (intervention.recommandations?.trim()) {
    const recSectionNum = ctx.details.length > 0 ? 5 : 3;
    builder.drawSectionHeading(`${recSectionNum}. ${ctx.vocab.recommandationsTitle}`);
    builder.drawCalloutBox(
      "Préconisations Techniques & Suivi d'Exploitation",
      intervention.recommandations.trim(),
      'info'
    );
  }

  // --- VALIDATION & SIGNATURES ---
  const sigSectionNum =
    (ctx.details.length > 0 ? 5 : 3) + (intervention.recommandations?.trim() ? 1 : 0);
  builder.drawSectionHeading(`${sigSectionNum}. VALIDATION & RÉCEPTION DE L'INTERVENTION`);
  if (intervention.commentairesDemandeur?.trim()) {
    builder.drawCalloutBox(
      'Commentaire du Demandeur / Service Utilisateur',
      intervention.commentairesDemandeur.trim(),
      intervention.validationDemandeur ? 'success' : 'neutral'
    );
  }
  builder.drawSignatureGrid(
    {
      role: 'INTERVENANT / TECHNICIEN IT',
      name: ctx.techLine,
      dateLabel: intervention.dateReception,
      statusLabel: `Clôturé (${ctx.statusDisplay})`,
      signed: intervention.resultat === 'Résolu',
    },
    {
      role: 'DEMANDEUR / VALIDATION SERVICE',
      name: `${intervention.nomDemandeur} (${intervention.serviceDemandeur})`,
      dateLabel: intervention.dateValidation || undefined,
      statusLabel: intervention.validationDemandeur
        ? 'Réception validée par le demandeur'
        : 'En attente de validation demandeur',
      signed: Boolean(intervention.validationDemandeur),
    }
  );

  // En-tête et pied de page avec pagination "Page X sur Y"
  builder.finalizeHeadersAndFooters({
    organization: ctx.companyName,
    documentTitle: `${ctx.reportMainTitle} — ${intervention.equipementConcerne}`,
    reference: intervention.numeroReference,
    generationDate: ctx.genDate,
    hasCoverPage: false,
  });

  doc.save(`rapport_intervention_${ctx.slug}.pdf`);
}

/**
 * Génère et télécharge un Rapport Détaillé d'Intervention Technique au format Word (.docx)
 * adapté dynamiquement à la nature de l'intervention.
 */
export async function generateInterventionReportDocx(
  intervention: FicheIntervention,
  generalInfo?: GeneralInfo
): Promise<void> {
  const ctx = buildInterventionContext(intervention, generalInfo);
  const theme = getDocumentTheme(ctx.category);

  const equipmentChildren: Array<Paragraph | Table> = [];
  if (ctx.details.length > 0) {
    equipmentChildren.push(...createDocxSectionHeading(theme, ctx.vocab.equipmentsHeading));

    ctx.details.forEach((item, idx) => {
      const actions = (item.actionsCorrectives || []).filter((a) => a.trim().length > 0);
      const toneColors = getToneColors(getStatusTone(item.statut), theme);
      const leftAccent = { style: BorderStyle.SINGLE, size: 18, color: theme.accentHex };
      const subtleBorder = { style: BorderStyle.SINGLE, size: 4, color: theme.borderHex };

      const cardChildren: Paragraph[] = [
        new Paragraph({
          keepNext: true,
          spacing: { before: 0, after: 70 },
          children: [
            new TextRun({
              text: sanitizeDocxText(
                `3.${idx + 1}. ${ctx.vocab.equipmentItemPrefix} : ${item.equipement} — ${item.titre}`
              ),
              bold: true,
              size: 21,
              color: theme.secondaryHex,
            }),
          ],
        }),
        new Paragraph({
          keepNext: true,
          spacing: { before: 0, after: 40 },
          children: [
            new TextRun({
              text: sanitizeDocxText(`${ctx.vocab.equipmentDiagLabel} :`),
              bold: true,
              size: 18,
              color: theme.textDarkHex,
            }),
          ],
        }),
        ...createDocxStructuredParagraphs(theme, item.constatDiagnostic || '—', { fontSize: 18 }),
      ];

      if (actions.length > 0) {
        cardChildren.push(
          new Paragraph({
            keepNext: true,
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text: sanitizeDocxText(`${ctx.vocab.equipmentActionsLabel} :`),
                bold: true,
                size: 18,
                color: theme.textDarkHex,
              }),
            ],
          }),
          ...createDocxStructuredParagraphs(
            theme,
            actions.map((a) => `• ${a}`).join('\n'),
            { fontSize: 18 }
          )
        );
      }

      if (item.materielSpecifique?.trim()) {
        cardChildren.push(
          new Paragraph({
            spacing: { before: 30, after: 40 },
            children: [
              new TextRun({
                text: 'Matériel utilisé : ',
                bold: true,
                size: 17,
                color: theme.textMutedHex,
              }),
              new TextRun({
                text: sanitizeDocxText(item.materielSpecifique),
                size: 17,
                color: theme.textBodyHex,
              }),
            ],
          })
        );
      }

      cardChildren.push(
        new Paragraph({
          spacing: { before: 50, after: 0 },
          children: [
            new TextRun({
              text: 'Résultat : ',
              bold: true,
              size: 18,
              color: toneColors.hex,
            }),
            new TextRun({
              text: sanitizeDocxText(
                `${item.resultatDetail?.trim() || item.statut} (${item.statut}).`
              ),
              bold: true,
              size: 18,
              color: toneColors.hex,
            }),
          ],
        })
      );

      equipmentChildren.push(
        new Table({
          width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH_DXA],
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
                  shading: { type: ShadingType.CLEAR, fill: theme.zebraBgHex },
                  borders: {
                    top: subtleBorder,
                    bottom: subtleBorder,
                    right: subtleBorder,
                    left: leftAccent,
                  },
                  margins: { top: 110, bottom: 110, left: 160, right: 140 },
                  children: cardChildren,
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ text: '', spacing: { before: 0, after: 100 } })
      );
    });

    equipmentChildren.push(
      ...createDocxSectionHeading(theme, ctx.vocab.comparisonHeading),
      createDocxDataTable(
        theme,
        [
          ctx.vocab.comparisonEquipCol,
          ctx.vocab.comparisonDiagCol,
          ctx.vocab.comparisonOpsCol,
          ctx.vocab.comparisonMatCol,
          'Statut',
        ],
        ctx.details.map((item) => [
          item.equipement || '—',
          item.constatDiagnostic || '—',
          item.operationsResume?.trim() || item.actionsCorrectives.join(' + ') || '—',
          item.materielSpecifique || '—',
          item.statut || '—',
        ]),
        [16, 22, 28, 21, 13],
        { boldColumns: [0], statusColumns: [4] }
      )
    );
  }

  const sigSectionNum =
    (ctx.details.length > 0 ? 5 : 3) + (intervention.recommandations?.trim() ? 1 : 0);

  const children: Array<Paragraph | Table> = [
    createDocxDocumentBanner({
      theme,
      organization: ctx.companyName,
      eyebrow: ctx.domaineText,
      title: ctx.reportMainTitle,
      subtitle: ctx.subtitleText,
      rightBadge: `Réf. ${intervention.numeroReference} · Édité le ${ctx.genDate}`,
    }),
    new Paragraph({ text: '', spacing: { before: 100, after: 0 } }),

    ...createDocxSectionHeading(theme, ctx.vocab.summaryHeading),
    createDocxKeyValueGridTable(
      theme,
      ctx.summaryRows.map((r) => ({
        kind: 'pair',
        label: r.label,
        value: r.value,
        isStatus: r.isStatus,
        tone: r.isStatus ? getStatusTone(intervention.resultat) : undefined,
      })),
      {
        headerLeft: "Paramètre d'intervention",
        headerRight: 'Détail technique constaté',
        labelWidthPct: 32,
      }
    ),

    ...createDocxSectionHeading(theme, ctx.vocab.analysisHeading),
    ...createDocxStructuredParagraphs(theme, ctx.analysisText, { fontSize: 20 }),

    ...equipmentChildren,

    ...(intervention.recommandations?.trim()
      ? [
          ...createDocxSectionHeading(
            theme,
            `${ctx.details.length > 0 ? 5 : 3}. ${ctx.vocab.recommandationsTitle}`
          ),
          createDocxCalloutBox(
            theme,
            "Préconisations Techniques & Suivi d'Exploitation",
            intervention.recommandations.trim(),
            'info'
          ),
        ]
      : []),

    ...createDocxSectionHeading(
      theme,
      `${sigSectionNum}. VALIDATION & RÉCEPTION DE L'INTERVENTION`
    ),
    ...(intervention.commentairesDemandeur?.trim()
      ? [
          createDocxCalloutBox(
            theme,
            'Commentaire du Demandeur / Service Utilisateur',
            intervention.commentairesDemandeur.trim(),
            intervention.validationDemandeur ? 'success' : 'neutral'
          ),
          new Paragraph({ text: '', spacing: { before: 0, after: 100 } }),
        ]
      : []),
    createDocxSignatureTable(
      theme,
      {
        role: 'INTERVENANT / TECHNICIEN IT',
        name: ctx.techLine,
        dateLabel: intervention.dateReception,
        statusLabel: `Clôturé (${ctx.statusDisplay})`,
        signed: intervention.resultat === 'Résolu',
      },
      {
        role: 'DEMANDEUR / VALIDATION SERVICE',
        name: `${intervention.nomDemandeur} (${intervention.serviceDemandeur})`,
        dateLabel: intervention.dateValidation || undefined,
        statusLabel: intervention.validationDemandeur
          ? 'Réception validée par le demandeur'
          : 'En attente de validation demandeur',
        signed: Boolean(intervention.validationDemandeur),
      }
    ),
  ];

  const doc = new Document({
    title: `${ctx.reportMainTitle} (${intervention.numeroReference})`,
    subject: ctx.subtitleText,
    creator: ctx.techLine,
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
            documentTitle: `${ctx.reportMainTitle} — ${intervention.equipementConcerne}`,
            reference: intervention.numeroReference,
            generationDate: ctx.genDate,
          }),
        },
        footers: {
          first: createDocxRunningFooter({
            theme,
            organization: ctx.companyName,
            confidentialityText: `${ctx.reportMainTitle} (${intervention.numeroReference})`,
            generationDate: ctx.genDate,
          }),
          default: createDocxRunningFooter({
            theme,
            organization: ctx.companyName,
            confidentialityText: `${ctx.reportMainTitle} (${intervention.numeroReference})`,
            generationDate: ctx.genDate,
          }),
        },
        children,
      },
    ],
  });

  await packAndSaveDocx(doc, `rapport_intervention_${ctx.slug}.docx`);
}
