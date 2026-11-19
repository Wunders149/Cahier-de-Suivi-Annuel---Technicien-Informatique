import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  IStylesOptions,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import FileSaver from 'file-saver';
import {
  DocumentThemePalette,
  formatGenerationDateFr,
  getOrganizationMonogram,
  getStatusTone,
  getToneColors,
  normalizeColumnWidthsPct,
  parseStructuredText,
  sanitizeDocxText,
  SemanticTone,
} from './documentThemes';

// Format A4 en twips (DXA) : 210mm x 297mm
export const A4_WIDTH_DXA = 11906;
export const A4_HEIGHT_DXA = 16838;
export const STANDARD_MARGIN_DXA = 1080; // ~19 mm
export const CONTENT_WIDTH_DXA = A4_WIDTH_DXA - STANDARD_MARGIN_DXA * 2; // 9746 DXA

export const CELL_MARGINS_STANDARD = {
  top: 90,
  bottom: 90,
  left: 125,
  right: 125,
};

export const CELL_MARGINS_COMPACT = {
  top: 75,
  bottom: 75,
  left: 105,
  right: 105,
};

export function createGridBorders(colorHex: string, size = 4) {
  const b = { style: BorderStyle.SINGLE, size, color: colorHex };
  return { top: b, bottom: b, left: b, right: b };
}

export const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

/**
 * Calcule des largeurs de colonnes DXA exactes totalisant CONTENT_WIDTH_DXA.
 */
export function computeDxaColumnWidths(
  colWidthsPct: number[],
  totalDxa = CONTENT_WIDTH_DXA
): number[] {
  const normalized = normalizeColumnWidthsPct(colWidthsPct);
  const widths = normalized.map((p) => Math.max(400, Math.round((totalDxa * p) / 100)));
  const currentSum = widths.reduce((a, b) => a + b, 0);
  widths[0] += totalDxa - currentSum;
  return widths;
}

/**
 * Styles Word natifs complets (Normal, Title, Subtitle, Heading 1/2/3)
 * pour une compatibilité native et une édition fluide sous Word et LibreOffice.
 */
export function createEditorialDocStyles(theme: DocumentThemePalette): IStylesOptions {
  return {
    default: {
      document: {
        run: {
          font: 'Calibri',
          size: 20, // 10pt
          color: theme.textBodyHex,
        },
        paragraph: {
          spacing: { line: 276, after: 90 },
        },
      },
      title: {
        run: {
          font: 'Calibri',
          size: 44, // 22pt
          bold: true,
          color: theme.primaryHex,
        },
        paragraph: {
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 100 },
        },
      },
      heading1: {
        run: {
          font: 'Calibri',
          size: 26, // 13pt
          bold: true,
          color: theme.primaryHex,
        },
        paragraph: {
          spacing: { before: 320, after: 110, line: 260 },
          keepNext: true,
          keepLines: true,
        },
      },
      heading2: {
        run: {
          font: 'Calibri',
          size: 22, // 11pt
          bold: true,
          color: theme.secondaryHex,
        },
        paragraph: {
          spacing: { before: 220, after: 80, line: 260 },
          keepNext: true,
          keepLines: true,
        },
      },
      heading3: {
        run: {
          font: 'Calibri',
          size: 20, // 10pt
          bold: true,
          color: theme.accentHex,
        },
        paragraph: {
          spacing: { before: 150, after: 60, line: 260 },
          keepNext: true,
          keepLines: true,
        },
      },
    },
    paragraphStyles: [
      {
        id: 'DocSubtitle',
        name: 'DocSubtitle',
        basedOn: 'Normal',
        next: 'Normal',
        run: {
          font: 'Calibri',
          size: 22,
          italics: true,
          color: theme.textMutedHex,
        },
        paragraph: {
          spacing: { after: 160, line: 260 },
        },
      },
      {
        id: 'EditorialCaption',
        name: 'EditorialCaption',
        basedOn: 'Normal',
        run: {
          font: 'Calibri',
          size: 16,
          italics: true,
          color: theme.textMutedHex,
        },
        paragraph: {
          spacing: { after: 80 },
        },
      },
    ],
  };
}

/**
 * En-tête professionnel courant avec organisation, titre du document et date d'édition.
 */
