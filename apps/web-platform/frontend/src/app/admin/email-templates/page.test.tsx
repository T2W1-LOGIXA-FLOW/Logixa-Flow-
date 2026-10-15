import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EmailTemplatesPage from "./page";

const { adminFetch, getAdminSessionToken } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  getAdminSessionToken: vi.fn(),
}));

vi.mock("@/components/api", () => ({ adminFetch }));
vi.mock("@/lib/adminSession", () => ({ getAdminSessionToken }));

const template = {
  id: "welcome",
  name: "Welcome",
  subject: "Welcome to the service",
  template_html: "<p>Welcome, {{name}}</p>",
  is_active: true,
  description: null,
  created_at: "2026-10-01T12:00:00Z",
  updated_at: "2026-10-01T12:00:00Z",
};

describe("Admin email templates page", () => {
  beforeEach(() => {
    getAdminSessionToken.mockResolvedValue("supabase-admin-token");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads real templates through the authenticated FastAPI helper", async () => {
    adminFetch.mockResolvedValue({ json: async () => [template] });

    render(<EmailTemplatesPage />);

    expect(await screen.findByRole("button", { name: /Welcome/ })).toBeInTheDocument();
    expect(adminFetch).toHaveBeenCalledWith("/api/admin/email-templates", "supabase-admin-token");
    expect(screen.queryByText(/Beta preview/)).not.toBeInTheDocument();
  });

  it("shows an empty state for an empty backend result", async () => {
    adminFetch.mockResolvedValue({ json: async () => [] });

    render(<EmailTemplatesPage />);

    expect(await screen.findByText("No email templates found.")).toBeInTheDocument();
  });

  it("does not request templates without an authenticated session", async () => {
    getAdminSessionToken.mockResolvedValue("");

    render(<EmailTemplatesPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Admin session is required");
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("surfaces backend errors without fake template data", async () => {
    adminFetch.mockRejectedValue(new Error("Backend unavailable"));

    render(<EmailTemplatesPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend unavailable");
    expect(screen.queryByText("Welcome Email")).not.toBeInTheDocument();
  });

  it("updates templates through the authenticated FastAPI endpoint", async () => {
    adminFetch
      .mockResolvedValueOnce({ json: async () => [template] })
      .mockResolvedValueOnce({ json: async () => ({ ...template, subject: "Updated subject" }) });

    render(<EmailTemplatesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Welcome/ }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Subject"), {
      target: { value: "Updated subject" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(adminFetch).toHaveBeenLastCalledWith(
        "/api/admin/email-templates/welcome",
        "supabase-admin-token",
        {
          method: "PATCH",
          body: JSON.stringify({
            subject: "Updated subject",
            template_html: template.template_html,
            is_active: true,
          }),
        }
      );
    });
  });
});
