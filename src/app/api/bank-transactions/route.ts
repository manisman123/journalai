import { NextRequest, NextResponse } from 'next/server';
import { getBankTransactions, createBankTransaction } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse, BankTransaction } from '@/types/index';
import { nanoid } from 'nanoid';

type CreateBankTransactionRequest = {
  date: string;
  description: string;
  amount: number;
  currency: string;
  bank_name: string;
  category: string;
};

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<BankTransaction[]>>> {
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

    // Get reconciled filter from query params
    const reconciledParam = request.nextUrl.searchParams.get('reconciled');

    let transactions = await getBankTransactions(userId);

    // Filter by reconciled status if provided
    if (reconciledParam !== null) {
      const reconciled = reconciledParam === 'true';
      transactions = transactions.filter((t) => t.reconciled === reconciled);
    }

    return NextResponse.json(
      {
        success: true,
        data: transactions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get bank transactions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<BankTransaction>>> {
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

    const body: CreateBankTransactionRequest = await request.json();
    const { date, description, amount, currency, bank_name, category } = body;

    // Validate input
    if (!date || !description || amount === undefined || !currency || !bank_name || !category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Date, description, amount, currency, bank_name, and category are required',
        },
        { status: 400 }
      );
    }

    const transaction: BankTransaction = {
      id: nanoid(),
      user_id: userId,
      date: new Date(date),
      description,
      amount,
      currency,
      bank_name,
      category,
      reconciled: false,
      created_at: new Date(),
    };

    const createdTransaction = await createBankTransaction(transaction);

    return NextResponse.json(
      {
        success: true,
        data: createdTransaction,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create bank transaction error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
