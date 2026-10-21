import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/react";
import NodeInspectorDrawer, { type ServiceNodeData } from "./NodeInspectorDrawer";

const node: Node<ServiceNodeData> = {
  id: "telegram-gate",
  position: { x: 0, y: 0 },
  data: { label: "TELEGRAM GATE", detail: "Send an explicit test notification", status: "green" },
};

describe("workflow node inspector execution", () => {
  it("fails closed instead of simulating success when no adapter exists", async () => {
    render(<NodeInspectorDrawer selectedNode={node} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Test Execute/i }));

    await waitFor(() => {
      expect(screen.getByText(/No execution adapter is configured/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Executed module .* successfully/i)).not.toBeInTheDocument();
  });

  it("uses the supplied execution adapter and displays its result", async () => {
    const execute = vi.fn().mockResolvedValue({ status: "delivered", message_id: 42 });
    render(<NodeInspectorDrawer selectedNode={node} onClose={vi.fn()} onExecuteNode={execute} />);
    fireEvent.click(screen.getByRole("button", { name: /Test Execute/i }));

    await waitFor(() => {
      expect(screen.getByText(/"message_id": 42/)).toBeInTheDocument();
    });
    expect(execute).toHaveBeenCalledWith(node);
  });
});
