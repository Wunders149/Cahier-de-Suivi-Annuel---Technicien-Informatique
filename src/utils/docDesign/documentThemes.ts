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

export interface DocumentThemePalette {
  category: DocumentCategory;
  categoryBadge: string;
  confidentialityLabel: string;
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
  accentHex: string
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

  return {
    category,
    categoryBadge,
    confidentialityLabel,
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
    primaryRgb: hexToRgb(primaryHex),
    secondaryRgb: hexToRgb(secondaryHex),
    accentRgb: hexToRgb(accentHex),
    lightBgRgb: hexToRgb(lightBgHex),
    zebraBgRgb: hexToRgb(zebraBgHex),
    borderRgb: hexToRgb(borderHex),
    textDarkRgb: hexToRgb(textDarkHex),
    textBodyRgb: hexToRgb(textBodyHex),
    textMutedRgb: hexToRgb(textMutedHex),
    successRgb: hexToRgb(successHex),
    warningRgb: hexToRgb(warningHex),
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
    '0284C7'
  ),
  monthly_report: buildTheme(
    'monthly_report',
    'RAPPORT MENSUEL D\'ACTIVITÉ IT',
    'Livrable Mensuel Officiel — Suivi d\'Exploitation SI',
    '0F2A4A',
    '0369A1',
    '0D9488'
  ),
  technical_incident: buildTheme(
    'technical_incident',
    'RAPPORT TECHNIQUE D\'INTERVENTION',
    'Document Technique — Support & Résolution d\'Incident',
    '0F2A4A',
    '1D4ED8',
    '0284C7'
  ),
  technical_deployment: buildTheme(
    'technical_deployment',
    'PROCÈS-VERBAL DE DÉPLOIEMENT & MISE EN SERVICE',
    'Document Technique — Déploiement & Recette Opérationnelle',
    '0F2A4A',
    '0F766E',
    '0284C7'
  ),
  technical_maintenance: buildTheme(
    'technical_maintenance',
    'RAPPORT DE MAINTENANCE PRÉVENTIVE & CONTRÔLE',
    'Document Technique — Maintien en Condition Opérationnelle',
    '1E293B',
    '3730A3',
    '0284C7'
  ),
  official_letter: buildTheme(
    'official_letter',
    'CORRESPONDANCE OFFICIELLE',
    'Correspondance Administrative & Technique',
    '0F2A4A',
    '334155',
    '1E3A8A'
  ),
  management_table: buildTheme(
    'management_table',
    'TABLEAU DE SUIVI & GESTION',
    'Registre de Suivi Opérationnel',
    '0F2A4A',
    '1E3A8A',
    '0369A1'
  ),
  attestation: buildTheme(
    'attestation',
    'ATTESTATION & CERTIFICAT DE CONFORMITÉ',
    'Attestation Officielle DSI',
    '0F2A4A',
    '065F46',
    '0284C7'
  ),
  invoice_quote: buildTheme(
    'invoice_quote',
    'ESTIMATION BUDGÉTAIRE & CHIFFRAGE',
    'Document Financier & Investissement IT',
    '0F2A4A',
    '1E3A8A',
    '0284C7'
  ),
};

export function getDocumentTheme(category: DocumentCategory): DocumentThemePalette {
  return DOCUMENT_THEMES[category] || DOCUMENT_THEMES.annual_workbook;
}

/**
 * Normalise un texte pour jsPDF (encodage WinAnsi Helvetica sans glyphes cassés).
 * Remplace notamment les espaces insécables étroites (\u202F) produites par
 * Number.toLocaleString('fr-FR'), les flèches et ligatures non WinAnsi.
 */
export function sanitizePdfText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const raw = String(value);
  if (!raw.trim()) return '—';

  return raw
    // Espaces insécables / étroites -> espace ASCII standard
    .replace(/[\u00A0\u2007\u202F\u2009\u200B-\u200D\uFEFF]/g, ' ')
    // Ligatures et caractères spéciaux hors WinAnsi standard
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↔/g, '<->')
    .replace(/⇒/g, '=>')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≈/g, '~')
    .replace(/€ /g, 'EUR ')
    .replace(/€/g, 'EUR')
    .replace(/[✓✔]/g, '[OK]')
    .replace(/[✗✘]/g, '[X]')
    .replace(/[⚠⚡]/g, '[!]')
    // Caractères de contrôle interdits (hors \n et \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Emojis / paires de substitution hors BMP
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .trim();
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
 * Date de génération du document formatée en français (JJ/MM/AAAA).
 */
export function formatGenerationDateFr(date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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
    /résolu|atteint|conforme|succès|validé|approuvé|en ligne|en production|clôturé avec succès|terminé|opérationnel|livré|reçu|oui/.test(
      s
    )
  ) {
    return 'success';
  }
  if (
    /critique|échec|hors ligne|rupture|non résolu|sous-licencié|anormalement bas|non exécuté|expire/.test(
      s
    )
  ) {
    return 'danger';
  }
  if (
    /en cours|partiel|alerte|avertissement|stock bas|à traiter|escaladé|en attente|reporté|dégradé|brouillon|prêt/.test(
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
