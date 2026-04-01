import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntry, getUser } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { checkCompliance } from '@/lib/ocr-engine';
import { ApiResponse, ComplianceCheckResult } from '@/types/index';

type ComplianceCheckRequest = {
  journal_entry_id: string;
};

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ComplianceCheckResult>>> {
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

    const body: ComplianceCheckRequest = await request.json();
    const { journal_entry_id } = body;

    if (!journal_entry_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Journal entry ID is required',
        },
        { status: 400 }
      );
    }

    // Get journal entry
    const journalEntry = await getJournalEntry(journal_entry_id);

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

    // Get user to check tier
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

    // Run compliance check
    const result = checkCompliance(journalEntry, user.tier);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Compliance check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
