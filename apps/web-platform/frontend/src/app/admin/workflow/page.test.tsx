import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/adminSession", () => ({
  getAdminSessionToken: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/components/api", () => ({
  adminFetch: vi.fn(),
}));

import { getAdminSessionToken } from "@/lib/adminSession";
import { adminFetch } from "@/components/api";
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
  });

  it("exposes explicit save and orchestration-only run controls", async () => {
    render(<AdminWorkflowPage />);
    expect(screen.getByRole("button", { name: "Save workflow" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Run orchestration test" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Admin session is required to run this workflow.");
    });
  });

  it("polls authenticated run state and reports the backend terminal status", async () => {
    vi.mocked(adminFetch).mockImplementation(async (path: string) => {
      if (path === "/api/admin/workflow/admin-command-canvas") {
        return { json: async () => ({ nodes: [] }) } as Response;
      }
      if (path === "/api/admin/workflow") {
        return { json: async () => ({ id: "admin-command-canvas" }) } as Response;
      }
      if (path === "/api/admin/workflow/admin-command-canvas/runs") {
        return { json: async () => ({ run_id: "run-test-123", state: { status: "queued" } }) } as Response;
      }
      if (path === "/api/admin/workflow/runs/run-test-123/state") {
        return {
          json: async () => ({
            run_id: "run-test-123",
            workflow_id: "admin-command-canvas",
            status: "completed",
            current_node: null,
            completed_nodes: ["orchestrator", "research"],
            error: null,
            execution_history: ["agent:thought-stream: awaiting admin review"],
            metrics: {
              agent_runs: [{ node_id: "thought-stream", agent_run_id: 81, memory_id: 206, status: "completed" }],
            },
          }),
        } as Response;
      }
      throw new Error("Unexpected admin API request: " + path);
    });

    render(<AdminWorkflowPage />);
    vi.mocked(getAdminSessionToken).mockResolvedValue("admin-token");
    fireEvent.click(screen.getByRole("button", { name: "Run orchestration test" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/run-test-123 completed/i);
      expect(screen.getByRole("status")).toHaveTextContent(/2 node\(s\) completed/i);
      expect(screen.getByRole("status")).toHaveTextContent(/private draft 206/i);
      expect(screen.getByRole("status")).toHaveTextContent(/awaiting admin review/i);
    });
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/workflow/runs/run-test-123/state",
      "admin-token"
    );
    vi.mocked(getAdminSessionToken).mockResolvedValue(null);
    vi.mocked(adminFetch).mockReset();
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
