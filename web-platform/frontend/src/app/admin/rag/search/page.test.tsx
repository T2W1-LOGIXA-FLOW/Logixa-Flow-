import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminRagSearchPage from "./page";

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ token: "admin-token", isAuthenticated: true }),
}));

vi.mock("@/components/api", () => ({
  adminFetch: vi.fn(),
}));

describe("admin RAG search", () => {
  beforeEach(async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockReset();
  });

  it("shows authenticated search progress and matches", async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockResolvedValue({
      json: async () => ({ matches: [{ title: "Port guidance", score: 0.9, content: "Use verified sources." }], attempts: 1 }),
    } as Response);
    render(<AdminRagSearchPage />);
    fireEvent.change(screen.getByLabelText("Search query"), { target: { value: "port congestion" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByText("Port guidance")).toBeInTheDocument());
    expect(adminFetch).toHaveBeenCalledWith("/api/admin/rag/search?q=port%20congestion", "admin-token");
  });

  it("shows retry and safe details for structured search failures", async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockRejectedValue(new Error(JSON.stringify({
      detail: {
        error_type: "search",
        message: "RAG search failed. Review the correlation ID and retry if permitted.",
        retry: { retryable: true, attempt: 2, max_attempts: 2 },
        correlation: { correlation_id: "search-corr-1" },
        fallback: { used: false, strategy: "json_cosine" },
      },
    })));
    render(<AdminRagSearchPage />);
    fireEvent.change(screen.getByLabelText("Search query"), { target: { value: "port congestion" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry search" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "View error details" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("search-corr-1");
    expect(screen.getByRole("dialog")).toHaveTextContent("json_cosine");
  });
});
