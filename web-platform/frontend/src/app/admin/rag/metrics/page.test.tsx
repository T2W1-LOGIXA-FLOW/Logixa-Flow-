import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminRagMetricsPage from "./page";

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ token: "admin-token", isAuthenticated: true }),
}));

vi.mock("@/components/api", () => ({
  adminFetch: vi.fn(),
}));

describe("admin RAG metrics dashboard", () => {
  beforeEach(async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockReset();
    vi.mocked(adminFetch).mockResolvedValue({
      json: async () => ({
        hours: 24,
        total_errors: 6,
        error_rate: 0.25,
        by_type: [{ error_type: "search", errors: 6, rate: 0.25 }],
        time_series: [{ timestamp: "2026-09-04T12:00:00Z", errors: 6 }],
        alert: { threshold: 5, errors: 6, triggered: true },
      }),
    } as Response);
  });

  it("loads aggregate metrics and alert status", async () => {
    render(<AdminRagMetricsPage />);
    await waitFor(() => expect(screen.getByText("Threshold reached")).toBeInTheDocument());
    expect(screen.getByText(/search: 6/)).toBeInTheDocument();
    expect(screen.getByLabelText("Hourly error trend")).toBeInTheDocument();
  });

  it("requests the selected time range", async () => {
    render(<AdminRagMetricsPage />);
    await waitFor(() => expect(screen.getByText("Threshold reached")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Time range"), { target: { value: "168" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument());
    expect(screen.getByLabelText("Time range")).toHaveValue("168");
    expect(vi.mocked((await import("@/components/api")).adminFetch)).toHaveBeenCalledWith(
      "/api/admin/rag/metrics?hours=168",
      "admin-token",
    );
  });
});
