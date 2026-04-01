import {
  SubscriptionTiers,
  CurrencyRates,
  GSTCalculation,
} from '@/types/index';

// Subscription tiers configuration
export const TIERS: SubscriptionTiers = {
  free: {
    name: 'Free',
    docsPerMonth: 10,
    platforms: ['web'],
    storageMB: 100,
    features: {
      ocr: true,
      extraction: true,
      complianceWarnings: true,
      complianceDetails: false,
      irasTax: false,
      multiEntity: false,
      prioritySupport: false,
    },
    llmRouter: 'claude-haiku',
    maxPagesPerDoc: 5,
  },
  lifetime: {
    name: 'Lifetime',
    docsPerMonth: 500,
    platforms: ['web', 'mobile', 'api'],
    storageMB: 10000,
    features: {
      ocr: true,
      extraction: true,
      complianceWarnings: true,
      complianceDetails: true,
      irasTax: true,
      multiEntity: true,
      prioritySupport: true,
    },
    llmRouter: 'claude-opus',
    maxPagesPerDoc: 100,
  },
  pro: {
    name: 'Pro',
    docsPerMonth: 100,
    platforms: ['web', 'mobile', 'api'],
    storageMB: 5000,
    features: {
      ocr: true,
      extraction: true,
      complianceWarnings: true,
      complianceDetails: true,
      irasTax: true,
      multiEntity: true,
      prioritySupport: true,
    },
    llmRouter: 'claude-opus',
    maxPagesPerDoc: 50,
  },
  enterprise: {
    name: 'Enterprise',
    docsPerMonth: 10000,
    platforms: ['web', 'mobile', 'api', 'integrations'],
    storageMB: 100000,
    features: {
      ocr: true,
      extraction: true,
      complianceWarnings: true,
      complianceDetails: true,
      irasTax: true,
      multiEntity: true,
      prioritySupport: true,
    },
    llmRouter: 'claude-opus-4',
    maxPagesPerDoc: 500,
  },
};

// Currency conversion rates (relative to SGD)
export const CURRENCY_RATES: CurrencyRates = {
  SGD: 1,
  USD: 1.34,
  MYR: 0.31,
  IDR: 0.000085,
  THB: 0.038,
  PHP: 0.024,
  CNY: 0.185,
};

/**
 * Check if a feature is available for a given tier
 */
export function checkFeatureAccess(
  tier: 'free' | 'lifetime' | 'pro' | 'enterprise',
  feature: keyof (typeof TIERS)['free']['features']
): boolean {
  const tierConfig = TIERS[tier];
  if (!tierConfig) return false;
  return tierConfig.features[feature] === true;
}

/**
 * Check usage limit for a given tier
 */
export function checkUsageLimit(
  tier: 'free' | 'lifetime' | 'pro' | 'enterprise',
  currentUsage: number
): { allowed: boolean; limit: number; used: number } {
  const tierConfig = TIERS[tier];
  if (!tierConfig) {
    return { allowed: false, limit: 0, used: currentUsage };
  }

  const limit = tierConfig.docsPerMonth;
  return {
    allowed: currentUsage < limit,
    limit,
    used: currentUsage,
  };
}

/**
 * Get the LLM router (model) for a given tier
 */
export function getLLMRouter(
  tier: 'free' | 'lifetime' | 'pro' | 'enterprise'
): string {
  const tierConfig = TIERS[tier];
  return tierConfig?.llmRouter || 'claude-haiku';
}

/**
 * Convert currency amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = CURRENCY_RATES[fromCurrency] || 1;
  const toRate = CURRENCY_RATES[toCurrency] || 1;

  // Convert to SGD first, then to target currency
  const inSGD = amount / fromRate;
  return inSGD * toRate;
}

/**
 * Calculate GST (Goods and Services Tax) at 9% rate in Singapore
 */
export function calculateGST(
  amount: number,
  inclusive: boolean = false
): GSTCalculation {
  const GST_RATE = 0.09;

  if (inclusive) {
    // Amount includes GST
    const net = amount / (1 + GST_RATE);
    const gst = amount - net;
    return {
      net: Math.round(net * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total: Math.round(amount * 100) / 100,
    };
  } else {
    // Amount does not include GST
    const gst = amount * GST_RATE;
    const total = amount + gst;
    return {
      net: Math.round(amount * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }
}
