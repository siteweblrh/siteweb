import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: true });

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "del", "code", "pre", "blockquote",
    "ul", "ol", "li",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
    "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "loading", "width", "height"],
    code: ["class"],
    pre: ["class"],
    p: ["style"],
    h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"], h5: ["style"], h6: ["style"],
    span: ["style"],
    div: ["style"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^(left|right|center|justify)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer ugc",
      },
    }),
  },
};

function looksLikeHtml(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.startsWith("<") && /<\/?[a-zA-Z][\s\S]*>/.test(trimmed);
}

/**
 * Auto-detects HTML (TipTap output) vs Markdown (legacy) and returns sanitized HTML.
 */
export function renderContent(input: string): string {
  if (!input) return "";
  const rawHtml = looksLikeHtml(input)
    ? input
    : (marked.parse(input, { async: false }) as string);
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
}

/**
 * Legacy alias — same behavior as renderContent.
 */
export const renderMarkdown = renderContent;

/**
 * Sanitize HTML on the server before persisting (security boundary).
 */
export function sanitizeUserHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/**
 * Strip both Markdown syntax and HTML tags for previews / excerpts.
 */
export function stripMarkdown(input: string): string {
  if (!input) return "";
  if (looksLikeHtml(input)) {
    return input
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
