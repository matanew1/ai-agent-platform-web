import { apiRequest } from "../../shared/api/client";
import type { StoredDocument } from "./types";

export async function ingestDocument(file: File) {
  const data = new FormData();
  data.append("file", file);
  return apiRequest<{ source_id: string; chunks_indexed: number }>(
    "/documents/file",
    { method: "POST", body: data },
  );
}

export function listDocuments(signal?: AbortSignal) {
  return apiRequest<StoredDocument[]>("/documents", { signal });
}

export function deleteDocument(sourceId: string) {
  return apiRequest<void>(
    `/documents/${encodeURIComponent(sourceId)}`,
    { method: "DELETE" },
  );
}
