import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntry, updateJournalEntry } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse, JournalEntry } from '@/types/index';

type UpdateJournalEntryRequest = Partial<JournalEntry>;

type Params = {
  id: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse<ApiResponse<JournalEntry>>> {
  const { id } = await params;
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

    const journalEntry = await getJournalEntry(id);

    if (!journalEntry) {
      return NextResponse.json(
        {
          success: false,
          error: 'Journal entry not found',
        },
        { status: 404 }
      );
    }

    // Verify user owns this journal entry
    if (journalEntry.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: journalEntry,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get journal entry error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse<ApiResponse<JournalEntry>>> {
  const { id } = await params;
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

    const journalEntry = await getJournalEntry(id);

    if (!journalEntry) {
      return NextResponse.json(
        {
          success: false,
          error: 'Journal entry not found',
        },
        { status: 404 }
      );
    }

    // Verify user owns this journal entry
    if (journalEntry.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 }
      );
    }

    const body: UpdateJournalEntryRequest = await request.json();

    // Only allow updating specific fields
    const allowedUpdates = ['status', 'entries', 'total_debit', 'total_credit'];
    const updates: Partial<JournalEntry> = {};

    for (const key of allowedUpdates) {
      if (key in body) {
        (updates as any)[key] = (body as any)[key];
      }
    }

    // If updating entries, recalculate totals
    if (updates.entries) {
      const newDebit = updates.entries.reduce((sum, line) => sum + (line.debit || 0), 0);
      const newCredit = updates.entries.reduce((sum, line) => sum + (line.credit || 0), 0);

      // Validate double-entry
      if (Math.abs(newDebit - newCredit) > 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: `Double-entry validation failed. Debits (${newDebit.toFixed(2)}) must equal credits (${newCredit.toFixed(2)})`,
          },
          { status: 400 }
        );
      }

      updates.total_debit = newDebit;
      updates.total_credit = newCredit;
    }

    const updatedEntry = await updateJournalEntry(id, updates);

    if (!updatedEntry) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update journal entry',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedEntry,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update journal entry error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
