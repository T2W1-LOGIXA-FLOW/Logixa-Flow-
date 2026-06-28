import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public admin routes
  if (pathname === "/admin/login" || pathname === "/admin/forgot-password") {
    return NextResponse.next();
  }

  // Protect /admin routes
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("adminToken")?.value;

    if (!token) {
      // Note: Middleware cannot access localStorage
      // For full protection, tokens should be stored in cookies
      // Current implementation uses localStorage, so client-side checks are primary
      // This middleware provides basic protection for cookie-based auth
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    "/admin/:path*",
  ],
};
