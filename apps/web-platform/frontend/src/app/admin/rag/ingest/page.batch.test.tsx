import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminRagIngestPage from "./page";

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ token: "admin-token", isAuthenticated: true }),
}));

vi.mock("@/components/api", () => ({
  adminFetch: vi.fn(),
}));

describe("admin RAG batch ingestion", () => {
  beforeEach(async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockReset();
  });

  it("uploads files and displays per-file progress and recovery state", async () => {
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockResolvedValue({
      json: async () => ({
        batch_id: "batch-1",
        total_files: 2,
        completed_files: 1,
        failed_files: 1,
        total_chunks: 3,
        files: [
          { file_name: "ok.txt", status: "completed", chunks: 3 },
          { file_name: "retry.md", status: "failed", chunks: 0, error: "Retry this file", recovery: { retryable: true, max_attempts: 3 } },
        ],
      }),
    } as Response);
    render(<AdminRagIngestPage />);
    const input = screen.getByLabelText("Batch file upload") as HTMLInputElement;
    const files = [new File(["ok"], "ok.txt"), new File(["retry"], "retry.md")];
    fireEvent.change(input, { target: { files } });
    await waitFor(() => expect(screen.getByText(/1\/2 files completed/)).toBeInTheDocument());
    expect(screen.getByText(/retry.md: failed/)).toBeInTheDocument();
    expect(screen.getByText(/Recovery available/)).toBeInTheDocument();
    expect(vi.mocked(adminFetch)).toHaveBeenCalledWith("/api/admin/rag/ingest/batch", "admin-token", expect.objectContaining({ method: "POST", body: expect.any(FormData) }));
  });
});
