import { NextRequest, NextResponse } from "next/server";

import { emailTemplatePreviews } from "../data";

export async function GET(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  try {
    void request;
    const params = await context.params;
    const templateId = params.templateId;

    // Get single template
    if (templateId) {
      const template = emailTemplatePreviews.find((t) => t.id === templateId);
      if (!template) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(template);
    }

    // Get all templates
    return NextResponse.json(emailTemplatePreviews);
  } catch {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  try {
    const params = await context.params;
    const templateId = params.templateId;
    const body = await request.json();

    // Update template
    const template = emailTemplatePreviews.find((t) => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    Object.assign(template, body);
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ templateId: string }> }) {
  try {
    void request;
    const params = await context.params;
    const templateId = params.templateId;

    // Delete template
    const index = emailTemplatePreviews.findIndex((t) => t.id === templateId);
    if (index === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    emailTemplatePreviews.splice(index, 1);
    return NextResponse.json({ beta_mode: true, success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
