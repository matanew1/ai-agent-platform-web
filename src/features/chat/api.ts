import { apiRequest, apiStream } from "../../shared/api/client";
import type { ArtifactReference, ChatAttachment, ChatMetadata, IndexedChatDocument, RetrievedSource, StoredSession } from "./types";

type StreamChatInput = {
  agentId: string;
  sessionId: string;
  message: string;
  files: ChatAttachment[];
  /** Narrows the agent's own allowed_tools for this one turn; omitted
   * means "use whatever the agent allows" (the pre-existing behavior).
   * Used by the schedule editor's "Test message" preview to honor a
   * schedule's own tools override - see chat.schemas.ChatRequest.tools. */
  tools?: string[];
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
};

export async function streamChat(input: StreamChatInput): Promise<ChatMetadata> {
  const response = await apiStream(
    `/agents/${input.agentId}/chat/stream`,
    {
      session_id: input.sessionId,
      message: input.message,
      files: input.files,
      ...(input.tools ? { tools: input.tools } : {}),
    },
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
  let sources: RetrievedSource[] = [];
  try {
    const parsed: unknown = JSON.parse(response.headers.get("X-Retrieved-Sources") || "[]");
    if (Array.isArray(parsed)) sources = parsed.filter((item): item is { source_id: string; excerpt: string; score: number } => (
      typeof item === "object" && item !== null &&
      typeof (item as { source_id?: unknown }).source_id === "string" &&
      typeof (item as { excerpt?: unknown }).excerpt === "string" &&
      typeof (item as { score?: unknown }).score === "number"
    )).map((item) => ({ sourceId: item.source_id, excerpt: item.excerpt, score: item.score }));
  } catch {
    // The answer stream remains usable if optional citations are malformed.
  }
  return {
    tools,
    chunks: Number.isFinite(parsedChunks) ? parsedChunks : 0,
    prepSeconds: Number.isFinite(parsedPrepSeconds) ? parsedPrepSeconds : undefined,
    artifacts,
    indexedDocuments,
    sources,
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
