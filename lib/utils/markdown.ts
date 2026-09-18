import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: true });

/**
 * Hôtes considérés comme « chez nous ». Codés en dur plutôt que lus dans
 * `NEXT_PUBLIC_SITE_URL` : cette valeur vaut `localhost` en développement, ce
 * qui ferait basculer les liens lrh.re du côté externe selon l'environnement.
 * Le domaine, lui, ne bouge pas.
 */
const INTERNAL_HOSTS = new Set(["lrh.re", "www.lrh.re"]);

/**
 * Un href pointe-t-il vers le site lui-même ?
 *
 * Reconnus comme internes : les chemins absolus (`/classements`) et les ancres
 * (`#resultats`), plus les URL absolues vers un hôte lrh.re. Tout le reste —
 * y compris les liens protocol-relative (`//ailleurs.re`) et les chemins
 * relatifs sans barre initiale — est traité comme externe : en cas de doute,
 * le comportement le plus prudent est celui qui ajoute `noopener`.
 */
function isInternalHref(href: string | undefined): boolean {
  const value = (href ?? "").trim();
  if (!value) return false;
  if (value.startsWith("#")) return true;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/")) return true;
  try {
    return INTERNAL_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "del", "code", "pre", "blockquote",
    "ul", "ol", "li",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
    "span", "div",
    // Embeds : <iframe> est restreint aux YouTube via allowedIframeHostnames.
    "iframe",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "loading", "width", "height"],
    code: ["class"],
    pre: ["class"],
    p: ["style"],
    h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"], h5: ["style"], h6: ["style"],
    span: ["style"],
    div: ["style", "class", "data-youtube-video", "data-gallery"],
    iframe: [
      "src", "width", "height", "frameborder",
      "allow", "allowfullscreen", "title", "loading", "referrerpolicy",
    ],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^(left|right|center|justify)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  // Whitelist stricte des hôtes autorisés dans un <iframe>. Empêche toute
  // injection d'iframe vers un domaine arbitraire (XSS via embed) même si
  // un éditeur HTML laisserait passer.
  allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"],
  transformTags: {
    a: (tagName, attribs) => {
      // Un lien vers nos propres pages n'est ni du contenu tiers, ni une
      // sortie du site : lui coller `rel="ugc"` signale à Google que notre
      // maillage interne est du contenu généré par les visiteurs, et
      // `target="_blank"` fait sortir le lecteur de sa page pour rien.
      // `noopener` devient inutile puisqu'on retire `target`.
      if (isInternalHref(attribs.href)) {
        const { target: _target, rel: _rel, ...rest } = attribs;
        return { tagName, attribs: rest };
      }
      return {
        tagName,
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer ugc",
        },
      };
    },
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
