import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/adminSession", () => ({
  getAdminSessionToken: vi.fn().mockResolvedValue(null),
}));

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

  it("supports node filtering and sidebar selection", () => {
    render(<AdminWorkflowPage />);
    fireEvent.change(screen.getByPlaceholderText("Search services..."), { target: { value: "finance" } });
    expect(screen.getByText("FINANCE")).toBeInTheDocument();
    expect(screen.queryByText("RESEARCH")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Media/ }));
    expect(screen.getByText("Media category selected")).toBeInTheDocument();
  });
});
