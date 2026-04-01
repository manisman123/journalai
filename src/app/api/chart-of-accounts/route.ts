import { NextRequest, NextResponse } from 'next/server';
import { getChartOfAccounts, createChartOfAccount } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse, ChartOfAccount } from '@/types/index';
import { nanoid } from 'nanoid';

type CreateAccountRequest = {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string;
};

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ChartOfAccount[]>>> {
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

    const accounts = await getChartOfAccounts(userId);

    return NextResponse.json(
      {
        success: true,
        data: accounts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get chart of accounts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ChartOfAccount>>> {
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

    const body: CreateAccountRequest = await request.json();
    const { code, name, type, parent_id } = body;

    // Validate input
    if (!code || !name || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Code, name, and type are required',
        },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid account type',
        },
        { status: 400 }
      );
    }

    const account: ChartOfAccount = {
      id: nanoid(),
      user_id: userId,
      code,
      name,
      type,
      parent_id,
      is_default: false,
    };

    const createdAccount = await createChartOfAccount(account);

    return NextResponse.json(
      {
        success: true,
        data: createdAccount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create chart of account error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
