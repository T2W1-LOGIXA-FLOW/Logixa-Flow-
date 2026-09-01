/* eslint-disable @next/next/no-img-element */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import BlogDetail from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }: { alt?: string; src?: string; [key: string]: unknown }) => (
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock("next/script", () => ({
  default: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => (
    <script {...props}>{children}</script>
  ),
}));

vi.mock("@/components/api", () => ({
  assetUrl: vi.fn((url?: string) => url || ""),
  getPost: vi.fn().mockResolvedValue({
    slug: "hello-world",
    title: "Hello World",
    excerpt: "Example excerpt",
    content_html: "<script>alert(1)</script><p>Hello <strong>world</strong></p>",
    image_url: "",
    published_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-02T00:00:00.000Z",
    type: "Insight",
    category: "Operations",
    source_url: "https://example.com/source",
  }),
}));

vi.mock("@/components/ShareButtons", () => ({
  default: () => <div>Share</div>,
}));

vi.mock("@/components/BlogPDFExport", () => ({
  default: () => <div>Export PDF</div>,
}));

vi.mock("@/components/PageBackground", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("Blog detail page", () => {
  it("renders sanitized article content", async () => {
    const element = await BlogDetail({ params: Promise.resolve({ slug: "hello-world" }) });
    render(element);

    expect(screen.getByRole("heading", { name: /hello world/i })).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.queryByText(/alert\(1\)/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("script")).not.toBeInTheDocument();
  });
});
