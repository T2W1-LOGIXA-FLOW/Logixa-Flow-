import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminRagPerformancePage from "./page";

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ token: "admin-token", isAuthenticated: true }),
}));
vi.mock("@/components/api", () => ({ adminFetch: vi.fn() }));

describe("admin RAG performance dashboard", () => {
  beforeEach(async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockReset();
    vi.mocked(adminFetch).mockResolvedValue({
      json: async () => ({
        cache: { entries: 2, max_entries: 512, ttl_seconds: 30, hit_rate: 0.5 },
        search: { requests: 4, cache_hits: 2, timeouts: 0, average_duration_ms: 12.5, concurrency_limit: 4, timeout_seconds: 5 },
        query_plan: { index_strategy: "vector_similarity_backend", lazy_loading: true, max_candidates: 50, ordering_fallback: "relevance_when_created_at_unavailable" },
        recommendations: ["Keep vector index statistics current before production scale-up."],
      }),
    } as Response);
  });

  it("loads performance metrics and recommendations", async () => {
    render(<AdminRagPerformancePage />);
    await waitFor(() => expect(screen.getByText("50%")).toBeInTheDocument());
    expect(screen.getByText("12.5 ms")).toBeInTheDocument();
    expect(screen.getByText("Keep vector index statistics current before production scale-up.")).toBeInTheDocument();
    expect(vi.mocked((await import("@/components/api")).adminFetch)).toHaveBeenCalledWith("/api/admin/rag/performance", "admin-token");
  });
});
