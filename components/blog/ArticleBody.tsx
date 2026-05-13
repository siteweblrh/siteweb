import React from "react";
import { renderContent } from "@/lib/utils/markdown";
import { LRH } from "@/components/lrh/tokens";

export default function ArticleBody({ content }: { content: string }) {
  const html = renderContent(content);
  return (
    <>
      <div className="lrh-article-body" dangerouslySetInnerHTML={{ __html: html }} />
      <style>{`
        .lrh-article-body { font-family: var(--font-montserrat), system-ui, sans-serif; font-size: 17px; line-height: 1.7; color: ${LRH.ink2}; }
        .lrh-article-body > * + * { margin-top: 1.1em; }
        .lrh-article-body h1, .lrh-article-body h2, .lrh-article-body h3, .lrh-article-body h4 {
          font-family: var(--font-poppins), system-ui, sans-serif;
          color: ${LRH.navy}; font-weight: 700; letter-spacing: -0.01em; line-height: 1.25;
          margin-top: 2em;
        }
        .lrh-article-body h2 { font-size: 28px; }
        .lrh-article-body h3 { font-size: 22px; }
        .lrh-article-body h4 { font-size: 18px; }
        .lrh-article-body a { color: ${LRH.red}; text-decoration: underline; text-underline-offset: 2px; }
        .lrh-article-body a:hover { color: ${LRH.redDeep}; }
        .lrh-article-body img { max-width: 100%; height: auto; border-radius: 8px; }
        .lrh-article-body blockquote {
          border-left: 4px solid ${LRH.gold}; padding: 8px 16px;
          background: ${LRH.paperWarm}; border-radius: 0 8px 8px 0;
          color: ${LRH.ink}; font-style: italic;
        }
        .lrh-article-body code {
          background: ${LRH.paper}; padding: 2px 6px; border-radius: 4px;
          font-family: var(--font-jetbrains-mono), ui-monospace, monospace; font-size: 0.92em;
        }
        .lrh-article-body pre {
          background: ${LRH.ink}; color: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto;
        }
        .lrh-article-body pre code { background: transparent; color: inherit; padding: 0; }
        .lrh-article-body ul, .lrh-article-body ol { padding-left: 1.5em; }
        .lrh-article-body li + li { margin-top: 0.4em; }
        .lrh-article-body hr { border: none; border-top: 1px solid ${LRH.hair}; margin: 2em 0; }
        .lrh-article-body table { width: 100%; border-collapse: collapse; }
        .lrh-article-body th, .lrh-article-body td { border: 1px solid ${LRH.hair}; padding: 8px 12px; text-align: left; }
        .lrh-article-body th { background: ${LRH.paper}; font-weight: 700; }
      `}</style>
    </>
  );
}
