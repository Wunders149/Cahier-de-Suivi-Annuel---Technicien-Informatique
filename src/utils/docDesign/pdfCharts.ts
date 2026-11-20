import { RgbColor, sanitizePdfText } from './documentThemes';
import { PdfDocumentBuilder } from './pdfLayoutEngine';

export interface PdfBarSeries {
  name: string;
  values: number[];
  colorRgb?: RgbColor;
}

export interface PdfVerticalBarChartOptions {
  title: string;
  subtitle?: string;
  caption?: string;
  categories: string[];
  series: PdfBarSeries[];
  heightMm?: number;
  valueFormatter?: (v: number) => string;
  yAxisSuffix?: string;
}

export interface PdfHorizontalBarItem {
  label: string;
  value: number;
  maxOrTarget?: number;
  valueText?: string;
  colorRgb?: RgbColor;
}

export interface PdfHorizontalBarChartOptions {
  title: string;
  subtitle?: string;
  caption?: string;
  items: PdfHorizontalBarItem[];
  targetLegendLabel?: string;
  valueLegendLabel?: string;
}

export interface PdfTrendChartOptions {
  title: string;
  subtitle?: string;
  caption?: string;
  labels: string[];
  values: number[];
  seriesLabel: string;
  targetValue?: number;
  targetLabel?: string;
  minY?: number;
  maxY?: number;
  unitSuffix?: string;
  heightMm?: number;
}

export interface PdfDonutSlice {
  label: string;
  value: number;
  colorRgb?: RgbColor;
}

export interface PdfDonutChartOptions {
  title: string;
  subtitle?: string;
  caption?: string;
  centerTopLabel: string;
  centerBottomLabel?: string;
  slices: PdfDonutSlice[];
}

function computeNiceMax(rawMax: number): number {
  if (!Number.isFinite(rawMax) || rawMax <= 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const frac = rawMax / exp;
  let niceFrac = 10;
  if (frac <= 1.2) niceFrac = 1.2;
  else if (frac <= 1.5) niceFrac = 1.5;
  else if (frac <= 2) niceFrac = 2;
  else if (frac <= 2.5) niceFrac = 2.5;
  else if (frac <= 3) niceFrac = 3;
  else if (frac <= 4) niceFrac = 4;
  else if (frac <= 5) niceFrac = 5;
  else if (frac <= 6) niceFrac = 6;
  else if (frac <= 8) niceFrac = 8;
  return niceFrac * exp;
}

function drawChartCardChrome(
  builder: PdfDocumentBuilder,
  title: string,
  subtitle: string | undefined,
  caption: string | undefined,
  totalCardH: number
): { boxY: number; innerTopY: number; innerLeftX: number; innerW: number } {
  const { doc, margin, contentWidth, theme, fontFamily } = builder;
  builder.ensureSpace(totalCardH + 3);
  const boxY = builder.y;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...theme.borderRgb);
  doc.setLineWidth(0.28);
  doc.roundedRect(margin, boxY, contentWidth, totalCardH, 1.8, 1.8, 'FD');

  // Fine barre supérieure accentuée
  doc.setFillColor(...theme.primaryRgb);
  doc.rect(margin, boxY, contentWidth, 1.1, 'F');

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(9.1);
  doc.setTextColor(...theme.primaryRgb);
  doc.text(sanitizePdfText(title), margin + 4.5, boxY + 6.4);

  let innerTopY = boxY + 9.5;
  if (subtitle) {
    doc.setFont(fontFamily, 'italic');
    doc.setFontSize(7.6);
    doc.setTextColor(...theme.textMutedRgb);
    const subFit = doc.splitTextToSize(sanitizePdfText(subtitle), contentWidth - 9)[0] || '';
    doc.text(subFit, margin + 4.5, boxY + 10.6);
    innerTopY = boxY + 13.5;
  }

  if (caption) {
    doc.setFont(fontFamily, 'italic');
    doc.setFontSize(7.2);
    doc.setTextColor(...theme.textMutedRgb);
    const capFit = doc.splitTextToSize(sanitizePdfText(caption), contentWidth - 9)[0] || '';
    doc.text(capFit, margin + 4.5, boxY + totalCardH - 2.8);
  }

  builder.recordDrawBounds(margin, boxY, contentWidth, totalCardH);
  return {
    boxY,
    innerTopY,
    innerLeftX: margin + 4.5,
    innerW: contentWidth - 9,
  };
}

