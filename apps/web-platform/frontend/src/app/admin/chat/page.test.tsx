import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminChatManagementPage from "./page";

const adminRequest = vi.fn();
const listSessions = vi.fn();

vi.mock("@/hooks/useAdminAuth", () => ({ useAdminAuth: () => ({ token: "admin-token", isAuthenticated: true }) }));
vi.mock("@/components/api", () => ({
  adminFetch: (...args: unknown[]) => adminRequest(...args),
  listAdminChatSessions: (...args: unknown[]) => listSessions(...args),
}));

describe("admin chat management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSessions.mockResolvedValue([{ session_id: "session-1", title: "Saved session" }]);
    adminRequest.mockResolvedValue({ json: async () => ({ messages: [{ id: 1 }] }) });
  });

  it("restores and transfers an owned session", async () => {
    render(<AdminChatManagementPage />);
    await waitFor(() => expect(screen.getByRole("option", { name: "Saved session" })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Chat session"), { target: { value: "session-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Restore session" }));
    await waitFor(() => expect(screen.getByText("Restored 1 messages.")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Transfer ownership to"), { target: { value: "owner-b" } });
    fireEvent.click(screen.getByRole("button", { name: "Transfer ownership" }));
    await waitFor(() => expect(screen.getByText("Session ownership transferred.")).toBeInTheDocument());
    expect(adminRequest).toHaveBeenCalledWith("/api/chat/sessions/session-1/transfer", "admin-token", expect.objectContaining({ method: "POST" }));
  });
});
