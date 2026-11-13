import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FeedManager from "./FeedManager";

const { adminFetch, getAdminSessionToken, toast } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  getAdminSessionToken: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock("@/components/api", () => ({ adminFetch }));
vi.mock("@/lib/adminSession", () => ({ getAdminSessionToken }));
vi.mock("sonner", () => ({ toast }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  return {
    motion: {
      tr: React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
        function MotionTableRow({ children, ...props }, ref) {
          return <tr ref={ref} {...props}>{children}</tr>;
        },
      ),
    },
  };
});

const feed = {
  id: 7,
  url: "https://news.google.com/rss/search?q=supply+chain+management&hl=en-US&gl=US&ceid=US:en",
  title: "",
  category: "Supply Chain",
  trust_level: "",
  is_active: true,
  last_scrape_at: null,
  last_scrape_status: "",
  scrape_count: 0,
};

describe("FeedManager", () => {
  beforeEach(() => {
    getAdminSessionToken.mockResolvedValue("admin-token");
    adminFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ feeds: [feed] }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders readable fallback states and full action labels for incomplete feed metadata", async () => {
    render(<FeedManager />);

    expect((await screen.findAllByText("standard")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("not scraped").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Scrape https:/ }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Delete https:/ }).length).toBeGreaterThanOrEqual(1);
  });

  it("filters feeds by search text and exposes a clear-filter state", async () => {
    render(<FeedManager />);

    await screen.findByRole("cell", { name: "Supply Chain" });
    fireEvent.change(screen.getByRole("searchbox", { name: "Search feeds" }), {
      target: { value: "no-such-feed" },
    });

    expect(await screen.findByText("No feeds match your filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect((await screen.findAllByText("standard")).length).toBeGreaterThanOrEqual(1);
  });

  it("loads feeds through the authenticated admin endpoint", async () => {
    render(<FeedManager />);

    await waitFor(() => {
      expect(adminFetch).toHaveBeenCalledWith("/api/admin/integration/feeds", "admin-token");
    });
  });
});
