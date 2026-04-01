import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntries, createJournalEntry, getChartOfAccount } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { calculateGST } from '@/lib/subscription-config';
import { ApiResponse, JournalEntry, JournalEntryLine } from '@/types/index';
import { nanoid } from 'nanoid';

type CreateJournalEntryRequest = {
  document_id?: string;
  date: string;
  description: string;
  lines: {
    account_id: string;
    debit: number;
    credit: number;
    description: string;
  }[];
  currency: string;
};

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<JournalEntry[]>>> {
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

    // Get status filter from query params
    const status = request.nextUrl.searchParams.get('status') as
      | 'draft'
      | 'pending'
      | 'posted'
      | 'voided'
      | null;

    let entries = await getJournalEntries(userId);

    // Filter by status if provided
    if (status) {
      entries = entries.filter((e) => e.status === status);
    }

    return NextResponse.json(
      {
        success: true,
        data: entries,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get journal entries error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<JournalEntry>>> {
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

    const body: CreateJournalEntryRequest = await request.json();
    const { document_id, date, description, lines, currency } = body;

    // Validate input
    if (!date || !description || !lines || lines.length === 0 || !currency) {
      return NextResponse.json(
        {
          success: false,
          error: 'Date, description, lines, and currency are required',
        },
        { status: 400 }
      );
    }

    // Calculate totals
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    // Validate double-entry: debits must equal credits
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: `Double-entry validation failed. Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Calculate GST from extracted data or provided amount
    const gstAmount = totalDebit * 0.09; // Assuming 9% GST rate for expenses

    const journalEntryId = nanoid();

    // Create journal entry lines
    const journalLines: JournalEntryLine[] = await Promise.all(
      lines.map(async (line, index) => {
        const account = await getChartOfAccount(line.account_id);
        return {
          id: `jel-${journalEntryId}-${index + 1}`,
          journal_entry_id: journalEntryId,
          account_id: line.account_id,
          account_name: account?.name || 'Unknown Account',
          debit: line.debit,
          credit: line.credit,
          description: line.description,
          currency: currency,
        };
      })
    );

    // Create journal entry
    const journalEntry: JournalEntry = {
      id: journalEntryId,
      user_id: userId,
      document_id,
      date: new Date(date),
      description,
      status: 'draft',
      entries: journalLines,
      total_debit: totalDebit,
      total_credit: totalCredit,
      currency,
      gst_amount: gstAmount,
      created_at: new Date(),
    };

    const createdEntry = await createJournalEntry(journalEntry);

    return NextResponse.json(
      {
        success: true,
        data: createdEntry,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create journal entry error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
