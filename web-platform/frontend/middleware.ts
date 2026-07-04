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
