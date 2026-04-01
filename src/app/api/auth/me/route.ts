import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse, User } from '@/types/index';

type MeResponse = Omit<User, 'password_hash'>;

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<MeResponse>>> {
  try {
    // Verify token from Authorization header
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

    // Get user from database
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

    // Return user without password_hash
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        success: true,
        data: userWithoutPassword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
