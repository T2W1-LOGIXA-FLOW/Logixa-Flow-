import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import BrainReviewPage from "./page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/hooks/useAdminAuth", () => ({
  useAdminAuth: () => ({
    token: "test-token",
    isAuthenticated: true,
    isCheckingAuth: false,
  }),
}));

vi.mock("@/components/api", () => ({
  adminFetch: vi.fn().mockResolvedValue({
    json: async () => [
      {
        id: 1,
        source_title: "Alpha memory",
        category: "ops",
        status: "published",
        is_public: true,
        post_slug: "alpha-memory",
        summary: "Example summary",
        content: "<script>alert(1)</script><p>Preview safe</p>",
      },
    ],
  }),
}));

describe("Brain review page", () => {
  it("renders a safe preview for the selected AI memory entry", async () => {
    render(<BrainReviewPage />);

    await waitFor(() => expect(screen.getByText("AI Memory")).toBeInTheDocument());
    expect(screen.getAllByText("Alpha memory")).toHaveLength(2);
    expect(screen.getByText("Preview safe")).toBeInTheDocument();
    expect(screen.queryByText(/alert\(1\)/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unpublish" })).toBeEnabled();
  });

  it("requires confirmation and disables unpublish while pending", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { adminFetch } = await import("@/components/api");
    vi.mocked(adminFetch).mockImplementation((path) => {
      if (path.includes("/unpublish")) {
        return new Promise(() => undefined);
      }
      return Promise.resolve({
        json: async () => [
          {
            id: 1,
            source_title: "Alpha memory",
            category: "ops",
            status: "published",
            is_public: true,
            post_slug: "alpha-memory",
            summary: "Example summary",
            content: "<script>alert(1)</script><p>Preview safe</p>",
          },
        ],
      } as Response);
    });
    render(<BrainReviewPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Unpublish" })).toBeInTheDocument());

    screen.getByRole("button", { name: "Unpublish" }).click();
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("reversible soft-unpublish"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Unpublish" })).toBeDisabled());
  });
});
