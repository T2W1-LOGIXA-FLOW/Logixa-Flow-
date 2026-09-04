import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminRagSearchPage from "./page";

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ token: "admin-token", isAuthenticated: true }),
}));
vi.mock("@/components/api", () => ({ adminFetch: vi.fn() }));

describe("advanced RAG search", () => {
  beforeEach(async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockReset();
    vi.mocked(adminFetch).mockResolvedValue({
      json: async () => ({ query: "ports", matches: [{ title: "Guide", score: 0.9, content: "content" }], total: 1, page: 1, page_size: 6, has_more: false }),
    } as Response);
  });

  it("submits filters and sort options", async () => {
    const { adminFetch } = await import("@/components/api");
    render(<AdminRagSearchPage />);
    fireEvent.change(screen.getByLabelText("Search query"), { target: { value: "ports" } });
    fireEvent.change(screen.getByLabelText("Source type filter"), { target: { value: "guide" } });
    fireEvent.change(screen.getByLabelText("Sort results"), { target: { value: "title" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByText("Guide")).toBeInTheDocument());
    expect(vi.mocked(adminFetch)).toHaveBeenCalledWith("/api/admin/rag/search?q=ports&source_type=guide&sort=title", "admin-token");
  });

  it("submits multiple queries as one authenticated request", async () => {
    const { adminFetch } = await import("@/components/api");
    render(<AdminRagSearchPage />);
    fireEvent.change(screen.getByLabelText("Multi-query (one query per line)"), { target: { value: "ports\nsupplier risk" } });
    fireEvent.click(screen.getByRole("button", { name: "Run multi-query" }));
    await waitFor(() => expect(screen.getByText("Guide")).toBeInTheDocument());
    expect(vi.mocked(adminFetch)).toHaveBeenCalledWith("/api/admin/rag/search/batch", "admin-token", expect.objectContaining({ method: "POST" }));
  });
});
