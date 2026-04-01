import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getUser } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { ApiResponse, User } from '@/types/index';

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
  user: Omit<User, 'password_hash'>;
};

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<LoginResponse>>> {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken(user.id);

    // Return user without password_hash
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          user: userWithoutPassword,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
