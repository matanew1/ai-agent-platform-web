import { useState } from "react";

import { apiResponse } from "../../../shared/api/client";
import type { MessageArtifact } from "../artifacts";

export function ArtifactDownloadCard({ artifact }: { artifact: MessageArtifact }) {
  const [state, setState] = useState<"idle" | "downloading" | "failed">("idle");

  const download = async () => {
    if (state === "downloading") return;
    setState("downloading");
    try {
      const response = await apiResponse(artifact.path);
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = artifact.filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setState("idle");
    } catch {
      setState("failed");
    }
  };

  return (
    <button
      className={`artifact-card ${artifact.kind}`}
      type="button"
      disabled={state === "downloading"}
      onClick={download}
    >
      <span className="artifact-type" aria-hidden="true">
        {artifact.kind === "pdf" ? "PDF" : "MD"}
      </span>
      <span className="artifact-details">
        <strong>{artifact.filename}</strong>
        <small>{artifact.kind === "pdf" ? "PDF document" : "Markdown file"}</small>
      </span>
      <span className="artifact-action">
        {state === "downloading" ? "Downloading…" : state === "failed" ? "Retry" : "Download"}
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 16h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}
