import { apiRequest, apiStream } from "../../shared/api/client";
import type { ArtifactReference, ChatAttachment, ChatMetadata, IndexedChatDocument, StoredSession } from "./types";

type StreamChatInput = {
  agentId: string;
  sessionId: string;
  message: string;
  files: ChatAttachment[];
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
};

export async function streamChat(input: StreamChatInput): Promise<ChatMetadata> {
  const response = await apiStream(
    `/agents/${input.agentId}/chat/stream`,
    { session_id: input.sessionId, message: input.message, files: input.files },
    input.signal,
  );
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    input.onChunk(decoder.decode(value, { stream: true }));
  }
  const tail = decoder.decode();
  if (tail) input.onChunk(tail);
  let tools: string[] = [];
  try {
    const parsed: unknown = JSON.parse(response.headers.get("X-Tools-Invoked") || "[]");
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) tools = parsed;
  } catch {
    // The answer stream is still valid if optional diagnostic metadata is malformed.
  }
  const parsedChunks = Number(response.headers.get("X-Chunks-Retrieved") || 0);
  const parsedPrepSeconds = Number(response.headers.get("X-Prep-Time-Seconds") || 0);
  let artifacts: ArtifactReference[] = [];
  try {
    const parsed: unknown = JSON.parse(response.headers.get("X-Artifacts") || "[]");
    if (Array.isArray(parsed)) {
      artifacts = parsed.filter((item): item is ArtifactReference => (
        typeof item === "object" && item !== null &&
        typeof (item as ArtifactReference).filename === "string" &&
        typeof (item as ArtifactReference).download_url === "string"
      ));
    }
  } catch {
    // Artifact cards are optional; the streamed answer remains usable.
  }
  let indexedDocuments: IndexedChatDocument[] = [];
  try {
    const parsed: unknown = JSON.parse(response.headers.get("X-Indexed-Documents") || "[]");
    if (Array.isArray(parsed)) {
      indexedDocuments = parsed.flatMap((item) => (
        typeof item === "object" && item !== null &&
        typeof (item as { source_id?: unknown }).source_id === "string" &&
        typeof (item as { chunks_indexed?: unknown }).chunks_indexed === "number"
          ? [{
              sourceId: (item as { source_id: string }).source_id,
              chunks: (item as { chunks_indexed: number }).chunks_indexed,
            }]
          : []
      ));
    }
  } catch {
    // Indexing is complete even if the optional display metadata is malformed.
  }
  return {
    tools,
    chunks: Number.isFinite(parsedChunks) ? parsedChunks : 0,
    prepSeconds: Number.isFinite(parsedPrepSeconds) ? parsedPrepSeconds : undefined,
    artifacts,
    indexedDocuments,
  };
}

export function listSessions(agentId: string, signal?: AbortSignal) {
  return apiRequest<StoredSession[]>(
    `/agents/${agentId}/sessions`,
    { signal },
  );
}

export function deleteSession(agentId: string, sessionId: string) {
  return apiRequest<void>(
    `/agents/${agentId}/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
}
