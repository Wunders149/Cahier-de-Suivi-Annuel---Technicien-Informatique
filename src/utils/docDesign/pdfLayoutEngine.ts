import jsPDF from 'jspdf';
import {
  DocumentCategory,
  DocumentThemePalette,
  formatGenerationDateFr,
  getDocumentTheme,
  getOrganizationMonogram,
  getStatusTone,
  getToneColors,
  normalizeColumnWidthsPct,
  parseStructuredText,
  sanitizePdfText,
  SemanticTone,
} from './documentThemes';

export interface PdfKpiItem {
  label: string;
  value: string;
  sub?: string;
  tone?: SemanticTone;
}

export interface PdfKeyValueRow {
  label: string;
  value: string;
  isStatus?: boolean;
  tone?: SemanticTone;
}

export interface PdfDataTableOptions {
  statusColumns?: number[];
  boldColumns?: number[];
  alignRightColumns?: number[];
  centerColumns?: number[];
  fontSize?: number;
  emptyMessage?: string;
}

export interface PdfFooterHeaderMeta {
  organization: string;
  documentTitle: string;
  reference?: string;
  generationDate?: string;
  hasCoverPage?: boolean;
  confidentialityText?: string;
}

export interface PdfSignatureParty {
  role: string;
  name: string;
  dateLabel?: string;
  statusLabel: string;
  signed?: boolean;
}

/**
 * Moteur de mise en page PDF A4 vectoriel modulaire (texte 100% sélectionnable et recherchable).
 */
export class PdfDocumentBuilder {
  public readonly doc: jsPDF;
  public readonly theme: DocumentThemePalette;
  public readonly margin = 16;
  public readonly pageWidth = 210;
  public readonly pageHeight = 297;
  public readonly contentWidth: number;
  public readonly topStartY = 21;
  public readonly maxContentY = 275;
  public y: number;

