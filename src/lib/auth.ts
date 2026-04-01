import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

// Hardcoded JWT secret for demo purposes
// In production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'journalai-demo-secret-key-2026';
const JWT_EXPIRY = '24h';

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

/**
 * Compare a plain text password with a hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Extract and verify a Bearer token from a NextRequest
 * Returns the user ID if valid, null otherwise
 */
export function getUserFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  const payload = verifyToken(token);

  return payload?.userId || null;
}
