import { findMessageArtifacts } from "../artifacts";
import type { ArtifactReference, RetrievedSource } from "../types";
import { ArtifactDownloadCard } from "./ArtifactDownloadCard";
import { MarkdownMessage } from "./MarkdownMessage";

type AssistantMessageContentProps = {
  content: string;
  references?: ArtifactReference[];
  sources?: RetrievedSource[];
};

export function AssistantMessageContent({ content, references = [], sources = [] }: AssistantMessageContentProps) {
  // Scanned from `references` only - the backend's structured list of
  // artifacts this turn's tool calls actually produced - never from the
  // model's own free-text `content`. The model can (and, seen live, does)
  // hallucinate a plausible-looking "/artifacts/document-N.pdf" sentence
  // on a turn where no file-generation tool ran, e.g. by extrapolating
  // from an incrementing filename pattern earlier in the conversation;
  // rendering a download card for that produces a card whose link 404s,
  // since no such file was ever created. `references` is populated
  // server-side straight from this turn's real tool results
  // (chat.service._artifact_references), so it can't contain that.
  const artifacts = findMessageArtifacts(
    references.map((reference) => reference.download_url).join("\n"),
  );
  const displayContent = artifacts.length ? content : removeUnverifiedArtifactParagraphs(content);

  return (
    <>
      <MarkdownMessage content={displayContent} />
      {artifacts.length > 0 && (
        <div className="artifact-downloads" aria-label="Generated files">
          {artifacts.map((artifact) => (
            <ArtifactDownloadCard artifact={artifact} key={artifact.path} />
          ))}
        </div>
      )}
      {sources.length > 0 && (
        <details className="message-sources">
          <summary>Sources ({sources.length})</summary>
          {sources.map((source, index) => <div key={`${source.sourceId}-${index}`}><strong>{source.sourceId}</strong><p>{source.excerpt}</p></div>)}
        </details>
      )}
    </>
  );
}

// A model can still occasionally claim that it generated a file even when no
// generation tool ran. Never display that claim as a broken link: genuine
// files always arrive with structured metadata in `references`.
const UNVERIFIED_ARTIFACT_LINK = /(?:https?:\/\/artifacts\/|(?:https?:\/\/[^\s<>"'()[\]]+)?\/artifacts\/)[^\s<>"'()[\]]+\.(?:pdf|md|markdown)(?:\?[^\s<>"'()[\]]*)?/i;

function removeUnverifiedArtifactParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .filter((paragraph) => !UNVERIFIED_ARTIFACT_LINK.test(paragraph))
    .join("\n\n")
    .trim();
}