/**
 * Graphique vectoriel en barres verticales (simple ou groupées) avec légende, grille Y et étiquettes.
 */
export function drawVerticalBarChart(
  builder: PdfDocumentBuilder,
  options: PdfVerticalBarChartOptions
): void {
  const { doc, theme, fontFamily } = builder;
  const cats = options.categories || [];
  const series = options.series || [];
  if (cats.length === 0 || series.length === 0) return;

  const plotH = options.heightMm ?? 38;
  const legendH = series.length > 1 ? 6 : 2;
  const captionH = options.caption ? 5.5 : 1.5;
  const headerH = options.subtitle ? 13.5 : 9.5;
  const xLabelH = 8.5;
  const totalCardH = headerH + legendH + plotH + xLabelH + captionH + 3;

  const { boxY, innerTopY, innerLeftX, innerW } = drawChartCardChrome(
    builder,
    options.title,
    options.subtitle,
    options.caption,
    totalCardH
  );

  // Légende alignée à droite si multi-séries
  const palette = theme.editorial.chartPaletteRgb;
  if (series.length > 1) {
    let lx = innerLeftX + innerW;
    const ly = innerTopY + 1.5;
    for (let s = series.length - 1; s >= 0; s--) {
      const color = series[s].colorRgb || palette[s % palette.length];
      const lbl = sanitizePdfText(series[s].name);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(7.2);
      const lblW = doc.getTextWidth(lbl);
      lx -= lblW;
      doc.setTextColor(...theme.textBodyRgb);
      doc.text(lbl, lx, ly);
      lx -= 4.2;
      doc.setFillColor(...color);
      doc.rect(lx, ly - 2.3, 2.8, 2.5, 'F');
      lx -= 5;
    }
  }

  const allValues = series.flatMap((s) => s.values.map((v) => Math.max(0, Number(v) || 0)));
  const rawMax = Math.max(1, ...allValues);
  const maxVal = computeNiceMax(rawMax);
  const fmt = options.valueFormatter || ((v: number) => `${Math.round(v)}${options.yAxisSuffix || ''}`);

  const yAxisW = 16;
  const plotX = innerLeftX + yAxisW;
  const plotW = innerW - yAxisW - 2;
  const plotY = innerTopY + legendH;

  // Grille horizontale (4 paliers)
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const ratio = i / ticks;
    const ty = plotY + plotH - ratio * plotH;
    doc.setDrawColor(...(i === 0 ? theme.textMutedRgb : theme.borderRgb));
    doc.setLineWidth(i === 0 ? 0.3 : 0.16);
    doc.line(plotX, ty, plotX + plotW, ty);

    const tickVal = (maxVal * i) / ticks;
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...theme.textMutedRgb);
    doc.text(sanitizePdfText(fmt(tickVal)), plotX - 1.8, ty + 1, { align: 'right' });
  }

  const groupW = plotW / cats.length;
  const barGap = series.length > 1 ? 0.9 : 0;
  const barMaxTotalW = Math.min(groupW * 0.72, series.length * 9);
  const singleBarW = Math.max(1.8, (barMaxTotalW - barGap * (series.length - 1)) / series.length);

  cats.forEach((cat, cIdx) => {
    const groupCenterX = plotX + cIdx * groupW + groupW / 2;
    const totalBarsW = singleBarW * series.length + barGap * (series.length - 1);
    const startBarX = groupCenterX - totalBarsW / 2;

    series.forEach((ser, sIdx) => {
      const val = Math.max(0, Number(ser.values[cIdx]) || 0);
      const bh = (val / maxVal) * plotH;
      const bx = startBarX + sIdx * (singleBarW + barGap);
      const by = plotY + plotH - bh;
      const color = ser.colorRgb || palette[sIdx % palette.length];

      if (bh > 0.2) {
        doc.setFillColor(...color);
        doc.rect(bx, by, singleBarW, bh, 'F');
      }

      // Étiquette de valeur au-dessus si lisible sans collision
      if (val > 0 && cats.length <= 12 && series.length <= 2) {
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(cats.length > 8 ? 5.8 : 6.4);
        doc.setTextColor(...theme.textDarkRgb);
        doc.text(sanitizePdfText(fmt(val)), bx + singleBarW / 2, Math.max(plotY + 2.5, by - 1), {
          align: 'center',
        });
      }
    });

    // Étiquette catégorie X
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(cats.length > 10 ? 6.2 : 6.9);
    doc.setTextColor(...theme.textBodyRgb);
    const catSafe = sanitizePdfText(cat);
    const catFit = doc.splitTextToSize(catSafe, Math.max(8, groupW - 1))[0] || catSafe;
    doc.text(catFit, groupCenterX, plotY + plotH + 4.3, { align: 'center' });
  });

  builder.y = boxY + totalCardH + 4.5;
}

