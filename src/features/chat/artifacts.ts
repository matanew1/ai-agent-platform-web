import { API_BASE_URL } from "../../shared/api/url";

export type MessageArtifact = {
  filename: string;
  path: string;
  kind: "pdf" | "markdown";
};

const SAFE_FILENAME = "(?:[A-Za-z0-9._-]|%[A-Fa-f0-9]{2})+";
const ARTIFACT_REFERENCE = new RegExp(
  `(?:https?:\\/\\/[^\\s<>\"'()[\\]]+)?\\/artifacts\\/${SAFE_FILENAME}\\.(?:pdf|md|markdown)(?:\\?[A-Za-z0-9._~!$&*+,;=:@%/?-]*)?`,
  "gi",
);
const ARTIFACT_PATH = new RegExp(
  `^\\/artifacts\\/(${SAFE_FILENAME}\\.(pdf|md|markdown))$`,
  "i",
);

/** Find downloadable artifacts mentioned by an assistant without altering its text. */
export function findMessageArtifacts(content: string): MessageArtifact[] {
  const artifacts: MessageArtifact[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(ARTIFACT_REFERENCE)) {
    const reference = match[0];
    const artifact = parseArtifactReference(reference);
    const artifactKey = artifact?.filename.toLowerCase();
    if (!artifact || !artifactKey || seen.has(artifactKey)) continue;
    seen.add(artifactKey);
    artifacts.push(artifact);
  }

  return artifacts;
}

function parseArtifactReference(reference: string): MessageArtifact | null {
  if (reference.startsWith("/")) {
    const [pathname] = reference.split("?", 1);
    const match = pathname.match(ARTIFACT_PATH);
    if (!match) return null;
    return buildArtifact(match[1], match[2], pathname);
  }

  try {
    const url = new URL(reference);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.origin !== new URL(API_BASE_URL).origin) return null;
    const match = url.pathname.match(ARTIFACT_PATH);
    if (!match) return null;
    return buildArtifact(match[1], match[2], `${url.pathname}${url.search}`);
  } catch {
    return null;
  }
}

function buildArtifact(encodedFilename: string, extension: string, path: string): MessageArtifact | null {
  let filename: string;
  try {
    filename = decodeURIComponent(encodedFilename);
  } catch {
    return null;
  }
  if (!filename || filename.includes("/") || filename.includes("\\") || filename.startsWith(".")) {
    return null;
  }
  return {
    filename,
    path,
    kind: extension.toLowerCase() === "pdf" ? "pdf" : "markdown",
  };
}
