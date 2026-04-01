import { NextRequest, NextResponse } from 'next/server';
import { getDocument, getChartOfAccounts } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { categorizeTransaction } from '@/lib/ocr-engine';
import { ApiResponse, CategorizationResult } from '@/types/index';

type Params = {
  id: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse<ApiResponse<CategorizationResult>>> {
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

    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Verify user owns this document
    if (document.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 }
      );
    }

    // Get chart of accounts for this user
    const accounts = await getChartOfAccounts(userId);

    if (accounts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No chart of accounts found for this user',
        },
        { status: 400 }
      );
    }

    // Categorize transaction
    const description = document.extracted_data.vendor || document.ocr_text;
    const amount = document.extracted_data.amount || 0;

    const categorizationResult = categorizeTransaction(description, amount, accounts);

    return NextResponse.json(
      {
        success: true,
        data: categorizationResult,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Categorize document error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
