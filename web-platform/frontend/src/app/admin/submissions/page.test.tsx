import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminSubmissionsPage from "./page";

const { adminFetch, getAdminSessionToken } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  getAdminSessionToken: vi.fn(),
}));

vi.mock("@/components/api", () => ({ adminFetch }));
vi.mock("@/lib/adminSession", () => ({ getAdminSessionToken }));

const submission = {
  id: "submission-1",
  name: "Real sender",
  email: "sender@example.com",
  phone: null,
  subject: "Actual request",
  message: "A real request from the backend.",
  status: "pending",
  created_at: "2026-10-01T12:00:00Z",
  read_at: "2026-10-01T12:01:00Z",
  updated_at: "2026-10-01T12:01:00Z",
};

describe("Admin submissions page", () => {
  beforeEach(() => {
    getAdminSessionToken.mockResolvedValue("supabase-admin-token");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads real submissions through the authenticated FastAPI helper", async () => {
    adminFetch.mockResolvedValue({ json: async () => [submission] });

    render(<AdminSubmissionsPage />);

    expect(await screen.findByText("Actual request")).toBeInTheDocument();
    expect(getAdminSessionToken).toHaveBeenCalled();
    expect(adminFetch).toHaveBeenCalledWith("/api/admin/submissions", "supabase-admin-token");
    expect(screen.queryByText("Beta Visitor")).not.toBeInTheDocument();
  });

  it("shows an empty state for an empty backend result", async () => {
    adminFetch.mockResolvedValue({ json: async () => [] });

    render(<AdminSubmissionsPage />);

    expect(await screen.findByText("No submissions found.")).toBeInTheDocument();
    expect(screen.queryByText("Beta Visitor")).not.toBeInTheDocument();
  });

  it("surfaces backend errors and does not make unauthenticated requests", async () => {
    adminFetch.mockRejectedValue(new Error("Backend unavailable"));

    render(<AdminSubmissionsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend unavailable");

    vi.clearAllMocks();
    getAdminSessionToken.mockResolvedValue("");
    render(<AdminSubmissionsPage />);

    await waitFor(() => expect(screen.getAllByRole("alert")[1]).toHaveTextContent("Admin session is required"));
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("uses the authenticated FastAPI patch route for status changes", async () => {
    adminFetch
      .mockResolvedValueOnce({ json: async () => [submission] })
      .mockResolvedValueOnce({ json: async () => ({ ...submission, status: "replied" }) });

    render(<AdminSubmissionsPage />);
    fireEvent.click(await screen.findByText("Actual request"));
    fireEvent.click(screen.getAllByRole("button", { name: "replied" })[1]);

    await waitFor(() => {
      expect(adminFetch).toHaveBeenLastCalledWith(
        "/api/admin/submissions/submission-1",
        "supabase-admin-token",
        { method: "PATCH", body: JSON.stringify({ status: "replied" }) }
      );
    });
  });
});
