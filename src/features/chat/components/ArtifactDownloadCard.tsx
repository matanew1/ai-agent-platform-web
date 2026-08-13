import { useState } from "react";
import { Download, FileText, FileCode, Loader as Loader2, CircleAlert as AlertCircle } from "lucide-react";

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
        {artifact.kind === "pdf" ? <FileText size={18} /> : <FileCode size={18} />}
      </span>
      <span className="artifact-details">
        <strong>{artifact.filename}</strong>
        <small>{artifact.kind === "pdf" ? "PDF document" : "Markdown file"}</small>
      </span>
      <span className="artifact-action">
        {state === "downloading" ? <><Loader2 size={13} className="spin" /> Downloading…</> : state === "failed" ? <><AlertCircle size={13} /> Retry</> : <><Download size={13} /> Download</>}
      </span>
    </button>
  );
}
