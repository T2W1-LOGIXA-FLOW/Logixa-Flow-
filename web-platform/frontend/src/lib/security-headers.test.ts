import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "../../middleware";

describe("security headers", () => {
  it("adds CSP and HSTS headers for HTTPS requests", () => {
    const request = new NextRequest("https://example.com/test", {
      headers: {
        "x-forwarded-proto": "https",
      },
    });

    const response = middleware(request);
    const csp = response.headers.get("Content-Security-Policy");
    const cspReportOnly = response.headers.get("Content-Security-Policy-Report-Only");
    const hsts = response.headers.get("Strict-Transport-Security");

    expect(csp).toBeTruthy();
    expect(cspReportOnly).toBeTruthy();
    expect(hsts).toBe("max-age=31536000; includeSubDomains; preload");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("report-uri /api/csp-report");

    expect(cspReportOnly).toBe(csp);
  });
});
