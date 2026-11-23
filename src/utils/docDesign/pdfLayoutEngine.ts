import { jsPDF } from 'jspdf';
import {
  DocumentCategory,
  DocumentThemePalette,
  findUnsafePdfChars,
  formatEditorialDateFr,
  formatGenerationDateFr,
  getDocumentTheme,
  getOrganizationMonogram,
  getStatusTone,
  getToneColors,
  normalizeColumnWidthsPct,
  parseStructuredText,
  RgbColor,
  sanitizePdfText,
  SemanticTone,
  wrapLongTokensForPdf,
} from './documentThemes';
import { dispatchPdfDownload, normalizePdfFilename } from './fileDownload';

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
  totalRowIndices?: number[];
  highlightRowIndices?: number[];
  fontSize?: number;
  emptyMessage?: string;
  caption?: string;
}

export interface PdfFooterHeaderMeta {
  organization: string;
  documentTitle: string;
  shortTitle?: string;
  reference?: string;
  author?: string;
  subject?: string;
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

export interface PdfTocEntry {
  title: string;
  level: 1 | 2;
  page: number;
  yMm: number;
}

export interface PdfPageAuditState {
  page: number;
  drawCount: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  isCover: boolean;
  isToc: boolean;
}

export interface PdfQualityReport {
  passed: boolean;
  totalPages: number;
  tocEntriesCount: number;
  blankPagesRemoved: number;
  marginOverflows: Array<{ page: number; detail: string }>;
  blankPagesRemaining: number[];
  unsafeCharactersFound: string[];
  tocInvalidEntries: string[];
  fileSizeBytes: number;
  autoRepairs: string[];
  warnings: string[];
}

export interface PdfExportResult {
  filename: string;
  pageCount: number;
  fileSizeBytes: number;
  qualityReport: PdfQualityReport;
}

/**
 * Moteur de mise en page PDF A4 vectoriel éditorial (texte 100% sélectionnable et recherchable).
 * Supporte : page de couverture institutionnelle, sommaire dynamique avec liens cliquables,
 * graphiques vectoriels, tableaux multi-pages avec répétition d'en-tête et lignes de total,
 * en-têtes/pieds de page homogènes « Page X / Y » et contrôle qualité pré-export.
 */
export class PdfDocumentBuilder {
  public readonly doc: jsPDF;
  public readonly theme: DocumentThemePalette;
  public readonly fontFamily: 'helvetica' | 'times';
  public readonly margin = 16;
  public readonly pageWidth = 210;
  public readonly pageHeight = 297;
  public readonly contentWidth: number;
  public readonly topStartY = 21;
  public readonly maxContentY = 274;
  public y: number;

  private _tocPage: number | null = null;
  private _tocTitle = 'SOMMAIRE & TABLE DES MATIÈRES';
  private _tocSubtitle = 'Navigation structurée des sections du document';
  private _tocEntries: PdfTocEntry[] = [];
  private _tocFinalized = false;
  private _blankPagesRemoved = 0;
  private _autoRepairs: string[] = [];
  private _unsafeChars = new Set<string>();
  private _pageStates = new Map<number, PdfPageAuditState>();

  constructor(category: DocumentCategory) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    this.theme = getDocumentTheme(category);
    this.fontFamily = this.theme.editorial.fontFamily;
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.y = this.topStartY;
    this.ensurePageState(1);
  }

  public get docInstance(): jsPDF {
    return this.doc;
  }

  public get currentPage(): number {
    return this.doc.getCurrentPageInfo().pageNumber;
  }

  private ensurePageState(pageNum: number): PdfPageAuditState {
    let st = this._pageStates.get(pageNum);
    if (!st) {
      st = {
        page: pageNum,
        drawCount: 0,
        minX: this.pageWidth,
        maxX: 0,
        minY: this.pageHeight,
        maxY: 0,
        isCover: false,
        isToc: false,
      };
      this._pageStates.set(pageNum, st);
    }
    return st;
  }

  /**
   * Enregistre les limites d'un bloc dessiné pour le contrôle qualité anti-débordement
   * et la détection de pages blanches accidentelles.
   */
  public recordDrawBounds(x: number, y: number, width: number, height: number): void {
    const st = this.ensurePageState(this.currentPage);
    st.drawCount += 1;
    st.minX = Math.min(st.minX, x);
    st.maxX = Math.max(st.maxX, x + Math.max(0, width));
    st.minY = Math.min(st.minY, y);
    st.maxY = Math.max(st.maxY, y + Math.max(0, height));
  }

  private safeText(raw: unknown): string {
    const clean = sanitizePdfText(raw);
    const bad = findUnsafePdfChars(clean);
    bad.forEach((ch) => this._unsafeChars.add(ch));
    return clean;
  }

