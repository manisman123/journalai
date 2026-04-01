import {
  User,
  Document,
  ChartOfAccount,
  JournalEntry,
  JournalEntryLine,
  BankTransaction,
  UsageRecord,
  ExtractedData,
} from '@/types/index';
import { hashPassword } from './auth';

// In-memory database stores
let users = new Map<string, User>();
let documents = new Map<string, Document>();
let journalEntries = new Map<string, JournalEntry>();
let journalEntryLines = new Map<string, JournalEntryLine>();
let chartOfAccounts = new Map<string, ChartOfAccount>();
let bankTransactions = new Map<string, BankTransaction>();
let usageRecords = new Map<string, UsageRecord>();

// Initialize database with demo data
let isInitialized = false;

async function initializeDatabase() {
  if (isInitialized) return;
  isInitialized = true;

  // Create demo user
  const demoUserId = 'user-001';
  const demoPasswordHash = await hashPassword('demo123');

  const demoUser: User = {
    id: demoUserId,
    email: 'demo@journalai.sg',
    name: 'Demo User',
    password_hash: demoPasswordHash,
    tier: 'pro',
    company_name: 'Acme Trading Pte Ltd',
    created_at: new Date('2026-01-15'),
  };

  users.set(demoUserId, demoUser);

  // Create default Singapore chart of accounts
  const defaultAccounts: ChartOfAccount[] = [
    {
      id: 'coa-001',
      user_id: demoUserId,
      code: '1000',
      name: 'Cash',
      type: 'asset',
      is_default: true,
    },
    {
      id: 'coa-002',
      user_id: demoUserId,
      code: '1010',
      name: 'Bank Account - SGD',
      type: 'asset',
      is_default: true,
    },
    {
      id: 'coa-003',
      user_id: demoUserId,
      code: '1020',
      name: 'Bank Account - USD',
      type: 'asset',
      is_default: true,
    },
    {
      id: 'coa-004',
      user_id: demoUserId,
      code: '1100',
      name: 'Accounts Receivable',
      type: 'asset',
      is_default: true,
    },
    {
      id: 'coa-005',
      user_id: demoUserId,
      code: '1500',
      name: 'Inventory',
      type: 'asset',
      is_default: true,
    },
    {
      id: 'coa-006',
      user_id: demoUserId,
      code: '2000',
      name: 'Accounts Payable',
      type: 'liability',
      is_default: true,
    },
    {
      id: 'coa-007',
      user_id: demoUserId,
      code: '2100',
      name: 'GST Payable',
      type: 'liability',
      is_default: true,
    },
    {
      id: 'coa-008',
      user_id: demoUserId,
      code: '2110',
      name: 'GST Input Tax',
      type: 'asset',
      is_default: true,
    },
    {
      id: 'coa-009',
      user_id: demoUserId,
      code: '3000',
      name: 'Equity',
      type: 'equity',
      is_default: true,
    },
    {
      id: 'coa-010',
      user_id: demoUserId,
      code: '4000',
      name: 'Revenue',
      type: 'revenue',
      is_default: true,
    },
    {
      id: 'coa-011',
      user_id: demoUserId,
      code: '5000',
      name: 'Cost of Goods Sold',
      type: 'expense',
      is_default: true,
    },
    {
      id: 'coa-012',
      user_id: demoUserId,
      code: '6000',
      name: 'Rent Expense',
      type: 'expense',
      is_default: true,
    },
    {
      id: 'coa-013',
      user_id: demoUserId,
      code: '6100',
      name: 'Utilities',
      type: 'expense',
      is_default: true,
    },
    {
      id: 'coa-014',
      user_id: demoUserId,
      code: '6200',
      name: 'Office Supplies',
      type: 'expense',
      is_default: true,
    },
    {
      id: 'coa-015',
      user_id: demoUserId,
      code: '6300',
      name: 'Meals & Entertainment',
      type: 'expense',
      is_default: true,
    },
    {
      id: 'coa-016',
      user_id: demoUserId,
      code: '6400',
      name: 'Salary Expense',
      type: 'expense',
      is_default: true,
    },
    {
      id: 'coa-017',
      user_id: demoUserId,
      code: '6500',
      name: 'Insurance',
      type: 'expense',
      is_default: true,
    },
    {
      id: 'coa-018',
      user_id: demoUserId,
      code: '6600',
      name: 'Professional Fees',
      type: 'expense',
      is_default: true,
    },
    {
      id: 'coa-019',
      user_id: demoUserId,
      code: '6700',
      name: 'Software & IT',
      type: 'expense',
      is_default: true,
    },
    {
      id: 'coa-020',
      user_id: demoUserId,
      code: '6800',
      name: 'Miscellaneous Expense',
      type: 'expense',
      is_default: true,
    },
  ];

  defaultAccounts.forEach((acc) => {
    chartOfAccounts.set(acc.id, acc);
  });

  // Create sample documents
  const sampleDocuments: Document[] = [
    {
      id: 'doc-001',
      user_id: demoUserId,
      filename: 'invoice_2026-03-01.pdf',
      original_name: 'Invoice from ABC Supplies.pdf',
      file_type: 'application/pdf',
      ocr_text: 'Invoice from ABC Supplies for office equipment',
      extracted_data: {
        vendor: 'ABC Supplies Pte Ltd',
        amount: 1250.0,
        date: new Date('2026-03-01'),
        currency: 'SGD',
        tax: 112.5,
        line_items: [
          {
            description: 'Office chairs',
            quantity: 5,
            unit_price: 200,
            amount: 1000,
          },
          {
            description: 'Desk lamp',
            quantity: 5,
            unit_price: 50,
            amount: 250,
          },
        ],
      },
      status: 'categorized',
      created_at: new Date('2026-03-01'),
    },
    {
      id: 'doc-002',
      user_id: demoUserId,
      filename: 'receipt_2026-03-05.pdf',
      original_name: 'Receipt - Office Depot.pdf',
      file_type: 'application/pdf',
      ocr_text: 'Receipt from Office Depot for supplies',
      extracted_data: {
        vendor: 'Office Depot',
        amount: 245.5,
        date: new Date('2026-03-05'),
        currency: 'SGD',
        tax: 22.05,
        line_items: [
          {
            description: 'Printer paper (10 reams)',
            quantity: 10,
            unit_price: 15.5,
            amount: 155,
          },
          {
            description: 'Toner cartridge',
            quantity: 2,
            unit_price: 45.25,
            amount: 90.5,
          },
        ],
      },
      status: 'categorized',
      created_at: new Date('2026-03-05'),
    },
    {
      id: 'doc-003',
      user_id: demoUserId,
      filename: 'invoice_2026-03-08_rent.pdf',
      original_name: 'Rent Invoice - PropertyCo.pdf',
      file_type: 'application/pdf',
      ocr_text: 'Monthly rent invoice for office premises',
      extracted_data: {
        vendor: 'PropertyCo Management',
        amount: 5000.0,
        date: new Date('2026-03-08'),
        currency: 'SGD',
        tax: 0,
        line_items: [
          {
            description: 'March 2026 rent - Unit 15-45',
            quantity: 1,
            unit_price: 5000,
            amount: 5000,
          },
        ],
      },
      status: 'posted',
      created_at: new Date('2026-03-08'),
    },
    {
      id: 'doc-004',
      user_id: demoUserId,
      filename: 'invoice_2026-03-12_client_xyz.pdf',
      original_name: 'Invoice to Client XYZ.pdf',
      file_type: 'application/pdf',
      ocr_text: 'Invoice for services rendered',
      extracted_data: {
        vendor: 'Client XYZ Pte Ltd',
        amount: 3500.0,
        date: new Date('2026-03-12'),
        currency: 'SGD',
        tax: 315.0,
        line_items: [
          {
            description: 'Consulting services - 20 hours',
            quantity: 20,
            unit_price: 150,
            amount: 3000,
          },
          {
            description: 'Travel reimbursement',
            quantity: 1,
            unit_price: 500,
            amount: 500,
          },
        ],
      },
      status: 'extracted',
      created_at: new Date('2026-03-12'),
    },
    {
      id: 'doc-005',
      user_id: demoUserId,
      filename: 'receipt_2026-03-20_meals.pdf',
      original_name: 'Business Lunch Receipt.pdf',
      file_type: 'application/pdf',
      ocr_text: 'Receipt for business meal expense',
      extracted_data: {
        vendor: 'Marina Bay Restaurant',
        amount: 185.5,
        date: new Date('2026-03-20'),
        currency: 'SGD',
        tax: 16.7,
        line_items: [
          {
            description: 'Lunch for 3 persons',
            quantity: 1,
            unit_price: 185.5,
            amount: 185.5,
          },
        ],
      },
      status: 'categorized',
      created_at: new Date('2026-03-20'),
    },
  ];

  sampleDocuments.forEach((doc) => {
    documents.set(doc.id, doc);
  });

  // Create sample bank transactions
  const sampleTransactions: BankTransaction[] = [
    {
      id: 'txn-001',
      user_id: demoUserId,
      date: new Date('2026-03-01'),
      description: 'Sales - Product delivery',
      amount: 8500.0,
      currency: 'SGD',
      bank_name: 'DBS Bank',
      category: 'revenue',
      reconciled: true,
      matched_document_id: undefined,
      created_at: new Date('2026-03-01'),
    },
    {
      id: 'txn-002',
      user_id: demoUserId,
      date: new Date('2026-03-02'),
      description: 'Payment to ABC Supplies',
      amount: -1362.5,
      currency: 'SGD',
      bank_name: 'DBS Bank',
      category: 'supplier',
      reconciled: true,
      matched_document_id: 'doc-001',
      created_at: new Date('2026-03-02'),
    },
    {
      id: 'txn-003',
      user_id: demoUserId,
      date: new Date('2026-03-03'),
      description: 'Wire transfer from customer',
      amount: 4250.0,
      currency: 'USD',
      bank_name: 'OCBC Bank',
      category: 'revenue',
      reconciled: true,
      matched_document_id: undefined,
      created_at: new Date('2026-03-03'),
    },
    {
      id: 'txn-004',
      user_id: demoUserId,
      date: new Date('2026-03-05'),
      description: 'Office Depot - supplies',
      amount: -267.55,
      currency: 'SGD',
      bank_name: 'DBS Bank',
      category: 'expense',
      reconciled: true,
      matched_document_id: 'doc-002',
      created_at: new Date('2026-03-05'),
    },
    {
      id: 'txn-005',
      user_id: demoUserId,
      date: new Date('2026-03-08'),
      description: 'PropertyCo - monthly rent',
      amount: -5000.0,
      currency: 'SGD',
      bank_name: 'DBS Bank',
      category: 'expense',
      reconciled: true,
      matched_document_id: 'doc-003',
      created_at: new Date('2026-03-08'),
    },
    {
      id: 'txn-006',
      user_id: demoUserId,
      date: new Date('2026-03-10'),
      description: 'Salary payment to staff',
      amount: -12500.0,
      currency: 'SGD',
      bank_name: 'DBS Bank',
      category: 'expense',
      reconciled: true,
      matched_document_id: undefined,
      created_at: new Date('2026-03-10'),
    },
    {
      id: 'txn-007',
      user_id: demoUserId,
      date: new Date('2026-03-12'),
      description: 'Client XYZ payment',
      amount: 3815.0,
      currency: 'SGD',
      bank_name: 'DBS Bank',
      category: 'revenue',
      reconciled: false,
      matched_document_id: 'doc-004',
      created_at: new Date('2026-03-12'),
    },
    {
      id: 'txn-008',
      user_id: demoUserId,
      date: new Date('2026-03-15'),
      description: 'Insurance premium',
      amount: -1250.0,
      currency: 'SGD',
      bank_name: 'DBS Bank',
      category: 'expense',
      reconciled: true,
      matched_document_id: undefined,
      created_at: new Date('2026-03-15'),
    },
    {
      id: 'txn-009',
      user_id: demoUserId,
      date: new Date('2026-03-20'),
      description: 'Marina Bay Restaurant',
      amount: -202.05,
      currency: 'SGD',
      bank_name: 'DBS Bank',
      category: 'expense',
      reconciled: true,
      matched_document_id: 'doc-005',
      created_at: new Date('2026-03-20'),
    },
    {
      id: 'txn-010',
      user_id: demoUserId,
      date: new Date('2026-03-22'),
      description: 'Cloud storage subscription',
      amount: -199.99,
      currency: 'SGD',
      bank_name: 'DBS Bank',
      category: 'expense',
      reconciled: true,
      matched_document_id: undefined,
      created_at: new Date('2026-03-22'),
    },
  ];

  sampleTransactions.forEach((txn) => {
    bankTransactions.set(txn.id, txn);
  });

  // Create sample journal entries
  const sampleJournalEntries: JournalEntry[] = [
    {
      id: 'je-001',
      user_id: demoUserId,
      document_id: 'doc-001',
      date: new Date('2026-03-01'),
      description: 'Office furniture purchase from ABC Supplies',
      status: 'posted',
      entries: [],
      total_debit: 1362.5,
      total_credit: 1362.5,
      currency: 'SGD',
      gst_amount: 112.5,
      created_at: new Date('2026-03-01'),
    },
  ];

  // Create journal entry lines for je-001
  const je001Lines: JournalEntryLine[] = [
    {
      id: 'jel-001-1',
      journal_entry_id: 'je-001',
      account_id: 'coa-014',
      account_name: 'Office Supplies',
      debit: 1250.0,
      credit: 0,
      description: 'Office furniture purchase',
      currency: 'SGD',
    },
    {
      id: 'jel-001-2',
      journal_entry_id: 'je-001',
      account_id: 'coa-008',
      account_name: 'GST Input Tax',
      debit: 112.5,
      credit: 0,
      description: 'GST on office furniture',
      currency: 'SGD',
    },
    {
      id: 'jel-001-3',
      journal_entry_id: 'je-001',
      account_id: 'coa-006',
      account_name: 'Accounts Payable',
      debit: 0,
      credit: 1362.5,
      description: 'Payment liability to ABC Supplies',
      currency: 'SGD',
    },
  ];

  sampleJournalEntries[0].entries = je001Lines;
  sampleJournalEntries.forEach((je) => {
    journalEntries.set(je.id, je);
  });

  je001Lines.forEach((jel) => {
    journalEntryLines.set(jel.id, jel);
  });

  // Create usage records
  const usageRecord: UsageRecord = {
    user_id: demoUserId,
    month: '2026-03',
    docs_processed: 5,
    storage_bytes: 2540000, // ~2.5 MB
  };

  usageRecords.set(`${demoUserId}-2026-03`, usageRecord);
}