  constructor(category: DocumentCategory) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    this.theme = getDocumentTheme(category);
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.y = this.topStartY;
  }

  public get docInstance(): jsPDF {
    return this.doc;
  }

  public addPage(): void {
    this.doc.addPage();
    this.y = this.topStartY;
  }

  public ensureSpace(neededMm: number): boolean {
    if (this.y + neededMm > this.maxContentY) {
      this.addPage();
      return true;
    }
    return false;
  }

  public addSpacing(mm: number): void {
    this.y += mm;
  }

  /**
   * Monogramme vectoriel discret aux couleurs du thème.
   */
  public drawOrgMonogram(x: number, y: number, sizeMm: number, orgName: string): void {
    const initials = getOrganizationMonogram(orgName);
    const { primaryRgb, accentRgb } = this.theme;

    this.doc.setFillColor(...primaryRgb);
    this.doc.roundedRect(x, y, sizeMm, sizeMm, 2, 2, 'F');

    // Liseré supérieur accent
    this.doc.setFillColor(...accentRgb);
    this.doc.rect(x + 1.2, y + 1.2, sizeMm - 2.4, 1.3, 'F');

    this.doc.setFont('helvetica', 'bold');
    const fontSize = initials.length >= 3 ? sizeMm * 0.68 : sizeMm * 0.82;
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(initials, x + sizeMm / 2, y + sizeMm * 0.67, { align: 'center' });
  }

  /**
   * Page de garde institutionnelle (Cahier Annuel).
   */
  public drawCoverPage(options: {
    organization: string;
    department: string;
    eyebrow: string;
    mainTitle: string;
    subtitle: string;
    exerciseLabel: string;
    tagline: string;
    metadataRows: Array<[string, string]>;
    engagementTitle: string;
    engagementText: string;
    engagementFooter: string;
  }): void {
    const { doc, margin, contentWidth, pageWidth, theme } = this;
    const genDate = formatGenerationDateFr();

    // Bandeau haut structurant
    doc.setFillColor(...theme.primaryRgb);
    doc.rect(0, 0, pageWidth, 6, 'F');
    doc.setFillColor(...theme.accentRgb);
    doc.rect(0, 6, pageWidth, 1.5, 'F');

    // En-tête organisation + monogramme
    this.drawOrgMonogram(margin, 18, 13, options.organization);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...theme.primaryRgb);
    doc.text(sanitizePdfText(options.organization).toUpperCase(), margin + 17, 23.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...theme.textMutedRgb);
    doc.text(sanitizePdfText(options.department || "Direction des Systèmes d'Information"), margin + 17, 29);

    doc.setFontSize(8);
    doc.text(`Édition du ${genDate}`, pageWidth - margin, 23.5, { align: 'right' });

    // Bloc titre principal
    let cursorY = 46;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...theme.accentRgb);
    doc.text(sanitizePdfText(options.eyebrow).toUpperCase(), pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...theme.primaryRgb);
    doc.text(sanitizePdfText(options.mainTitle), pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 8.5;

    doc.setFontSize(14);
    doc.setTextColor(...theme.secondaryRgb);
    doc.text(sanitizePdfText(options.subtitle), pageWidth / 2, cursorY, { align: 'center' });
    cursorY += 10;

    // Badge Exercice
    const pillW = 68;
    const pillX = (pageWidth - pillW) / 2;
    doc.setFillColor(...theme.primaryRgb);
    doc.roundedRect(pillX, cursorY - 5.5, pillW, 8.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(sanitizePdfText(options.exerciseLabel), pageWidth / 2, cursorY + 0.3, { align: 'center' });
    cursorY += 9;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.8);
    doc.setTextColor(...theme.textMutedRgb);
    const tagLines = doc.splitTextToSize(sanitizePdfText(options.tagline), contentWidth - 16);
    doc.text(tagLines, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += tagLines.length * 4.2 + 8;

    // Tableau d'identification auto-mesuré (zéro débordement)
    this.y = cursorY;
    const labelW = 60;
    const valW = contentWidth - labelW;

    options.metadataRows.forEach(([lbl, val], idx) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.6);
      const safeVal = sanitizePdfText(val);
      const valLines = doc.splitTextToSize(safeVal, valW - 8);
      const rowH = Math.max(8, valLines.length * 4 + 3.8);

      const whiteRgb: [number, number, number] = [255, 255, 255];
      doc.setFillColor(...(idx % 2 === 0 ? theme.lightBgRgb : whiteRgb));
      doc.setDrawColor(...theme.borderRgb);
      doc.setLineWidth(0.25);
      doc.rect(margin, this.y, labelW, rowH, 'FD');

      doc.setFillColor(...(idx % 2 === 0 ? theme.zebraBgRgb : whiteRgb));
      doc.rect(margin + labelW, this.y, valW, rowH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.4);
      doc.setTextColor(...theme.primaryRgb);
      doc.text(sanitizePdfText(lbl), margin + 3.5, this.y + 5.1);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.6);
      doc.setTextColor(...theme.textDarkRgb);
      doc.text(valLines, margin + labelW + 3.5, this.y + 5.1);

      this.y += rowH;
    });

    // Encadré Engagement Déontologique en bas de couverture
    this.y = Math.max(this.y + 10, 212);
    const engLines = doc.splitTextToSize(sanitizePdfText(options.engagementText), contentWidth - 14);
    const boxH = 17 + engLines.length * 3.9 + 8;

    doc.setFillColor(...theme.zebraBgRgb);
    doc.setDrawColor(...theme.borderRgb);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, this.y, contentWidth, boxH, 1.5, 1.5, 'FD');

    // Barre d'accent gauche
    doc.setFillColor(...theme.secondaryRgb);
    doc.rect(margin, this.y, 1.8, boxH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...theme.primaryRgb);
    doc.text(sanitizePdfText(options.engagementTitle), margin + 6, this.y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(...theme.textBodyRgb);
    doc.text(engLines, margin + 6, this.y + 13);

    const footerLineY = this.y + 13 + engLines.length * 3.9 + 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...theme.secondaryRgb);
    doc.text(sanitizePdfText(options.engagementFooter), margin + 6, footerLineY);
  }

  /**
   * Bannière exécutive pour rapports mensuels et fiches techniques.
   */
  public drawDocumentBanner(options: {
    organization: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    rightBadge?: string;
    subMeta?: string;
  }): void {
    const { doc, margin, contentWidth, pageWidth, theme } = this;
    const startY = 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const subLines = doc.splitTextToSize(sanitizePdfText(options.subtitle), contentWidth - 22);
    const titleLines = doc.splitTextToSize(sanitizePdfText(options.title), contentWidth - 44);
    const bannerH = Math.max(29, 14 + titleLines.length * 6 + subLines.length * 4.2 + (options.subMeta ? 5.5 : 1));

    // Fond bandeau marine
    doc.setFillColor(...theme.primaryRgb);
    doc.roundedRect(margin, startY, contentWidth, bannerH, 2, 2, 'F');

    // Liseré accent inférieur
    doc.setFillColor(...theme.accentRgb);
    doc.rect(margin, startY + bannerH - 1.5, contentWidth, 1.5, 'F');

    // Monogramme inversé clair
    const initials = getOrganizationMonogram(options.organization);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + 4, startY + 4.5, 11, 11, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(initials.length >= 3 ? 7.8 : 9);
    doc.setTextColor(...theme.primaryRgb);
    doc.text(initials, margin + 9.5, startY + 11.7, { align: 'center' });

    // Eyebrow
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(147, 197, 253);
    doc.text(sanitizePdfText(options.eyebrow).toUpperCase(), margin + 19, startY + 7.5);

    // Badge droit (date / statut)
    if (options.rightBadge) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(226, 232, 240);
      doc.text(sanitizePdfText(options.rightBadge), pageWidth - margin - 4, startY + 7.5, {
        align: 'right',
      });
    }

    // Titre principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14.5);
    doc.setTextColor(255, 255, 255);
    doc.text(titleLines, margin + 19, startY + 14.5);

    const afterTitleY = startY + 14.5 + (titleLines.length - 1) * 5.8 + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(226, 232, 240);
    doc.text(subLines, margin + 4, afterTitleY);

    if (options.subMeta) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.8);
      doc.setTextColor(186, 230, 253);
      doc.text(
        sanitizePdfText(options.subMeta),
        margin + 4,
        afterTitleY + subLines.length * 4 + 1.5
      );
    }

    this.y = startY + bannerH + 6;
  }

  /**
   * Bandeau de 2 à 4 cartes KPI alignées.
   */
  public drawKpiStrip(items: PdfKpiItem[]): void {
    if (!items || items.length === 0) return;
    const count = Math.min(4, items.length);
    const gap = 3;
    const boxW = (this.contentWidth - gap * (count - 1)) / count;
    const boxH = 19.5;

    this.ensureSpace(boxH + 4);

    items.slice(0, 4).forEach((item, idx) => {
      const bx = this.margin + idx * (boxW + gap);
      const toneColors = getToneColors(item.tone || 'info', this.theme);

      this.doc.setFillColor(...this.theme.zebraBgRgb);
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.25);
      this.doc.roundedRect(bx, this.y, boxW, boxH, 1.5, 1.5, 'FD');

      // Barre d'accent supérieure
      this.doc.setFillColor(...toneColors.rgb);
      this.doc.rect(bx, this.y, boxW, 1.2, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(...this.theme.textMutedRgb);
      this.doc.text(sanitizePdfText(item.label).toUpperCase(), bx + boxW / 2, this.y + 5.5, {
        align: 'center',
      });

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(11.5);
      this.doc.setTextColor(...this.theme.primaryRgb);
      this.doc.text(sanitizePdfText(item.value), bx + boxW / 2, this.y + 11.8, {
        align: 'center',
      });

      if (item.sub) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7);
        this.doc.setTextColor(...this.theme.textBodyRgb);
        const subFit = this.doc.splitTextToSize(sanitizePdfText(item.sub), boxW - 4)[0] || '';
        this.doc.text(subFit, bx + boxW / 2, this.y + 16.8, { align: 'center' });
      }
    });

    this.y += boxH + 6;
  }

  /**
   * Titre de section majeur (garantit minimum 28mm disponibles pour éviter un titre orphelin).
   */
  public drawSectionHeading(
    title: string,
    subtitle?: string,
    options?: { pageBreakBefore?: boolean }
  ): void {
    if (options?.pageBreakBefore && this.y > this.topStartY + 4) {
      this.addPage();
    } else {
      this.ensureSpace(subtitle ? 30 : 25);
    }

    const safeTitle = sanitizePdfText(title).toUpperCase();
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11.5);
    const titleLines = this.doc.splitTextToSize(safeTitle, this.contentWidth - 5);

    // Pastille / barre verticale gauche
    const titleBlockH = titleLines.length * 5;
    this.doc.setFillColor(...this.theme.accentRgb);
    this.doc.rect(this.margin, this.y - 3.6, 2.2, titleBlockH + 0.5, 'F');

    this.doc.setTextColor(...this.theme.primaryRgb);
    this.doc.text(titleLines, this.margin + 4.5, this.y);
    this.y += titleLines.length * 4.8 + 1.5;

    if (subtitle) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(...this.theme.textMutedRgb);
      const subLines = this.doc.splitTextToSize(sanitizePdfText(subtitle), this.contentWidth);
      this.doc.text(subLines, this.margin, this.y);
      this.y += subLines.length * 3.8 + 1.5;
    }

    this.doc.setDrawColor(...this.theme.borderRgb);
    this.doc.setLineWidth(0.35);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 5;
  }

  /**
   * Sous-titre de section (empêche les titres isolés en bas de page).
   */
  public drawSubHeading(title: string): void {
    this.ensureSpace(20);
    const safeTitle = sanitizePdfText(title);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.8);
    this.doc.setTextColor(...this.theme.secondaryRgb);
    const lines = this.doc.splitTextToSize(safeTitle, this.contentWidth);
    this.doc.text(lines, this.margin, this.y);
    this.y += lines.length * 4.2 + 2.5;
  }

  /**
   * Rend un texte structuré (paragraphes, puces, listes numérotées) avec pagination fluide.
   */
  public drawStructuredText(
    rawText: string,
    options?: { indentMm?: number; fontSize?: number; color?: [number, number, number] }
  ): void {
    const blocks = parseStructuredText(rawText, true);
    const indent = options?.indentMm ?? 0;
    const fontSize = options?.fontSize ?? 8.8;
    const lineHeight = fontSize * 0.46;
    const textColor = options?.color ?? this.theme.textBodyRgb;

    blocks.forEach((blk) => {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(fontSize);
      this.doc.setTextColor(...textColor);

      if (blk.type === 'bullet' || blk.type === 'numbered') {
        const marker = blk.marker || '•';
        const markerOffset = blk.type === 'numbered' ? 6.5 : 4.5;
        const wrapped = this.doc.splitTextToSize(
          blk.text,
          this.contentWidth - indent - markerOffset
        );
        const h = wrapped.length * lineHeight + 1.6;
        this.ensureSpace(Math.min(h, 25));

        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(...this.theme.accentRgb);
        this.doc.text(marker, this.margin + indent + 1, this.y);

        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(...textColor);
        wrapped.forEach((line: string) => {
          this.ensureSpace(lineHeight + 1);
          this.doc.text(line, this.margin + indent + markerOffset, this.y);
          this.y += lineHeight;
        });
        this.y += 1.2;
      } else {
        const wrapped = this.doc.splitTextToSize(blk.text, this.contentWidth - indent);
        wrapped.forEach((line: string) => {
          this.ensureSpace(lineHeight + 1);
          this.doc.text(line, this.margin + indent, this.y);
          this.y += lineHeight;
        });
        this.y += 2;
      }
    });
  }

  /**
   * Encadré de mise en avant (recommandations, avertissements sécurité, notes narratives).
   */
  public drawCalloutBox(
    title: string,
    bodyText: string,
    tone: SemanticTone = 'info'
  ): void {
    const toneColors = getToneColors(tone, this.theme);
    const blocks = parseStructuredText(bodyText, true);
    const innerWidth = this.contentWidth - 11;

    // Mesure de la hauteur totale requise
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.3);
    let bodyHeight = 0;
    const prepared = blocks.map((blk) => {
      const markerWidth = blk.type === 'paragraph' ? 0 : blk.type === 'numbered' ? 6 : 4.2;
      const lines = this.doc.splitTextToSize(blk.text, innerWidth - markerWidth);
      const h = lines.length * 3.85 + 1.4;
      bodyHeight += h;
      return { blk, lines, markerWidth };
    });

    const totalH = 9.5 + bodyHeight + 2.5;

    // Si l'encadré tient sur la page courante ou une page neuve entière
    if (totalH <= this.maxContentY - this.topStartY) {
      this.ensureSpace(totalH + 3);
      const boxY = this.y;

      this.doc.setFillColor(...this.theme.zebraBgRgb);
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.25);
      this.doc.roundedRect(this.margin, boxY, this.contentWidth, totalH, 1.5, 1.5, 'FD');

      this.doc.setFillColor(...toneColors.rgb);
      this.doc.rect(this.margin, boxY, 1.8, totalH, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.6);
      this.doc.setTextColor(...this.theme.primaryRgb);
      this.doc.text(sanitizePdfText(title), this.margin + 5, boxY + 6);

      let cursorY = boxY + 11;
      prepared.forEach(({ blk, lines, markerWidth }) => {
        if (blk.type !== 'paragraph') {
          this.doc.setFont('helvetica', 'bold');
          this.doc.setFontSize(8.3);
          this.doc.setTextColor(...toneColors.rgb);
          this.doc.text(blk.marker || '•', this.margin + 5, cursorY);
        }
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(8.3);
        this.doc.setTextColor(...this.theme.textBodyRgb);
        this.doc.text(lines, this.margin + 5 + markerWidth, cursorY);
        cursorY += lines.length * 3.85 + 1.4;
      });

      this.y = boxY + totalH + 3.5;
    } else {
      // Très long bloc narratif : titre + flux multi-page propre
      this.drawSubHeading(title);
      this.drawStructuredText(bodyText, { indentMm: 3, fontSize: 8.4 });
      this.y += 2;
    }
  }

  /**
   * Tableau Clé / Valeur (ex: Paramètres d'intervention, Synthèse bilan).
   */
  public drawKeyValueTable(
    rows: PdfKeyValueRow[],
    options?: {
      headerLeft?: string;
      headerRight?: string;
      labelWidthMm?: number;
    }
  ): void {
    const labelW = options?.labelWidthMm ?? 52;
    const valW = this.contentWidth - labelW;
    const drawHeader = () => {
      if (!options?.headerLeft && !options?.headerRight) return;
      this.doc.setFillColor(...this.theme.primaryRgb);
      this.doc.setDrawColor(...this.theme.primaryRgb);
      this.doc.setLineWidth(0.25);
      this.doc.rect(this.margin, this.y, labelW, 7.5, 'FD');
      this.doc.rect(this.margin + labelW, this.y, valW, 7.5, 'FD');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.2);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(sanitizePdfText(options.headerLeft || 'Paramètre'), this.margin + 3, this.y + 5);
      this.doc.text(
        sanitizePdfText(options.headerRight || 'Détail constaté'),
        this.margin + labelW + 3,
        this.y + 5
      );
      this.y += 7.5;
    };

    this.ensureSpace(20);
    drawHeader();

    rows.forEach((row, idx) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.1);
      const lblLines = this.doc.splitTextToSize(sanitizePdfText(row.label), labelW - 6);

      this.doc.setFont('helvetica', row.isStatus ? 'bold' : 'normal');
      this.doc.setFontSize(8.3);
      const valLines = this.doc.splitTextToSize(sanitizePdfText(row.value), valW - 6);

      const lineCount = Math.max(lblLines.length, valLines.length);
      const rowH = Math.max(7.8, lineCount * 3.9 + 3.8);

      if (this.y + rowH > this.maxContentY) {
        this.addPage();
        drawHeader();
      }

      const bgRgb = idx % 2 === 0 ? this.theme.lightBgRgb : ([255, 255, 255] as [number, number, number]);
      const valBgRgb = idx % 2 === 0 ? this.theme.zebraBgRgb : ([255, 255, 255] as [number, number, number]);

      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.22);
      this.doc.setFillColor(...bgRgb);
      this.doc.rect(this.margin, this.y, labelW, rowH, 'FD');
      this.doc.setFillColor(...valBgRgb);
      this.doc.rect(this.margin + labelW, this.y, valW, rowH, 'FD');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.1);
      this.doc.setTextColor(...this.theme.primaryRgb);
      this.doc.text(lblLines, this.margin + 3, this.y + 4.9);

      if (row.isStatus || row.tone) {
        const toneColors = getToneColors(row.tone || getStatusTone(row.value), this.theme);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(...toneColors.rgb);
      } else {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(...this.theme.textBodyRgb);
      }
      this.doc.setFontSize(8.3);
      this.doc.text(valLines, this.margin + labelW + 3, this.y + 4.9);

      this.y += rowH;
    });

    this.y += 4;
  }

  /**
   * Tableau structuré multi-pages avec répétition automatique d'en-tête,
   * zebra striping, hauteur dynamique et zéro texte tronqué.
   */
  public drawDataTable(
    headers: string[],
    rows: string[][],
    colWidthsPct: number[],
    options?: PdfDataTableOptions
  ): void {
    const normalizedPct = normalizeColumnWidthsPct(colWidthsPct);
    const colWidthsMm = normalizedPct.map((pct) => (this.contentWidth * pct) / 100);
    const fontSize = options?.fontSize ?? 7.7;
    const lineH = fontSize * 0.455;
    const cellPadX = 2.2;
    const cellPadTop = 4.3;
    const statusCols = new Set(options?.statusColumns || []);
    const boldCols = new Set(options?.boldColumns || []);
    const rightCols = new Set(options?.alignRightColumns || []);
    const centerCols = new Set(options?.centerColumns || []);

    // Mesure de la hauteur d'en-tête (supporte les en-têtes sur 2 lignes)
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.8);
    const headerLinesPerCol = headers.map((h, i) =>
      this.doc.splitTextToSize(sanitizePdfText(h), Math.max(8, colWidthsMm[i] - cellPadX * 2))
    );
    const maxHeaderLines = Math.max(1, ...headerLinesPerCol.map((l) => l.length));
    const headerH = Math.max(8, maxHeaderLines * 3.6 + 3.8);

    const drawHeaderRow = () => {
      let x = this.margin;
      this.doc.setFillColor(...this.theme.primaryRgb);
      this.doc.setDrawColor(...this.theme.primaryRgb);
      this.doc.setLineWidth(0.25);

      colWidthsMm.forEach((w, i) => {
        this.doc.rect(x, this.y, w, headerH, 'FD');
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(7.8);
        this.doc.setTextColor(255, 255, 255);
        const align = rightCols.has(i) ? 'right' : centerCols.has(i) ? 'center' : 'left';
        const textX =
          align === 'right' ? x + w - cellPadX : align === 'center' ? x + w / 2 : x + cellPadX;
        this.doc.text(headerLinesPerCol[i], textX, this.y + 4.8, { align });
        x += w;
      });
      this.y += headerH;
    };

    if (!rows || rows.length === 0) {
      this.ensureSpace(headerH + 12);
      drawHeaderRow();
      const emptyH = 10;
      this.doc.setFillColor(...this.theme.zebraBgRgb);
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.rect(this.margin, this.y, this.contentWidth, emptyH, 'FD');
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(8.2);
      this.doc.setTextColor(...this.theme.textMutedRgb);
      this.doc.text(
        sanitizePdfText(options?.emptyMessage || 'Aucune donnée enregistrée dans cette section.'),
        this.margin + 4,
        this.y + 6.2
      );
      this.y += emptyH + 5;
      return;
    }

    // Garde au moins l'en-tête + 1ère ligne attachés
    this.ensureSpace(headerH + 14);
    drawHeaderRow();

    rows.forEach((row, rIdx) => {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(fontSize);

      const cellWrapped = colWidthsMm.map((w, cIdx) => {
        const raw = row[cIdx] ?? '—';
        return this.doc.splitTextToSize(sanitizePdfText(raw), Math.max(8, w - cellPadX * 2));
      });

      const maxLines = Math.max(1, ...cellWrapped.map((l) => l.length));
      const rowH = Math.max(7.5, maxLines * lineH + 3.6);

      // Saut de page propre avec répétition d'en-tête
      if (this.y + rowH > this.maxContentY) {
        this.addPage();
        drawHeaderRow();
      }

      const rowBg = rIdx % 2 === 1 ? this.theme.zebraBgRgb : ([255, 255, 255] as [number, number, number]);
      let x = this.margin;

      colWidthsMm.forEach((w, cIdx) => {
        this.doc.setFillColor(...rowBg);
        this.doc.setDrawColor(...this.theme.borderRgb);
        this.doc.setLineWidth(0.2);
        this.doc.rect(x, this.y, w, rowH, 'FD');

        if (statusCols.has(cIdx)) {
          const toneColors = getToneColors(getStatusTone(row[cIdx]), this.theme);
          this.doc.setFont('helvetica', 'bold');
          this.doc.setTextColor(...toneColors.rgb);
        } else if (boldCols.has(cIdx)) {
          this.doc.setFont('helvetica', 'bold');
          this.doc.setTextColor(...this.theme.textDarkRgb);
        } else {
          this.doc.setFont('helvetica', 'normal');
          this.doc.setTextColor(...this.theme.textBodyRgb);
        }

        this.doc.setFontSize(fontSize);
        const align = rightCols.has(cIdx) ? 'right' : centerCols.has(cIdx) ? 'center' : 'left';
        const textX =
          align === 'right' ? x + w - cellPadX : align === 'center' ? x + w / 2 : x + cellPadX;

        this.doc.text(cellWrapped[cIdx], textX, this.y + cellPadTop, { align });
        x += w;
      });

      this.y += rowH;
    });

    this.y += 5;
  }

  /**
   * Grille double signature / validation officielle.
   */
  public drawSignatureGrid(left: PdfSignatureParty, right: PdfSignatureParty): void {
    const gap = 6;
    const colW = (this.contentWidth - gap) / 2;
    const boxH = 26;

    this.ensureSpace(boxH + 4);

    [left, right].forEach((party, idx) => {
      const bx = this.margin + idx * (colW + gap);
      this.doc.setFillColor(...this.theme.zebraBgRgb);
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.28);
      this.doc.roundedRect(bx, this.y, colW, boxH, 1.5, 1.5, 'FD');

      this.doc.setFillColor(...(party.signed ? this.theme.successRgb : this.theme.primaryRgb));
      this.doc.rect(bx, this.y, colW, 1.2, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.2);
      this.doc.setTextColor(...this.theme.primaryRgb);
      this.doc.text(sanitizePdfText(party.role), bx + 4, this.y + 6.5);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8.4);
      this.doc.setTextColor(...this.theme.textDarkRgb);
      this.doc.text(sanitizePdfText(party.name), bx + 4, this.y + 12.5);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.8);
      this.doc.setTextColor(...(party.signed ? this.theme.successRgb : this.theme.warningRgb));
      const statusText = party.dateLabel
        ? `${party.statusLabel} · ${party.dateLabel}`
        : party.statusLabel;
      this.doc.text(sanitizePdfText(statusText), bx + 4, this.y + 20.5);
    });

    this.y += boxH + 5;
  }

  /**
   * Passe finale sur toutes les pages : ajoute en-têtes discrets et pieds de page "Page X sur Y".
   */
  public finalizeHeadersAndFooters(meta: PdfFooterHeaderMeta): void {
    const totalPages = this.doc.getNumberOfPages();
    const genDate = meta.generationDate || formatGenerationDateFr();
    const orgSafe = sanitizePdfText(meta.organization || 'DSI');
    const titleSafe = sanitizePdfText(meta.documentTitle);
    const refSafe = meta.reference ? `Réf. ${sanitizePdfText(meta.reference)} · ` : '';
    const confSafe = sanitizePdfText(
      meta.confidentialityText || this.theme.confidentialityLabel
    );

    for (let p = 1; p <= totalPages; p++) {
      this.doc.setPage(p);

      // En-tête courant (masqué sur page 1 si page de garde ou bannière déjà présente en haut)
      const drawHeader = !(meta.hasCoverPage && p === 1) && p > 1;
      if (drawHeader) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(7.6);
        this.doc.setTextColor(...this.theme.primaryRgb);
        this.doc.text(`${orgSafe}  |  ${titleSafe}`, this.margin, 10.5);

        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7.4);
        this.doc.setTextColor(...this.theme.textMutedRgb);
        this.doc.text(`${refSafe}Édité le ${genDate}`, this.pageWidth - this.margin, 10.5, {
          align: 'right',
        });

        this.doc.setDrawColor(...this.theme.borderRgb);
        this.doc.setLineWidth(0.25);
        this.doc.line(this.margin, 13, this.pageWidth - this.margin, 13);
      }

      // Pied de page homogène sur toutes les pages
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.25);
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.4);
      this.doc.setTextColor(...this.theme.textMutedRgb);
      const leftFooter =
        meta.hasCoverPage && p === 1
          ? `${orgSafe} · ${confSafe}`
          : `${orgSafe} · ${confSafe} · ${genDate}`;
      this.doc.text(leftFooter, this.margin, this.pageHeight - 10);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...this.theme.primaryRgb);
      this.doc.text(`Page ${p} sur ${totalPages}`, this.pageWidth - this.margin, this.pageHeight - 10, {
        align: 'right',
      });
    }
  }
}
