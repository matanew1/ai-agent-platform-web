import { ChangeEvent, useEffect, useRef, useState } from "react";

import { DEFAULT_PAGE_LIMIT } from "../../../shared/api/pagination";
import { getErrorMessage } from "../../../shared/lib/errors";
import { deleteDocument, ingestDocument, listDocuments } from "../api";
import type { IndexedDocument, StoredDocument } from "../types";
import type { IndexedChatDocument } from "../../chat/types";

function fromStored(document: StoredDocument): IndexedDocument {
  return { name: document.source_id, chunks: document.chunks_indexed, status: document.status };
}

export function useDocuments(userId: string, onError: (message: string | null) => void) {
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const activeUser = useRef(userId);

  useEffect(() => {
    activeUser.current = userId;
    setDocuments([]);
    setTotal(0);
    setLoading(true);
    setUploading(false);
    setDeleting(null);
    const controller = new AbortController();
    void listDocuments({ limit: DEFAULT_PAGE_LIMIT, offset: 0 }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        setDocuments(page.items.map(fromStored));
        setTotal(page.total);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) onError(getErrorMessage(reason, "Could not load documents."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [onError, userId]);

  const loadMore = async () => {
    if (loadingMore || documents.length >= total) return;
    const requestUser = userId;
    setLoadingMore(true);
    onError(null);
    try {
      const page = await listDocuments({ limit: DEFAULT_PAGE_LIMIT, offset: documents.length });
      if (activeUser.current === requestUser) {
        setDocuments((current) => [...current, ...page.items.map(fromStored)]);
        setTotal(page.total);
      }
    } catch (reason) {
      if (activeUser.current === requestUser) onError(getErrorMessage(reason, "Could not load more documents."));
    } finally {
      if (activeUser.current === requestUser) setLoadingMore(false);
    }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const input = event.currentTarget;
    const requestUser = userId;
    setUploading(true);
    onError(null);
    try {
      const result = await ingestDocument(file);
      if (activeUser.current === requestUser) {
        // Compute "is this new" from the functional updater's own `current`,
        // not the `documents` closed over when `upload` was called - two
        // uploads resolving between renders would otherwise both read the
        // same stale snapshot and double-count the same new document.
        setDocuments((current) => {
          const isNew = !current.some((document) => document.name === result.source_id);
          if (isNew) setTotal((total) => total + 1);
          return [
            { name: result.source_id, chunks: result.chunks_indexed, status: "indexed" },
            ...current.filter((document) => document.name !== result.source_id),
          ];
        });
      }
    } catch (reason) {
      if (activeUser.current === requestUser) onError(getErrorMessage(reason, "Document upload failed."));
    } finally {
      if (activeUser.current === requestUser) setUploading(false);
      input.value = "";
    }
  };

  const remove = async (sourceId: string) => {
    const requestUser = userId;
    setDeleting(sourceId);
    onError(null);
    try {
      await deleteDocument(sourceId);
      if (activeUser.current === requestUser) {
        setDocuments((current) => current.filter((document) => document.name !== sourceId));
        setTotal((current) => Math.max(0, current - 1));
      }
    } catch (reason) {
      if (activeUser.current === requestUser) onError(getErrorMessage(reason, "Could not delete the document."));
    } finally {
      if (activeUser.current === requestUser) setDeleting(null);
    }
  };

  const addIndexed = (indexed: IndexedChatDocument[]) => {
    if (!indexed.length) return;
    const added = indexed.map((document) => ({ name: document.sourceId, chunks: document.chunks, status: "indexed" as const }));
    // Same reasoning as upload() above: derive newCount from the updater's
    // own `current`, not the closed-over `documents`, to avoid double-
    // counting when this races another mutation between renders.
    setDocuments((current) => {
      const newCount = added.filter((item) => !current.some((document) => document.name === item.name)).length;
      if (newCount) setTotal((total) => total + newCount);
      return [
        ...added,
        ...current.filter((document) => !indexed.some((item) => item.sourceId === document.name)),
      ];
    });
  };

  return { documents, total, loading, loadingMore, uploading, deleting, upload, remove, addIndexed, loadMore };
}
