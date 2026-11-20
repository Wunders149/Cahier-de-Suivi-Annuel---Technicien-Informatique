/**
 * Charte éditoriale centralisée, thèmes par type de document et utilitaires de normalisation
 * pour l'ensemble des exports PDF et Word (.docx).
 */

export type DocumentCategory =
  | 'annual_workbook'
  | 'monthly_report'
  | 'technical_incident'
  | 'technical_deployment'
  | 'technical_maintenance'
  | 'official_letter'
  | 'management_table'
  | 'attestation'
  | 'invoice_quote';

export type RgbColor = [number, number, number];

export interface EditorialProfile {
  coverStyle: 'full_cover' | 'executive_banner';
  useTocByDefault: boolean;
  fontFamily: 'helvetica' | 'times';
  chartPaletteRgb: RgbColor[];
}

export interface DocumentThemePalette {
  category: DocumentCategory;
  categoryBadge: string;
  confidentialityLabel: string;
  editorial: EditorialProfile;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  lightBgHex: string;
  zebraBgHex: string;
  borderHex: string;
  textDarkHex: string;
  textBodyHex: string;
  textMutedHex: string;
  successHex: string;
  warningHex: string;
  dangerHex: string;
  primaryRgb: RgbColor;
  secondaryRgb: RgbColor;
  accentRgb: RgbColor;
  lightBgRgb: RgbColor;
  zebraBgRgb: RgbColor;
  borderRgb: RgbColor;
  textDarkRgb: RgbColor;
  textBodyRgb: RgbColor;
  textMutedRgb: RgbColor;
  successRgb: RgbColor;
  warningRgb: RgbColor;
  dangerRgb: RgbColor;
}

function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return [r, g, b];
}

function buildTheme(
  category: DocumentCategory,
  categoryBadge: string,
  confidentialityLabel: string,
  primaryHex: string,
  secondaryHex: string,
  accentHex: string,
  editorialOverrides?: Partial<EditorialProfile>
): DocumentThemePalette {
  const lightBgHex = 'F1F5F9';
  const zebraBgHex = 'F8FAFC';
  const borderHex = 'CBD5E1';
  const textDarkHex = '0F172A';
  const textBodyHex = '334155';
  const textMutedHex = '64748B';
  const successHex = '15803D';
  const warningHex = 'B45309';
  const dangerHex = 'B91C1C';

  const primaryRgb = hexToRgb(primaryHex);
  const secondaryRgb = hexToRgb(secondaryHex);
  const accentRgb = hexToRgb(accentHex);
  const successRgb = hexToRgb(successHex);
  const warningRgb = hexToRgb(warningHex);

  const editorial: EditorialProfile = {
    coverStyle: editorialOverrides?.coverStyle ?? 'executive_banner',
    useTocByDefault: editorialOverrides?.useTocByDefault ?? false,
    fontFamily: editorialOverrides?.fontFamily ?? 'helvetica',
    chartPaletteRgb: editorialOverrides?.chartPaletteRgb ?? [
      primaryRgb,
      accentRgb,
      successRgb,
      warningRgb,
      secondaryRgb,
    ],
  };

  return {
    category,
    categoryBadge,
    confidentialityLabel,
    editorial,
    primaryHex,
    secondaryHex,
    accentHex,
    lightBgHex,
    zebraBgHex,
    borderHex,
    textDarkHex,
    textBodyHex,
    textMutedHex,
    successHex,
    warningHex,
    dangerHex,
    primaryRgb,
    secondaryRgb,
    accentRgb,
    lightBgRgb: hexToRgb(lightBgHex),
    zebraBgRgb: hexToRgb(zebraBgHex),
    borderRgb: hexToRgb(borderHex),
    textDarkRgb: hexToRgb(textDarkHex),
    textBodyRgb: hexToRgb(textBodyHex),
    textMutedRgb: hexToRgb(textMutedHex),
    successRgb,
    warningRgb,
    dangerRgb: hexToRgb(dangerHex),
  };
}

