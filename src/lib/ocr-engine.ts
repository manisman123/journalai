import {
  ExtractedData,
  ChartOfAccount,
  JournalEntryLine,
  CategorizationResult,
  ComplianceCheckResult,
  ComplianceIssue,
} from '@/types/index';

/**
 * Simulate OCR extraction from a document.
 * Parses the text content intelligently — looks for amounts, dates, vendor names,
 * and falls back to smart defaults when fields can't be found.
 */
export function processDocument(
  fileContent: string,
  filename: string
): ExtractedData {
  const text = fileContent.toLowerCase();

  // --- Extract vendor ---
  // Look for "from", "bill to", company suffixes, or use filename
  let vendor = 'Unknown Vendor';
  const vendorPatterns = [
    /(?:from|vendor|supplier|billed?\s*by|company)[:\s]+([A-Z][A-Za-z\s&.]+(?:Pte\.?\s*Ltd\.?|Inc\.?|LLC|Co\.?|Corp\.?)?)/i,
    /(?:invoice|receipt)\s+(?:from\s+)?([A-Z][A-Za-z\s&.]+(?:Pte\.?\s*Ltd\.?|Inc\.?|LLC|Co\.?|Corp\.?)?)/i,
    /([A-Z][A-Za-z\s&.]+(?:Pte\.?\s*Ltd\.?|Inc\.?|LLC|Co\.?|Corp\.?))/,
  ];
  for (const pattern of vendorPatterns) {
    const match = fileContent.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      // Clean up: take only the first line, trim whitespace
      vendor = match[1].trim().split('\n')[0].trim();
      break;
    }
  }

  // --- Extract amount ---
  // Look for dollar amounts like $1,234.56 or "SGD 1234.56" or "total: 500"
  let amount = 0;
  const amountPatterns = [
    /(?:total|amount|sum|balance|due|grand\s*total)[:\s]*\$?\s*([\d,]+\.?\d*)/i,
    /(?:SGD|USD|MYR|S\$|US\$|RM)\s*([\d,]+\.?\d*)/i,
    /\$([\d,]+\.?\d{2})/,
    /([\d,]+\.\d{2})/,
  ];
  for (const pattern of amountPatterns) {
    const match = fileContent.match(pattern);
    if (match && match[1]) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (parsed > 0 && parsed < 1000000) {
        amount = parsed;
        break;
      }
    }
  }
  if (amount === 0) {
    // Fallback: generate a plausible amount
    amount = Math.round((Math.random() * 2000 + 50) * 100) / 100;
  }

  // --- Extract currency ---
  let currency = 'SGD';
  if (/USD|US\$|dollars?\b/i.test(fileContent)) currency = 'USD';
  else if (/MYR|RM\s?\d|ringgit/i.test(fileContent)) currency = 'MYR';
  else if (/SGD|S\$|singapore/i.test(fileContent)) currency = 'SGD';

  // --- Extract date ---
  let date = new Date();
  const datePatterns = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i,
  ];
  for (const pattern of datePatterns) {
    const match = fileContent.match(pattern);
    if (match) {
      const parsed = new Date(match[0]);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
        break;
      }
    }
  }

  // --- Calculate GST (9%) ---
  const taxRate = 0.09;
  let gstAmount = 0;
  const gstMatch = fileContent.match(
    /(?:GST|tax|VAT)[:\s]*\$?\s*([\d,]+\.?\d*)/i
  );
  if (gstMatch && gstMatch[1]) {
    gstAmount = parseFloat(gstMatch[1].replace(/,/g, ''));
  } else {
    gstAmount = Math.round(amount * taxRate * 100) / 100;
  }

  // --- Extract line items ---
  const lineItems: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }> = [];

  // Try to find itemised lines like "Office chairs x5 @ $250"
  const linePattern =
    /^([A-Za-z][A-Za-z\s]{2,30}?)\s*x\s*(\d+)\s*@\s*\$?\s*([\d,]+\.?\d*)/gim;
  let lineMatch;
  while ((lineMatch = linePattern.exec(fileContent)) !== null) {
    const desc = lineMatch[1].trim();
    const qty = parseInt(lineMatch[2]);
    const price = parseFloat(lineMatch[3].replace(/,/g, ''));
    if (desc.length > 2 && qty > 0 && price > 0 && price < 100000) {
      lineItems.push({
        description: desc,
        quantity: qty,
        unit_price: price,
        amount: qty * price,
      });
    }
  }

  // If no line items found, create one from the total
  if (lineItems.length === 0) {
    const description =
      filename
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Services rendered';
    lineItems.push({
      description,
      quantity: 1,
      unit_price: amount,
      amount,
    });
  }

  return {
    vendor,
    amount,
    date,
    currency,
    tax: gstAmount,
    line_items: lineItems,
    extracted_at: new Date(),
    confidence: vendor !== 'Unknown Vendor' ? 0.94 : 0.78,
  };
}

