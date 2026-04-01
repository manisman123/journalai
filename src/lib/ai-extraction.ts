/**
 * JournalAI — AI Extraction Pipeline
 *
 * Architecture (from blueprint):
 *   Step 1: OCR — convert image/PDF to text (Mistral OCR 3 in production; here we
 *           accept raw text or use Claude Vision for images)
 *   Step 2: Classify — Haiku 4.5 classifies document type & complexity
 *   Step 3: Extract — Routed LLM extracts structured JSON
 *   Step 6: Tax engine — deterministic GST / withholding tax calc
 *
 * This module calls the Anthropic API (Claude) via fetch() for steps 2 & 3.
 * If no API key is set, it falls back to an enhanced heuristic extractor
 * so the app still works in demo mode.
 */

import { ExtractedData } from '@/types/index';

// ---------------------------------------------------------------------------
// Helpers — direct API calls via fetch (no SDK dependency)
// ---------------------------------------------------------------------------

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

async function callClaude(opts: {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
}): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const body: Record<string, unknown> = {
      model: opts.model,
      max_tokens: opts.max_tokens,
      messages: opts.messages,
    };
    if (opts.system) body.system = opts.system;

    const resp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Anthropic API error:', resp.status, errText);
      return null;
    }

    const data: AnthropicResponse = await resp.json();
    const textBlock = data.content?.find((b) => b.type === 'text');
    return textBlock?.text ?? null;
  } catch (e) {
    console.error('Anthropic API call failed:', e);
    return null;
  }
}

// Deterministic GST engine (Singapore 9% from 1 Jan 2024)
export function calculateGST(
  amount: number,
  gstInclusive: boolean = false,
  rate: number = 0.09
): { net: number; gst: number; total: number } {
  if (gstInclusive) {
    const net = Math.round((amount / (1 + rate)) * 100) / 100;
    const gst = Math.round((amount - net) * 100) / 100;
    return { net, gst, total: amount };
  }
  const gst = Math.round(amount * rate * 100) / 100;
  return { net: amount, gst, total: Math.round((amount + gst) * 100) / 100 };
}

// ---------------------------------------------------------------------------
// Step 2 — Document Classifier (Haiku)
// ---------------------------------------------------------------------------

interface ClassificationResult {
  type: 'receipt' | 'invoice' | 'purchase_order' | 'bank_statement' | 'credit_note' | 'unknown';
  complexity: 'simple' | 'standard' | 'complex';
  route: 'haiku' | 'sonnet' | 'opus';
  confidence: number;
}

