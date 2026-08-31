import createDOMPurify from "isomorphic-dompurify";

export const SANITIZE_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
];

export const SANITIZE_ALLOWED_ATTR = [
  "class",
  "href",
  "title",
  "target",
  "rel",
  "src",
  "alt",
  "width",
  "height",
  "loading",
  "colspan",
  "rowspan",
];

const SAFE_URL_REGEXP = /^(?:(?:https?:|mailto:|tel:)|\/|#)/i;

export function sanitizeHtml(input: string): string {
  const purifier = createDOMPurify(typeof window !== "undefined" ? window : undefined);

  const sanitized = purifier.sanitize(input, {
    ALLOWED_TAGS: SANITIZE_ALLOWED_TAGS,
    ALLOWED_ATTR: SANITIZE_ALLOWED_ATTR,
    FORBID_TAGS: [
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "svg",
      "math",
      "form",
      "input",
      "button",
      "video",
      "audio",
      "link",
      "meta",
      "base",
      "template",
    ],
    FORBID_ATTR: ["style"],
    ADD_ATTR: ["class"],
    ALLOWED_URI_REGEXP: SAFE_URL_REGEXP,
    KEEP_CONTENT: false,
  });

  return sanitized.replace(/<a\b([^>]*)target\s*=\s*["']_blank["']([^>]*)>/gi, (match, before, after) => {
    const attrs = `${before}${after}`;
    if (/\srel\s*=/i.test(attrs)) {
      return `<a${attrs}>`;
    }
    return `<a${before} rel="noopener noreferrer"${after}>`;
  });
}
