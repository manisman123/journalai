// User types
export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  tier: 'free' | 'lifetime' | 'pro' | 'enterprise';
  company_name: string;
  created_at: Date;
}

// Document types
export interface ExtractedData {
  vendor?: string;
  amount?: number;
  date?: Date;
  currency?: string;
  tax?: number;
  line_items?: LineItem[];
  [key: string]: any;
}

export interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
}

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  file_type: string;
  ocr_text: string;
  extracted_data: ExtractedData;
  status: 'uploaded' | 'processing' | 'extracted' | 'categorized' | 'posted';
  created_at: Date;
  file_base64?: string;
  file_media_type?: string;
}

// Chart of Accounts types
export interface ChartOfAccount {
  id: string;
  user_id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
  is_default: boolean;
}

// Journal Entry types
export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
  currency: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  document_id?: string;
  date: Date;
  description: string;
  status: 'draft' | 'pending' | 'posted' | 'voided';
  entries: JournalEntryLine[];
  total_debit: number;
  total_credit: number;
  currency: string;
  gst_amount: number;
  created_at: Date;
}

// Bank Transaction types
export interface BankTransaction {
  id: string;
  user_id: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  bank_name: string;
  category: string;
  reconciled: boolean;
  matched_document_id?: string;
  created_at: Date;
}

// Usage tracking
export interface UsageRecord {
  user_id: string;
  month: string; // YYYY-MM format
  docs_processed: number;
  storage_bytes: number;
}

// Subscription tier configuration
export interface SubscriptionTier {
  name: string;
  docsPerMonth: number;
  platforms: string[];
  storageMB: number;
  features: {
    ocr: boolean;
    extraction: boolean;
    complianceWarnings: boolean;
    complianceDetails: boolean;
    irasTax: boolean;
    multiEntity: boolean;
    prioritySupport: boolean;
  };
  llmRouter: string;
  maxPagesPerDoc: number;
}

export interface SubscriptionTiers {
  free: SubscriptionTier;
  lifetime: SubscriptionTier;
  pro: SubscriptionTier;
  enterprise: SubscriptionTier;
}

// API Response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

// Currency rates
export interface CurrencyRates {
  [key: string]: number;
}

// Compliance check result
export interface ComplianceCheckResult {
  compliant: boolean;
  issueCount: number;
  issues?: ComplianceIssue[];
}

export interface ComplianceIssue {
  type: string;
  severity: 'warning' | 'error';
  message: string;
  field?: string;
}

// Categorization result
export interface CategorizationResult {
  accountId: string;
  accountName: string;
  confidence: number;
}

// GST calculation result
export interface GSTCalculation {
  net: number;
  gst: number;
  total: number;
}