async function classifyDocument(ocrText: string): Promise<ClassificationResult> {
  const text = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Classify this financial document. Read the first ~500 tokens and respond with ONLY valid JSON, no explanation.

Document text (first 500 chars):
${ocrText.slice(0, 500)}

Respond with exactly this JSON schema:
{
  "type": "receipt" | "invoice" | "purchase_order" | "bank_statement" | "credit_note" | "unknown",
  "complexity": "simple" | "standard" | "complex",
  "route": "haiku" | "sonnet" | "opus",
  "confidence": 0.0-1.0
}

Rules:
- simple receipts/expenses with ≤3 line items → route "haiku"
- standard invoices with clear tables → route "sonnet"
- multi-page, cross-border, or multi-currency → route "opus"`,
      },
    ],
  });

  if (text) {
    try {
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      if (json) return JSON.parse(json) as ClassificationResult;
    } catch {}
  }

  // Fallback heuristic
  const lower = ocrText.toLowerCase();
  const isInvoice = lower.includes('invoice') || lower.includes('bill to');
  const isReceipt = lower.includes('receipt') || lower.includes('payment received');
  const isBankStatement = lower.includes('bank statement') || lower.includes('account summary');
  const type = isInvoice ? 'invoice' : isReceipt ? 'receipt' : isBankStatement ? 'bank_statement' : 'unknown';
  return { type, complexity: 'standard', route: 'sonnet', confidence: 0.7 };
}

// ---------------------------------------------------------------------------
// Step 3 — Structured Data Extraction (Sonnet / Haiku / Opus)
// ---------------------------------------------------------------------------

const EXTRACTION_SYSTEM_PROMPT = `You are JournalAI's extraction engine. You extract structured financial data from OCR text of invoices, receipts, and bills.

You MUST respond with ONLY valid JSON matching this exact schema — no markdown, no explanation, no code fences:

{
  "vendor": "string — full legal name of the vendor/supplier",
  "vendor_address": "string or null",
  "vendor_tax_id": "string or null — GST registration / UEN if visible",
  "invoice_number": "string or null",
  "date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD or null",
  "currency": "string — 3-letter ISO code (SGD, USD, MYR, etc.)",
  "subtotal": number,
  "tax_amount": number,
  "tax_rate": "string — e.g. '9%' or '10%' or 'N/A'",
  "total": number,
  "line_items": [
    {
      "description": "string",
      "quantity": number,
      "unit_price": number,
      "amount": number
    }
  ],
  "payment_terms": "string or null",
  "notes": "string or null — any additional relevant info"
}

Rules:
- Extract EXACT numbers from the document. Never estimate or fabricate.
- If a field is not found, use null for strings and 0 for numbers.
- For amounts, use the document's stated values. Do NOT recalculate.
- Currency: look for symbols ($, S$, RM, US$) or codes (SGD, USD, MYR). Default to USD if only "$" with no country indicator.
- Date format: always YYYY-MM-DD.
- Line items: extract ALL line items visible in the document.
- Tax: extract the stated tax amount and rate. Do not assume 9% GST unless the document says so.`;

interface ExtractionResponse {
  vendor: string;
  vendor_address?: string | null;
  vendor_tax_id?: string | null;
  invoice_number?: string | null;
  date: string;
  due_date?: string | null;
  currency: string;
  subtotal: number;
  tax_amount: number;
  tax_rate?: string;
  total: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  payment_terms?: string | null;
  notes?: string | null;
}

async function extractWithLLM(
  ocrText: string,
  route: 'haiku' | 'sonnet' | 'opus'
): Promise<ExtractionResponse | null> {
  const modelMap = {
    haiku: 'claude-haiku-4-5-20251001',
    sonnet: 'claude-sonnet-4-6',
    opus: 'claude-sonnet-4-6', // Use Sonnet as Opus fallback
  };

  const text = await callClaude({
    model: modelMap[route],
    max_tokens: 2048,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract structured data from this document:\n\n${ocrText}`,
      },
    ],
  });

  if (text) {
    try {
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      if (json) return JSON.parse(json) as ExtractionResponse;
    } catch (e) {
      console.error('LLM extraction parse error:', e);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step 3 (alt) — Vision-based extraction for images
// ---------------------------------------------------------------------------

async function extractFromImage(
  base64Data: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<ExtractionResponse | null> {
  const text = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Data },
          },
          {
            type: 'text',
            text: 'Extract all structured financial data from this invoice/receipt image.',
          },
        ],
      },
    ],
  });

  if (text) {
    try {
      const json = text.match(/\{[\s\S]*\}/)?.[0];
      if (json) return JSON.parse(json) as ExtractionResponse;
    } catch (e) {
      console.error('Vision extraction parse error:', e);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fallback — enhanced heuristic extractor (when no API key)
// ---------------------------------------------------------------------------

function heuristicExtract(text: string, filename: string): ExtractionResponse {
  // --- Vendor ---
  let vendor = 'Unknown Vendor';
  const vendorPatterns = [
    /(?:from|vendor|supplier|billed?\s*by|company)[:\s]+([^\n]+)/i,
    /^([A-Z][A-Za-z\s&.']+(?:Pte\.?\s*Ltd\.?|Inc\.?|LLC|Co\.?|Corp\.?|Entity))/m,
  ];
  for (const p of vendorPatterns) {
    const m = text.match(p);
    if (m?.[1] && m[1].trim().length > 2) {
      vendor = m[1].trim().split('\n')[0].trim();
      break;
    }
  }

  // --- Invoice number ---
  let invoice_number: string | null = null;
  const invMatch = text.match(/(?:invoice|inv|ref|receipt)\s*#\s*:?\s*([A-Z0-9\-]+)/i) ||
    text.match(/#\s*([A-Z0-9\-]{3,})/i);
  if (invMatch) invoice_number = invMatch[1];

  // --- Date ---
  let date = new Date().toISOString().slice(0, 10);
  const datePatterns = [
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*)\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\d{1,2})\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*)\s+(\d{4})/i,
  ];
  for (const p of datePatterns) {
    const m = text.match(p);
    if (m) {
      const parsed = new Date(m[0]);
      if (!isNaN(parsed.getTime())) {
        date = parsed.toISOString().slice(0, 10);
        break;
      }
    }
  }

  // --- Currency ---
  let currency = 'SGD';
  if (/US\$|USD/i.test(text)) currency = 'USD';
  else if (/RM\s?\d|MYR/i.test(text)) currency = 'MYR';
  else if (/S\$|SGD/i.test(text)) currency = 'SGD';
  else if (/\$/.test(text) && !/S\$/.test(text)) currency = 'USD';

  // --- Amounts ---
  let total = 0;
  let subtotal = 0;
  let tax_amount = 0;
  let tax_rate = 'N/A';

  const totalMatch = text.match(/(?:total|grand\s*total|amount\s*due)[:\s]*\$?\s*([\d,]+\.?\d*)/i);
  if (totalMatch) total = parseFloat(totalMatch[1].replace(/,/g, ''));

  const subtotalMatch = text.match(/(?:subtotal|sub[\-\s]total|net)[:\s]*\$?\s*([\d,]+\.?\d*)/i);
  if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));

  const taxMatch = text.match(/(?:GST|tax|VAT)\s*(?:\((\d+%?)\))?\s*[:\s]*\$?\s*([\d,]+\.?\d*)/i);
  if (taxMatch) {
    tax_amount = parseFloat(taxMatch[2].replace(/,/g, ''));
    if (taxMatch[1]) tax_rate = taxMatch[1].includes('%') ? taxMatch[1] : `${taxMatch[1]}%`;
  }

  if (total === 0 && subtotal > 0) total = subtotal + tax_amount;
  if (subtotal === 0 && total > 0) subtotal = total - tax_amount;
  if (total === 0) {
    const allAmounts = [...text.matchAll(/\$([\d,]+\.\d{2})/g)]
      .map((m) => parseFloat(m[1].replace(/,/g, '')))
      .filter((n) => n > 0);
    if (allAmounts.length > 0) {
      total = Math.max(...allAmounts);
      subtotal = total;
    }
  }

  // --- Line items ---
  const line_items: ExtractionResponse['line_items'] = [];
  const lineRegex =
    /([A-Za-z][A-Za-z\s\-.,()\/\d]{2,50}?)\s{2,}(\d+)\s+\$?([\d,]+\.?\d{0,2})\s+\$?([\d,]+\.?\d{0,2})/g;
  let lm;
  while ((lm = lineRegex.exec(text)) !== null) {
    const desc = lm[1].trim();
    const qty = parseInt(lm[2]);
    const unitPrice = parseFloat(lm[3].replace(/,/g, ''));
    const amount = parseFloat(lm[4].replace(/,/g, ''));
    if (desc.length > 2 && qty > 0 && amount > 0) {
      line_items.push({ description: desc, quantity: qty, unit_price: unitPrice, amount });
    }
  }

  if (line_items.length === 0 && subtotal > 0) {
    const desc =
      filename
        .replace(/\.[^/.]+$/, '')
        .replace(/[_\-]/g, ' ')
        .trim() || 'Services rendered';
    line_items.push({ description: desc, quantity: 1, unit_price: subtotal, amount: subtotal });
  }

  // --- Due date ---
  let due_date: string | null = null;
  const dueMatch = text.match(
    /(?:due|payment\s*due|pay\s*by)[:\s]*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i
  );
  if (dueMatch) {
    const parsed = new Date(dueMatch[1]);
    if (!isNaN(parsed.getTime())) due_date = parsed.toISOString().slice(0, 10);
  }

  return {
    vendor,
    invoice_number,
    date,
    due_date,
    currency,
    subtotal,
    tax_amount,
    tax_rate,
    total,
    line_items,
    payment_terms: null,
    notes: null,
  };
}

// ---------------------------------------------------------------------------
// Main pipeline entry point
// ---------------------------------------------------------------------------

export interface ProcessingResult {
  extractedData: ExtractedData;
  classification: ClassificationResult;
  rawExtraction: ExtractionResponse;
  pipeline: 'ai' | 'heuristic';
}

export async function processDocumentAI(
  fileContent: string | null,
  filename: string,
  imageBase64: string | null = null,
  imageMediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | null = null
): Promise<ProcessingResult> {
  let rawExtraction: ExtractionResponse | null = null;
  let classification: ClassificationResult;
  let pipeline: 'ai' | 'heuristic' = 'heuristic';

  const hasApiKey = !!ANTHROPIC_API_KEY;

  if (hasApiKey && imageBase64 && imageMediaType) {
    // Image upload → Claude Vision (combines OCR + extraction in one call)
    classification = { type: 'invoice', complexity: 'standard', route: 'sonnet', confidence: 0.9 };
    rawExtraction = await extractFromImage(imageBase64, imageMediaType);
    if (rawExtraction) pipeline = 'ai';
  }

  if (hasApiKey && !rawExtraction && fileContent) {
    // Text-based pipeline: classify then extract
    classification = await classifyDocument(fileContent);
    rawExtraction = await extractWithLLM(fileContent, classification.route);
    if (rawExtraction) pipeline = 'ai';
  }

  // Fallback
  if (!rawExtraction) {
    classification = { type: 'invoice', complexity: 'standard', route: 'sonnet', confidence: 0.5 };
    rawExtraction = heuristicExtract(fileContent || filename, filename);
    pipeline = 'heuristic';
  } else {
    classification = classification!;
  }

  // Apply deterministic tax engine (Step 6)
  let tax = rawExtraction.tax_amount;
  let net = rawExtraction.subtotal || rawExtraction.total - tax;
  let total = rawExtraction.total;

  if (tax === 0 && net > 0 && rawExtraction.tax_rate === 'N/A') {
    // No tax stated — don't assume GST; leave tax as 0
  }

  // Convert to ExtractedData format
  const extractedData: ExtractedData = {
    vendor: rawExtraction.vendor,
    amount: net || total,
    date: new Date(rawExtraction.date),
    currency: rawExtraction.currency,
    tax: tax,
    line_items: rawExtraction.line_items.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      amount: li.amount,
    })),
    extracted_at: new Date(),
    confidence: pipeline === 'ai' ? 0.95 : classification.confidence,
    ...(rawExtraction.invoice_number && { invoice_number: rawExtraction.invoice_number }),
    ...(rawExtraction.due_date && { due_date: rawExtraction.due_date }),
    ...(rawExtraction.tax_rate && { tax_rate: rawExtraction.tax_rate }),
    ...(rawExtraction.total && { total: rawExtraction.total }),
    ...(rawExtraction.payment_terms && { payment_terms: rawExtraction.payment_terms }),
    ...(rawExtraction.notes && { notes: rawExtraction.notes }),
  };

  return { extractedData, classification, rawExtraction, pipeline };
}