// Call initialization on module load — store the promise so we can await it
const initPromise = initializeDatabase();

async function ensureInitialized() {
  await initPromise;
}

// User functions
export async function getUser(userId: string): Promise<User | null> {
  await ensureInitialized();
  return users.get(userId) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await ensureInitialized();
  for (const user of users.values()) {
    if (user.email === email) {
      return user;
    }
  }
  return null;
}

export async function createUser(user: User): Promise<User> {
  users.set(user.id, user);
  return user;
}

// Document functions
export async function getDocuments(userId: string): Promise<Document[]> {
  await ensureInitialized();
  return Array.from(documents.values()).filter((doc) => doc.user_id === userId);
}

export async function getDocument(documentId: string): Promise<Document | null> {
  await ensureInitialized();
  return documents.get(documentId) || null;
}

export async function createDocument(document: Document): Promise<Document> {
  documents.set(document.id, document);
  return document;
}

export async function updateDocument(
  documentId: string,
  updates: Partial<Document>
): Promise<Document | null> {
  const doc = documents.get(documentId);
  if (!doc) return null;

  const updated = { ...doc, ...updates };
  documents.set(documentId, updated);
  return updated;
}

// Journal Entry functions
export async function getJournalEntries(
  userId: string
): Promise<JournalEntry[]> {
  await ensureInitialized();
  return Array.from(journalEntries.values()).filter(
    (je) => je.user_id === userId
  );
}