export function createDocxRunningHeader(options: {
  theme: DocumentThemePalette;
  organization: string;
  documentTitle: string;
  reference?: string;
  generationDate?: string;
}): Header {
  const { theme, organization, documentTitle, reference } = options;
  const genDate = options.generationDate || formatGenerationDateFr();
  const leftW = Math.round(CONTENT_WIDTH_DXA * 0.65);
  const rightW = CONTENT_WIDTH_DXA - leftW;

  const bottomRule = { style: BorderStyle.SINGLE, size: 6, color: theme.borderHex };

  return new Header({
    children: [
      new Table({
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: [leftW, rightW],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: leftW, type: WidthType.DXA },
                borders: { ...NO_BORDERS, bottom: bottomRule },
                margins: { top: 0, bottom: 70, left: 0, right: 80 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0 },
                    children: [
                      new TextRun({
                        text: sanitizeDocxText(organization),
                        bold: true,
                        size: 16,
                        color: theme.primaryHex,
                      }),
                      new TextRun({
                        text: `  |  ${sanitizeDocxText(documentTitle)}`,
                        size: 16,
                        color: theme.textMutedHex,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: rightW, type: WidthType.DXA },
                borders: { ...NO_BORDERS, bottom: bottomRule },
                margins: { top: 0, bottom: 70, left: 80, right: 0 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 0, after: 0 },
                    children: [
                      new TextRun({
                        text: `${reference ? `Réf. ${sanitizeDocxText(reference)} · ` : ''}Édité le ${genDate}`,
                        size: 15,
                        color: theme.textMutedHex,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Pied de page professionnel avec mention de confidentialité et pagination "Page X sur Y".
 */
export function createDocxRunningFooter(options: {
  theme: DocumentThemePalette;
  organization: string;
  confidentialityText?: string;
  generationDate?: string;
}): Footer {
  const { theme, organization } = options;
  const genDate = options.generationDate || formatGenerationDateFr();
  const conf = sanitizeDocxText(options.confidentialityText || theme.confidentialityLabel);
  const leftW = Math.round(CONTENT_WIDTH_DXA * 0.74);
  const rightW = CONTENT_WIDTH_DXA - leftW;

  const topRule = { style: BorderStyle.SINGLE, size: 6, color: theme.borderHex };

  return new Footer({
    children: [
      new Table({
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: [leftW, rightW],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: leftW, type: WidthType.DXA },
                borders: { ...NO_BORDERS, top: topRule },
                margins: { top: 70, bottom: 0, left: 0, right: 80 },
                children: [
                  new Paragraph({
                    spacing: { before: 0, after: 0 },
                    children: [
                      new TextRun({
                        text: `${sanitizeDocxText(organization)} · ${conf} · ${genDate}`,
                        size: 15,
                        color: theme.textMutedHex,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: rightW, type: WidthType.DXA },
                borders: { ...NO_BORDERS, top: topRule },
                margins: { top: 70, bottom: 0, left: 80, right: 0 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    spacing: { before: 0, after: 0 },
                    children: [
                      new TextRun({ text: 'Page ', size: 15, bold: true, color: theme.primaryHex }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        size: 15,
                        bold: true,
                        color: theme.primaryHex,
                      }),
                      new TextRun({ text: ' sur ', size: 15, bold: true, color: theme.primaryHex }),
                      new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        size: 15,
                        bold: true,
                        color: theme.primaryHex,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Bandeau supérieur organisation + monogramme pour rapports exécutifs et fiches techniques.
 */
export function createDocxDocumentBanner(options: {
  theme: DocumentThemePalette;
  organization: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  rightBadge?: string;
}): Table {
  const { theme, organization, eyebrow, title, subtitle, rightBadge } = options;
  const initials = getOrganizationMonogram(organization);
  const logoW = 1200;
  const bodyW = CONTENT_WIDTH_DXA - logoW;

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [logoW, bodyW],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: logoW, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: theme.primaryHex },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 140, bottom: 140, left: 100, right: 100 },
            borders: {
              ...NO_BORDERS,
              bottom: { style: BorderStyle.SINGLE, size: 18, color: theme.accentHex },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: initials,
                    bold: true,
                    size: initials.length >= 3 ? 28 : 34,
                    color: 'FFFFFF',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(organization).slice(0, 14).toUpperCase(),
                    size: 12,
                    bold: true,
                    color: 'BAE6FD',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: bodyW, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: theme.primaryHex },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 140, bottom: 140, left: 160, right: 180 },
            borders: {
              ...NO_BORDERS,
              bottom: { style: BorderStyle.SINGLE, size: 18, color: theme.accentHex },
            },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(eyebrow).toUpperCase(),
                    bold: true,
                    size: 16,
                    color: '93C5FD',
                  }),
                  ...(rightBadge
                    ? [
                        new TextRun({
                          text: `   ·   ${sanitizeDocxText(rightBadge)}`,
                          size: 15,
                          color: 'E2E8F0',
                        }),
                      ]
                    : []),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(title),
                    bold: true,
                    size: 28,
                    color: 'FFFFFF',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(subtitle),
                    size: 18,
                    color: 'E2E8F0',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Titre de section principal (Heading 1 natif, keepNext=true pour éviter tout titre isolé).
 */
export function createDocxSectionHeading(
  theme: DocumentThemePalette,
  title: string,
  subtitle?: string,
  options?: { pageBreakBefore?: boolean }
): Paragraph[] {
  const paras: Paragraph[] = [
    new Paragraph({
      text: sanitizeDocxText(title).toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: Boolean(options?.pageBreakBefore),
      keepNext: true,
      keepLines: true,
      spacing: { before: options?.pageBreakBefore ? 80 : 320, after: subtitle ? 50 : 120 },
      border: {
        bottom: { color: theme.secondaryHex, space: 4, style: BorderStyle.SINGLE, size: 12 },
      },
    }),
  ];

  if (subtitle) {
    paras.push(
      new Paragraph({
        keepNext: true,
        spacing: { before: 0, after: 140 },
        children: [
          new TextRun({
            text: sanitizeDocxText(subtitle),
            italics: true,
            color: theme.textMutedHex,
            size: 18,
          }),
        ],
      })
    );
  }

  return paras;
}

/**
 * Sous-titre structuré (Heading 2 / Heading 3 natif, keepNext=true).
 */
export function createDocxSubHeading(
  title: string,
  level: 'h2' | 'h3' = 'h2'
): Paragraph {
  return new Paragraph({
    text: sanitizeDocxText(title),
    heading: level === 'h3' ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
    keepNext: true,
    keepLines: true,
  });
}

/**
 * Convertit un bloc texte multi-ligne en paragraphes, puces ou listes numérotées Word éditables.
 */
export function createDocxStructuredParagraphs(
  theme: DocumentThemePalette,
  rawText: string,
  options?: { fontSize?: number; leftIndentDxa?: number }
): Paragraph[] {
  const blocks = parseStructuredText(rawText, false);
  const size = options?.fontSize ?? 20;
  const baseIndent = options?.leftIndentDxa ?? 0;

  return blocks.map((blk) => {
    if (blk.type === 'bullet' || blk.type === 'numbered') {
      const marker = blk.type === 'numbered' ? `${blk.marker} ` : '•  ';
      return new Paragraph({
        spacing: { before: 20, after: 60, line: 276 },
        indent: { left: baseIndent + 360, hanging: 220 },
        children: [
          new TextRun({
            text: marker,
            bold: true,
            size,
            color: theme.accentHex,
          }),
          new TextRun({
            text: blk.text,
            size,
            color: theme.textBodyHex,
          }),
        ],
      });
    }

    return new Paragraph({
      spacing: { before: 20, after: 95, line: 276 },
      indent: baseIndent ? { left: baseIndent } : undefined,
      children: [
        new TextRun({
          text: blk.text,
          size,
          color: theme.textBodyHex,
        }),
      ],
    });
  });
}

/**
 * Encadré éditorial à bordure latérale épaisse (recommandations, charte, alertes).
 */
export function createDocxCalloutBox(
  theme: DocumentThemePalette,
  title: string,
  bodyText: string,
  tone: SemanticTone = 'info'
): Table {
  const toneColors = getToneColors(tone, theme);
  const subtleBorder = { style: BorderStyle.SINGLE, size: 4, color: theme.borderHex };
  const leftAccent = { style: BorderStyle.SINGLE, size: 24, color: toneColors.hex };

  return new Table({
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
            margins: { top: 120, bottom: 120, left: 180, right: 160 },
            children: [
              new Paragraph({
                keepNext: true,
                spacing: { before: 0, after: 70 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(title),
                    bold: true,
                    size: 20,
                    color: theme.primaryHex,
                  }),
                ],
              }),
              ...createDocxStructuredParagraphs(theme, bodyText, { fontSize: 18 }),
            ],
          }),
        ],
      }),
    ],
  });
}

export interface DocxKpiCard {
  label: string;
  value: string;
  sub?: string;
  tone?: SemanticTone;
}

/**
 * Bandeau de 2 à 4 cartes KPI alignées dans un tableau Word propre sans coupure.
 */
export function createDocxKpiStripTable(
  theme: DocumentThemePalette,
  items: DocxKpiCard[]
): Table {
  const sliced = items.slice(0, 4);
  const count = sliced.length || 1;
  const colWidths = computeDxaColumnWidths(sliced.map(() => 100 / count));
  const subtleBorder = { style: BorderStyle.SINGLE, size: 4, color: theme.borderHex };

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        cantSplit: true,
        children: sliced.map((k, idx) => {
          const toneColors = getToneColors(k.tone || 'info', theme);
          return new TableCell({
            width: { size: colWidths[idx], type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: theme.zebraBgHex },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 16, color: toneColors.hex },
              bottom: subtleBorder,
              left: subtleBorder,
              right: subtleBorder,
            },
            margins: { top: 100, bottom: 100, left: 90, right: 90 },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 30 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(k.label).toUpperCase(),
                    bold: true,
                    size: 15,
                    color: theme.textMutedHex,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: k.sub ? 30 : 0 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(k.value),
                    bold: true,
                    size: 26,
                    color: theme.primaryHex,
                  }),
                ],
              }),
              ...(k.sub
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 0 },
                      children: [
                        new TextRun({
                          text: sanitizeDocxText(k.sub),
                          size: 15,
                          color: theme.textBodyHex,
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          });
        }),
      }),
    ],
  });
}

