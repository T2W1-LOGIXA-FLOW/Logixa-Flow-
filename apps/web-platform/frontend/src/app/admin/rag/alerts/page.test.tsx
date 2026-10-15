import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminRagAlertsPage from "./page";

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ token: "admin-token", isAuthenticated: true }),
}));

vi.mock("@/components/api", () => ({
  adminFetch: vi.fn(),
}));

describe("admin RAG alerts", () => {
  beforeEach(async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockReset();
    vi.mocked(adminFetch).mockResolvedValue({
      json: async () => ({
        threshold: 5,
        channels: [{ channel: "in_app", enabled: true }],
        alerts: [{
          alert_id: "alert-1",
          alert_type: "error_threshold",
          severity: "warning",
          message: "RAG error threshold reached.",
          created_at: "2026-09-04T12:00:00Z",
          errors: 5,
          threshold: 5,
          channels: [{ channel: "in_app", enabled: true }],
          dispatch: "mocked",
        }],
      }),
    } as Response);
  });

  it("loads alert history and mocked channel state", async () => {
    render(<AdminRagAlertsPage />);
    await waitFor(() => expect(screen.getByText("warning: error_threshold")).toBeInTheDocument());
    expect(screen.getByText(/in_app \(mock\)/)).toBeInTheDocument();
    expect(screen.getByText("5 errors / threshold 5 · mocked")).toBeInTheDocument();
  });

  it("applies threshold configuration without external dispatch", async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockResolvedValueOnce({
      json: async () => ({ threshold: 5, channels: [{ channel: "in_app", enabled: true }], alerts: [] }),
    } as Response).mockResolvedValueOnce({
      json: async () => ({ threshold: 10, persistent: false }),
    } as Response);
    render(<AdminRagAlertsPage />);
    await waitFor(() => expect(screen.getByDisplayValue("5")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Error threshold"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply configuration" }));
    await waitFor(() => expect(screen.getByText(/process only/)).toBeInTheDocument());
    expect(vi.mocked(adminFetch)).toHaveBeenCalledWith("/api/admin/rag/alerts/config", "admin-token", expect.objectContaining({
      method: "POST",
    }));
  });
});
