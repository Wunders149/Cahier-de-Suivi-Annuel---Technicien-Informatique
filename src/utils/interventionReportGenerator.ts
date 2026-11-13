import jsPDF from 'jspdf';
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
  AlignmentType,
  ShadingType,
  Footer,
  PageNumber,
} from 'docx';
import { saveAs } from 'file-saver';
import { FicheIntervention, GeneralInfo } from '../types/it-tracker';
import { formatDuration } from './durationFormatter';

function sanitizeFileSlug(text: string): string {
  return (text || 'intervention')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

/**
 * Génère un Rapport Détaillé d'Intervention Technique en PDF A4
 * aligné sur la mise en page professionnelle standard (Synthèse, Analyse, Détail par équipement, Comparatif).
 */
export function generateInterventionReportPdf(
  intervention: FicheIntervention,
  generalInfo?: GeneralInfo
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 16;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - margin * 2;
  const maxY = pageHeight - 22;
  let y = 18;

  const navy: [number, number, number] = [15, 42, 74];
  const blue: [number, number, number] = [2, 132, 199];
  const slate900: [number, number, number] = [15, 23, 42];
  const slate700: [number, number, number] = [51, 65, 85];
  const slate500: [number, number, number] = [100, 116, 139];
  const lightBg: [number, number, number] = [241, 245, 249];
  const borderGray: [number, number, number] = [203, 213, 225];
  const green: [number, number, number] = [21, 128, 61];
  const amber: [number, number, number] = [180, 83, 9];

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > maxY) {
      doc.addPage();
      y = 18;
    }
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...navy);
    doc.text(title, margin, y);
    y += 2.5;
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // --- EN-TÊTE DU RAPPORT ---
  const domaineText = (
    intervention.domaineTitre?.trim() ||
    `MAINTENANCE & SUPPORT ${intervention.typeIntervention.toUpperCase()}`
  ).toUpperCase();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...blue);
  doc.text(domaineText, margin, y);
  y += 6.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...navy);
  doc.text("Rapport Détaillé d'Intervention Technique", margin, y);
  y += 5.5;

  const subtitleText =
    intervention.titreRapport?.trim() ||
    `${intervention.numeroReference} — ${intervention.equipementConcerne} (${intervention.dateReception})`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...slate500);
  const subLines = doc.splitTextToSize(subtitleText, contentWidth);
  doc.text(subLines, margin, y);
  y += subLines.length * 4.5 + 1.5;

  doc.setDrawColor(...navy);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- 1. SYNTHÈSE GÉNÉRALE DE L'INCIDENT ---
  drawSectionHeading("1. Synthèse Générale de l'Incident");

  const techLine = generalInfo
    ? `${generalInfo.prenomTechnicien} ${generalInfo.nomTechnicien}`.trim()
    : '';
  const resultLabel = `${intervention.resultat}${
    intervention.solutionAppliquee?.trim()
      ? ` — ${intervention.solutionAppliquee.trim()}`
      : ''
  }`;

  const summaryRows: Array<{ label: string; value: string; isResult?: boolean }> = [
    {
      label: 'Référence & Date',
      value: `${intervention.numeroReference} · Reçu le ${intervention.dateReception} à ${intervention.heureReception}${
        techLine ? ` · Intervenant : ${techLine}` : ''
      }`,
    },
    {
      label: 'Demandeur / Service',
      value: `${intervention.nomDemandeur} (${intervention.serviceDemandeur})`,
    },
    {
      label: 'Équipements concernés',
      value: intervention.equipementConcerne || '—',
    },
    {
      label: 'Description de la panne',
      value: intervention.descriptionPanne || '—',
    },
    {
      label: 'Diagnostic technique',
      value: intervention.diagnosticTechnique || '—',
    },
    {
      label: 'Cause identifiée',
      value: intervention.causeIdentifiee || '—',
    },
    {
      label: 'Matériel utilisé',
      value: intervention.materielLogicielUtilise || '—',
    },
    {
      label: 'Temps total consacré',
      value: formatDuration(intervention.tempsConsacreMin, true),
    },
    {
      label: 'Résultat final',
      value: resultLabel,
      isResult: true,
    },
  ];

  const col1Width = 48;
  const col2Width = contentWidth - col1Width;

  // En-tête du tableau Synthèse
  ensureSpace(12);
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, col1Width, 8, 'FD');
  doc.rect(margin + col1Width, y, col2Width, 8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...navy);
  doc.text("Paramètre d'intervention", margin + 3, y + 5.2);
  doc.text('Détail technique constaté', margin + col1Width + 3, y + 5.2);
  y += 8;

  summaryRows.forEach((row) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const valLines = doc.splitTextToSize(row.value, col2Width - 6);
    const rowHeight = Math.max(8, valLines.length * 4 + 4.5);

    ensureSpace(rowHeight);

    doc.setDrawColor(...borderGray);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, col1Width, rowHeight, 'S');
    doc.rect(margin + col1Width, y, col2Width, rowHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slate900);
    doc.text(row.label, margin + 3, y + 5.2);

    if (row.isResult) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(intervention.resultat === 'Résolu' ? green : amber));
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slate700);
    }
    doc.text(valLines, margin + col1Width + 3, y + 5.2);
    y += rowHeight;
  });

  y += 8;

  // --- 2. ANALYSE TECHNIQUE ET CAUSE RACINE ---
  drawSectionHeading('2. Analyse Technique et Cause Racine');

  const analysisText =
    intervention.analyseCauseRacine?.trim() ||
    `${intervention.diagnosticTechnique}\n\nCause identifiée : ${intervention.causeIdentifiee}`;

  const paragraphs = analysisText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...slate700);

  paragraphs.forEach((para) => {
    const lines = doc.splitTextToSize(para, contentWidth);
    ensureSpace(lines.length * 4.3 + 4);
    doc.text(lines, margin, y);
    y += lines.length * 4.3 + 3.5;
  });

  // --- 3. RAPPORT DÉTAILLÉ PAR ÉQUIPEMENT (SI PRÉSENT) ---
  const details = intervention.detailEquipements || [];
  if (details.length > 0) {
    y += 4;
    drawSectionHeading('3. Rapport Détaillé par Équipement');

    details.forEach((item, idx) => {
      const startSectionY = () => y;

      const actions = (item.actionsCorrectives || []).filter((a) => a.trim().length > 0);
      const constatLines = doc.splitTextToSize(
        `Constat et diagnostic : ${item.constatDiagnostic || '—'}`,
        contentWidth - 8
      );
      const actionLineBlocks = actions.map((act) =>
        doc.splitTextToSize(act, contentWidth - 14)
      );
      const resultText = `Résultat : ${
        item.resultatDetail?.trim() || item.statut
      } (${item.statut}).`;
      const resultLines = doc.splitTextToSize(resultText, contentWidth - 8);

      const estimatedHeight =
        10 +
        constatLines.length * 4.1 +
        6 +
        actionLineBlocks.reduce((acc, blk) => acc + blk.length * 4.1 + 1.5, 0) +
        resultLines.length * 4.1 +
        6;

      ensureSpace(Math.min(estimatedHeight, 70));
      const blockTop = startSectionY();

      // Sous-titre 3.x
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...blue);
      const subTitle = `3.${idx + 1}. Incident ${item.equipement} — ${item.titre}`;
      const subTitleLines = doc.splitTextToSize(subTitle, contentWidth - 8);
      doc.text(subTitleLines, margin + 4, y + 3);
      y += subTitleLines.length * 4.5 + 2.5;

      // Constat et diagnostic
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(...slate900);
      doc.text('Constat et diagnostic :', margin + 4, y);
      y += 4.2;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...slate700);
      const diagLines = doc.splitTextToSize(item.constatDiagnostic || '—', contentWidth - 8);
      ensureSpace(diagLines.length * 4.1);
      doc.text(diagLines, margin + 4, y);
      y += diagLines.length * 4.1 + 2.5;

      // Actions correctives
      if (actions.length > 0) {
        ensureSpace(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...slate900);
        doc.text('Actions correctives appliquées :', margin + 4, y);
        y += 4.5;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...slate700);
        actionLineBlocks.forEach((blk) => {
          ensureSpace(blk.length * 4.1 + 2);
          doc.text('•', margin + 6, y);
          doc.text(blk, margin + 10, y);
          y += blk.length * 4.1 + 1.2;
        });
        y += 1.5;
      }

      // Résultat
      ensureSpace(resultLines.length * 4.1 + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(item.statut === 'Résolu' ? green : slate900));
      doc.text(resultLines, margin + 4, y);
      y += resultLines.length * 4.1 + 2;

      // Barre bleue latérale si le bloc tient sur la même page
      if (y > blockTop) {
        doc.setDrawColor(...blue);
        doc.setLineWidth(1.1);
        doc.line(margin, blockTop, margin, y - 1);
      }

      y += 5;
    });

    // --- 4. RÉCAPITULATIF COMPARATIF DES INTERVENTIONS ---
    y += 2;
    drawSectionHeading('4. Récapitulatif Comparatif des Interventions');

    const cols = [
      { title: 'Équipement', width: 22 },
      { title: 'Diagnostic', width: 42 },
      { title: 'Opérations réalisées', width: 48 },
      { title: 'Matériel spécifique', width: 44 },
      { title: 'Statut', width: contentWidth - 156 },
    ];

    const drawComparisonHeader = () => {
      ensureSpace(14);
      let x = margin;
      doc.setFillColor(...navy);
      doc.setDrawColor(...navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      cols.forEach((c) => {
        doc.rect(x, y, c.width, 8, 'FD');
        doc.text(c.title, x + 2, y + 5.3);
        x += c.width;
      });
      y += 8;
    };

    drawComparisonHeader();

    details.forEach((item) => {
      const opsText =
        item.operationsResume?.trim() ||
        item.actionsCorrectives.join(' + ') ||
        '—';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      const cellTexts = [
        doc.splitTextToSize(item.equipement || '—', cols[0].width - 4),
        doc.splitTextToSize(item.constatDiagnostic || '—', cols[1].width - 4),
        doc.splitTextToSize(opsText, cols[2].width - 4),
        doc.splitTextToSize(item.materielSpecifique || '—', cols[3].width - 4),
        doc.splitTextToSize(item.statut || '—', cols[4].width - 4),
      ];

      const maxLines = Math.max(...cellTexts.map((lines) => lines.length));
      const rowH = Math.max(9, maxLines * 3.8 + 4);

      if (y + rowH > maxY) {
        doc.addPage();
        y = 18;
        drawComparisonHeader();
      }

      let x = margin;
      cols.forEach((c, cIdx) => {
        doc.setDrawColor(...borderGray);
        doc.rect(x, y, c.width, rowH, 'S');
        if (cIdx === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...slate900);
        } else if (cIdx === 4) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...(item.statut === 'Résolu' ? green : amber));
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...slate700);
        }
        doc.text(cellTexts[cIdx], x + 2, y + 4.5);
        x += c.width;
      });
      y += rowH;
    });
  }

  // --- PIED DE PAGE SUR TOUTES LES PAGES ---
  const totalPages = doc.getNumberOfPages();
  const footerLeft = `Rapport d'Intervention Technique (${intervention.numeroReference}) — ${intervention.equipementConcerne}`;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...slate500);
    doc.text(footerLeft.slice(0, 90), margin, pageHeight - 10);
    doc.text(`Page ${p} sur ${totalPages}`, pageWidth - margin, pageHeight - 10, {
      align: 'right',
    });
  }

  const slug = sanitizeFileSlug(
    `${intervention.numeroReference}_${intervention.equipementConcerne}`
  );
  doc.save(`rapport_intervention_${slug}.pdf`);
}

