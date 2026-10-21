import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminFetchMock, toastMock } = vi.hoisted(() => ({
  adminFetchMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ token: "test-admin-token", isAuthenticated: true }),
}));
vi.mock("@/components/api", () => ({ adminFetch: (...args: unknown[]) => adminFetchMock(...args) }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/components/ui/animated-shiny-text", () => ({
  AnimatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

import AdminControllersPage from "./page";

const jsonResponse = (body: unknown) => ({ json: async () => body });

beforeEach(() => {
  adminFetchMock.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  adminFetchMock.mockImplementation(async (_path: string, _token: string, options?: RequestInit) => {
    if (options?.method === "POST") return jsonResponse({ id: "ops-runner" });
    return jsonResponse([]);
  });
});

describe("admin controller management", () => {
  it("creates a manual controller linked to the saved workflow", async () => {
    render(<AdminControllersPage />);
    fireEvent.click(screen.getByRole("button", { name: "New Controller" }));
    fireEvent.change(screen.getByLabelText("Controller ID"), { target: { value: "ops-runner" } });
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Operations Runner" } });
    fireEvent.change(screen.getByLabelText("Workflow ID"), { target: { value: "admin-command-canvas" } });
    fireEvent.click(screen.getByRole("button", { name: "Create controller" }));

    await waitFor(() => {
      expect(adminFetchMock).toHaveBeenCalledWith("/api/admin/controllers", "test-admin-token", expect.objectContaining({
        method: "POST",
      }));
    });
    const call = adminFetchMock.mock.calls.find((args) => args[0] === "/api/admin/controllers" && args[2]?.method === "POST");
    expect(call).toBeDefined();
    const payload = JSON.parse(call?.[2]?.body as string);
    expect(payload).toMatchObject({
      id: "ops-runner",
      name: "Operations Runner",
      trigger_type: "manual",
      enabled: true,
    });
    expect(JSON.parse(payload.config)).toEqual({
      workflow_id: "admin-command-canvas",
      priority: 1,
      delay_seconds: 0,
    });
  });

  it("queues enabled controllers through the real execute endpoint", async () => {
    adminFetchMock.mockImplementation(async (path: string, _token: string, options?: RequestInit) => {
      if (path === "/api/admin/controllers" && !options?.method) {
        return jsonResponse([{
          id: "ops-runner",
          name: "Operations Runner",
          trigger_type: "manual",
          enabled: true,
          last_execution: null,
          success_count: 0,
          failure_count: 0,
        }]);
      }
      if (path.endsWith("/execute")) return jsonResponse({ message: "Workflow queued", run: { run_id: "run-test" } });
      return jsonResponse([]);
    });

    render(<AdminControllersPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Run now" }));
    await waitFor(() => {
      expect(adminFetchMock).toHaveBeenCalledWith(
        "/api/admin/controllers/ops-runner/execute",
        "test-admin-token",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