export async function getJournalEntry(
  journalEntryId: string
): Promise<JournalEntry | null> {
  return journalEntries.get(journalEntryId) || null;
}

export async function createJournalEntry(
  journalEntry: JournalEntry
): Promise<JournalEntry> {
  journalEntries.set(journalEntry.id, journalEntry);
  journalEntry.entries.forEach((line) => {
    journalEntryLines.set(line.id, line);
  });
  return journalEntry;
}

export async function updateJournalEntry(
  journalEntryId: string,
  updates: Partial<JournalEntry>
): Promise<JournalEntry | null> {
  const je = journalEntries.get(journalEntryId);
  if (!je) return null;

  const updated = { ...je, ...updates };
  journalEntries.set(journalEntryId, updated);
  return updated;
}

// Bank Transaction functions
export async function getBankTransactions(
  userId: string
): Promise<BankTransaction[]> {
  await ensureInitialized();
  return Array.from(bankTransactions.values()).filter(
    (txn) => txn.user_id === userId
  );
}

export async function getBankTransaction(
  transactionId: string
): Promise<BankTransaction | null> {
  return bankTransactions.get(transactionId) || null;
}

export async function createBankTransaction(
  transaction: BankTransaction
): Promise<BankTransaction> {
  bankTransactions.set(transaction.id, transaction);
  return transaction;
}

