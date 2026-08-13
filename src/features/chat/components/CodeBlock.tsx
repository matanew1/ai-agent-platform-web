import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";

type CopyState = "idle" | "copied" | "failed";

type CodeBlockProps = {
  code: string;
  language?: string;
};

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | null>(null);
  const languageLabel = normalizeLanguage(language);

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  const copy = async () => {
    try {
      await copyText(code);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-toolbar">
        <span>{languageLabel}</span>
        <button type="button" onClick={copy} aria-label="Copy code to clipboard">
          {copyState === "copied" ? <Check size={13} /> : copyState === "failed" ? <X size={13} /> : <Copy size={13} />}
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
        </button>
      </div>
      <pre>
        <code className={language ? `language-${languageLabel}` : undefined}>{code}</code>
      </pre>
    </div>
  );
}

function normalizeLanguage(language?: string) {
  const normalized = language?.trim().replace(/[^a-z0-9+#._-]/gi, "");
  return normalized || "text";
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    if (!document.execCommand("copy")) throw new Error("Copy command was rejected");
  } finally {
    textArea.remove();
  }
}