export interface DocxDataTableOptions {
  statusColumns?: number[];
  boldColumns?: number[];
  alignRightColumns?: number[];
  centerColumns?: number[];
  fontSizeHalfPt?: number;
  emptyMessage?: string;
}

function makeParagraphsFromCellText(
  text: string,
  size: number,
  colorHex: string,
  bold: boolean,
  align: (typeof AlignmentType)[keyof typeof AlignmentType]
): Paragraph[] {
  const safe = sanitizeDocxText(text);
  const lines = safe.split('\n');
  return lines.map(
    (line, idx) =>
      new Paragraph({
        alignment: align,
        spacing: {
          before: 0,
          after: idx < lines.length - 1 ? 35 : 0,
          line: 250,
        },
        children: [
          new TextRun({
            text: line.trim() || (idx === 0 ? '—' : ''),
            bold,
            color: colorHex,
            size,
          }),
        ],
      })
  );
}

/**
 * Tableau de données professionnel Word :
 * - En-tête répété automatiquement sur saut de page (`tableHeader: true`)
 * - Lignes insécables (`cantSplit: true`)
 * - Largeurs DXA exactes compatibles Word & LibreOffice
 * - Marges internes généreuses & alternance de teinte zébrée
 */
export function createDocxDataTable(
  theme: DocumentThemePalette,
  headers: string[],
  rows: string[][],
  colWidthsPct: number[],
  options?: DocxDataTableOptions
): Table {
  const colWidths = computeDxaColumnWidths(colWidthsPct);
  const cellFont = options?.fontSizeHalfPt ?? 17; // 8.5pt
  const headerFont = 17;
  const borders = createGridBorders(theme.borderHex, 4);
  const headerBorders = createGridBorders(theme.primaryHex, 4);

  const statusCols = new Set(options?.statusColumns || []);
  const boldCols = new Set(options?.boldColumns || []);
  const rightCols = new Set(options?.alignRightColumns || []);
  const centerCols = new Set(options?.centerColumns || []);

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, cIdx) => {
      const align = rightCols.has(cIdx)
        ? AlignmentType.RIGHT
        : centerCols.has(cIdx)
        ? AlignmentType.CENTER
        : AlignmentType.LEFT;
      return new TableCell({
        width: { size: colWidths[cIdx], type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: theme.primaryHex },
        borders: headerBorders,
        margins: CELL_MARGINS_COMPACT,
        verticalAlign: VerticalAlign.CENTER,
        children: makeParagraphsFromCellText(h, headerFont, 'FFFFFF', true, align),
      });
    }),
  });

  if (!rows || rows.length === 0) {
    const emptyRow = new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          columnSpan: headers.length,
          width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: theme.zebraBgHex },
          borders,
          margins: CELL_MARGINS_STANDARD,
          children: [
            new Paragraph({
              spacing: { before: 0, after: 0 },
              children: [
                new TextRun({
                  text: sanitizeDocxText(
                    options?.emptyMessage || 'Aucune donnée enregistrée pour cette rubrique.'
                  ),
                  italics: true,
                  size: 18,
                  color: theme.textMutedHex,
                }),
              ],
            }),
          ],
        }),
      ],
    });

    return new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [headerRow, emptyRow],
    });
  }

  const bodyRows = rows.map((row, rIdx) => {
    const rowFill = rIdx % 2 === 1 ? theme.zebraBgHex : 'FFFFFF';
    return new TableRow({
      cantSplit: true,
      children: colWidths.map((colW, cIdx) => {
        const val = row[cIdx] ?? '—';
        const isStatus = statusCols.has(cIdx);
        const isBold = isStatus || boldCols.has(cIdx);
        const colorHex = isStatus
          ? getToneColors(getStatusTone(val), theme).hex
          : isBold
          ? theme.textDarkHex
          : theme.textBodyHex;
        const align = rightCols.has(cIdx)
          ? AlignmentType.RIGHT
          : centerCols.has(cIdx)
          ? AlignmentType.CENTER
          : AlignmentType.LEFT;

        return new TableCell({
          width: { size: colW, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: rowFill },
          borders,
          margins: CELL_MARGINS_COMPACT,
          verticalAlign: VerticalAlign.TOP,
          children: makeParagraphsFromCellText(val, cellFont, colorHex, isBold, align),
        });
      }),
    });
  });

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...bodyRows],
  });
}