export const DOCUMENT_THEMES: Record<DocumentCategory, DocumentThemePalette> = {
  annual_workbook: buildTheme(
    'annual_workbook',
    'CAHIER DE SUIVI ANNUEL & PILOTAGE SI',
    'Document Interne Confidentiel — Direction des Systèmes d\'Information',
    '0F2A4A',
    '1E3A8A',
    '0284C7',
    { coverStyle: 'full_cover', useTocByDefault: true }
  ),
  monthly_report: buildTheme(
    'monthly_report',
    'RAPPORT MENSUEL D\'ACTIVITÉ IT',
    'Livrable Mensuel Officiel — Suivi d\'Exploitation SI',
    '0F2A4A',
    '0369A1',
    '0D9488',
    { coverStyle: 'full_cover', useTocByDefault: true }
  ),
  technical_incident: buildTheme(
    'technical_incident',
    'RAPPORT TECHNIQUE D\'INTERVENTION',
    'Document Technique — Support & Résolution d\'Incident',
    '0F2A4A',
    '1D4ED8',
    '0284C7',
    { coverStyle: 'executive_banner', useTocByDefault: false }
  ),
  technical_deployment: buildTheme(
    'technical_deployment',
    'PROCÈS-VERBAL DE DÉPLOIEMENT & MISE EN SERVICE',
    'Document Technique — Déploiement & Recette Opérationnelle',
    '0F2A4A',
    '0F766E',
    '0284C7',
    { coverStyle: 'executive_banner', useTocByDefault: false }
  ),
  technical_maintenance: buildTheme(
    'technical_maintenance',
    'RAPPORT DE MAINTENANCE PRÉVENTIVE & CONTRÔLE',
    'Document Technique — Maintien en Condition Opérationnelle',
    '1E293B',
    '3730A3',
    '0284C7',
    { coverStyle: 'executive_banner', useTocByDefault: false }
  ),
  official_letter: buildTheme(
    'official_letter',
    'CORRESPONDANCE OFFICIELLE',
    'Correspondance Administrative & Technique',
    '0F2A4A',
    '334155',
    '1E3A8A',
    { coverStyle: 'executive_banner', useTocByDefault: false, fontFamily: 'times' }
  ),
  management_table: buildTheme(
    'management_table',
    'TABLEAU DE SUIVI & GESTION',
    'Registre de Suivi Opérationnel',
    '0F2A4A',
    '1E3A8A',
    '0369A1',
    { coverStyle: 'executive_banner', useTocByDefault: false }
  ),
  attestation: buildTheme(
    'attestation',
    'ATTESTATION & CERTIFICAT DE CONFORMITÉ',
    'Attestation Officielle DSI',
    '0F2A4A',
    '065F46',
    '0284C7',
    { coverStyle: 'executive_banner', useTocByDefault: false, fontFamily: 'times' }
  ),
  invoice_quote: buildTheme(
    'invoice_quote',
    'ANALYSE FINANCIÈRE, BUDGET & ROI IT',
    'Document Financier & Investissement IT — Confidentiel Direction',
    '0F2A4A',
    '065F46',
    '0284C7',
    { coverStyle: 'full_cover', useTocByDefault: true }
  ),
};

export function getDocumentTheme(category: DocumentCategory): DocumentThemePalette {
  return DOCUMENT_THEMES[category] || DOCUMENT_THEMES.annual_workbook;
}

// Caractères WinAnsi (Windows-1252) > 0xFF nativement supportés par jsPDF v4 Helvetica/Times
const WINANSI_EXTENDED_CHARS = new Set([
  '€', '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š', '‹', 'Œ', 'Ž',
  '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ', 'ž', 'Ÿ',
]);

/**
 * Normalise un texte pour jsPDF (encodage WinAnsi / Windows-1252 avec conservation intégrale
 * des accents français et caractères éditoriaux `œ`, `€`, `•`, `–`, `—`, `’`, `«`, `»`, `…`).
 * Supprime les espaces insécables étroites (\u202F), emojis et glyphes hors WinAnsi.
 */