  public addPage(): void {
    this.doc.addPage();
    this.y = this.topStartY;
    this.ensurePageState(this.currentPage);
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
   * Réserve une page dédiée pour le Sommaire dynamique (avec numéros de pages réels calculés
   * en fin de génération et liens internes cliquables) et avance à la page suivante.
   */
  public beginTableOfContents(
    title = 'SOMMAIRE & TABLE DES MATIÈRES',
    subtitle = 'Structure éditoriale et pagination du document'
  ): void {
    this._tocTitle = title;
    this._tocSubtitle = subtitle;
    this._tocPage = this.currentPage;
    const st = this.ensurePageState(this._tocPage);
    st.isToc = true;
    st.drawCount += 1;
    this.addPage();
  }

  public registerTocEntry(title: string, level: 1 | 2 = 1): void {
    if (this._tocPage === null) return;
    const cleanTitle = this.safeText(title);
    if (!cleanTitle || cleanTitle === '—') return;
    this._tocEntries.push({
      title: cleanTitle,
      level,
      page: this.currentPage,
      yMm: this.y,
    });
  }

  /**
   * Dessine le monogramme vectoriel ou un logo image (base64 PNG/JPEG) en toute sécurité.
   */
  public drawOrgLogoOrMonogram(
    x: number,
    y: number,
    sizeMm: number,
    orgName: string,
    logoDataUrl?: string
  ): void {
    if (logoDataUrl && /^data:image\/(png|jpe?g|webp);base64,/i.test(logoDataUrl)) {
      try {
        const format = /image\/png/i.test(logoDataUrl) ? 'PNG' : 'JPEG';
        this.doc.addImage(logoDataUrl, format, x, y, sizeMm, sizeMm, undefined, 'FAST');
        this.recordDrawBounds(x, y, sizeMm, sizeMm);
        return;
      } catch {
        // Fallback propre sur le monogramme vectoriel si image invalide
      }
    }

    const initials = getOrganizationMonogram(orgName);
    const { primaryRgb, accentRgb } = this.theme;

    this.doc.setFillColor(...primaryRgb);
    this.doc.roundedRect(x, y, sizeMm, sizeMm, 2.2, 2.2, 'F');

    this.doc.setFillColor(...accentRgb);
    this.doc.rect(x + 1.2, y + 1.2, sizeMm - 2.4, 1.3, 'F');

    this.doc.setFont(this.fontFamily, 'bold');
    const fontSize = initials.length >= 3 ? sizeMm * 0.68 : sizeMm * 0.82;
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(initials, x + sizeMm / 2, y + sizeMm * 0.67, { align: 'center' });
    this.recordDrawBounds(x, y, sizeMm, sizeMm);
  }

  /**
   * Page de garde éditoriale et institutionnelle moderne.
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
    logoDataUrl?: string;
    recipient?: string;
    periodLabel?: string;
    confidentialityNotice?: string;
  }): void {
    const { doc, margin, contentWidth, pageWidth, pageHeight, theme } = this;
    const genDate = formatGenerationDateFr();
    const editorialDate = formatEditorialDateFr();
    const st = this.ensurePageState(this.currentPage);
    st.isCover = true;

    // Architecture graphique sobre : filet latéral + bandeau supérieur
    doc.setFillColor(...theme.primaryRgb);
    doc.rect(0, 0, pageWidth, 5.5, 'F');
    doc.setFillColor(...theme.accentRgb);
    doc.rect(0, 5.5, pageWidth, 1.4, 'F');

    // Liseré vertical architectural sur la marge gauche
    doc.setFillColor(...theme.primaryRgb);
    doc.rect(0, 0, 3.2, pageHeight, 'F');
    doc.setFillColor(...theme.accentRgb);
    doc.rect(3.2, 0, 0.9, pageHeight, 'F');

    // En-tête organisation + logo/monogramme
    this.drawOrgLogoOrMonogram(margin, 17, 14, options.organization, options.logoDataUrl);

    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...theme.primaryRgb);
    doc.text(this.safeText(options.organization).toUpperCase(), margin + 18, 22.5);

    doc.setFont(this.fontFamily, 'normal');
    doc.setFontSize(8.6);
    doc.setTextColor(...theme.textMutedRgb);
    doc.text(
      this.safeText(options.department || "Direction des Systèmes d'Information"),
      margin + 18,
      28
    );

    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...theme.secondaryRgb);
    doc.text(this.safeText(`Édition du ${editorialDate}`), pageWidth - margin, 22.5, {
      align: 'right',
    });
    doc.setFont(this.fontFamily, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...theme.textMutedRgb);
    doc.text(
      this.safeText(options.periodLabel || `Mise à jour : ${genDate}`),
      pageWidth - margin,
      27.5,
      { align: 'right' }
    );

    // Ligne de séparation fine
    doc.setDrawColor(...theme.borderRgb);
    doc.setLineWidth(0.3);
    doc.line(margin, 36, pageWidth - margin, 36);

    // Bloc titre principal (hiérarchie éditoriale claire)
    let cursorY = 50;
    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...theme.accentRgb);
    doc.text(this.safeText(options.eyebrow).toUpperCase(), pageWidth / 2, cursorY, {
      align: 'center',
    });
    cursorY += 10;

    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(21.5);
    doc.setTextColor(...theme.primaryRgb);
    const titleLines = doc.splitTextToSize(this.safeText(options.mainTitle), contentWidth - 10);
    doc.text(titleLines, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += titleLines.length * 8.2 + 2;

    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(...theme.secondaryRgb);
    const subLines = doc.splitTextToSize(this.safeText(options.subtitle), contentWidth - 14);
    doc.text(subLines, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += subLines.length * 5.8 + 6;

    // Pastille Période / Exercice
    const pillText = this.safeText(options.exerciseLabel);
    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(9.5);
    const pillW = Math.min(contentWidth - 20, Math.max(66, doc.getTextWidth(pillText) + 18));
    const pillX = (pageWidth - pillW) / 2;
    doc.setFillColor(...theme.primaryRgb);
    doc.roundedRect(pillX, cursorY - 5.5, pillW, 8.8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(pillText, pageWidth / 2, cursorY + 0.4, { align: 'center' });
    cursorY += 10;

    doc.setFont(this.fontFamily, 'italic');
    doc.setFontSize(8.8);
    doc.setTextColor(...theme.textMutedRgb);
    const tagLines = doc.splitTextToSize(this.safeText(options.tagline), contentWidth - 16);
    doc.text(tagLines, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += tagLines.length * 4.2 + 8;

    // Tableau d'identification auto-mesuré (zéro débordement)
    this.y = cursorY;
    const labelW = 58;
    const valW = contentWidth - labelW;

    const rowsToDraw: Array<[string, string]> = [...options.metadataRows];
    if (options.recipient && !rowsToDraw.some(([k]) => /destinataire/i.test(k))) {
      rowsToDraw.push(['Destinataire officiel', options.recipient]);
    }

    rowsToDraw.forEach(([lbl, val], idx) => {
      doc.setFont(this.fontFamily, 'normal');
      doc.setFontSize(8.5);
      const safeVal = wrapLongTokensForPdf(this.safeText(val), 46);
      const valLines = doc.splitTextToSize(safeVal, valW - 8);
      const rowH = Math.max(7.6, valLines.length * 3.9 + 3.6);

      const whiteRgb: RgbColor = [255, 255, 255];
      doc.setFillColor(...(idx % 2 === 0 ? theme.lightBgRgb : whiteRgb));
      doc.setDrawColor(...theme.borderRgb);
      doc.setLineWidth(0.22);
      doc.rect(margin, this.y, labelW, rowH, 'FD');

      doc.setFillColor(...(idx % 2 === 0 ? theme.zebraBgRgb : whiteRgb));
      doc.rect(margin + labelW, this.y, valW, rowH, 'FD');

      doc.setFont(this.fontFamily, 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(...theme.primaryRgb);
      doc.text(this.safeText(lbl), margin + 3.5, this.y + 4.9);

      doc.setFont(this.fontFamily, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...theme.textDarkRgb);
      doc.text(valLines, margin + labelW + 3.5, this.y + 4.9);

      this.recordDrawBounds(margin, this.y, contentWidth, rowH);
      this.y += rowH;
    });

    // Encadré Engagement / Confidentialité en bas de couverture (position protégée)
    const engLines = doc.splitTextToSize(this.safeText(options.engagementText), contentWidth - 14);
    const boxH = 16 + engLines.length * 3.85 + 8;
    const targetBoxY = Math.min(Math.max(this.y + 8, 214), this.maxContentY - boxH - 2);
    this.y = targetBoxY;

    doc.setFillColor(...theme.zebraBgRgb);
    doc.setDrawColor(...theme.borderRgb);
    doc.setLineWidth(0.28);
    doc.roundedRect(margin, this.y, contentWidth, boxH, 1.5, 1.5, 'FD');

    doc.setFillColor(...theme.secondaryRgb);
    doc.rect(margin, this.y, 1.8, boxH, 'F');

    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(...theme.primaryRgb);
    doc.text(this.safeText(options.engagementTitle), margin + 6, this.y + 6.5);

    doc.setFont(this.fontFamily, 'normal');
    doc.setFontSize(8.1);
    doc.setTextColor(...theme.textBodyRgb);
    doc.text(engLines, margin + 6, this.y + 12.2);

    const footerLineY = this.y + 12.2 + engLines.length * 3.85 + 2.8;
    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(7.9);
    doc.setTextColor(...theme.secondaryRgb);
    doc.text(this.safeText(options.engagementFooter), margin + 6, footerLineY);

    this.recordDrawBounds(margin, 17, contentWidth, this.y + boxH - 17);
  }

  /**
   * Bannière exécutive (rapports techniques, PV de déploiement, fiches de maintenance).
   */
  public drawDocumentBanner(options: {
    organization: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    rightBadge?: string;
    subMeta?: string;
    logoDataUrl?: string;
  }): void {
    const { doc, margin, contentWidth, pageWidth, theme } = this;
    const startY = 14;

    doc.setFont(this.fontFamily, 'normal');
    doc.setFontSize(8.8);
    const subLines = doc.splitTextToSize(this.safeText(options.subtitle), contentWidth - 22);
    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(14.5);
    const titleLines = doc.splitTextToSize(this.safeText(options.title), contentWidth - 46);

    const bannerH = Math.max(
      30,
      14 + titleLines.length * 5.8 + subLines.length * 4.1 + (options.subMeta ? 6 : 2)
    );

    doc.setFillColor(...theme.primaryRgb);
    doc.roundedRect(margin, startY, contentWidth, bannerH, 2, 2, 'F');

    doc.setFillColor(...theme.accentRgb);
    doc.rect(margin, startY + bannerH - 1.5, contentWidth, 1.5, 'F');

    // Logo ou monogramme clair
    if (options.logoDataUrl && /^data:image\/(png|jpe?g|webp);base64,/i.test(options.logoDataUrl)) {
      try {
        const format = /image\/png/i.test(options.logoDataUrl) ? 'PNG' : 'JPEG';
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin + 4, startY + 4.5, 11, 11, 1.5, 1.5, 'F');
        doc.addImage(options.logoDataUrl, format, margin + 4.5, startY + 5, 10, 10, undefined, 'FAST');
      } catch {
        this.drawInvertedMonogram(options.organization, margin + 4, startY + 4.5);
      }
    } else {
      this.drawInvertedMonogram(options.organization, margin + 4, startY + 4.5);
    }

    // Eyebrow
    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(147, 197, 253);
    doc.text(this.safeText(options.eyebrow).toUpperCase(), margin + 19, startY + 7.5);

    // Badge droit
    if (options.rightBadge) {
      doc.setFont(this.fontFamily, 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(226, 232, 240);
      doc.text(this.safeText(options.rightBadge), pageWidth - margin - 4, startY + 7.5, {
        align: 'right',
      });
    }

    // Titre principal
    doc.setFont(this.fontFamily, 'bold');
    doc.setFontSize(14.5);
    doc.setTextColor(255, 255, 255);
    doc.text(titleLines, margin + 19, startY + 14.2);

    const afterTitleY = startY + 14.2 + (titleLines.length - 1) * 5.6 + 5.2;
    doc.setFont(this.fontFamily, 'normal');
    doc.setFontSize(8.7);
    doc.setTextColor(226, 232, 240);
    doc.text(subLines, margin + 4, afterTitleY);

    if (options.subMeta) {
      doc.setFont(this.fontFamily, 'italic');
      doc.setFontSize(7.7);
      doc.setTextColor(186, 230, 253);
      doc.text(
        this.safeText(options.subMeta),
        margin + 4,
        afterTitleY + subLines.length * 4 + 1.2
      );
    }

    this.recordDrawBounds(margin, startY, contentWidth, bannerH);
    this.y = startY + bannerH + 6;
  }

  private drawInvertedMonogram(organization: string, x: number, y: number): void {
    const initials = getOrganizationMonogram(organization);
    this.doc.setFillColor(255, 255, 255);
    this.doc.roundedRect(x, y, 11, 11, 1.5, 1.5, 'F');
    this.doc.setFont(this.fontFamily, 'bold');
    this.doc.setFontSize(initials.length >= 3 ? 7.8 : 9);
    this.doc.setTextColor(...this.theme.primaryRgb);
    this.doc.text(initials, x + 5.5, y + 7.2, { align: 'center' });
  }

  /**
   * Bandeau de 2 à 4 cartes KPI alignées.
   */
  public drawKpiStrip(items: PdfKpiItem[]): void {
    if (!items || items.length === 0) return;
    const count = Math.min(4, items.length);
    const gap = 3;
    const boxW = (this.contentWidth - gap * (count - 1)) / count;
    const boxH = 20;

    this.ensureSpace(boxH + 4);

    items.slice(0, 4).forEach((item, idx) => {
      const bx = this.margin + idx * (boxW + gap);
      const toneColors = getToneColors(item.tone || 'info', this.theme);

      this.doc.setFillColor(...this.theme.zebraBgRgb);
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.25);
      this.doc.roundedRect(bx, this.y, boxW, boxH, 1.5, 1.5, 'FD');

      this.doc.setFillColor(...toneColors.rgb);
      this.doc.rect(bx, this.y, boxW, 1.3, 'F');

      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setFontSize(6.9);
      this.doc.setTextColor(...this.theme.textMutedRgb);
      const lblFit = this.doc.splitTextToSize(this.safeText(item.label).toUpperCase(), boxW - 3)[0] || '';
      this.doc.text(lblFit, bx + boxW / 2, this.y + 5.6, { align: 'center' });

      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setFontSize(11);
      this.doc.setTextColor(...this.theme.primaryRgb);
      const valFit = this.doc.splitTextToSize(this.safeText(item.value), boxW - 3)[0] || '';
      this.doc.text(valFit, bx + boxW / 2, this.y + 11.8, { align: 'center' });

      if (item.sub) {
        this.doc.setFont(this.fontFamily, 'normal');
        this.doc.setFontSize(6.9);
        this.doc.setTextColor(...this.theme.textBodyRgb);
        const subFit = this.doc.splitTextToSize(this.safeText(item.sub), boxW - 3)[0] || '';
        this.doc.text(subFit, bx + boxW / 2, this.y + 16.9, { align: 'center' });
      }
    });

    this.recordDrawBounds(this.margin, this.y, this.contentWidth, boxH);
    this.y += boxH + 6;
  }

