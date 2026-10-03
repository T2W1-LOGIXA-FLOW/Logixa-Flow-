import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminLayout from "../layout";
import AdminSidebar from "@/components/admin/AdminSidebar";

const mocks = vi.hoisted(() => ({
  pathname: "/admin/workflow",
  token: "admin-token",
  validateAdminToken: vi.fn(),
  clearAdminSession: vi.fn(),
  logoutAdminSession: vi.fn(),
  getAdminSessionToken: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock("@/components/api", () => ({
  validateAdminToken: mocks.validateAdminToken,
}));

vi.mock("@/lib/adminSession", () => ({
  clearAdminSession: mocks.clearAdminSession,
  logoutAdminSession: mocks.logoutAdminSession,
  getAdminSessionToken: mocks.getAdminSessionToken,
}));

vi.mock("@/components/admin/AdminShell", () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="admin-shell">{children}</div>,
}));

describe("workflow navigation integration", () => {
  beforeEach(() => {
    mocks.pathname = "/admin/workflow";
    mocks.token = "admin-token";
    mocks.validateAdminToken.mockReset().mockResolvedValue(true);
    mocks.getAdminSessionToken.mockReset().mockResolvedValue(mocks.token);
    mocks.clearAdminSession.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes the admin workflow route and marks it active", () => {
    render(<AdminSidebar open onClose={vi.fn()} onLogout={vi.fn()} />);

    const workflowLink = screen.getByRole("link", { name: "Workflow" });
    expect(workflowLink).toHaveAttribute("href", "/admin/workflow");
    expect(workflowLink).toHaveAttribute("aria-current", "page");
  });

  it("renders the workflow only after the admin token is validated", async () => {
    const { unmount } = render(
      <AdminLayout>
        <div>Protected workflow content</div>
      </AdminLayout>,
    );

    await waitFor(() => expect(screen.getByText("Protected workflow content")).toBeInTheDocument());
    expect(mocks.getAdminSessionToken).toHaveBeenCalled();
    expect(mocks.validateAdminToken).toHaveBeenCalledWith("admin-token");

    unmount();
    mocks.validateAdminToken.mockResolvedValue(false);
    render(
      <AdminLayout>
        <div>Protected workflow content</div>
      </AdminLayout>,
    );

    await waitFor(() => expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument());
    expect(mocks.clearAdminSession).toHaveBeenCalled();
  });

  it("does not let the legacy bypass environment variable skip session validation", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_AUTH_BYPASS", "true");
    mocks.getAdminSessionToken.mockResolvedValue("");

    render(
      <AdminLayout>
        <div>Protected workflow content</div>
      </AdminLayout>,
    );

    await waitFor(() => expect(mocks.getAdminSessionToken).toHaveBeenCalled());
    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected workflow content")).not.toBeInTheDocument();
    expect(mocks.validateAdminToken).not.toHaveBeenCalled();
  });
});
