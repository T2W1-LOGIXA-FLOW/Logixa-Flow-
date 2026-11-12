import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminWorkflowPage from "./page";

const mockGetAdminSessionToken = vi.fn();

vi.mock("@/lib/adminSession", () => ({
  getAdminSessionToken: () => mockGetAdminSessionToken(),
}));

describe("workflow websocket integration", () => {
  const sockets: Array<{ onopen?: () => void; onmessage?: (event: { data: string }) => void; onclose?: () => void; close: () => void; send: (data: string) => void; readyState: number }> = [];

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

    const MockWebSocket = vi.fn(function (this: WebSocket) {
      const socket = {
          readyState: 1,
          close: vi.fn(),
          send: vi.fn(),
          onopen: undefined,
          onmessage: undefined,
          onclose: undefined,
          onerror: undefined,
        } as any;
      sockets.push(socket);
      return socket;
    });
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  it("subscribes to workflow telemetry on page load", async () => {
    render(<AdminWorkflowPage />);

    await waitFor(() => expect(sockets).toHaveLength(1));
    expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);

    const socket = sockets[0];
    act(() => socket.onopen?.());

    expect(screen.getAllByText(/SYSTEM LIVE|SYNCING|OFFLINE/i).length).toBeGreaterThan(0);
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "auth", token: "admin-token" }),
    );
  });

  it("shows approval controls and submits an authenticated approve decision", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [{
            event: "workflow.status",
            run_id: "run-approval-ui",
            workflow_id: "approval-flow",
            state: {
              status: "waiting_approval",
              current_node: "human-check",
              approval_node: "human-check",
              completed_nodes: ["prepare"],
              error: null,
            },
          }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ run_id: "run-approval-ui", status: "queued", approved_node: "human-check" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminWorkflowPage />);

    await waitFor(() => expect(sockets).toHaveLength(1));
    const socket = sockets[0];
    act(() => {
      socket.onmessage?.({
        data: JSON.stringify({
          event: "workflow.status",
          run_id: "run-approval-ui",
          workflow_id: "approval-flow",
          state: {
            status: "waiting_approval",
            current_node: "human-check",
            approval_node: "human-check",
            completed_nodes: ["prepare"],
            error: null,
          },
        }),
      });
    });

    expect(await screen.findByRole("region", { name: "Pending workflow approval" })).toBeInTheDocument();
    expect(screen.getByText(/Downstream nodes are blocked/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve & resume" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/workflow/runs/run-approval-ui/approve"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer admin-token" }),
      }),
    ));
  });

  it("renders live telemetry updates from the workflow stream", async () => {
    render(<AdminWorkflowPage />);

    await waitFor(() => expect(sockets).toHaveLength(1));
    const socket = sockets[0];
    act(() => {
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
    });

    await waitFor(() => expect(screen.getByText(/RESEARCH active|running workflow/i)).toBeInTheDocument());
    expect(screen.getByText("STATUS")).toBeInTheDocument();
    expect(screen.getByText("RESEARCH")).toBeInTheDocument();
  });
});