  /**
   * Titre de section majeur (garantit un espace suffisant pour prévenir tout titre orphelin).
   */
  public drawSectionHeading(
    title: string,
    subtitle?: string,
    options?: { pageBreakBefore?: boolean; registerToc?: boolean }
  ): void {
    if (options?.pageBreakBefore && this.y > this.topStartY + 4) {
      this.addPage();
    } else {
      this.ensureSpace(subtitle ? 32 : 26);
    }

    if (options?.registerToc !== false) {
      this.registerTocEntry(title, 1);
    }

    const safeTitle = this.safeText(title).toUpperCase();
    this.doc.setFont(this.fontFamily, 'bold');
    this.doc.setFontSize(11.5);
    const titleLines = this.doc.splitTextToSize(safeTitle, this.contentWidth - 7);

    const startY = this.y;
    const titleBlockH = titleLines.length * 4.9 + (subtitle ? 5.2 : 1.8);

    // Léger fond éditorial sous le titre de section majeur
    this.doc.setFillColor(...this.theme.lightBgRgb);
    this.doc.rect(this.margin, startY - 4.2, this.contentWidth, titleBlockH + 2.4, 'F');

    // Barre d'accent gauche
    this.doc.setFillColor(...this.theme.accentRgb);
    this.doc.rect(this.margin, startY - 4.2, 2.3, titleBlockH + 2.4, 'F');

    this.doc.setTextColor(...this.theme.primaryRgb);
    this.doc.text(titleLines, this.margin + 5, startY + 0.2);
    this.y = startY + titleLines.length * 4.8 + 1.2;

    if (subtitle) {
      this.doc.setFont(this.fontFamily, 'italic');
      this.doc.setFontSize(8.3);
      this.doc.setTextColor(...this.theme.textMutedRgb);
      const subLines = this.doc.splitTextToSize(this.safeText(subtitle), this.contentWidth - 7);
      this.doc.text(subLines, this.margin + 5, this.y);
      this.y += subLines.length * 3.8 + 1.4;
    }

    this.doc.setDrawColor(...this.theme.primaryRgb);
    this.doc.setLineWidth(0.35);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.recordDrawBounds(this.margin, startY - 4.2, this.contentWidth, this.y - (startY - 4.2));
    this.y += 5;
  }

