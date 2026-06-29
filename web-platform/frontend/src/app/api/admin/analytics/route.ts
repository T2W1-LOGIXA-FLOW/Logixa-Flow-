import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");
    const pageViewsData = [];
    const submissionsData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      pageViewsData.push({
        name: dateStr,
        value: 0,
      });

      submissionsData.push({
        name: dateStr,
        value: 0,
      });
    }

    return NextResponse.json({
      beta_mode: true,
      stats: {
        totalPageViews: 0,
        totalSubmissions: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
      },
      pageViews: pageViewsData,
      submissions: submissionsData,
      devices: [
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
