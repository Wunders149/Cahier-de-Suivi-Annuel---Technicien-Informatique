export type RoiCurrency = 'Ar' | 'EUR' | 'USD';

export interface FxRates {
  EUR: number;
  USD: number;
  updatedAt?: string;
}

export const DEFAULT_FX_RATES: FxRates = {
  EUR: 4950,
  USD: 4550,
};

const FX_STORAGE_KEY = 'sogediproma_roi_fx_rates_v1';

export function loadFxRates(): FxRates {
  try {
    const raw = localStorage.getItem(FX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FxRates>;
      const eur = Number(parsed.EUR);
      const usd = Number(parsed.USD);
      return {
        EUR: Number.isFinite(eur) && eur > 0 ? eur : DEFAULT_FX_RATES.EUR,
        USD: Number.isFinite(usd) && usd > 0 ? usd : DEFAULT_FX_RATES.USD,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {
    // Ignorer erreur localStorage
  }
  return { ...DEFAULT_FX_RATES };
}

export function saveFxRates(rates: FxRates): void {
  try {
    localStorage.setItem(
      FX_STORAGE_KEY,
      JSON.stringify({
        EUR: Math.max(1, Math.round(rates.EUR || DEFAULT_FX_RATES.EUR)),
        USD: Math.max(1, Math.round(rates.USD || DEFAULT_FX_RATES.USD)),
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignorer erreur localStorage
  }
}

export function convertToAriary(
  amount: number,
  currency: RoiCurrency,
  rates: FxRates
): number {
  const value = Number(amount) || 0;
  if (currency === 'EUR') return Math.round(value * (rates.EUR || DEFAULT_FX_RATES.EUR));
  if (currency === 'USD') return Math.round(value * (rates.USD || DEFAULT_FX_RATES.USD));
  return Math.round(value);
}

export function convertFromAriary(
  amountAr: number,
  targetCurrency: RoiCurrency,
  rates: FxRates
): number {
  const value = Number(amountAr) || 0;
  if (targetCurrency === 'EUR') {
    const rate = rates.EUR || DEFAULT_FX_RATES.EUR;
    return Math.round((value / rate) * 100) / 100;
  }
  if (targetCurrency === 'USD') {
    const rate = rates.USD || DEFAULT_FX_RATES.USD;
    return Math.round((value / rate) * 100) / 100;
  }
  return Math.round(value);
}

export function formatAriary(amount: number): string {
  return `${Math.round(Number(amount) || 0).toLocaleString('fr-FR')} Ar`;
}

export function formatCompactAriary(amount: number): string {
  const num = Number(amount) || 0;
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2).replace(/\.00$/, '').replace('.', ',')} Md Ar`;
  }
  if (abs >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',')} M Ar`;
  }
  if (abs >= 1_000) {
    return `${Math.round(num / 1_000)} k Ar`;
  }
  return `${Math.round(num)} Ar`;
}

export function formatCompactAriaryAxis(val: number): string {
  const num = Number(val) || 0;
  if (Math.abs(num) >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace('.0', '').replace('.', ',')}Md`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace('.0', '').replace('.', ',')}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${Math.round(num / 1_000)}k`;
  }
  return `${num}`;
}

export function parseFormattedNumber(raw?: string): number {
  if (!raw) return 0;
  const cleaned = raw
    .replace(/\u202f|\u00a0|\s+/g, '')
    .replace(',', '.');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : 0;
}

export function detectCurrencyAndConvertToAr(
  rawText: string | undefined,
  rates: FxRates
): {
  rawAmount: number;
  currency: RoiCurrency;
  amountAr: number;
  annualizedAr: number;
  isMonthly: boolean;
} {
  if (!rawText) {
    return {
      rawAmount: 0,
      currency: 'Ar',
      amountAr: 0,
      annualizedAr: 0,
      isMonthly: false,
    };
  }
  const amount = parseFormattedNumber(rawText);
  let currency: RoiCurrency = 'Ar';
  if (/€|\bEUR\b/i.test(rawText)) currency = 'EUR';
  else if (/\$|\bUSD\b/i.test(rawText)) currency = 'USD';

  const amountAr = convertToAriary(amount, currency, rates);
  const isMonthly = /mensuel|\/\s*mois|\bmonthly\b/i.test(rawText);
  const isQuarterly = /trimestriel|\bquarterly\b/i.test(rawText);
  const annualizedAr = isMonthly
    ? amountAr * 12
    : isQuarterly
    ? amountAr * 4
    : amountAr;

  return {
    rawAmount: amount,
    currency,
    amountAr,
    annualizedAr,
    isMonthly,
  };
}