  /**
   * Sous-titre de section (empêche les titres isolés en bas de page).
   */
  public drawSubHeading(title: string, options?: { registerToc?: boolean }): void {
    this.ensureSpace(22);
    if (options?.registerToc) {
      this.registerTocEntry(title, 2);
    }

    const safeTitle = this.safeText(title);
    this.doc.setFont(this.fontFamily, 'bold');
    this.doc.setFontSize(9.8);
    this.doc.setTextColor(...this.theme.secondaryRgb);
    const lines = this.doc.splitTextToSize(safeTitle, this.contentWidth - 4);

    // Petit marqueur carré discret
    this.doc.setFillColor(...this.theme.accentRgb);
    this.doc.rect(this.margin, this.y - 2.3, 1.6, 2.5, 'F');

    this.doc.text(lines, this.margin + 3.5, this.y);
    const blockH = lines.length * 4.2 + 2.6;
    this.recordDrawBounds(this.margin, this.y - 3, this.contentWidth, blockH);
    this.y += blockH;
  }

  /**
   * Rend un texte structuré (paragraphes justifiés ou alignés gauche, puces, listes numérotées)
   * avec interlignage régulier et pagination fluide sans chevauchement.
   */
  public drawStructuredText(
    rawText: string,
    options?: {
      indentMm?: number;
      fontSize?: number;
      color?: RgbColor;
      justify?: boolean;
    }
  ): void {
    const blocks = parseStructuredText(rawText, true);
    const indent = options?.indentMm ?? 0;
    const fontSize = options?.fontSize ?? 8.8;
    const lineHeight = fontSize * 0.47;
    const textColor = options?.color ?? this.theme.textBodyRgb;
    const availWidth = this.contentWidth - indent;
    const useJustify = options?.justify !== false && availWidth >= 120;

    blocks.forEach((blk) => {
      this.doc.setFont(this.fontFamily, 'normal');
      this.doc.setFontSize(fontSize);
      this.doc.setTextColor(...textColor);

      const safeContent = wrapLongTokensForPdf(this.safeText(blk.text), 48);

      if (blk.type === 'bullet' || blk.type === 'numbered') {
        const marker = blk.marker || '•';
        const markerOffset = blk.type === 'numbered' ? 6.8 : 4.5;
        const wrapped = this.doc.splitTextToSize(safeContent, availWidth - markerOffset);
        const h = wrapped.length * lineHeight + 1.6;
        this.ensureSpace(Math.min(h, 24));

        this.doc.setFont(this.fontFamily, 'bold');
        this.doc.setTextColor(...this.theme.accentRgb);
        this.doc.text(marker, this.margin + indent + 1, this.y);

        this.doc.setFont(this.fontFamily, 'normal');
        this.doc.setTextColor(...textColor);
        wrapped.forEach((line: string) => {
          this.ensureSpace(lineHeight + 1.2);
          this.doc.text(line, this.margin + indent + markerOffset, this.y);
          this.recordDrawBounds(
            this.margin + indent + markerOffset,
            this.y - lineHeight,
            availWidth - markerOffset,
            lineHeight
          );
          this.y += lineHeight;
        });
        this.y += 1.3;
      } else {
        const wrapped = this.doc.splitTextToSize(safeContent, availWidth);
        if (useJustify && wrapped.length >= 2 && this.y + wrapped.length * lineHeight <= this.maxContentY) {
          this.doc.text(safeContent, this.margin + indent, this.y, {
            maxWidth: availWidth,
            align: 'justify',
            lineHeightFactor: 1.26,
          });
          const blockH = wrapped.length * lineHeight;
          this.recordDrawBounds(this.margin + indent, this.y - lineHeight, availWidth, blockH);
          this.y += blockH + 2.2;
        } else {
          wrapped.forEach((line: string) => {
            this.ensureSpace(lineHeight + 1.2);
            this.doc.text(line, this.margin + indent, this.y);
            this.recordDrawBounds(
              this.margin + indent,
              this.y - lineHeight,
              availWidth,
              lineHeight
            );
            this.y += lineHeight;
          });
          this.y += 2.1;
        }
      }
    });
  }

