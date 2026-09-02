import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import AdminAgentChatPage from "./page";

const listSessions = vi.fn();
const getMessages = vi.fn();
const adminRequest = vi.fn();

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({ token: "test-token", isAuthenticated: true, isCheckingAuth: false }),
}));

vi.mock("@/components/api", () => ({
  adminFetch: (...args: unknown[]) => adminRequest(...args),
  listAdminChatSessions: (...args: unknown[]) => listSessions(...args),
  getAdminChatMessages: (...args: unknown[]) => getMessages(...args),
}));

vi.mock("@/components/ui/ai-input-with-loading", () => ({
  AIInputWithLoading: ({ onSubmit }: { onSubmit: (value: string) => void }) => (
    <button onClick={() => onSubmit("Local draft")}>Chat input</button>
  ),
}));

vi.mock("@/components/admin/agent/AdminConversationMonitor", () => ({
  AdminConversationMonitor: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminConversationMessage: ({ content }: { content: string }) => <p>{content}</p>,
}));

vi.mock("@/components/admin/agent/AdminAgentErrorState", () => ({
  default: ({ detail }: { detail: string }) => <div role="alert">{detail}</div>,
}));

describe("Admin agent chat session restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    listSessions.mockResolvedValue([
      {
        id: 1,
        session_id: "session-1",
        title: "Saved session",
        is_active: true,
        created_at: "2026-09-02T00:00:00Z",
        updated_at: "2026-09-02T01:00:00Z",
      },
    ]);
    getMessages.mockResolvedValue([
      {
        id: 2,
        session_id: 1,
        role: "agent",
        content: "Restored safely",
        created_at: "2026-09-02T01:00:00Z",
      },
    ]);
    adminRequest.mockResolvedValue({
      ok: true,
      json: async () => ({ response: "Agent response", agent_id: "default" }),
    });
  });

  it("loads owned sessions and restores selected history", async () => {
    render(<AdminAgentChatPage />);

    await waitFor(() => expect(screen.getByRole("option", { name: /Saved session/ })).toBeInTheDocument());
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Select a persisted session"), { target: { value: "session-1" } });
    });

    await waitFor(() => expect(screen.getByText("Restored safely")).toBeInTheDocument());
    expect(getMessages).toHaveBeenCalledWith("test-token", "session-1");
  });

  it("does not silently replace a local draft", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminAgentChatPage />);

    await waitFor(() => expect(screen.getByRole("option", { name: /Saved session/ })).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText("Chat input"));
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Select a persisted session"), { target: { value: "session-1" } });
    });
    expect(confirm).toHaveBeenCalled();
    expect(getMessages).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("shows explicit empty and unavailable session-list states", async () => {
    listSessions.mockResolvedValueOnce([]);
    const { unmount } = render(<AdminAgentChatPage />);
    await waitFor(() => expect(screen.getByRole("option", { name: "No persisted sessions" })).toBeInTheDocument());
    expect(screen.getByText("Only your active sessions can be restored. Deleted and legacy sessions are unavailable.")).toBeInTheDocument();
    unmount();

    listSessions.mockRejectedValueOnce(new Error("backend detail"));
    render(<AdminAgentChatPage />);
    await waitFor(() => expect(screen.getByRole("alert", { name: "" })).toHaveTextContent("Persisted session list is unavailable."));
    expect(screen.queryByText("backend detail")).not.toBeInTheDocument();
  });

  it("does not replace a newer selection with stale history", async () => {
    listSessions.mockResolvedValueOnce([
      { id: 1, session_id: "session-1", title: "First", is_active: true, created_at: "2026-09-02T00:00:00Z", updated_at: "2026-09-02T01:00:00Z" },
      { id: 2, session_id: "session-2", title: "Second", is_active: true, created_at: "2026-09-02T00:00:00Z", updated_at: "2026-09-02T02:00:00Z" },
    ]);
    let resolveFirst: (value: unknown[]) => void = () => undefined;
    const firstHistory = new Promise<unknown[]>((resolve) => { resolveFirst = resolve; });
    getMessages.mockReturnValueOnce(firstHistory).mockResolvedValueOnce([
      { id: 3, session_id: 2, role: "agent", content: "Newest history", created_at: "2026-09-02T02:00:00Z" },
    ]);
    render(<AdminAgentChatPage />);
    await waitFor(() => expect(screen.getByRole("option", { name: /First/ })).toBeInTheDocument());
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Select a persisted session"), { target: { value: "session-1" } });
      fireEvent.change(screen.getByLabelText("Select a persisted session"), { target: { value: "session-2" } });
    });
    resolveFirst([{ id: 4, session_id: 1, role: "agent", content: "Stale history", created_at: "2026-09-02T01:00:00Z" }]);
    await waitFor(() => expect(screen.getByText("Newest history")).toBeInTheDocument());
    expect(screen.queryByText("Stale history")).not.toBeInTheDocument();
  });
});
