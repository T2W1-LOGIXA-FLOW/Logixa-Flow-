import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminRagQualityPage from "./page";

vi.mock("@/hooks/useAdminAuth", () => ({ useAdminAuth: () => ({ token: "admin-token", isAuthenticated: true }) }));
vi.mock("@/components/api", () => ({ adminFetch: vi.fn() }));

describe("admin RAG quality dashboard", () => {
  beforeEach(async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockReset().mockResolvedValue({
      json: async () => ({
        feedback_count: 2,
        average_rating: 4,
        helpful_rate: 0.5,
        by_variant: { control: { feedback_count: 2, average_rating: 4, helpful_rate: 0.5 } },
        ab_test: { name: "test", control: "control", treatment: "treatment", enabled: false },
        report: "Quality metrics are based on bounded in-memory admin feedback.",
      }),
    } as Response);
  });

  it("shows metrics and submits authenticated feedback", async () => {
    const { adminFetch } = await import("@/components/api");
    render(<AdminRagQualityPage />);
    await waitFor(() => expect(screen.getByText("4 / 5")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Query ID"), { target: { value: "query-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    await waitFor(() => expect(screen.getByText("Feedback recorded.")).toBeInTheDocument());
    expect(vi.mocked(adminFetch)).toHaveBeenCalledWith("/api/admin/rag/quality/feedback", "admin-token", expect.objectContaining({ method: "POST" }));
  });
});
