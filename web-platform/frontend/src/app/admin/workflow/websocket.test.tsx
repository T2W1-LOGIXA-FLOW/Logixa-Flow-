import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminWorkflowPage from "./page";

const mockGetAdminSessionToken = vi.fn();

vi.mock("@/lib/adminSession", () => ({
  getAdminSessionToken: () => mockGetAdminSessionToken(),
}));

describe("workflow websocket integration", () => {
  const sockets: Array<{ onopen?: () => void; onmessage?: (event: { data: string }) => void; onclose?: () => void; close: () => void; readyState: number }> = [];

  beforeEach(() => {
    sockets.length = 0;
    mockGetAdminSessionToken.mockReturnValue("admin-token");

    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as typeof ResizeObserver;
    }

    vi.stubGlobal(
      "WebSocket",
      vi.fn().mockImplementation(() => {
        const socket = {
          readyState: 1,
          close: vi.fn(),
          onopen: undefined,
          onmessage: undefined,
          onclose: undefined,
          onerror: undefined,
        } as any;
        sockets.push(socket);
        return socket;
      }),
    );
  });

  it("subscribes to workflow telemetry on page load", async () => {
    render(<AdminWorkflowPage />);

    await waitFor(() => expect(sockets).toHaveLength(1));
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);

    const socket = sockets[0];
    socket.onopen?.();

    await waitFor(() => expect(screen.getByText(/SYSTEM LIVE|SYNCING|OFFLINE/i)).toBeInTheDocument());
  });

  it("renders live telemetry updates from the workflow stream", async () => {
    render(<AdminWorkflowPage />);

    const socket = sockets[0];
    socket.onmessage?.({
      data: JSON.stringify({
        event: "workflow.status",
        run_id: "run-1",
        workflow_id: "workflow-1",
        state: {
          status: "running",
          current_node: "research",
          completed_nodes: ["orchestrator"],
          error: null,
        },
      }),
    });

    await waitFor(() => expect(screen.getByText(/RESEARCH active|running workflow/i)).toBeInTheDocument());
    expect(screen.getByText("STATUS")).toBeInTheDocument();
    expect(screen.getByText("RESEARCH")).toBeInTheDocument();
  });
});