/**
 * Categorize a transaction based on description.
 * Uses keyword matching against chart of accounts.
 */
export function categorizeTransaction(
  description: string,
  amount: number,
  chartOfAccounts: ChartOfAccount[]
): CategorizationResult {
  const lowerDesc = description.toLowerCase();

  const categoryMap: Record<string, { name: string; confidence: number }> = {
    rent: { name: 'Rent Expense', confidence: 0.95 },
    office: { name: 'Office Supplies', confidence: 0.85 },
    food: { name: 'Meals & Entertainment', confidence: 0.8 },
    meal: { name: 'Meals & Entertainment', confidence: 0.8 },
    lunch: { name: 'Meals & Entertainment', confidence: 0.82 },
    dinner: { name: 'Meals & Entertainment', confidence: 0.82 },
    catering: { name: 'Meals & Entertainment', confidence: 0.84 },
    utilities: { name: 'Utilities', confidence: 0.9 },
    electricity: { name: 'Utilities', confidence: 0.92 },
    water: { name: 'Utilities', confidence: 0.92 },
    fuel: { name: 'Fuel & Transport', confidence: 0.88 },
    transport: { name: 'Fuel & Transport', confidence: 0.8 },
    grab: { name: 'Fuel & Transport', confidence: 0.85 },
    taxi: { name: 'Fuel & Transport', confidence: 0.88 },
    insurance: { name: 'Insurance', confidence: 0.93 },
    salary: { name: 'Salary Expense', confidence: 0.97 },
    wage: { name: 'Salary Expense', confidence: 0.95 },
    software: { name: 'Software & IT', confidence: 0.92 },
    subscription: { name: 'Software & IT', confidence: 0.85 },
    cloud: { name: 'Software & IT', confidence: 0.88 },
    supplies: { name: 'Office Supplies', confidence: 0.88 },
    stationery: { name: 'Office Supplies', confidence: 0.9 },
    equipment: { name: 'Equipment', confidence: 0.85 },
    furniture: { name: 'Office Supplies', confidence: 0.83 },
    travel: { name: 'Travel', confidence: 0.92 },
    flight: { name: 'Travel', confidence: 0.93 },
    hotel: { name: 'Travel', confidence: 0.91 },
    advertising: { name: 'Advertising', confidence: 0.9 },
    marketing: { name: 'Advertising', confidence: 0.87 },
    bank: { name: 'Bank Charges', confidence: 0.94 },
    interest: { name: 'Interest Expense', confidence: 0.93 },
    training: { name: 'Training', confidence: 0.88 },
    consulting: { name: 'Professional Fees', confidence: 0.9 },
    legal: { name: 'Professional Fees', confidence: 0.92 },
    audit: { name: 'Professional Fees', confidence: 0.91 },
  };

  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (lowerDesc.includes(keyword)) {
      const account = chartOfAccounts.find(
        (acc) => acc.name.toLowerCase() === category.name.toLowerCase()
      );
      if (account) {
        return {
          accountId: account.id,
          accountName: account.name,
          confidence: category.confidence,
        };
      }
    }
  }

  // Default: first expense account
  const defaultAccount = chartOfAccounts.find(
    (acc) =>
      acc.name.toLowerCase().includes('miscellaneous') ||
      acc.type === 'expense'
  );

  return {
    accountId: defaultAccount?.id || 'unknown',
    accountName: defaultAccount?.name || 'Miscellaneous Expense',
    confidence: 0.72,
  };
}

