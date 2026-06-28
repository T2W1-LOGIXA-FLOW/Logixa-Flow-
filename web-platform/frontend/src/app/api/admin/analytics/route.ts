import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface AnalyticsEvent {
  timestamp: Date;
  deviceType: string | null;
}

interface ContactSubmission {
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch analytics events from database
    const events = await prisma.analyticsEvent.findMany({
      where: {
        timestamp: {
          gte: startDate,
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Fetch submissions in date range
    const submissions = await prisma.contactSubmission.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Group events by date and event name
    const pageViewsData = [];
    const submissionsData = [];
    const deviceData: Record<string, number> = {};
    let totalPageViews = 0;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      // Count page views for this date
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = events.filter(
        (e: AnalyticsEvent) => e.timestamp >= dayStart && e.timestamp <= dayEnd
      );
      const dayViews = dayEvents.length;

      pageViewsData.push({
        name: dateStr,
        value: dayViews,
      });

      // Count submissions for this date
      const daySubmissions = submissions.filter((s: ContactSubmission) => {
        const sDate = new Date(s.createdAt);
        return sDate >= dayStart && sDate <= dayEnd;
      });

      submissionsData.push({
        name: dateStr,
        value: daySubmissions.length,
      });

      totalPageViews += dayViews;
    }

    // Count device types
    events.forEach((event: AnalyticsEvent) => {
      const device = event.deviceType ?? "Unknown";
      deviceData[device] = (deviceData[device] || 0) + 1;
    });

    const devices = Object.entries(deviceData).map(([name, value]) => ({
      name,
      value,
    }));

    // Calculate stats
    const stats = {
      totalPageViews,
      totalSubmissions: submissions.length,
      avgSessionDuration: Math.floor(Math.random() * 300) + 60, // Placeholder - requires session tracking
      bounceRate: Math.floor(Math.random() * 40) + 20, // Placeholder - requires session tracking
    };

    return NextResponse.json({
      stats,
      pageViews: pageViewsData,
      submissions: submissionsData,
      devices: devices.length > 0 ? devices : [
        { name: "Desktop", value: 0 },
        { name: "Mobile", value: 0 },
        { name: "Tablet", value: 0 },
      ],
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
