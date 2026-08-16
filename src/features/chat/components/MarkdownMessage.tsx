import { memo, Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform, type Components, type UrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlock } from "./CodeBlock";

type MarkdownMessageProps = {
  content: string;
  /** When true, skip Markdown parsing and render raw text — used during streaming for speed. */
  streaming?: boolean;
};

const markdownComponents: Components = {
  a: ({ node: _node, href, children, ...props }) => {
    const external = Boolean(href && /^(?:https?:)?\/\//i.test(href));
    return (
      <a
        {...props}
        href={href}
        rel={external ? "noopener noreferrer" : undefined}
        target={external ? "_blank" : undefined}
      >
        {children}
      </a>
    );
  },
  code: ({ node: _node, className, children, ...props }) => (
    <code {...props} className={className ? `${className} markdown-inline-code` : "markdown-inline-code"}>
      {children}
    </code>
  ),
  pre: ({ node: _node, children }) => {
    const child = Children.toArray(children).find(isValidElement);
    if (!child || typeof child.props !== "object" || child.props === null) {
      return <pre>{children}</pre>;
    }

    const props = child.props as { children?: ReactNode; className?: string };
    const language = /(?:^|\s)language-([^\s]+)/.exec(props.className || "")?.[1];
    const code = textContent(props.children).replace(/\n$/, "");
    return <CodeBlock code={code} language={language} />;
  },
};

/** Render model output as Markdown without allowing raw HTML or executable URLs.
 *  During streaming, skip the Markdown parser entirely and render raw text for speed. */
export const MarkdownMessage = memo(function MarkdownMessage({ content, streaming }: MarkdownMessageProps) {
  if (streaming) {
    return <div className="assistant-copy markdown-message"><p>{content}</p></div>;
  }
  return (
    <div className="assistant-copy markdown-message">
      <ReactMarkdown
        components={markdownComponents}
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={safeMarkdownUrl}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export const safeMarkdownUrl: UrlTransform = (url) => {
  const transformed = defaultUrlTransform(url);
  if (!transformed) return "";

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(transformed)?.[1]?.toLowerCase();
  return !scheme || scheme === "http" || scheme === "https" || scheme === "mailto"
    ? transformed
    : "";
};

function textContent(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textContent).join("");
  if (isValidElement(value)) {
    return textContent((value.props as { children?: ReactNode }).children);
  }
  return "";
}
