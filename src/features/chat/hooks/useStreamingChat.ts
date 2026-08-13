import { FormEvent, useEffect, useRef, useState } from "react";

import { getErrorMessage } from "../../../shared/lib/errors";
import { fileToAttachment } from "../../../shared/lib/files";
import { newId, sessionTitle } from "../../../shared/lib/format";
import { streamChat } from "../api";
import type { ChatMessage, Session } from "../types";
import type { IndexedChatDocument } from "../types";

type UseStreamingChatInput = {
  agent: { id: string } | null;
  session: Session | null;
  updateSession: (agentId: string, sessionId: string, updater: (session: Session) => Session) => void;
  onError: (message: string | null) => void;
  onDocumentsIndexed: (documents: IndexedChatDocument[]) => void;
};

export function useStreamingChat({ agent, session, updateSession, onError, onDocumentsIndexed }: UseStreamingChatInput) {
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [streaming, setStreaming] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setStreaming(false);
    setDraft("");
    setFiles([]);
    return () => activeRequest.current?.abort();
  }, [agent?.id, session?.id]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!agent || !session || !draft.trim() || streaming) return;

    const input = draft.trim();
    const queuedFiles = files;
    const controller = new AbortController();
    const assistantId = newId();
    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      content: input,
      files: queuedFiles.map((file) => file.name),
    };
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      meta: { tools: [], chunks: 0, artifacts: [], indexedDocuments: [] },
    };
    const update = (updater: (current: Session) => Session) =>
      updateSession(agent.id, session.id, updater);

    update((current) => ({
      ...current,
      title: current.messages.length ? current.title : sessionTitle(input),
      messages: [...current.messages, userMessage, assistantMessage],
      updatedAt: Date.now(),
    }));
    setDraft("");
    setFiles([]);
    setStreaming(true);
    activeRequest.current = controller;
    onError(null);

    try {
      const attachments = await Promise.all(queuedFiles.map(fileToAttachment));
      const meta = await streamChat({
        agentId: agent.id,
        sessionId: session.id,
        message: input,
        files: attachments,
        signal: controller.signal,
        onChunk: (chunk) => update((current) => ({
          ...current,
          messages: current.messages.map((message) =>
            message.id === assistantId ? { ...message, content: message.content + chunk } : message,
          ),
        })),
      });
      onDocumentsIndexed(meta.indexedDocuments);
      update((current) => ({
        ...current,
        persisted: true,
        messages: current.messages.map((message) =>
          message.id === assistantId ? { ...message, meta } : message,
        ),
        updatedAt: Date.now(),
      }));
    } catch (reason) {
      const interrupted = controller.signal.aborted;
      update((current) => ({
        ...current,
        messages: current.messages.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: message.content
                  ? `${message.content}\n\n[Stream interrupted]`
                  : interrupted ? "Response stopped." : "I couldn’t complete that request.",
                meta: undefined,
              }
            : message,
        ),
      }));
      if (!interrupted) onError(getErrorMessage(reason, "Streaming failed."));
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setStreaming(false);
      }
    }
  };

  return { draft, files, streaming, setDraft, setFiles, send };
}
