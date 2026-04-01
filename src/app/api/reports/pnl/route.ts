import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntries } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { convertCurrency } from '@/lib/subscription-config';
import { ApiResponse } from '@/types/index';

type PNLCategory = {
  name: string;
  amount: number;
};

type PNLReport = {
  period: string;
  revenue: {
    total: number;
    categories: PNLCategory[];
  };
  expenses: {
    total: number;
    categories: PNLCategory[];
  };
  net_income: number;
  gst_collected: number;
  gst_paid: number;
  currency: string;
};

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<PNLReport>>> {
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

    // Get all journal entries
    const journalEntries = await getJournalEntries(userId);

    // Group by revenue and expense accounts
    const revenueCategories: Record<string, number> = {};
    const expenseCategories: Record<string, number> = {};

    journalEntries.forEach((je) => {
      if (je.status === 'posted') {
        je.entries.forEach((line) => {
          // Convert to SGD for consistent reporting
          const amountSGD = convertCurrency(
            line.debit > 0 ? line.debit : line.credit,
            line.currency,
            'SGD'
          );

          if (line.account_name.toLowerCase().includes('revenue')) {
            if (!revenueCategories[line.account_name]) {
              revenueCategories[line.account_name] = 0;
            }
            revenueCategories[line.account_name] += amountSGD;
          } else if (line.account_name.toLowerCase().includes('expense') || line.debit > 0) {
            if (!expenseCategories[line.account_name]) {
              expenseCategories[line.account_name] = 0;
            }
            expenseCategories[line.account_name] += amountSGD;
          }
        });
      }
    });

    // Calculate totals
    const revenueTotal = Object.values(revenueCategories).reduce((sum, val) => sum + val, 0);
    const expenseTotal = Object.values(expenseCategories).reduce((sum, val) => sum + val, 0);
    const netIncome = revenueTotal - expenseTotal;

    // Calculate GST
    let gstCollected = 0;
    let gstPaid = 0;
    journalEntries.forEach((je) => {
      if (je.status === 'posted' && je.gst_amount) {
        je.entries.forEach((line) => {
          if (line.account_name.toLowerCase().includes('gst output') || line.account_name.toLowerCase().includes('gst collected')) {
            gstCollected += line.credit > 0 ? line.credit : line.debit;
          } else if (line.account_name.toLowerCase().includes('gst input')) {
            gstPaid += line.debit > 0 ? line.debit : line.credit;
          }
        });
      }
    });

    // Format report
    const report: PNLReport = {
      period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      revenue: {
        total: revenueTotal,
        categories: Object.entries(revenueCategories).map(([name, amount]) => ({
          name,
          amount: Math.round(amount * 100) / 100,
        })),
      },
      expenses: {
        total: expenseTotal,
        categories: Object.entries(expenseCategories).map(([name, amount]) => ({
          name,
          amount: Math.round(amount * 100) / 100,
        })),
      },
      net_income: Math.round(netIncome * 100) / 100,
      gst_collected: Math.round(gstCollected * 100) / 100,
      gst_paid: Math.round(gstPaid * 100) / 100,
      currency: 'SGD',
    };

    return NextResponse.json(
      {
        success: true,
        data: report,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get P&L report error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
