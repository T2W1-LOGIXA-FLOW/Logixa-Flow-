import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

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

  it("supports node filtering and sidebar selection", () => {
    render(<AdminWorkflowPage />);
    fireEvent.change(screen.getByPlaceholderText("Search services..."), { target: { value: "finance" } });
    expect(screen.getByText("FINANCE")).toBeInTheDocument();
    expect(screen.queryByText("RESEARCH")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Media/ }));
    expect(screen.getByText("Media category selected")).toBeInTheDocument();
  });
});
