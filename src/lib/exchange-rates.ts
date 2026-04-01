/**
 * JournalAI — Exchange Rate Service
 *
 * IRAS Regulation: Foreign currency invoices must be converted to SGD
 * using the spot exchange rate on the date of supply (invoice date).
 *
 * Accepted sources: MAS daily rates, local bank selling rate, or
 * another source approved by the Comptroller.
 *
 * We use the Frankfurter API (ECB reference rates, free, no API key).
 * In production, this should be replaced with MAS exchange rates
 * (https://eservices.mas.gov.sg/api/) for full IRAS compliance.
 */

export interface ExchangeRateResult {
  from: string;        // e.g. "USD"
  to: string;          // "SGD"
  rate: number;        // e.g. 1.3845
  date: string;        // actual date the rate is from (YYYY-MM-DD)
  requestedDate: string; // the date we asked for
  sgdAmount: number;   // converted amount in SGD
  originalAmount: number;
  source: string;      // "ECB via Frankfurter" or "fallback"
}

// Fallback rates (approximate, updated periodically)
// Used when the API is unavailable
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.3450,
  EUR: 1.4550,
  GBP: 1.6900,
  MYR: 0.3050,
  IDR: 0.000085,
  THB: 0.0390,
  PHP: 0.0240,
  CNY: 0.1860,
  JPY: 0.0090,
  AUD: 0.8850,
  HKD: 0.1720,
  KRW: 0.00098,
  INR: 0.0161,
  TWD: 0.0415,
};

/**
 * Fetch the historical exchange rate for a given currency to SGD
 * on a specific date.
 *
 * @param currency - 3-letter ISO currency code (e.g. "USD")
 * @param date - invoice date as YYYY-MM-DD string
 * @param amount - the original amount to convert
 * @returns ExchangeRateResult with rate and converted SGD amount
 */
export async function getExchangeRate(
  currency: string,
  date: string,
  amount: number
): Promise<ExchangeRateResult> {
  const upper = currency.toUpperCase();

  // If already SGD, no conversion needed
  if (upper === 'SGD') {
    return {
      from: 'SGD',
      to: 'SGD',
      rate: 1,
      date,
      requestedDate: date,
      sgdAmount: amount,
      originalAmount: amount,
      source: 'none (same currency)',
    };
  }

  try {
    // Frankfurter API — free, no key, historical ECB rates
    // If the date falls on a weekend/holiday, it returns the last available rate
    const url = `https://api.frankfurter.dev/v1/${date}?from=${upper}&to=SGD`;
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(5000) // 5s timeout
    });

    if (resp.ok) {
      const data = await resp.json();
      const rate = data.rates?.SGD;
      if (rate && typeof rate === 'number') {
        return {
          from: upper,
          to: 'SGD',
          rate,
          date: data.date || date,
          requestedDate: date,
          sgdAmount: Math.round(amount * rate * 100) / 100,
          originalAmount: amount,
          source: 'ECB via Frankfurter',
        };
      }
    }
  } catch (e) {
    console.warn('Exchange rate API failed, using fallback:', e);
  }

  // Fallback to hardcoded rates
  const fallbackRate = FALLBACK_RATES[upper];
  if (fallbackRate) {
    return {
      from: upper,
      to: 'SGD',
      rate: fallbackRate,
      date,
      requestedDate: date,
      sgdAmount: Math.round(amount * fallbackRate * 100) / 100,
      originalAmount: amount,
      source: 'fallback (approximate)',
    };
  }

  // Unknown currency — return amount as-is with rate 1
  return {
    from: upper,
    to: 'SGD',
    rate: 1,
    date,
    requestedDate: date,
    sgdAmount: amount,
    originalAmount: amount,
    source: 'unknown currency — no conversion',
  };
}
