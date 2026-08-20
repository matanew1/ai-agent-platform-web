import { apiRequest } from "../../shared/api/client";
import { DEFAULT_PAGE_LIMIT, type Page } from "../../shared/api/pagination";
import type { StoredDocument } from "./types";

export async function ingestDocument(file: File) {
  const data = new FormData();
  data.append("file", file);
  return apiRequest<{ source_id: string; chunks_indexed: number }>(
    "/documents/file",
    { method: "POST", body: data },
  );
}

export function listDocuments(
  { limit = DEFAULT_PAGE_LIMIT, offset = 0 }: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
) {
  return apiRequest<Page<StoredDocument>>(
    `/documents?limit=${limit}&offset=${offset}`,
    { signal },
  );
}

export function deleteDocument(sourceId: string) {
  return apiRequest<void>(
    `/documents/${encodeURIComponent(sourceId)}`,
    { method: "DELETE" },
  );
}
