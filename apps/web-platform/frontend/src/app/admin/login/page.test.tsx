import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLoginPage from "./page";

const { routerPush, login, validateAdminToken, clearAdminSession } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  login: vi.fn(),
  validateAdminToken,
  clearAdminSession,
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
    login.mockResolvedValue({ access_token: "valid-session" });
    validateAdminToken.mockResolvedValue(true);
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
    await waitFor(() => expect(validateAdminToken).toHaveBeenCalledWith("valid-session"));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/admin"));
  });

  it("does not enter the dashboard when the backend rejects admin access", async () => {
    validateAdminToken.mockResolvedValue(false);

    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Login to Dashboard" }).closest("form")!);

    await waitFor(() => expect(clearAdminSession).toHaveBeenCalledOnce());
    expect(routerPush).not.toHaveBeenCalledWith("/admin");
    expect(
      await screen.findByText(/admin access could not be verified/i),
    ).toBeInTheDocument();
  });
});
