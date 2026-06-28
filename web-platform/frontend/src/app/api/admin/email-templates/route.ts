import { NextResponse } from "next/server";

import { emailTemplatePreviews } from "./data";

export async function GET() {
  return NextResponse.json(emailTemplatePreviews);
}
