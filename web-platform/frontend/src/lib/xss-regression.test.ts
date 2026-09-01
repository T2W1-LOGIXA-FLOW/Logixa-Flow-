import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "./sanitize-html";

describe("xss regression protection", () => {
  it("removes script tags and script content", () => {
    const input = "<script>alert('x')</script><p>safe</p>";
    const output = sanitizeHtml(input);

    expect(output).not.toContain("<script");
    expect(output).not.toContain("alert('x')");
    expect(output).toContain("safe");
  });

  it("removes inline event handlers", () => {
    const input = '<img src="x" onerror="alert(1)" alt="ok">';
    const output = sanitizeHtml(input);

    expect(output).not.toContain("onerror");
    expect(output).toContain("img");
  });

  it("blocks javascript URLs", () => {
    const input = '<a href="javascript:alert(1)" target="_blank">bad</a><a href="https://example.com">good</a>';
    const output = sanitizeHtml(input);

    expect(output).not.toContain("javascript:");
    expect(output).toContain("https://example.com");
    expect(output).toContain("good");
  });

  it("removes iframe injections", () => {
    const input = "<iframe src=\"https://evil.example\"></iframe><p>safe</p>";
    const output = sanitizeHtml(input);

    expect(output).not.toContain("<iframe");
    expect(output).toContain("safe");
  });

  it("removes svg payloads", () => {
    const input = "<svg><script>alert(1)</script></svg><p>safe</p>";
    const output = sanitizeHtml(input);

    expect(output).not.toContain("<svg");
    expect(output).not.toContain("<script");
    expect(output).toContain("safe");
  });

  it("preserves safe allowlisted HTML", () => {
    const input = '<p><strong>World</strong> <em>again</em></p><ul><li>Item</li></ul>';
    const output = sanitizeHtml(input);

    expect(output).toContain("<p>");
    expect(output).toContain("<strong>");
    expect(output).toContain("<em>");
    expect(output).toContain("<ul>");
    expect(output).toContain("<li>");
  });

  it("hardens target=_blank links", () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a>';
    const output = sanitizeHtml(input);

    expect(output).not.toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
  });
});
