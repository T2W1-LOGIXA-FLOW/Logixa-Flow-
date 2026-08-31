import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CSP_REPORT_ONLY_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "frame-ancestors 'none'",
  "form-action 'self' https:",
  "base-uri 'self'",
  "object-src 'none'",
  "media-src 'self' blob: https:",
  "report-uri /api/csp-report",
  "report-to csp-endpoint",
].join("; ");

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname === "/admin/forgot-password") {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy-Report-Only", CSP_REPORT_ONLY_DIRECTIVES);
    response.headers.set(
      "Reporting-Endpoints",
      `csp-endpoint="${new URL("/api/csp-report", request.url).toString()}"`
    );
    return response;
  }

  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("adminToken")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/csp-report")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy-Report-Only", CSP_REPORT_ONLY_DIRECTIVES);
  response.headers.set(
    "Reporting-Endpoints",
    `csp-endpoint="${new URL("/api/csp-report", request.url).toString()}"`
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
