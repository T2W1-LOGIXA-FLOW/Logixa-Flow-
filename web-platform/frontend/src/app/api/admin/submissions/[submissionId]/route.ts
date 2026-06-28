import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: { params: Promise<{ submissionId: string }> }) {
  try {
    const params = await context.params;
    const submissionId = params.submissionId;

    // Get single submission
    const submission = await prisma.contactSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error("Failed to fetch submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ submissionId: string }> }) {
  try {
    const params = await context.params;
    const submissionId = params.submissionId;
    const body = await request.json();

    // Update submission
    const submission = await prisma.contactSubmission.update({
      where: { id: submissionId },
      data: {
        status: body.status || undefined,
        adminNotes: body.adminNotes || undefined,
        readAt: body.readAt ? new Date(body.readAt) : undefined,
      },
    });

    return NextResponse.json(submission);
  } catch (error) {
    console.error("Failed to update submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ submissionId: string }> }) {
  try {
    const params = await context.params;
    const submissionId = params.submissionId;

    // Delete submission
    await prisma.contactSubmission.delete({
      where: { id: submissionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete submission:", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
