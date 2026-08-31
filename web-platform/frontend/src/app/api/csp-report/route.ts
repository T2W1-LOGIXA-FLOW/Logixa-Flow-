import { NextRequest, NextResponse } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now >= record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  if (record.count >= 20) {
    return true;
  }

  record.count += 1;
  return false;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many reports. Please try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const report = body?.["csp-report"];

    if (!report || typeof report !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid CSP report payload." }, { status: 400 });
    }

    const event = {
      documentUri: report["document-uri"] || null,
      violatedDirective: report["violated-directive"] || null,
      effectiveDirective: report["effective-directive"] || null,
      originalPolicy: report["original-policy"] || null,
      blockedUri: report["blocked-uri"] || null,
      referrer: report.referrer || null,
      sourceFile: report["source-file"] || null,
      sample: report.sample || null,
      ip,
      receivedAt: new Date().toISOString(),
    };

    console.warn("[CSP REPORT]", JSON.stringify(event));

    return NextResponse.json({ ok: true, received: true }, { status: 200 });
  } catch (error) {
    console.warn("[CSP REPORT] invalid payload", { ip, error });
    return NextResponse.json({ ok: false, error: "Invalid JSON payload." }, { status: 400 });
  }
}
