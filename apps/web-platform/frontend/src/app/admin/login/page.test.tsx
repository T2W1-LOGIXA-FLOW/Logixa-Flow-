import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLoginPage from "./page";

const { routerPush, login } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  login: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/api", () => ({
  login,
  validateAdminToken: vi.fn(),
}));

vi.mock("@/lib/adminSession", () => ({
  clearAdminSession: vi.fn(),
  getAdminSessionToken: vi.fn().mockResolvedValue(""),
}));

describe("Admin login", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("requires the normal login flow even when the legacy bypass variable is true", async () => {
    vi.stubEnv("NEXT_PUBLIC_ADMIN_AUTH_BYPASS", "true");

    render(<AdminLoginPage />);

    expect(screen.getByRole("heading", { name: "Admin Login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
    expect(screen.getByRole("button", { name: "Login to Dashboard" })).toBeInTheDocument();

    await waitFor(() => {
      expect(routerPush).not.toHaveBeenCalled();
    });
    expect(login).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Login to Dashboard" }).closest("form")!);

    await waitFor(() => expect(login).toHaveBeenCalledWith("admin@example.com", "password"));
  });
});