export async function updateBankTransaction(
  transactionId: string,
  updates: Partial<BankTransaction>
): Promise<BankTransaction | null> {
  const txn = bankTransactions.get(transactionId);
  if (!txn) return null;

  const updated = { ...txn, ...updates };
  bankTransactions.set(transactionId, updated);
  return updated;
}

// Chart of Accounts functions
export async function getChartOfAccounts(
  userId: string
): Promise<ChartOfAccount[]> {
  await ensureInitialized();
  return Array.from(chartOfAccounts.values()).filter(
    (coa) => coa.user_id === userId
  );
}

export async function getChartOfAccount(
  accountId: string
): Promise<ChartOfAccount | null> {
  return chartOfAccounts.get(accountId) || null;
}

export async function createChartOfAccount(
  account: ChartOfAccount
): Promise<ChartOfAccount> {
  chartOfAccounts.set(account.id, account);
  return account;
}

// Usage functions
export async function getUsage(
  userId: string,
  month: string
): Promise<UsageRecord | null> {
  await ensureInitialized();
  return usageRecords.get(`${userId}-${month}`) || null;
}

export async function incrementUsage(
  userId: string,
  month: string,
  docsProcessed: number = 1,
  storageBytes: number = 0
): Promise<UsageRecord> {
  const key = `${userId}-${month}`;
  let record = usageRecords.get(key);

  if (!record) {
    record = {
      user_id: userId,
      month,
      docs_processed: 0,
      storage_bytes: 0,
    };
  }

  record.docs_processed += docsProcessed;
  record.storage_bytes += storageBytes;

  usageRecords.set(key, record);
  return record;
}
