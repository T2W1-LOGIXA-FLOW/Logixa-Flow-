import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import AdminAnalyticsPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({
    token: "test-token",
    isAuthenticated: true,
  }),
}));

vi.mock("@/components/api", () => ({
  adminFetch: vi.fn().mockResolvedValue({
    json: async () => [
      {
        date: "2026-09-03",
        agent_runs: 2,
        sources_added: 1,
        published_posts: 1,
        pending_approvals: 0,
      },
    ],
  }),
}));

describe("Admin analytics page", () => {
  it("loads an authenticated snapshot without creating a tokenized stream URL", async () => {
    const { adminFetch } = await import("@/components/api");
    const eventSource = vi.fn();
    vi.stubGlobal("EventSource", eventSource);

    render(<AdminAnalyticsPage />);

    await waitFor(() => expect(screen.getByText("Live analytics streaming is unavailable; showing the latest authenticated snapshot.")).toBeInTheDocument());
    expect(adminFetch).toHaveBeenCalledWith("/api/admin/analytics?days=7", "test-token");
    expect(eventSource).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("test-token");
  });
});