export function sanitizePdfText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const raw = String(value);
  if (!raw.trim()) return '—';

  const normalized = raw
    // Espaces insécables / étroites -> espace ASCII standard
    .replace(/[\u00A0\u2007\u202F\u2009\u2002-\u2006\u2008\u200A]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Puces & flèches hors WinAnsi -> équivalents propres
    .replace(/[▪▫‣◦●○◆◇]/g, '•')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↔/g, '<->')
    .replace(/⇒/g, '=>')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠/g, '!=')
    .replace(/≈/g, '~')
    .replace(/[✓✔☑]/g, '[OK]')
    .replace(/[✗✘☒]/g, '[X]')
    .replace(/[⚠⚡]/g, '[!]')
    // Caractères de contrôle interdits (hors \n et \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Emojis / paires de substitution hors BMP
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ');

  // Filtrer tout caractère résiduel > 0xFF qui ne fait pas partie de WinAnsi
  let safe = '';
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const code = ch.charCodeAt(0);
    if (code <= 0xff || WINANSI_EXTENDED_CHARS.has(ch)) {
      safe += ch;
    }
  }

  return safe.trim() || '—';
}

/**
 * Détecte d'éventuels caractères résiduels non supportés par WinAnsi dans une chaîne déjà destinée au PDF.
 */
export function findUnsafePdfChars(text: string): string[] {
  const bad: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    if (
      (code < 0x20 && ch !== '\n' && ch !== '\r') ||
      (code > 0xff && !WINANSI_EXTENDED_CHARS.has(ch))
    ) {
      bad.push(ch);
    }
  }
  return Array.from(new Set(bad));
}

/**
 * Insère des points de césure souples dans les jetons très longs sans espaces (URL, MAC, séries)
 * afin d'éviter tout débordement hors cellule dans les tableaux étroits.
 */
export function wrapLongTokensForPdf(text: string, maxTokenLen = 28): string {
  if (!text || text.length <= maxTokenLen) return text;
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part.length <= maxTokenLen) return part;
      // Coupe proprement après /, -, _, . ou par tranches
      const chunks: string[] = [];
      let remaining = part;
      while (remaining.length > maxTokenLen) {
        let cut = -1;
        for (let i = maxTokenLen; i >= Math.floor(maxTokenLen * 0.55); i--) {
          if ('/_-.=:'.includes(remaining[i])) {
            cut = i + 1;
            break;
          }
        }
        if (cut <= 0) cut = maxTokenLen;
        chunks.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut);
      }
      if (remaining) chunks.push(remaining);
      return chunks.join(' ');
    })
    .join('');
}

/**
 * Normalise un texte pour OOXML (.docx) afin de garantir l'ouverture sans erreur
 * sous Microsoft Word et LibreOffice Writer.
 */
export function sanitizeDocxText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const raw = String(value);
  if (!raw.trim()) return '—';

  return raw
    .replace(/\u202F/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Formate un montant en Ariary avec séparateur de milliers propre.
 */
export function formatAriary(amount: number | undefined | null, forPdf = false): string {
  const rounded = Math.round(Number(amount) || 0);
  const formatted = rounded.toLocaleString('fr-FR').replace(/[\u00A0\u202F]/g, ' ');
  const result = `${formatted} Ar`;
  return forPdf ? sanitizePdfText(result) : result;
}

/**
 * Formate un montant compact pour axes de graphiques PDF (ex: 12,5 M Ar, 450 k Ar).
 */
export function formatCompactAriaryPdf(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return sanitizePdfText(`${sign}${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} Md`);
  }
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return sanitizePdfText(`${sign}${m >= 10 ? Math.round(m) : m.toFixed(1).replace('.', ',')} M`);
  }
  if (abs >= 1_000) {
    return sanitizePdfText(`${sign}${Math.round(abs / 1_000)} k`);
  }
  return sanitizePdfText(`${Math.round(amount)}`);
}

/**
 * Date de génération du document formatée en français (JJ/MM/AAAA).
 */
export function formatGenerationDateFr(date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Date éditoriale longue en français (ex: 20 novembre 2026).
 */
export function formatEditorialDateFr(date = new Date()): string {
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];
  return `${date.getDate()} ${months[date.getMonth()] || ''} ${date.getFullYear()}`;
}

/**
 * Extrait un monogramme typographique (2 à 3 lettres) pour l'en-tête organisationnel.
 */
export function getOrganizationMonogram(orgName?: string): string {
  const clean = sanitizePdfText(orgName || '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .trim();
  if (!clean || clean === '—') return 'DSI';

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0].toUpperCase())
      .join('');
  }
  const single = words[0].toUpperCase();
  if (single.length <= 3) return single;
  return single.slice(0, 3);
}

