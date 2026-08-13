import { ChangeEvent, useEffect, useRef, useState } from "react";

import { getErrorMessage } from "../../../shared/lib/errors";
import { deleteDocument, ingestDocument, listDocuments } from "../api";
import type { IndexedDocument } from "../types";
import type { IndexedChatDocument } from "../../chat/types";

export function useDocuments(userId: string, onError: (message: string | null) => void) {
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const activeUser = useRef(userId);

  useEffect(() => {
    activeUser.current = userId;
    setDocuments([]);
    setLoading(true);
    setUploading(false);
    setDeleting(null);
    const controller = new AbortController();
    void listDocuments(controller.signal)
      .then((stored) => {
        if (controller.signal.aborted) return;
        setDocuments(stored.map((document) => ({
          name: document.source_id,
          chunks: document.chunks_indexed,
          status: document.status,
        })));
      })
      .catch((reason) => {
        if (!controller.signal.aborted) onError(getErrorMessage(reason, "Could not load documents."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [onError, userId]);

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
        setDocuments((current) => [
          { name: result.source_id, chunks: result.chunks_indexed, status: "indexed" },
          ...current.filter((document) => document.name !== result.source_id),
        ]);
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
      }
    } catch (reason) {
      if (activeUser.current === requestUser) onError(getErrorMessage(reason, "Could not delete the document."));
    } finally {
      if (activeUser.current === requestUser) setDeleting(null);
    }
  };

  const addIndexed = (indexed: IndexedChatDocument[]) => {
    if (!indexed.length) return;
    setDocuments((current) => [
      ...indexed.map((document) => ({ name: document.sourceId, chunks: document.chunks, status: "indexed" as const })),
      ...current.filter((document) => !indexed.some((added) => added.sourceId === document.name)),
    ]);
  };

  return { documents, loading, uploading, deleting, upload, remove, addIndexed };
}