export type KeyValueGridRow =
  | { kind: 'pair'; label: string; value: string; isStatus?: boolean; tone?: SemanticTone }
  | { kind: 'quad'; label1: string; value1: string; label2: string; value2: string; isStatus2?: boolean };

/**
 * Tableau de fiche signalétique / paramètres à 2 ou 4 colonnes avec `columnSpan` propre
 * (corrige l'ancien décalage de colonnes sous Word & LibreOffice).
 */
export function createDocxKeyValueGridTable(
  theme: DocumentThemePalette,
  rows: KeyValueGridRow[],
  options?: {
    hasQuadRows?: boolean;
    headerLeft?: string;
    headerRight?: string;
    labelWidthPct?: number;
  }
): Table {
  const borders = createGridBorders(theme.borderHex, 4);

  if (options?.hasQuadRows) {
    const colWidths = computeDxaColumnWidths([23, 27, 23, 27]);
    const tableRows: TableRow[] = rows.map((r, idx) => {
      const labelBg = theme.lightBgHex;
      const valBg = idx % 2 === 1 ? theme.zebraBgHex : 'FFFFFF';

      if (r.kind === 'quad') {
        const val2Color = r.isStatus2
          ? getToneColors(getStatusTone(r.value2), theme).hex
          : theme.textBodyHex;
        return new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: colWidths[0], type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: labelBg },
              borders,
              margins: CELL_MARGINS_COMPACT,
              children: makeParagraphsFromCellText(r.label1, 17, theme.primaryHex, true, AlignmentType.LEFT),
            }),
            new TableCell({
              width: { size: colWidths[1], type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: valBg },
              borders,
              margins: CELL_MARGINS_COMPACT,
              children: makeParagraphsFromCellText(r.value1, 17, theme.textDarkHex, false, AlignmentType.LEFT),
            }),
            new TableCell({
              width: { size: colWidths[2], type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: labelBg },
              borders,
              margins: CELL_MARGINS_COMPACT,
              children: makeParagraphsFromCellText(r.label2, 17, theme.primaryHex, true, AlignmentType.LEFT),
            }),
            new TableCell({
              width: { size: colWidths[3], type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: valBg },
              borders,
              margins: CELL_MARGINS_COMPACT,
              children: makeParagraphsFromCellText(
                r.value2,
                17,
                val2Color,
                Boolean(r.isStatus2),
                AlignmentType.LEFT
              ),
            }),
          ],
        });
      }

      // Ligne sur 2 colonnes avec columnSpan: 3 sur la cellule de valeur !
      const spannedW = colWidths[1] + colWidths[2] + colWidths[3];
      const valColor = r.isStatus
        ? getToneColors(r.tone || getStatusTone(r.value), theme).hex
        : theme.textBodyHex;

      return new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: colWidths[0], type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: labelBg },
            borders,
            margins: CELL_MARGINS_COMPACT,
            children: makeParagraphsFromCellText(r.label, 17, theme.primaryHex, true, AlignmentType.LEFT),
          }),
          new TableCell({
            columnSpan: 3,
            width: { size: spannedW, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: valBg },
            borders,
            margins: CELL_MARGINS_COMPACT,
            children: makeParagraphsFromCellText(
              r.value,
              17,
              valColor,
              Boolean(r.isStatus),
              AlignmentType.LEFT
            ),
          }),
        ],
      });
    });

    return new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: tableRows,
    });
  }

  // Mode standard 2 colonnes
  const lblPct = options?.labelWidthPct ?? 32;
  const colWidths = computeDxaColumnWidths([lblPct, 100 - lblPct]);
  const tableRows: TableRow[] = [];

  if (options?.headerLeft || options?.headerRight) {
    const hBorders = createGridBorders(theme.primaryHex, 4);
    tableRows.push(
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: colWidths[0], type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: theme.primaryHex },
            borders: hBorders,
            margins: CELL_MARGINS_COMPACT,
            children: makeParagraphsFromCellText(
              options.headerLeft || 'Paramètre',
              17,
              'FFFFFF',
              true,
              AlignmentType.LEFT
            ),
          }),
          new TableCell({
            width: { size: colWidths[1], type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: theme.primaryHex },
            borders: hBorders,
            margins: CELL_MARGINS_COMPACT,
            children: makeParagraphsFromCellText(
              options.headerRight || 'Détail constaté',
              17,
              'FFFFFF',
              true,
              AlignmentType.LEFT
            ),
          }),
        ],
      })
    );
  }

  rows.forEach((r, idx) => {
    if (r.kind !== 'pair') return;
    const valBg = idx % 2 === 1 ? theme.zebraBgHex : 'FFFFFF';
    const valColor = r.isStatus
      ? getToneColors(r.tone || getStatusTone(r.value), theme).hex
      : theme.textBodyHex;

    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: colWidths[0], type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: theme.lightBgHex },
            borders,
            margins: CELL_MARGINS_COMPACT,
            children: makeParagraphsFromCellText(
              r.label,
              18,
              theme.primaryHex,
              true,
              AlignmentType.LEFT
            ),
          }),
          new TableCell({
            width: { size: colWidths[1], type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: valBg },
            borders,
            margins: CELL_MARGINS_COMPACT,
            children: makeParagraphsFromCellText(
              r.value,
              18,
              valColor,
              Boolean(r.isStatus),
              AlignmentType.LEFT
            ),
          }),
        ],
      })
    );
  });

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: tableRows,
  });
}