  /**
   * Panneau de Résumé Exécutif / Conclusion avec liste de points clés optionnels.
   */
  public drawExecutiveCard(options: {
    title: string;
    leadParagraph: string;
    highlights?: string[];
    tone?: SemanticTone;
  }): void {
    const toneColors = getToneColors(options.tone || 'info', this.theme);
    const innerW = this.contentWidth - 11;
    const leadSafe = wrapLongTokensForPdf(this.safeText(options.leadParagraph), 48);

    this.doc.setFont(this.fontFamily, 'normal');
    this.doc.setFontSize(8.6);
    const leadLines = this.doc.splitTextToSize(leadSafe, innerW);

    const highlightBlocks = (options.highlights || [])
      .filter((h) => h.trim().length > 0)
      .map((h) =>
        this.doc.splitTextToSize(wrapLongTokensForPdf(this.safeText(h), 46), innerW - 5)
      );

    const leadH = leadLines.length * 4.0;
    const hlH = highlightBlocks.reduce((sum, lines) => sum + lines.length * 3.85 + 1.4, 0);
    const totalH = 11 + leadH + (hlH > 0 ? hlH + 3 : 0) + 2.5;

    if (totalH <= this.maxContentY - this.topStartY) {
      this.ensureSpace(totalH + 3);
      const boxY = this.y;

      this.doc.setFillColor(...this.theme.zebraBgRgb);
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.28);
      this.doc.roundedRect(this.margin, boxY, this.contentWidth, totalH, 1.5, 1.5, 'FD');

      this.doc.setFillColor(...toneColors.rgb);
      this.doc.rect(this.margin, boxY, 2.2, totalH, 'F');

      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setFontSize(9.2);
      this.doc.setTextColor(...this.theme.primaryRgb);
      this.doc.text(this.safeText(options.title), this.margin + 5.5, boxY + 6.5);

      let cy = boxY + 12;
      this.doc.setFont(this.fontFamily, 'normal');
      this.doc.setFontSize(8.6);
      this.doc.setTextColor(...this.theme.textDarkRgb);
      this.doc.text(leadLines, this.margin + 5.5, cy);
      cy += leadH + 2.2;

      highlightBlocks.forEach((lines) => {
        this.doc.setFont(this.fontFamily, 'bold');
        this.doc.setFontSize(8.3);
        this.doc.setTextColor(...toneColors.rgb);
        this.doc.text('•', this.margin + 5.5, cy);

        this.doc.setFont(this.fontFamily, 'normal');
        this.doc.setTextColor(...this.theme.textBodyRgb);
        this.doc.text(lines, this.margin + 10, cy);
        cy += lines.length * 3.85 + 1.4;
      });

      this.recordDrawBounds(this.margin, boxY, this.contentWidth, totalH);
      this.y = boxY + totalH + 4.5;
    } else {
      this.drawSubHeading(options.title);
      this.drawStructuredText(options.leadParagraph, { indentMm: 2, fontSize: 8.6 });
      if (options.highlights && options.highlights.length > 0) {
        this.drawStructuredText(
          options.highlights.map((h) => `• ${h}`).join('\n'),
          { indentMm: 3, fontSize: 8.4 }
        );
      }
    }
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

    this.doc.setFont(this.fontFamily, 'normal');
    this.doc.setFontSize(8.3);
    let bodyHeight = 0;
    const prepared = blocks.map((blk) => {
      const markerWidth = blk.type === 'paragraph' ? 0 : blk.type === 'numbered' ? 6 : 4.2;
      const safeBlk = wrapLongTokensForPdf(this.safeText(blk.text), 46);
      const lines = this.doc.splitTextToSize(safeBlk, innerWidth - markerWidth);
      const h = lines.length * 3.85 + 1.4;
      bodyHeight += h;
      return { blk, lines, markerWidth };
    });

    const totalH = 9.5 + bodyHeight + 2.5;

    if (totalH <= this.maxContentY - this.topStartY) {
      this.ensureSpace(totalH + 3);
      const boxY = this.y;

      this.doc.setFillColor(...this.theme.zebraBgRgb);
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.25);
      this.doc.roundedRect(this.margin, boxY, this.contentWidth, totalH, 1.5, 1.5, 'FD');

      this.doc.setFillColor(...toneColors.rgb);
      this.doc.rect(this.margin, boxY, 1.8, totalH, 'F');

      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setFontSize(8.6);
      this.doc.setTextColor(...this.theme.primaryRgb);
      this.doc.text(this.safeText(title), this.margin + 5, boxY + 6);

      let cursorY = boxY + 11;
      prepared.forEach(({ blk, lines, markerWidth }) => {
        if (blk.type !== 'paragraph') {
          this.doc.setFont(this.fontFamily, 'bold');
          this.doc.setFontSize(8.3);
          this.doc.setTextColor(...toneColors.rgb);
          this.doc.text(blk.marker || '•', this.margin + 5, cursorY);
        }
        this.doc.setFont(this.fontFamily, 'normal');
        this.doc.setFontSize(8.3);
        this.doc.setTextColor(...this.theme.textBodyRgb);
        this.doc.text(lines, this.margin + 5 + markerWidth, cursorY);
        cursorY += lines.length * 3.85 + 1.4;
      });

