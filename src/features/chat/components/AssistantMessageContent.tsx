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

  return (
    <>
      <MarkdownMessage content={content} />
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
