export type ArtifactReference = { filename: string; download_url: string };
export type IndexedChatDocument = { sourceId: string; chunks: number };

export type ChatMetadata = {
  tools: string[];
  chunks: number;
  prepSeconds?: number;
  artifacts: ArtifactReference[];
  indexedDocuments: IndexedChatDocument[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: string[];
  meta?: ChatMetadata;
};

export type Session = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  persisted: boolean;
};

export type ChatAttachment = { filename: string; content_base64: string };

export type StoredSession = {
  session_id: string;
  history: Array<Pick<ChatMessage, "role" | "content"> & {
    tools_invoked?: string[];
    chunks_retrieved?: number;
    prep_time_seconds?: number | null;
    artifacts?: ArtifactReference[];
  }>;
  updated_at: string;
};