/**
 * Graphique vectoriel en barres horizontales avec barre de référence/objectif optionnelle.
 */
export function drawHorizontalBarChart(
  builder: PdfDocumentBuilder,
  options: PdfHorizontalBarChartOptions
): void {
  const { doc, theme, fontFamily } = builder;
  const items = (options.items || []).slice(0, 10);
  if (items.length === 0) return;

  const hasTargets = items.some((i) => (i.maxOrTarget ?? 0) > 0);
  const headerH = options.subtitle ? 13.5 : 9.5;
  const legendH = hasTargets && options.targetLegendLabel ? 5.5 : 1.5;
  const rowPitch = 6.8;
  const captionH = options.caption ? 5.5 : 1.5;
  const totalCardH = headerH + legendH + items.length * rowPitch + captionH + 3;

  const { boxY, innerTopY, innerLeftX, innerW } = drawChartCardChrome(
    builder,
    options.title,
    options.subtitle,
    options.caption,
    totalCardH
  );

  if (hasTargets && options.targetLegendLabel) {
    let rx = innerLeftX + innerW;
    const ly = innerTopY + 1;
    const tLbl = sanitizePdfText(options.targetLegendLabel);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...theme.textMutedRgb);
    rx -= doc.getTextWidth(tLbl);
    doc.text(tLbl, rx, ly);
    rx -= 4;
    doc.setFillColor(...theme.lightBgRgb);
    doc.setDrawColor(...theme.borderRgb);
    doc.rect(rx, ly - 2.3, 2.8, 2.4, 'FD');
    rx -= 6;

    const vLbl = sanitizePdfText(options.valueLegendLabel || 'Réalisé');
    rx -= doc.getTextWidth(vLbl);
    doc.setTextColor(...theme.textBodyRgb);
    doc.text(vLbl, rx, ly);
    rx -= 4;
    doc.setFillColor(...theme.accentRgb);
    doc.rect(rx, ly - 2.3, 2.8, 2.4, 'F');
  }

  const maxVal = computeNiceMax(
    Math.max(1, ...items.map((it) => Math.max(it.value, it.maxOrTarget ?? 0)))
  );
  const labelW = Math.min(54, innerW * 0.34);
  const valueColW = 24;
  const trackX = innerLeftX + labelW + 2;
  const trackW = innerW - labelW - valueColW - 4;

  const palette = theme.editorial.chartPaletteRgb;
  let cy = innerTopY + legendH + 1;

  items.forEach((it, idx) => {
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...theme.textDarkRgb);
    const lblSafe = sanitizePdfText(it.label);
    const lblFit = doc.splitTextToSize(lblSafe, labelW)[0] || lblSafe;
    doc.text(lblFit, innerLeftX, cy + 3.1);

    // Piste de fond / cible
    doc.setFillColor(...theme.lightBgRgb);
    doc.roundedRect(trackX, cy + 0.5, trackW, 3.6, 0.8, 0.8, 'F');

    if ((it.maxOrTarget ?? 0) > 0) {
      const targetW = Math.min(trackW, ((it.maxOrTarget as number) / maxVal) * trackW);
      doc.setDrawColor(...theme.textMutedRgb);
      doc.setLineWidth(0.35);
      doc.line(trackX + targetW, cy, trackX + targetW, cy + 4.6);
    }

    const fillW = Math.min(trackW, Math.max(0, (it.value / maxVal) * trackW));
    const color = it.colorRgb || palette[idx % palette.length];
    if (fillW > 0.3) {
      doc.setFillColor(...color);
      doc.roundedRect(trackX, cy + 0.5, fillW, 3.6, 0.8, 0.8, 'F');
    }

    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(7.3);
    doc.setTextColor(...theme.primaryRgb);
    const valTxt = sanitizePdfText(it.valueText ?? String(it.value));
    doc.text(valTxt, innerLeftX + innerW, cy + 3.1, { align: 'right' });

    cy += rowPitch;
  });

  builder.y = boxY + totalCardH + 4.5;
}