/**
 * Génère et télécharge un Rapport Détaillé d'Intervention Technique au format Word (.docx)
 */
export async function generateInterventionReportDocx(
  intervention: FicheIntervention,
  generalInfo?: GeneralInfo
): Promise<void> {
  const domaineText = (
    intervention.domaineTitre?.trim() ||
    `MAINTENANCE & SUPPORT ${intervention.typeIntervention.toUpperCase()}`
  ).toUpperCase();

  const subtitleText =
    intervention.titreRapport?.trim() ||
    `${intervention.numeroReference} — ${intervention.equipementConcerne} (${intervention.dateReception})`;

  const techLine = generalInfo
    ? `${generalInfo.prenomTechnicien} ${generalInfo.nomTechnicien}`.trim()
    : '';

  const resultLabel = `${intervention.resultat}${
    intervention.solutionAppliquee?.trim()
      ? ` — ${intervention.solutionAppliquee.trim()}`
      : ''
  }`;

  const summaryRowsData: Array<[string, string, boolean?]> = [
    [
      'Référence & Date',
      `${intervention.numeroReference} · ${intervention.dateReception} à ${intervention.heureReception}${
        techLine ? ` · Intervenant : ${techLine}` : ''
      }`,
    ],
    [
      'Demandeur / Service',
      `${intervention.nomDemandeur} (${intervention.serviceDemandeur})`,
    ],
    ['Équipements concernés', intervention.equipementConcerne || '—'],
    ['Description de la panne', intervention.descriptionPanne || '—'],
    ['Diagnostic technique', intervention.diagnosticTechnique || '—'],
    ['Cause identifiée', intervention.causeIdentifiee || '—'],
    ['Matériel utilisé', intervention.materielLogicielUtilise || '—'],
    ['Temps total consacré', formatDuration(intervention.tempsConsacreMin, true)],
    ['Résultat final', resultLabel, true],
  ];

  const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const cellBorders = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
  };

  const summaryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Paramètre d'intervention",
                    bold: true,
                    size: 19,
                    color: '0F2A4A',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
            borders: cellBorders,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Détail technique constaté',
                    bold: true,
                    size: 19,
                    color: '0F2A4A',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      ...summaryRowsData.map(
        ([label, val, isRes]) =>
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: label,
                        bold: true,
                        size: 18,
                        color: '0F172A',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: cellBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: val,
                        bold: Boolean(isRes),
                        size: 18,
                        color: isRes
                          ? intervention.resultat === 'Résolu'
                            ? '15803D'
                            : 'B45309'
                          : '334155',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
      ),
    ],
  });

  const analysisText =
    intervention.analyseCauseRacine?.trim() ||
    `${intervention.diagnosticTechnique}\n\nCause identifiée : ${intervention.causeIdentifiee}`;
  const analysisParagraphs = analysisText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (para) =>
        new Paragraph({
          spacing: { after: 140 },
          children: [
            new TextRun({ text: para, size: 20, color: '334155' }),
          ],
        })
    );

  const sectionHeading = (text: string) =>
    new Paragraph({
      spacing: { before: 240, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
      },
      children: [
        new TextRun({ text, bold: true, size: 24, color: '0F2A4A' }),
      ],
    });

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: domaineText,
          bold: true,
          size: 18,
          color: '0284C7',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: "Rapport Détaillé d'Intervention Technique",
          bold: true,
          size: 34,
          color: '0F2A4A',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 180 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: '0F2A4A' },
      },
      children: [
        new TextRun({
          text: subtitleText,
          size: 20,
          color: '64748B',
        }),
      ],
    }),
    sectionHeading("1. Synthèse Générale de l'Incident"),
    summaryTable,
    sectionHeading('2. Analyse Technique et Cause Racine'),
    ...analysisParagraphs,
  ];

  const details = intervention.detailEquipements || [];
  if (details.length > 0) {
    children.push(sectionHeading('3. Rapport Détaillé par Équipement'));

    details.forEach((item, idx) => {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 80 },
          indent: { left: 180 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 18, color: '0284C7' },
          },
          children: [
            new TextRun({
              text: `3.${idx + 1}. Incident ${item.equipement} — ${item.titre}`,
              bold: true,
              size: 21,
              color: '0284C7',
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          indent: { left: 180 },
          children: [
            new TextRun({
              text: 'Constat et diagnostic : ',
              bold: true,
              size: 19,
              color: '0F172A',
            }),
            new TextRun({
              text: item.constatDiagnostic || '—',
              size: 19,
              color: '334155',
            }),
          ],
        })
      );

      const actions = (item.actionsCorrectives || []).filter((a) => a.trim().length > 0);
      if (actions.length > 0) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            indent: { left: 180 },
            children: [
              new TextRun({
                text: 'Actions correctives appliquées :',
                bold: true,
                size: 19,
                color: '0F172A',
              }),
            ],
          })
        );
        actions.forEach((act) => {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              indent: { left: 420 },
              children: [
                new TextRun({
                  text: `• ${act}`,
                  size: 19,
                  color: '334155',
                }),
              ],
            })
          );
        });
      }

      children.push(
        new Paragraph({
          spacing: { before: 60, after: 140 },
          indent: { left: 180 },
          children: [
            new TextRun({
              text: 'Résultat : ',
              bold: true,
              size: 19,
              color: item.statut === 'Résolu' ? '15803D' : 'B45309',
            }),
            new TextRun({
              text: `${item.resultatDetail?.trim() || item.statut} (${item.statut}).`,
              bold: true,
              size: 19,
              color: item.statut === 'Résolu' ? '15803D' : 'B45309',
            }),
          ],
        })
      );
    });

    children.push(sectionHeading('4. Récapitulatif Comparatif des Interventions'));

    const headers = [
      'Équipement',
      'Diagnostic',
      'Opérations réalisées',
      'Matériel spécifique',
      'Statut',
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: headers.map(
              (h) =>
                new TableCell({
                  shading: { fill: '0F2A4A', type: ShadingType.CLEAR },
                  borders: cellBorders,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: h,
                          bold: true,
                          size: 17,
                          color: 'FFFFFF',
                        }),
                      ],
                    }),
                  ],
                })
            ),
          }),
          ...details.map(
            (item) =>
              new TableRow({
                children: [
                  new TableCell({
                    borders: cellBorders,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: item.equipement || '—',
                            bold: true,
                            size: 17,
                            color: '0F172A',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: cellBorders,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: item.constatDiagnostic || '—',
                            size: 17,
                            color: '334155',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: cellBorders,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text:
                              item.operationsResume?.trim() ||
                              item.actionsCorrectives.join(' + ') ||
                              '—',
                            size: 17,
                            color: '334155',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: cellBorders,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: item.materielSpecifique || '—',
                            size: 17,
                            color: '334155',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: cellBorders,
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: item.statut || '—',
                            bold: true,
                            size: 17,
                            color: item.statut === 'Résolu' ? '15803D' : 'B45309',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              })
          ),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Rapport d'Intervention Technique (${intervention.numeroReference}) — Page `,
                    size: 16,
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '64748B',
                  }),
                  new TextRun({
                    text: ' / ',
                    size: 16,
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '64748B',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const slug = sanitizeFileSlug(
    `${intervention.numeroReference}_${intervention.equipementConcerne}`
  );
  saveAs(blob, `rapport_intervention_${slug}.docx`);
}
