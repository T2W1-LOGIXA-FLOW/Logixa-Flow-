import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/adminSession", () => ({
  getAdminSessionToken: vi.fn().mockResolvedValue(null),
}));

import { getAdminSessionToken } from "@/lib/adminSession";
import AdminWorkflowPage from "./page";

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver;
  }
});

describe("unified command canvas", () => {
  it("renders five service nodes and process telemetry", () => {
    render(<AdminWorkflowPage />);
    expect(screen.getByText("Workflow command center")).toBeInTheDocument();
    expect(screen.getByText("RESEARCH")).toBeInTheDocument();
    expect(screen.getByText("MEDIA")).toBeInTheDocument();
    expect(screen.getByText("FINANCE")).toBeInTheDocument();
    expect(screen.getByText("OUTBOUND")).toBeInTheDocument();
    expect(screen.getByText("ORCHESTRATOR")).toBeInTheDocument();
    expect(screen.getByLabelText("Process cost panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Workflow ID")).toHaveValue("command-canvas");
    expect(screen.getByRole("button", { name: "Save workflow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run log-only workflow" })).toBeInTheDocument();
    expect(screen.getByText("Run uses log-only task actions; no publish or external delivery.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import JSON" })).toBeInTheDocument();
  });

  it("creates and starts a log-only workflow run with the authenticated session", async () => {
    render(<AdminWorkflowPage />);
    await act(async () => { await Promise.resolve(); });

    vi.mocked(getAdminSessionToken).mockResolvedValue("admin-session-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        run_id: "run-p0-smoke",
        workflow_id: "command-canvas",
        state: { status: "queued", current_node: null, completed_nodes: [], error: null },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    fireEvent.click(screen.getByRole("button", { name: "Run log-only workflow" }));

    expect(await screen.findByText(/Run accepted: run-p0-smoke/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/admin/workflow");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/admin/workflow/command-canvas/runs");
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer admin-session-token" }),
    }));

    vi.mocked(getAdminSessionToken).mockResolvedValue(null);
    vi.unstubAllGlobals();
  });

  it("reports that an admin session is required before starting a run", async () => {
    render(<AdminWorkflowPage />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole("button", { name: "Run log-only workflow" }));
    expect(await screen.findByRole("status")).toHaveTextContent("An admin session is required.");
  });

  it("supports node filtering and sidebar selection", () => {
    render(<AdminWorkflowPage />);
    fireEvent.change(screen.getByPlaceholderText("Search services..."), { target: { value: "finance" } });
    expect(screen.getByText("FINANCE")).toBeInTheDocument();
    expect(screen.queryByText("RESEARCH")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Media/ }));
    expect(screen.getByText("Media category selected")).toBeInTheDocument();
  });
});