export interface StructuredTextBlock {
  type: 'paragraph' | 'bullet' | 'numbered';
  text: string;
  marker?: string;
}

/**
 * Analyse un texte multi-lignes pour détecter paragraphes, puces (-, •, *) et listes numérotées (1., 2)).
 */
export function parseStructuredText(rawText: string, forPdf = false): StructuredTextBlock[] {
  const clean = (forPdf ? sanitizePdfText(rawText) : sanitizeDocxText(rawText)) || '—';
  const lines = clean.split('\n');
  const blocks: StructuredTextBlock[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphBuffer.join(' ') });
      paragraphBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const bulletMatch = line.match(/^(?:[-•*▪‣])\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      blocks.push({ type: 'bullet', text: bulletMatch[1].trim(), marker: '•' });
      continue;
    }

    const numMatch = line.match(/^(\d+[.)])\s+(.+)$/);
    if (numMatch) {
      flushParagraph();
      blocks.push({ type: 'numbered', text: numMatch[2].trim(), marker: numMatch[1] });
      continue;
    }

    // Ligne autonome courte ou titre intermédiaire -> préserver comme paragraphe distinct si le buffer existe déjà
    if (paragraphBuffer.length > 0 && /[:.!?]$/.test(paragraphBuffer[paragraphBuffer.length - 1])) {
      flushParagraph();
    }
    paragraphBuffer.push(line);
  }

  flushParagraph();

  if (blocks.length === 0) {
    return [{ type: 'paragraph', text: '—' }];
  }
  return blocks;
}

/**
 * Contrôle qualité pré-export : normalise un tableau de largeurs en % pour qu'il totalise exactement 100.
 */
export function normalizeColumnWidthsPct(widths: number[]): number[] {
  if (!widths || widths.length === 0) return [100];
  const safe = widths.map((w) => (Number.isFinite(w) && w > 0 ? w : 10));
  const sum = safe.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const equal = Math.floor(100 / safe.length);
    return safe.map((_, i) => (i === 0 ? 100 - equal * (safe.length - 1) : equal));
  }
  const scaled = safe.map((w) => Math.round((w / sum) * 1000) / 10);
  const scaledSum = scaled.reduce((a, b) => a + b, 0);
  const diff = Math.round((100 - scaledSum) * 10) / 10;
  if (diff !== 0) {
    scaled[0] = Math.round((scaled[0] + diff) * 10) / 10;
  }
  return scaled;
}

export type SemanticTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/**
 * Détermine le ton sémantique d'un statut métier (tableaux, badges, résultats).
 */
export function getStatusTone(statusValue?: string): SemanticTone {
  const s = (statusValue || '').toLowerCase();
  if (
    /résolu|atteint|conforme|succès|validé|approuvé|en ligne|en production|clôturé|terminé|opérationnel|livré|reçu|oui|réalisé/.test(
      s
    )
  ) {
    return 'success';
  }
  if (
    /critique|échec|hors ligne|rupture|non résolu|sous-licencié|anormalement bas|non exécuté|expire|rebut|obsolète/.test(
      s
    )
  ) {
    return 'danger';
  }
  if (
    /en cours|partiel|alerte|avertissement|stock bas|à traiter|escaladé|en attente|reporté|dégradé|brouillon|prêt|à faire|à réaliser/.test(
      s
    )
  ) {
    return 'warning';
  }
  if (/planifié|commandé|surveillance|information/.test(s)) {
    return 'info';
  }
  return 'neutral';
}

export function getToneColors(
  tone: SemanticTone,
  theme: DocumentThemePalette
): { hex: string; rgb: RgbColor } {
  switch (tone) {
    case 'success':
      return { hex: theme.successHex, rgb: theme.successRgb };
    case 'warning':
      return { hex: theme.warningHex, rgb: theme.warningRgb };
    case 'danger':
      return { hex: theme.dangerHex, rgb: theme.dangerRgb };
    case 'info':
      return { hex: theme.accentHex, rgb: theme.accentRgb };
    default:
      return { hex: theme.textBodyHex, rgb: theme.textBodyRgb };
  }
}

export function sanitizeFileSlug(text: string): string {
  return (text || 'document')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}
