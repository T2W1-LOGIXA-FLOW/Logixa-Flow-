import createDOMPurify from "dompurify";

function getSanitizerWindow(): Window | undefined {
  if (typeof window !== "undefined") {
    return window;
  }

  if (typeof globalThis !== "undefined" && "document" in globalThis) {
    const globalDocument = (globalThis as { document?: Document }).document;
    if (globalDocument?.defaultView) {
      return globalDocument.defaultView;
    }
  }

  if (typeof process === "undefined" || !process.versions?.node) {
    return undefined;
  }

  try {
    type JSDOMLike = new (markup: string) => { window: Window };
    const dynamicRequire = new Function("return require('jsdom')") as () => {
      JSDOM: JSDOMLike;
    };
    const { JSDOM } = dynamicRequire();
    return new JSDOM("<!doctype html><html><body></body></html>").window as Window;
  } catch {
    return undefined;
  }
}

const SANITIZE_FORBIDDEN_TAGS = new Set([
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
]);

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

const SAFE_URL_REGEXP = /^(?:https?:|mailto:|tel:|\/(?!\/)|#)/i;

function getTextContent(input: string): string {
  const sanitizerWindow = getSanitizerWindow() as (Window & { DOMParser?: typeof DOMParser }) | undefined;
  if (!sanitizerWindow?.DOMParser) {
    return input.trim();
  }
  const parser = new sanitizerWindow.DOMParser();
  const doc = parser.parseFromString(`<body>${input}</body>`, "text/html");
  return doc.body.textContent?.trim() ?? "";
}

function sanitizeFallback(input: string): string {
  const fallbackWindow = getSanitizerWindow() as (Window & { DOMParser?: typeof DOMParser }) | undefined;
  if (!fallbackWindow?.DOMParser || !fallbackWindow.document) {
    return input;
  }

  const parser = new fallbackWindow.DOMParser();
  const doc = parser.parseFromString(`<body>${input}</body>`, "text/html");
  const body = doc.body;

  const sanitizeNode = (node: Node): string => {
    if (node.nodeType === node.TEXT_NODE) {
      return node.textContent ?? "";
    }

    if (node.nodeType !== node.ELEMENT_NODE) {
      return "";
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (SANITIZE_FORBIDDEN_TAGS.has(tagName)) {
      return "";
    }

    if (!SANITIZE_ALLOWED_TAGS.includes(tagName)) {
      const childHtml = Array.from(element.childNodes).map(sanitizeNode).join("");
      return childHtml;
    }

    const safeElement = doc.createElement(tagName);

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value;

      if (attributeName.startsWith("on") || attributeName === "style" || !SANITIZE_ALLOWED_ATTR.includes(attributeName)) {
        continue;
      }

      if ((attributeName === "href" || attributeName === "src") && !SAFE_URL_REGEXP.test(attributeValue)) {
        continue;
      }

      if (attributeName === "target" && attributeValue.toLowerCase() === "_blank") {
        safeElement.setAttribute("rel", "noopener noreferrer");
        continue;
      }

      safeElement.setAttribute(attributeName, attributeValue);
    }

    safeElement.innerHTML = Array.from(element.childNodes).map(sanitizeNode).join("");
    return safeElement.outerHTML;
  };

  return Array.from(body.childNodes).map(sanitizeNode).join("");
}

export function sanitizeHtml(input: string): string {
  const purifier = createDOMPurify(getSanitizerWindow() as Parameters<typeof createDOMPurify>[0]);
  purifier.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (element.tagName.toLowerCase() === "a" && element.getAttribute("target")?.toLowerCase() === "_blank") {
      element.setAttribute("rel", "noopener noreferrer");
    }
  });

  const sanitized = purifier.sanitize(input, {
    ALLOWED_TAGS: SANITIZE_ALLOWED_TAGS,
    ALLOWED_ATTR: SANITIZE_ALLOWED_ATTR,
    FORBID_TAGS: Array.from(SANITIZE_FORBIDDEN_TAGS),
    FORBID_ATTR: ["style"],
    ADD_ATTR: ["class"],
    KEEP_CONTENT: false,
  });

  if (getTextContent(input).length > 0 && getTextContent(sanitized).length === 0) {
    return sanitizeFallback(input);
  }

  return sanitized;
}
