export type IndexedDocument = { name: string; chunks: number; status?: "indexed" | "failed" };

export type StoredDocument = {
  source_id: string;
  chunks_indexed: number;
  status: "indexed" | "failed";
};

/** Present chat-uploaded sources by their filename while retaining their secure source ID. */
export function documentDisplayName(sourceId: string) {
  const chatAttachment = sourceId.match(/^chat\/[^/]+\/[a-f0-9]{16}-(.+)$/i);
  return chatAttachment?.[1] || sourceId;
}
