import { NextRequest, NextResponse } from 'next/server';
import { getBankTransaction, getDocument, updateBankTransaction } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse, BankTransaction } from '@/types/index';

type ReconcileRequest = {
  document_id: string;
};

type Params = {
  id: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse<ApiResponse<BankTransaction>>> {
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

    const transaction = await getBankTransaction(id);

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bank transaction not found',
        },
        { status: 404 }
      );
    }

    // Verify user owns this transaction
    if (transaction.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 }
      );
    }

    const body: ReconcileRequest = await request.json();
    const { document_id } = body;

    if (!document_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document ID is required',
        },
        { status: 400 }
      );
    }

    // Get document to verify it exists and user owns it
    const document = await getDocument(document_id);

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    if (document.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 }
      );
    }

    // Check if amounts match (with some tolerance for rounding)
    const documentAmount = document.extracted_data.amount || 0;
    const transactionAmount = Math.abs(transaction.amount);

    // Allow 5% tolerance for matching
    const tolerance = transactionAmount * 0.05;
    if (Math.abs(documentAmount - transactionAmount) > tolerance) {
      return NextResponse.json(
        {
          success: false,
          error: `Amount mismatch. Document amount (${documentAmount}) does not match transaction amount (${transactionAmount})`,
        },
        { status: 400 }
      );
    }

    // Update transaction to mark as reconciled
    const updatedTransaction = await updateBankTransaction(id, {
      reconciled: true,
      matched_document_id: document_id,
    });

    if (!updatedTransaction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to reconcile transaction',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedTransaction,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reconcile transaction error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