export interface DocxSignatureParty {
  role: string;
  name: string;
  dateLabel?: string;
  statusLabel: string;
  signed?: boolean;
}

/**
 * Grille double de signatures et validation hiérarchique.
 */
export function createDocxSignatureTable(
  theme: DocumentThemePalette,
  left: DocxSignatureParty,
  right: DocxSignatureParty
): Table {
  const halfW = Math.floor(CONTENT_WIDTH_DXA / 2);
  const colWidths = [halfW, CONTENT_WIDTH_DXA - halfW];
  const borders = createGridBorders(theme.borderHex, 4);

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [left, right].map((party, idx) => {
          const topBarColor = party.signed ? theme.successHex : theme.primaryHex;
          const statusColor = party.signed ? theme.successHex : theme.warningHex;
          const statusText = party.dateLabel
            ? `${party.statusLabel} · ${party.dateLabel}`
            : party.statusLabel;

          return new TableCell({
            width: { size: colWidths[idx], type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: theme.zebraBgHex },
            borders: {
              ...borders,
              top: { style: BorderStyle.SINGLE, size: 16, color: topBarColor },
            },
            margins: { top: 120, bottom: 140, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(party.role),
                    bold: true,
                    size: 18,
                    color: theme.primaryHex,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 140 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(party.name),
                    size: 19,
                    color: theme.textDarkHex,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: sanitizeDocxText(statusText),
                    bold: true,
                    size: 17,
                    color: statusColor,
                  }),
                ],
              }),
            ],
          });
        }),
      }),
    ],
  });
}

/**
 * Emballe un Document OOXML et déclenche son téléchargement proprement (compatible Vite, ESM et CJS).
 */
export async function packAndSaveDocx(doc: Document, filename: string): Promise<void> {
  const blob = await Packer.toBlob(doc);
  const saveFn =
    (FileSaver as unknown as { saveAs?: typeof FileSaver }).saveAs ?? FileSaver;
  saveFn(blob, filename);
}