/**
 * Graphique linéaire vectoriel d'évolution (FCR %, disponibilité, SLA) avec seuil cible optionnel.
 */
export function drawTrendLineChart(
  builder: PdfDocumentBuilder,
  options: PdfTrendChartOptions
): void {
  const { doc, theme, fontFamily } = builder;
  const labels = options.labels || [];
  const values = options.values || [];
  if (labels.length < 2 || values.length < 2) return;

  const plotH = options.heightMm ?? 34;
  const headerH = options.subtitle ? 13.5 : 9.5;
  const captionH = options.caption ? 5.5 : 1.5;
  const totalCardH = headerH + 5 + plotH + 8 + captionH + 3;

  const { boxY, innerTopY, innerLeftX, innerW } = drawChartCardChrome(
    builder,
    options.title,
    options.subtitle,
    options.caption,
    totalCardH
  );

  const minY = options.minY ?? 0;
  const maxY = options.maxY ?? computeNiceMax(Math.max(...values, options.targetValue ?? 0, 10));
  const rangeY = Math.max(1, maxY - minY);
  const unit = options.unitSuffix || '';

  const yAxisW = 13;
  const plotX = innerLeftX + yAxisW;
  const plotW = innerW - yAxisW - 3;
  const plotY = innerTopY + 4;

  // Grille horizontale
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const ty = plotY + plotH - (i / ticks) * plotH;
    doc.setDrawColor(...(i === 0 ? theme.textMutedRgb : theme.borderRgb));
    doc.setLineWidth(i === 0 ? 0.3 : 0.16);
    doc.line(plotX, ty, plotX + plotW, ty);

    const tv = Math.round(minY + (rangeY * i) / ticks);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...theme.textMutedRgb);
    doc.text(`${tv}${unit}`, plotX - 1.5, ty + 1, { align: 'right' });
  }

  // Ligne de seuil cible en pointillés
  if (options.targetValue !== undefined && options.targetValue >= minY && options.targetValue <= maxY) {
    const targetY = plotY + plotH - ((options.targetValue - minY) / rangeY) * plotH;
    doc.setDrawColor(...theme.successRgb);
    doc.setLineWidth(0.32);
    for (let dx = plotX; dx < plotX + plotW; dx += 3) {
      doc.line(dx, targetY, Math.min(dx + 1.6, plotX + plotW), targetY);
    }
    if (options.targetLabel) {
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(6.4);
      doc.setTextColor(...theme.successRgb);
      doc.text(sanitizePdfText(options.targetLabel), plotX + plotW, targetY - 1.2, {
        align: 'right',
      });
    }
  }

  // Points et courbe vectorielle
  const stepX = plotW / Math.max(1, labels.length - 1);
  const points = values.map((v, idx) => {
    const clamped = Math.min(maxY, Math.max(minY, Number(v) || 0));
    const px = plotX + idx * stepX;
    const py = plotY + plotH - ((clamped - minY) / rangeY) * plotH;
    return { px, py, val: clamped };
  });

  doc.setDrawColor(...theme.accentRgb);
  doc.setLineWidth(0.65);
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i].px, points[i].py, points[i + 1].px, points[i + 1].py);
  }

  points.forEach((pt, idx) => {
    doc.setFillColor(...theme.primaryRgb);
    doc.circle(pt.px, pt.py, 1.05, 'F');

    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(6.3);
    doc.setTextColor(...theme.primaryRgb);
    doc.text(`${Math.round(pt.val)}${unit}`, pt.px, Math.max(plotY + 2, pt.py - 2), {
      align: 'center',
    });

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(labels.length > 10 ? 6.1 : 6.8);
    doc.setTextColor(...theme.textBodyRgb);
    doc.text(sanitizePdfText(labels[idx]), pt.px, plotY + plotH + 4.3, { align: 'center' });
  });

  builder.y = boxY + totalCardH + 4.5;
}

