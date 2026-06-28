import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/lib/jwt";

export function requireNextAdmin(request: NextRequest): NextResponse | null {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Missing admin token" }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Invalid admin token" }, { status: 401 });
  }

  return null;
}
