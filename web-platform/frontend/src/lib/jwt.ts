// src/lib/jwt.ts

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ADMIN_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('WARNING: Using default JWT secret for development. Set JWT_SECRET environment variable for production use.');
}

const secret = JWT_SECRET || 'dev-secret-key-change-in-production-' + Date.now();

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function generateToken(userId: string, email: string, role: string = 'admin'): string {
  return jwt.sign(
    { userId, email, role },
    secret,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  return decoded.exp * 1000 < Date.now();
}