/**
 * Anneau vectoriel synthétique (Donut) + légende quantitative détaillée à droite.
 */
export function drawDonutSummaryChart(
  builder: PdfDocumentBuilder,
  options: PdfDonutChartOptions
): void {
  const { doc, theme, fontFamily } = builder;
  const nonZero = (options.slices || []).filter((s) => s.value > 0);
  const total = nonZero.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return;

  const palette = theme.editorial.chartPaletteRgb;
  const headerH = options.subtitle ? 13.5 : 9.5;
  const ringR = 16;
  const innerR = 9.2;
  const legendRowsH = nonZero.length * 6.2 + 4;
  const bodyH = Math.max(ringR * 2 + 4, legendRowsH);
  const captionH = options.caption ? 5.5 : 1.5;
  const totalCardH = headerH + bodyH + captionH + 4;

  const { boxY, innerTopY, innerLeftX, innerW } = drawChartCardChrome(
    builder,
    options.title,
    options.subtitle,
    options.caption,
    totalCardH
  );

  const cx = innerLeftX + ringR + 8;
  const cy = innerTopY + bodyH / 2;

  let startAngle = -Math.PI / 2;
  nonZero.forEach((slice, idx) => {
    const color = slice.colorRgb || palette[idx % palette.length];
    const sweep = (slice.value / total) * Math.PI * 2;
    const steps = Math.max(6, Math.ceil((sweep / (Math.PI * 2)) * 48));
    const stepAngle = sweep / steps;

    doc.setFillColor(...color);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.1);
    for (let s = 0; s < steps; s++) {
      const a1 = startAngle + s * stepAngle;
      const a2 = startAngle + (s + 1) * stepAngle;
      doc.triangle(
        cx,
        cy,
        cx + Math.cos(a1) * ringR,
        cy + Math.sin(a1) * ringR,
        cx + Math.cos(a2) * ringR,
        cy + Math.sin(a2) * ringR,
        'FD'
      );
    }
    startAngle += sweep;
  });

  // Centre creux blanc + KPI central
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, innerR, 'F');

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...theme.primaryRgb);
  doc.text(sanitizePdfText(options.centerTopLabel), cx, cy + (options.centerBottomLabel ? 0.5 : 1.5), {
    align: 'center',
  });

  if (options.centerBottomLabel) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...theme.textMutedRgb);
    doc.text(sanitizePdfText(options.centerBottomLabel), cx, cy + 4.8, { align: 'center' });
  }

  // Légende détaillée à droite
  const legX = cx + ringR + 12;
  const legW = innerLeftX + innerW - legX;
  let ly = innerTopY + Math.max(2, (bodyH - nonZero.length * 6.2) / 2) + 2;

  nonZero.forEach((slice, idx) => {
    const color = slice.colorRgb || palette[idx % palette.length];
    const pct = Math.round((slice.value / total) * 100);

    doc.setFillColor(...color);
    doc.roundedRect(legX, ly - 2.6, 3, 3, 0.5, 0.5, 'F');

    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...theme.textDarkRgb);
    const lblFit = doc.splitTextToSize(sanitizePdfText(slice.label), legW - 26)[0] || '';
    doc.text(lblFit, legX + 5, ly);

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(...theme.textMutedRgb);
    doc.text(`${slice.value} (${pct}%)`, legX + legW, ly, { align: 'right' });

    ly += 6.2;
  });

  builder.y = boxY + totalCardH + 4.5;
}
