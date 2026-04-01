import { NextRequest, NextResponse } from 'next/server';
import {
  getUser,
  getDocuments,
  getJournalEntries,
  getBankTransactions,
  getUsage,
} from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { TIERS, CURRENCY_RATES, convertCurrency } from '@/lib/subscription-config';
import { ApiResponse } from '@/types/index';

type DashboardStats = {
  total_documents: number;
  documents_this_month: number;
  total_journal_entries: number;
  pending_entries: number;
  unreconciled_transactions: number;
  reconciled_count: number;
  revenue_total: number;
  expense_total: number;
  net_income: number;
  gst_collected: number;
  gst_paid: number;
  gst_liability: number;
  usage: {
    docs_processed: number;
    docs_limit: number;
    storage_used: number;
    storage_limit: number;
  };
  recent_activity: any[];
  currency_breakdown: Record<string, number>;
};

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<DashboardStats>>> {
  try {
    const userId = getUserFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get user
    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Get all documents
    const documents = await getDocuments(userId);
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM
    const documentsThisMonth = documents.filter((doc) => {
      const docMonth = doc.created_at.toISOString().slice(0, 7);
      return docMonth === currentMonth;
    }).length;

    // Get all journal entries
    const journalEntries = await getJournalEntries(userId);
    const pendingEntries = journalEntries.filter((je) => je.status === 'pending').length;

    // Get all bank transactions
    const bankTransactions = await getBankTransactions(userId);
    const unreconciledTransactions = bankTransactions.filter((t) => !t.reconciled).length;
    const reconciledCount = bankTransactions.filter((t) => t.reconciled).length;

    // Calculate P&L
    let revenueTotalSGD = 0;
    let expenseTotalSGD = 0;
    let gstCollected = 0;
    let gstPaid = 0;

    journalEntries.forEach((je) => {
      if (je.status === 'posted') {
        je.entries.forEach((line) => {
          // Convert to SGD for comparison
          const lineAmountSGD = convertCurrency(
            line.debit > 0 ? line.debit : line.credit,
            line.currency,
            'SGD'
          );

          // Simple categorization: if account_name contains 'Revenue', it's revenue
          if (line.account_name.toLowerCase().includes('revenue')) {
            revenueTotalSGD += lineAmountSGD;
            gstCollected += je.gst_amount;
          } else if (line.account_name.toLowerCase().includes('expense') || line.debit > 0) {
            expenseTotalSGD += lineAmountSGD;
            gstPaid += je.gst_amount;
          }
        });
      }
    });

    const netIncome = revenueTotalSGD - expenseTotalSGD;
    const gstLiability = gstCollected - gstPaid;

    // Get usage
    const usageRecord = await getUsage(userId, currentMonth);
    const tierConfig = TIERS[user.tier];
    const docsProcessed = usageRecord?.docs_processed || 0;
    const docsLimit = tierConfig.docsPerMonth;
    const storageUsed = usageRecord?.storage_bytes || 0;
    const storageLimit = tierConfig.storageMB * 1024 * 1024;

    // Prepare recent activity (last 5 documents and journal entries)
    const recentActivity = [
      ...documents.slice(-3).map((d) => ({
        type: 'document',
        date: d.created_at,
        description: `${d.original_name} - ${d.status}`,
      })),
      ...journalEntries.slice(-2).map((je) => ({
        type: 'journal_entry',
        date: je.created_at,
        description: `${je.description} - ${je.status}`,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    // Prepare currency breakdown
    const currencyBreakdown: Record<string, number> = {};
    journalEntries.forEach((je) => {
      if (!currencyBreakdown[je.currency]) {
        currencyBreakdown[je.currency] = 0;
      }
      currencyBreakdown[je.currency] += je.total_debit;
    });

    const stats: DashboardStats = {
      total_documents: documents.length,
      documents_this_month: documentsThisMonth,
      total_journal_entries: journalEntries.length,
      pending_entries: pendingEntries,
      unreconciled_transactions: unreconciledTransactions,
      reconciled_count: reconciledCount,
      revenue_total: revenueTotalSGD,
      expense_total: expenseTotalSGD,
      net_income: netIncome,
      gst_collected: gstCollected,
      gst_paid: gstPaid,
      gst_liability: gstLiability,
      usage: {
        docs_processed: docsProcessed,
        docs_limit: docsLimit,
        storage_used: storageUsed,
        storage_limit: storageLimit,
      },
      recent_activity: recentActivity,
      currency_breakdown: currencyBreakdown,
    };

    return NextResponse.json(
      {
        success: true,
        data: stats,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