      this.recordDrawBounds(this.margin, boxY, this.contentWidth, totalH);
      this.y = boxY + totalH + 3.8;
    } else {
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

      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setFontSize(8.2);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(this.safeText(options.headerLeft || 'Paramètre'), this.margin + 3, this.y + 5);
      this.doc.text(
        this.safeText(options.headerRight || 'Détail constaté'),
        this.margin + labelW + 3,
        this.y + 5
      );
      this.recordDrawBounds(this.margin, this.y, this.contentWidth, 7.5);
      this.y += 7.5;
    };

    this.ensureSpace(20);
    drawHeader();

    rows.forEach((row, idx) => {
      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setFontSize(8.1);
      const lblLines = this.doc.splitTextToSize(this.safeText(row.label), labelW - 6);

      this.doc.setFont(this.fontFamily, row.isStatus ? 'bold' : 'normal');
      this.doc.setFontSize(8.3);
      const safeVal = wrapLongTokensForPdf(this.safeText(row.value), 44);
      const valLines = this.doc.splitTextToSize(safeVal, valW - 6);

      const lineCount = Math.max(lblLines.length, valLines.length);
      const rowH = Math.max(7.6, lineCount * 3.9 + 3.8);

      if (this.y + rowH > this.maxContentY) {
        this.addPage();
        drawHeader();
      }

      const bgRgb = idx % 2 === 0 ? this.theme.lightBgRgb : ([255, 255, 255] as RgbColor);
      const valBgRgb = idx % 2 === 0 ? this.theme.zebraBgRgb : ([255, 255, 255] as RgbColor);

      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.2);
      this.doc.setFillColor(...bgRgb);
      this.doc.rect(this.margin, this.y, labelW, rowH, 'FD');
      this.doc.setFillColor(...valBgRgb);
      this.doc.rect(this.margin + labelW, this.y, valW, rowH, 'FD');

      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setFontSize(8.1);
      this.doc.setTextColor(...this.theme.primaryRgb);
      this.doc.text(lblLines, this.margin + 3, this.y + 4.9);

      if (row.isStatus || row.tone) {
        const toneColors = getToneColors(row.tone || getStatusTone(row.value), this.theme);
        this.doc.setFont(this.fontFamily, 'bold');
        this.doc.setTextColor(...toneColors.rgb);
      } else {
        this.doc.setFont(this.fontFamily, 'normal');
        this.doc.setTextColor(...this.theme.textBodyRgb);
      }
      this.doc.setFontSize(8.3);
      this.doc.text(valLines, this.margin + labelW + 3, this.y + 4.9);

      this.recordDrawBounds(this.margin, this.y, this.contentWidth, rowH);
      this.y += rowH;
    });

    this.y += 4;
  }

  /**
   * Tableau structuré multi-pages avec répétition automatique d'en-tête,
   * bordures discrètes, alignement numérique droit, lignes de total mises en évidence
   * et protection anti-débordement sur jetons longs.
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
    const totalRows = new Set(options?.totalRowIndices || []);
    const highlightRows = new Set(options?.highlightRowIndices || []);

    this.doc.setFont(this.fontFamily, 'bold');
    this.doc.setFontSize(7.8);
    const headerLinesPerCol = headers.map((h, i) =>
      this.doc.splitTextToSize(this.safeText(h), Math.max(8, colWidthsMm[i] - cellPadX * 2))
    );
    const maxHeaderLines = Math.max(1, ...headerLinesPerCol.map((l) => l.length));
    const headerH = Math.max(8, maxHeaderLines * 3.6 + 3.8);

    const drawHeaderRow = () => {
      let x = this.margin;
      this.doc.setFillColor(...this.theme.primaryRgb);
      this.doc.setDrawColor(...this.theme.primaryRgb);
      this.doc.setLineWidth(0.25);
      this.doc.rect(this.margin, this.y, this.contentWidth, headerH, 'FD');

      colWidthsMm.forEach((w, i) => {
        if (i > 0) {
          this.doc.setDrawColor(255, 255, 255);
          this.doc.setLineWidth(0.15);
          this.doc.line(x, this.y + 1.2, x, this.y + headerH - 1.2);
        }
        this.doc.setFont(this.fontFamily, 'bold');
        this.doc.setFontSize(7.8);
        this.doc.setTextColor(255, 255, 255);
        const align = rightCols.has(i) ? 'right' : centerCols.has(i) ? 'center' : 'left';
        const textX =
          align === 'right' ? x + w - cellPadX : align === 'center' ? x + w / 2 : x + cellPadX;
        this.doc.text(headerLinesPerCol[i], textX, this.y + 4.8, { align });
        x += w;
      });
      this.recordDrawBounds(this.margin, this.y, this.contentWidth, headerH);
      this.y += headerH;
    };

    if (!rows || rows.length === 0) {
      this.ensureSpace(headerH + 12);
      drawHeaderRow();
      const emptyH = 10;
      this.doc.setFillColor(...this.theme.zebraBgRgb);
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.22);
      this.doc.rect(this.margin, this.y, this.contentWidth, emptyH, 'FD');
      this.doc.setFont(this.fontFamily, 'italic');
      this.doc.setFontSize(8.2);
      this.doc.setTextColor(...this.theme.textMutedRgb);
      this.doc.text(
        this.safeText(options?.emptyMessage || 'Aucune donnée enregistrée dans cette section.'),
        this.margin + 4,
        this.y + 6.2
      );
      this.recordDrawBounds(this.margin, this.y, this.contentWidth, emptyH);
      this.y += emptyH + 5;
      return;
    }

    // Garde au moins l'en-tête + 1ère ligne attachés
    this.ensureSpace(headerH + 14);
    drawHeaderRow();

    rows.forEach((row, rIdx) => {
      const isTotal = totalRows.has(rIdx);
      const isHighlight = highlightRows.has(rIdx);

      this.doc.setFont(this.fontFamily, isTotal ? 'bold' : 'normal');
      this.doc.setFontSize(fontSize);

      const cellWrapped = colWidthsMm.map((w, cIdx) => {
        const raw = row[cIdx] ?? '—';
        const approxChars = Math.max(10, Math.floor((w - cellPadX * 2) / 1.45));
        const safeCell = wrapLongTokensForPdf(this.safeText(raw), approxChars);
        return this.doc.splitTextToSize(safeCell, Math.max(8, w - cellPadX * 2));
      });

      const maxLines = Math.max(1, ...cellWrapped.map((l) => l.length));
      const rowH = Math.max(isTotal ? 8.2 : 7.4, maxLines * lineH + 3.6);

      if (this.y + rowH > this.maxContentY) {
        this.addPage();
        drawHeaderRow();
      }

      const rowBg: RgbColor = isTotal
        ? this.theme.lightBgRgb
        : isHighlight
          ? this.theme.zebraBgRgb
          : rIdx % 2 === 1
            ? this.theme.zebraBgRgb
            : [255, 255, 255];

      // Fond de ligne + bordure extérieure discrète + séparateur horizontal
      this.doc.setFillColor(...rowBg);
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(isTotal ? 0.35 : 0.18);
      this.doc.rect(this.margin, this.y, this.contentWidth, rowH, 'FD');

      if (isTotal) {
        this.doc.setDrawColor(...this.theme.primaryRgb);
        this.doc.setLineWidth(0.45);
        this.doc.line(this.margin, this.y, this.margin + this.contentWidth, this.y);
      }

      let x = this.margin;
      colWidthsMm.forEach((w, cIdx) => {
        if (cIdx > 0) {
          this.doc.setDrawColor(...this.theme.borderRgb);
          this.doc.setLineWidth(0.14);
          this.doc.line(x, this.y, x, this.y + rowH);
        }

        if (isTotal) {
          this.doc.setFont(this.fontFamily, 'bold');
          this.doc.setTextColor(...this.theme.primaryRgb);
        } else if (statusCols.has(cIdx)) {
          const toneColors = getToneColors(getStatusTone(row[cIdx]), this.theme);
          this.doc.setFont(this.fontFamily, 'bold');
          this.doc.setTextColor(...toneColors.rgb);
        } else if (boldCols.has(cIdx)) {
          this.doc.setFont(this.fontFamily, 'bold');
          this.doc.setTextColor(...this.theme.textDarkRgb);
        } else {
          this.doc.setFont(this.fontFamily, 'normal');
          this.doc.setTextColor(...this.theme.textBodyRgb);
        }

        this.doc.setFontSize(fontSize);
        const align = rightCols.has(cIdx) ? 'right' : centerCols.has(cIdx) ? 'center' : 'left';
        const textX =
          align === 'right' ? x + w - cellPadX : align === 'center' ? x + w / 2 : x + cellPadX;

        this.doc.text(cellWrapped[cIdx], textX, this.y + cellPadTop, { align });
        x += w;
      });

      this.recordDrawBounds(this.margin, this.y, this.contentWidth, rowH);
      this.y += rowH;
    });

    if (options?.caption) {
      this.doc.setFont(this.fontFamily, 'italic');
      this.doc.setFontSize(7.4);
      this.doc.setTextColor(...this.theme.textMutedRgb);
      const capLines = this.doc.splitTextToSize(this.safeText(options.caption), this.contentWidth);
      this.doc.text(capLines, this.margin, this.y + 3.4);
      this.y += capLines.length * 3.4 + 2;
    }

    this.y += 4.5;
  }

  /**
   * Grille double signature / validation officielle.
   */
  public drawSignatureGrid(left: PdfSignatureParty, right: PdfSignatureParty): void {
    const gap = 6;
    const colW = (this.contentWidth - gap) / 2;
    const boxH = 27;

    this.ensureSpace(boxH + 4);

    [left, right].forEach((party, idx) => {
      const bx = this.margin + idx * (colW + gap);
      this.doc.setFillColor(...this.theme.zebraBgRgb);
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.28);
      this.doc.roundedRect(bx, this.y, colW, boxH, 1.5, 1.5, 'FD');

      this.doc.setFillColor(...(party.signed ? this.theme.successRgb : this.theme.primaryRgb));
      this.doc.rect(bx, this.y, colW, 1.3, 'F');

      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setFontSize(8.1);
      this.doc.setTextColor(...this.theme.primaryRgb);
      this.doc.text(this.safeText(party.role), bx + 4, this.y + 6.5);

      this.doc.setFont(this.fontFamily, 'normal');
      this.doc.setFontSize(8.4);
      this.doc.setTextColor(...this.theme.textDarkRgb);
      const nameFit = this.doc.splitTextToSize(this.safeText(party.name), colW - 8)[0] || '';
      this.doc.text(nameFit, bx + 4, this.y + 12.6);

      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setFontSize(7.8);
      this.doc.setTextColor(...(party.signed ? this.theme.successRgb : this.theme.warningRgb));
      const statusText = party.dateLabel
        ? `${party.statusLabel} · ${party.dateLabel}`
        : party.statusLabel;
      const statusFit = this.doc.splitTextToSize(this.safeText(statusText), colW - 8)[0] || '';
      this.doc.text(statusFit, bx + 4, this.y + 21);
    });

    this.recordDrawBounds(this.margin, this.y, this.contentWidth, boxH);
    this.y += boxH + 5;
  }

  /**
   * Supprime une éventuelle page blanche accidentelle en fin de document.
   */
  public pruneTrailingBlankPages(): void {
    let total = this.doc.getNumberOfPages();
    while (total > 1) {
      const st = this._pageStates.get(total);
      if (st && st.drawCount === 0 && !st.isCover && !st.isToc) {
        this.doc.deletePage(total);
        this._pageStates.delete(total);
        this._blankPagesRemoved += 1;
        this._autoRepairs.push(`Page blanche accidentelle n°${total} supprimée avant export.`);
        total -= 1;
      } else {
        break;
      }
    }
  }

  /**
   * Remplit la page de Table des Matières avec les numéros de page exacts et des liens cliquables.
   */
  public finalizeTableOfContents(): void {
    if (this._tocPage === null || this._tocFinalized) return;
    this._tocFinalized = true;

    const totalPages = this.doc.getNumberOfPages();
    if (this._tocPage < 1 || this._tocPage > totalPages) return;

    this.doc.setPage(this._tocPage);
    let cy = this.topStartY;

    // En-tête éditorial du Sommaire
    this.doc.setFillColor(...this.theme.lightBgRgb);
    this.doc.rect(this.margin, cy - 4, this.contentWidth, 16, 'F');
    this.doc.setFillColor(...this.theme.accentRgb);
    this.doc.rect(this.margin, cy - 4, 2.5, 16, 'F');

    this.doc.setFont(this.fontFamily, 'bold');
    this.doc.setFontSize(13);
    this.doc.setTextColor(...this.theme.primaryRgb);
    this.doc.text(this.safeText(this._tocTitle), this.margin + 5.5, cy + 2);

    this.doc.setFont(this.fontFamily, 'italic');
    this.doc.setFontSize(8.4);
    this.doc.setTextColor(...this.theme.textMutedRgb);
    this.doc.text(this.safeText(this._tocSubtitle), this.margin + 5.5, cy + 8.5);
    cy += 19;

    const entries = this._tocEntries;
    if (entries.length === 0) {
      this.doc.setFont(this.fontFamily, 'italic');
      this.doc.setFontSize(9);
      this.doc.setTextColor(...this.theme.textMutedRgb);
      this.doc.text('Aucune section enregistrée.', this.margin, cy + 6);
      return;
    }

    const availH = this.maxContentY - cy - 6;
    const useTwoColumns = entries.length > 32;
    const colGap = 8;
    const colW = useTwoColumns ? (this.contentWidth - colGap) / 2 : this.contentWidth;
    const rowsPerCol = useTwoColumns ? Math.ceil(entries.length / 2) : entries.length;
    const pitch = Math.min(7.8, Math.max(4.6, availH / Math.max(1, rowsPerCol)));

    entries.forEach((entry, idx) => {
      const colIdx = useTwoColumns ? Math.floor(idx / rowsPerCol) : 0;
      const rowInCol = useTwoColumns ? idx % rowsPerCol : idx;
      const baseX = this.margin + colIdx * (colW + colGap);
      const rowY = cy + rowInCol * pitch;
      const isMain = entry.level === 1;
      const indent = isMain ? 0 : 5.5;

      this.doc.setFont(this.fontFamily, isMain ? 'bold' : 'normal');
      this.doc.setFontSize(useTwoColumns ? (isMain ? 8.1 : 7.5) : isMain ? 9.1 : 8.2);
      this.doc.setTextColor(...(isMain ? this.theme.primaryRgb : this.theme.textBodyRgb));

      const pageLabel = `Page ${entry.page}`;
      const pageLabelW = this.doc.getTextWidth(pageLabel);
      const maxTitleW = colW - indent - pageLabelW - 10;
      let displayTitle = entry.title;
      while (
        displayTitle.length > 10 &&
        this.doc.getTextWidth(displayTitle) > maxTitleW
      ) {
        displayTitle = `${displayTitle.slice(0, -4)}...`;
      }

      const titleX = baseX + indent;
      this.doc.text(displayTitle, titleX, rowY);

      // Pointillés éditoriaux entre titre et numéro de page
      const titleW = this.doc.getTextWidth(displayTitle);
      const dotsStart = titleX + titleW + 2;
      const dotsEnd = baseX + colW - pageLabelW - 2.5;
      if (dotsEnd > dotsStart + 4) {
        this.doc.setDrawColor(...this.theme.borderRgb);
        this.doc.setLineWidth(0.2);
        // Ligne pointillée vectorielle nette
        for (let dx = dotsStart; dx < dotsEnd; dx += 1.8) {
          this.doc.line(dx, rowY - 0.5, Math.min(dx + 0.5, dotsEnd), rowY - 0.5);
        }
      }

      // Numéro de page aligné à droite
      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setTextColor(...(isMain ? this.theme.accentRgb : this.theme.textMutedRgb));
      this.doc.text(pageLabel, baseX + colW, rowY, { align: 'right' });

      // Lien interne cliquable vers la page cible
      if (entry.page >= 1 && entry.page <= totalPages) {
        this.doc.link(baseX, rowY - 3.5, colW, pitch - 0.5, { pageNumber: entry.page });
      }
    });

    this.recordDrawBounds(this.margin, this.topStartY - 4, this.contentWidth, cy + rowsPerCol * pitch);
  }

  /**
   * Passe finale sur toutes les pages : en-têtes discrets et pieds de page au format « Page X / Y ».
   */
  public finalizeHeadersAndFooters(meta: PdfFooterHeaderMeta): void {
    this.pruneTrailingBlankPages();
    this.finalizeTableOfContents();

    const totalPages = this.doc.getNumberOfPages();
    const genDate = meta.generationDate || formatGenerationDateFr();
    const orgSafe = this.safeText(meta.organization || 'DSI');
    const titleSafe = this.safeText(meta.shortTitle || meta.documentTitle);
    const refSafe = meta.reference ? `Réf. ${this.safeText(meta.reference)} · ` : '';
    const confSafe = this.safeText(
      meta.confidentialityText || this.theme.confidentialityLabel
    );

    // Propriétés PDF standard pour lecteurs Acrobat / Chrome / LibreOffice
    this.doc.setProperties({
      title: this.safeText(meta.documentTitle),
      subject: this.safeText(meta.subject || confSafe),
      author: this.safeText(meta.author || orgSafe),
      creator: this.safeText(`${orgSafe} — Système de Documentation SI`),
    });
    this.doc.setDisplayMode('fullwidth', 'continuous');

    for (let p = 1; p <= totalPages; p++) {
      this.doc.setPage(p);

      // En-tête courant (masqué sur page 1 si couverture ou bannière déjà présente en haut)
      const drawHeader = p > 1;
      if (drawHeader) {
        this.doc.setFont(this.fontFamily, 'bold');
        this.doc.setFontSize(7.6);
        this.doc.setTextColor(...this.theme.primaryRgb);
        const leftHeader = `${orgSafe}  |  ${titleSafe}`;
        const leftHeaderFit =
          this.doc.splitTextToSize(leftHeader, this.contentWidth * 0.62)[0] || leftHeader;
        this.doc.text(leftHeaderFit, this.margin, 10.5);

        this.doc.setFont(this.fontFamily, 'normal');
        this.doc.setFontSize(7.4);
        this.doc.setTextColor(...this.theme.textMutedRgb);
        this.doc.text(`${refSafe}Édité le ${genDate}`, this.pageWidth - this.margin, 10.5, {
          align: 'right',
        });

        this.doc.setDrawColor(...this.theme.borderRgb);
        this.doc.setLineWidth(0.25);
        this.doc.line(this.margin, 13, this.pageWidth - this.margin, 13);
      }

      // Pied de page homogène « Page X / Y »
      this.doc.setDrawColor(...this.theme.borderRgb);
      this.doc.setLineWidth(0.25);
      this.doc.line(
        this.margin,
        this.pageHeight - 15,
        this.pageWidth - this.margin,
        this.pageHeight - 15
      );

      this.doc.setFont(this.fontFamily, 'normal');
      this.doc.setFontSize(7.3);
      this.doc.setTextColor(...this.theme.textMutedRgb);
      const leftFooter =
        meta.hasCoverPage && p === 1
          ? `${orgSafe} · ${confSafe}`
          : `${orgSafe} · ${confSafe} · ${genDate}`;
      const leftFooterFit =
        this.doc.splitTextToSize(leftFooter, this.contentWidth - 28)[0] || leftFooter;
      this.doc.text(leftFooterFit, this.margin, this.pageHeight - 10);

      this.doc.setFont(this.fontFamily, 'bold');
      this.doc.setTextColor(...this.theme.primaryRgb);
      this.doc.text(`Page ${p} / ${totalPages}`, this.pageWidth - this.margin, this.pageHeight - 10, {
        align: 'right',
      });
    }
  }

  /**
   * Contrôle qualité automatisé pré-export : vérifie marges, débordements, pages blanches,
   * cohérence du sommaire, pagination et intégrité des caractères accentués.
   */
  public runQualityAudit(): PdfQualityReport {
    const totalPages = this.doc.getNumberOfPages();
    const marginOverflows: Array<{ page: number; detail: string }> = [];
    const blankPagesRemaining: number[] = [];
    const warnings: string[] = [];

    for (let p = 1; p <= totalPages; p++) {
      const st = this._pageStates.get(p);
      if (!st || st.drawCount === 0) {
        blankPagesRemaining.push(p);
        continue;
      }
      if (!st.isCover) {
        if (st.minX < this.margin - 0.8) {
          marginOverflows.push({
            page: p,
            detail: `Débordement marge gauche (${st.minX.toFixed(1)} mm < ${this.margin} mm)`,
          });
        }
        if (st.maxX > this.pageWidth - this.margin + 0.8) {
          marginOverflows.push({
            page: p,
            detail: `Débordement marge droite (${st.maxX.toFixed(1)} mm > ${this.pageWidth - this.margin} mm)`,
          });
        }
        if (st.maxY > this.pageHeight - 14.2) {
          marginOverflows.push({
            page: p,
            detail: `Chevauchement pied de page (maxY=${st.maxY.toFixed(1)} mm)`,
          });
        }
      }
    }

    const tocInvalidEntries = this._tocEntries
      .filter((e) => e.page < 1 || e.page > totalPages)
      .map((e) => `${e.title} -> p.${e.page}`);

    const unsafeCharactersFound = Array.from(this._unsafeChars);
    const fileSizeBytes = this.doc.output('arraybuffer').byteLength;

    if (marginOverflows.length > 0) {
      warnings.push(`${marginOverflows.length} alerte(s) de marge détectée(s).`);
    }
    if (unsafeCharactersFound.length > 0) {
      warnings.push(`Caractères filtrés hors WinAnsi : ${unsafeCharactersFound.join(' ')}`);
    }

    const passed =
      totalPages >= 1 &&
      blankPagesRemaining.length === 0 &&
      marginOverflows.length === 0 &&
      tocInvalidEntries.length === 0;

    return {
      passed,
      totalPages,
      tocEntriesCount: this._tocEntries.length,
      blankPagesRemoved: this._blankPagesRemoved,
      marginOverflows,
      blankPagesRemaining,
      unsafeCharactersFound,
      tocInvalidEntries,
      fileSizeBytes,
      autoRepairs: [...this._autoRepairs],
      warnings,
    };
  }

  /**
   * Finalise le document (sommaire, en-têtes/pieds de page, contrôle qualité) et déclenche
   * le téléchargement universel compatible Ordinateur & Mobile (iOS / Android / PWA / Iframe).
   */
  public finalizeAndSave(filename: string, meta: PdfFooterHeaderMeta): PdfExportResult {
    try {
      this.finalizeHeadersAndFooters(meta);
      const qualityReport = this.runQualityAudit();
      if (!qualityReport.passed) {
        console.warn('[PDF QA]', filename, qualityReport);
      }
      const buffer = this.doc.output('arraybuffer');
      const { filename: safeFilename } = dispatchPdfDownload({
        buffer,
        filename: normalizePdfFilename(filename),
        title: meta.documentTitle,
        pageCount: qualityReport.totalPages,
        fileSizeBytes: qualityReport.fileSizeBytes,
      });
      return {
        filename: safeFilename,
        pageCount: qualityReport.totalPages,
        fileSizeBytes: qualityReport.fileSizeBytes,
        qualityReport,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Échec de génération du document PDF (${filename}) : ${msg}`);
    }
  }

  /**
   * Finalise le document et retourne les octets bruts + rapport qualité sans déclencher de téléchargement DOM.
   */
  public finalizeToBuffer(meta: PdfFooterHeaderMeta): {
    buffer: ArrayBuffer;
    qualityReport: PdfQualityReport;
  } {
    this.finalizeHeadersAndFooters(meta);
    const qualityReport = this.runQualityAudit();
    const buffer = this.doc.output('arraybuffer');
    return { buffer, qualityReport };
  }
}
