import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendConfirmationEmail, sendAdminNotification } from "@/lib/email";
import DOMPurify from "isomorphic-dompurify";

// Validation schema
const contactSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(3).max(100),
  message: z.string().min(10).max(5000),
});

// Rate limiting map (IP -> request count)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(ip, { count: 1, resetTime: now + 3600000 }); // 1 hour
    return true;
  }

  if (limit.count >= 5) {
    return false; // Rate limited
  }

  limit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const data = contactSchema.parse(body);

    // Sanitize inputs
    const sanitizedData = {
      name: DOMPurify.sanitize(data.name),
      email: DOMPurify.sanitize(data.email),
      phone: data.phone ? DOMPurify.sanitize(data.phone) : undefined,
      subject: DOMPurify.sanitize(data.subject),
      message: DOMPurify.sanitize(data.message),
    };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const submissionId = `contact-${Date.now()}`;

    if (apiUrl) {
      await fetch(`${apiUrl}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sanitizedData.name,
          email: sanitizedData.email,
          company: sanitizedData.phone || undefined,
          message: `${sanitizedData.subject}\n\n${sanitizedData.message}`,
        }),
      });
    }

    // Send confirmation email
    await sendConfirmationEmail(data.email, data.name, submissionId);

    // Send admin notification
    await sendAdminNotification(
      data.name,
      data.email,
      data.subject,
      sanitizedData.message,
      data.phone
    );

    return NextResponse.json(
      {
        success: true,
        message: "Thank you! Your message has been received.",
        submissionId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contact form error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid form data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