/**
 * Generate journal entry lines from a categorized transaction
 */
export function generateJournalEntry(
  documentId: string,
  amount: number,
  currency: string,
  description: string,
  categoryResult: CategorizationResult,
  gstAmount: number = 0,
  creditAccountId: string = 'bank-sgd'
): JournalEntryLine[] {
  const lines: JournalEntryLine[] = [];
  const entryId = `je-${Date.now()}`;

  lines.push({
    id: `jel-${Date.now()}-1`,
    journal_entry_id: entryId,
    account_id: categoryResult.accountId,
    account_name: categoryResult.accountName,
    debit: amount,
    credit: 0,
    description,
    currency,
  });

  if (gstAmount > 0) {
    lines.push({
      id: `jel-${Date.now()}-2`,
      journal_entry_id: entryId,
      account_id: 'gst-input',
      account_name: 'GST Input Tax',
      debit: gstAmount,
      credit: 0,
      description: `GST on ${description}`,
      currency,
    });
  }

  lines.push({
    id: `jel-${Date.now()}-3`,
    journal_entry_id: entryId,
    account_id: creditAccountId,
    account_name: 'Bank Account',
    debit: 0,
    credit: amount + gstAmount,
    description: `Payment for ${description}`,
    currency,
  });

  return lines;
}

/**
 * Check journal entry compliance.
 * Free tier: issue count only. Paid tiers: full details.
 */
export function checkCompliance(
  journalEntry: any,
  tier: string
): ComplianceCheckResult {
  const issues: ComplianceIssue[] = [];

  const totalDebit = journalEntry.entries.reduce(
    (sum: number, line: any) => sum + (line.debit || 0),
    0
  );
  const totalCredit = journalEntry.entries.reduce(
    (sum: number, line: any) => sum + (line.credit || 0),
    0
  );

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    issues.push({
      type: 'IMBALANCED',
      severity: 'error',
      message: `Debits (${totalDebit.toFixed(2)}) do not equal credits (${totalCredit.toFixed(2)})`,
    });
  }

  const hasDebit = journalEntry.entries.some((line: any) => line.debit > 0);
  const hasCredit = journalEntry.entries.some((line: any) => line.credit > 0);
  if (!hasDebit || !hasCredit) {
    issues.push({
      type: 'INVALID_ENTRY',
      severity: 'error',
      message: 'Journal entry must have at least one debit and one credit',
    });
  }

  if (journalEntry.gst_amount > 0) {
    const gstLine = journalEntry.entries.find(
      (line: any) => line.account_id === 'gst-input'
    );
    if (!gstLine) {
      issues.push({
        type: 'MISSING_GST',
        severity: 'warning',
        message: 'GST amount recorded but no GST Input line found',
      });
    }
  }

  const invalidAccounts = journalEntry.entries.filter(
    (line: any) => !line.account_id || line.account_id === 'unknown'
  );
  if (invalidAccounts.length > 0) {
    issues.push({
      type: 'INVALID_ACCOUNTS',
      severity: 'error',
      message: `${invalidAccounts.length} line(s) have invalid accounts`,
    });
  }

  if (tier === 'free') {
    return { compliant: issues.length === 0, issueCount: issues.length };
  }

  return {
    compliant: issues.length === 0,
    issueCount: issues.length,
    issues: issues.length > 0 ? issues : undefined,
  };
}
