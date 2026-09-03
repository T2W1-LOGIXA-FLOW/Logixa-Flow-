import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminRagIngestPage from "./page";

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ token: "admin-token", isAuthenticated: true }),
}));

vi.mock("@/components/api", () => ({
  adminFetch: vi.fn(),
}));

describe("admin RAG ingestion", () => {
  beforeEach(async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockReset();
  });

  it("keeps ingestion behind admin authentication", () => {
    render(<AdminRagIngestPage />);
    expect(screen.getByRole("button", { name: "Start ingestion" })).toBeInTheDocument();
  });

  it("shows progress counts after an authenticated ingestion", async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockResolvedValue({
      json: async () => ({ sources: 2, brain_items: 1, chunks: 8, attempts: 2, errors: 0 }),
    } as Response);
    render(<AdminRagIngestPage />);
    fireEvent.click(screen.getByRole("button", { name: "Start ingestion" }));
    await waitFor(() => expect(screen.getByText(/Processed 2 sources and 1 brain items/)).toBeInTheDocument());
    expect(screen.getByText(/Errors: 0/)).toBeInTheDocument();
  });

  it("shows retry and safe error details for retryable failures", async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockRejectedValue(
      new Error(
        JSON.stringify({
          detail: {
            error_type: "transient",
            message: "RAG ingestion failed. Review the correlation ID and retry if permitted.",
            retry: { retryable: true, attempt: 2, max_attempts: 3 },
            correlation: { correlation_id: "corr-123" },
          },
        }),
      ),
    );
    render(<AdminRagIngestPage />);
    fireEvent.click(screen.getByRole("button", { name: "Start ingestion" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry ingestion" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "View error details" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("corr-123");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("provider");
  });
});
