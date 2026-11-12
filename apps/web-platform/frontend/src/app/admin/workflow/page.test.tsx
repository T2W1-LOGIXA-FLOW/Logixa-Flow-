import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  vi.mocked(getAdminSessionToken).mockResolvedValue(null);
  vi.unstubAllGlobals();
});

describe("unified command canvas", () => {
  it("renders an honest empty canvas and process telemetry", () => {
    render(<AdminWorkflowPage />);
    expect(screen.getByText("Workflow command center")).toBeInTheDocument();
    expect(screen.getByText("Your workflow canvas is empty")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blank canvas" })).toBeInTheDocument();
    expect(screen.queryByText("RESEARCH")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Process cost panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Workflow ID")).toHaveValue("command-canvas");
    expect(screen.getByRole("button", { name: "Save workflow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run log-only workflow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import JSON" })).toBeInTheDocument();
  });

  it("loads the private review starter without external delivery nodes", () => {
    render(<AdminWorkflowPage />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "private-review" } });
    expect(screen.getByLabelText("Workflow ID")).toHaveValue("private-review");
    expect(screen.getByText("PREPARE PRIVATE DRAFT")).toBeInTheDocument();
    expect(screen.getByText("ADMIN APPROVAL")).toBeInTheDocument();
    expect(screen.getByText("RECORD APPROVED")).toBeInTheDocument();
    expect(screen.getByText(/no external integrations or delivery actions/i)).toBeInTheDocument();
  });

  it("creates and starts a log-only workflow run with the authenticated session", async () => {
    render(<AdminWorkflowPage />);
    await act(async () => { await Promise.resolve(); });

    vi.mocked(getAdminSessionToken).mockResolvedValue("admin-session-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ detail: "workflow not found" }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({
          run_id: "run-p0-smoke",
          workflow_id: "command-canvas",
          state: { status: "queued", current_node: null, completed_nodes: [], error: null },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    fireEvent.click(screen.getByRole("button", { name: "Run log-only workflow" }));

    expect(await screen.findByText(/Run accepted: run-p0-smoke/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/admin/workflow/command-canvas");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/admin/workflow");
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "POST" }));
    expect(fetchMock.mock.calls[2][0]).toContain("/api/admin/workflow/command-canvas/runs");
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer admin-session-token" }),
    }));

  });

  it("does not overwrite an existing workflow when the canvas has unsaved changes", async () => {
    render(<AdminWorkflowPage />);
    await act(async () => { await Promise.resolve(); });
    vi.mocked(getAdminSessionToken).mockResolvedValue("admin-session-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: "existing workflow", nodes: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    fireEvent.click(screen.getByRole("button", { name: "Run log-only workflow" }));

    expect(await screen.findByRole("status")).toHaveTextContent("This workflow ID already contains different content.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchMock).mock.calls[0][1]).toEqual(expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer admin-session-token" }) }));

    vi.mocked(getAdminSessionToken).mockResolvedValue(null);
    vi.unstubAllGlobals();
  });

  it("saves a human approval module with the approval node type", async () => {
    render(<AdminWorkflowPage />);
    await act(async () => { await Promise.resolve(); });
    vi.mocked(getAdminSessionToken).mockResolvedValue("admin-session-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    fireEvent.click(screen.getByTitle("Add Human Approval Gate to canvas"));
    fireEvent.click(screen.getByRole("button", { name: "Save workflow" }));

    await screen.findByRole("status");
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: expect.stringMatching(/^approval_gate_/), type: "approval", name: "APPROVAL GATE" }),
    ]));
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
    expect(screen.getByText("Smart Receipt Parser")).toBeInTheDocument();
    expect(screen.queryByText("Live Thought Stream")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Media/ }));
    expect(screen.getByText("Media category selected")).toBeInTheDocument();
  });
});
