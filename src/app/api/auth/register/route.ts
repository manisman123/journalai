import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { ApiResponse, User } from '@/types/index';
import { nanoid } from 'nanoid';

type RegisterRequest = {
  email: string;
  password: string;
  name: string;
  company_name: string;
};

type RegisterResponse = {
  token: string;
  user: Omit<User, 'password_hash'>;
};

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<RegisterResponse>>> {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, name, company_name } = body;

    // Validate input
    if (!email || !password || !name || !company_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email, password, name, and company_name are required',
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email already registered',
        },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create new user with free tier
    const newUser: User = {
      id: nanoid(),
      email,
      password_hash,
      name,
      company_name,
      tier: 'free',
      created_at: new Date(),
    };

    const createdUser = await createUser(newUser);

    // Generate token
    const token = generateToken(createdUser.id);

    // Return user without password_hash
    const { password_hash: _, ...userWithoutPassword } = createdUser;

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          user: userWithoutPassword,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
