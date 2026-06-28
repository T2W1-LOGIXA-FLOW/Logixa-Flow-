// src/lib/adminAuthMiddleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

export function createAuthMiddleware(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const token = extractToken(request);

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized: No token provided' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Attach user to request
    const authRequest = request as AuthenticatedRequest;
    authRequest.user = user;

    try {
      return await handler(authRequest);
    } catch (error) {
      console.error('Handler error:', error);
      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

export function requireAdminAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return createAuthMiddleware(handler);
}

export function requireRole(role: string, handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return createAuthMiddleware(async (request: AuthenticatedRequest) => {
    if (request.user?.role !== role) {
      return NextResponse.json(
        { message: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(request);
  });
}
