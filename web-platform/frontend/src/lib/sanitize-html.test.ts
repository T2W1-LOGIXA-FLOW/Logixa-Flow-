import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const { window } = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
  window,
  document: window.document,
  DOMParser: window.DOMParser,
  Node: window.Node,
});

const { sanitizeHtml } = await import("./sanitize-html.ts");

describe("sanitizeHtml", () => {
  it("removes script tags", () => {
    const input = "<script>alert(1)</script><p>Hello</p>";
    const output = sanitizeHtml(input);

    expect(output).not.toMatch(/<script/i);
    expect(output).toMatch(/<p>Hello<\/p>/i);
  });

  it("removes event handler attributes", () => {
    const input = '<img src="https://example.com/x.png" onerror="alert(1)" alt="x" />';
    const output = sanitizeHtml(input);

    expect(output).not.toMatch(/onerror/i);
    expect(output).toMatch(/src="https:\/\/example\.com\/x\.png"/i);
    expect(output).toMatch(/alt="x"/i);
  });

  it("restricts dangerous URLs", () => {
    const input = '<a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a>';
    const output = sanitizeHtml(input);

    expect(output).not.toMatch(/javascript:/i);
    expect(output).toMatch(/href="https:\/\/example\.com"/i);
  });

  it("preserves allowed tags", () => {
    const input = '<p>Hello <strong>World</strong> <a href="/about" title="Info">link</a></p>';
    const output = sanitizeHtml(input);

    expect(output).toBe('<p>Hello <strong>World</strong> <a href="/about" title="Info">link</a></p>');
  });

  it("removes forbidden tags", () => {
    const input = '<p>safe</p><svg><circle></circle></svg><iframe src="https://evil.test"></iframe>';
    const output = sanitizeHtml(input);

    expect(output).not.toMatch(/<svg|<iframe/i);
    expect(output).toMatch(/<p>safe<\/p>/i);
  });

  it("preserves safe links", () => {
    const input = '<a href="/posts/1">Read more</a>';
    const output = sanitizeHtml(input);

    expect(output).toMatch(/href="\/posts\/1"/i);
  });

  it("hardens target=_blank links", () => {
    const input = '<a href="https://example.com" target="_blank">Docs</a>';
    const output = sanitizeHtml(input);

    expect(output).toMatch(/rel="noopener noreferrer"/i);
    expect(output).not.toMatch(/target="_blank"/i);
  });
});
