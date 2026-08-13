import { FormEvent, RefObject, useEffect, useRef, useState } from "react";

import { DEFAULT_MODEL } from "../../../shared/config/constants";
import { Avatar } from "../../../shared/ui/Avatar";
import type { Session } from "../types";
import { AssistantMessageContent } from "./AssistantMessageContent";

type ChatPaneProps = {
  agent: { name: string; model?: string | null };
  session: Session | null;
  draft: string;
  files: File[];
  streaming: boolean;
  uploadRef: RefObject<HTMLInputElement | null>;
  onDraft: (value: string) => void;
  onFiles: (files: File[]) => void;
  onSubmit: (event: FormEvent) => void;
  onNewSession: () => void;
};

export function ChatPane(props: ChatPaneProps) {
  const { agent, session, draft, files, streaming, uploadRef, onDraft, onFiles, onSubmit, onNewSession } = props;
  const messagesRef = useRef<HTMLDivElement>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const latestContent = session?.messages.at(-1)?.content;

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromBottom < 140) element.scrollTo({ top: element.scrollHeight, behavior: streaming ? "auto" : "smooth" });
  }, [latestContent, session?.messages.length, streaming]);

  return (
    <section className="chat-pane">
      <header className="chat-head">
        <div><h2>{session?.title || "New conversation"}</h2><p>{agent.name} · session {session?.id.slice(0, 6) || "new"} · {agent.model || DEFAULT_MODEL}</p></div>
        <div className="chat-actions">
          <button className="secondary" type="button" onClick={() => window.print()}>Export</button>
          <button className="secondary" type="button" onClick={onNewSession}>New session</button>
        </div>
      </header>
      <div className="messages" ref={messagesRef}>
        {!session?.messages.length && (
          <div className="empty-conversation">
            <Avatar name={agent.name} />
            <h3>Start a conversation with {agent.name}</h3>
            <p>Attach a document for this answer or add one to the shared library in the inspector.</p>
          </div>
        )}
        {session?.messages.map((message) => (
          <article className={`message ${message.role}`} key={message.id}>
            {message.role === "assistant" && <Avatar name={agent.name} small />}
            <div className="message-body">
              {message.role === "assistant" && message.meta && (message.meta.tools.length > 0 || message.meta.chunks > 0) && (
                <div className="meta-row">
                  {message.meta.tools.map((tool, index) => (
                    <span className={index === 0 ? "active" : ""} key={tool}>
                      {tool}{index === 0 && message.meta?.chunks ? ` · ${message.meta.chunks} chunks` : ""}{index === 0 && message.meta?.prepSeconds ? ` · ${formatDuration(message.meta.prepSeconds)}` : ""}
                    </span>
                  ))}
                  {message.meta.tools.length === 0 && message.meta.chunks > 0 && <span className="active">rag_search · {message.meta.chunks} chunks</span>}
                </div>
              )}
              <div className="bubble">
                {message.content ? (
                  message.role === "assistant" ? (
                    <AssistantMessageContent content={message.content} references={message.meta?.artifacts} />
                  ) : message.content
                ) : (
                  <span className="typing">Thinking<span>.</span><span>.</span><span>.</span></span>
                )}
                {!!message.files?.length && (
                  <div className="attachment-row">
                    {message.files.map((file) => <span key={file}>⌕ {file}</span>)}
                  </div>
                )}
              </div>
              {message.role === "assistant" && (
                <div className="message-status">
                  <span>{streaming && message === session?.messages.at(-1) ? "streaming" : "complete"}</span>
                  {streaming && message === session?.messages.at(-1) && <i><b /><b /><b /></i>}
                  {!!message.content && <span>{estimateTokens(message.content).toLocaleString()} tok</span>}
                  {!!message.content && <span>stop</span>}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      <form className="composer" onSubmit={onSubmit}>
        <input
          ref={uploadRef}
          type="file"
          multiple
          accept=".txt,.pdf,.docx"
          hidden
          onChange={(event) => {
            onFiles([...files, ...Array.from(event.target.files || [])]);
            event.target.value = "";
          }}
        />
        <div className="composer-box">
          {files.length > 0 && (
            <div className="queued-files">
              {files.map((file) => (
                <span key={`${file.name}-${file.lastModified}`}>
                  {file.name}
                  <button type="button" onClick={() => onFiles(files.filter((queued) => queued !== file))}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="composer-row">
            <div className="composer-add">
              <button
                type="button"
                className="attach"
                aria-label="More message actions"
                aria-expanded={actionsOpen}
                onClick={() => setActionsOpen((open) => !open)}
              >
                <span aria-hidden="true">+</span>
              </button>
              {actionsOpen && (
                <div className="composer-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => {
                    setActionsOpen(false);
                    uploadRef.current?.click();
                  }}>Attach files</button>
                </div>
              )}
            </div>
            <textarea
              rows={1}
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
              placeholder={`Message ${agent.name}`}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="composer-actions">
              <button className="send" disabled={!session || !draft.trim() || streaming} aria-label="Send message">
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 16V4M4.5 9.5L10 4l5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        </div>
        <div className="composer-shortcuts"><span>⇧⏎ newline</span><span>⌘K switch agent</span><span>⌘U upload</span></div>
      </form>
    </section>
  );
}

function formatDuration(seconds: number) {
  return seconds < 1 ? `${Math.round(seconds * 1000)}ms` : `${seconds.toFixed(1)}s`;
}

function estimateTokens(content: string) {
  return Math.max(1, Math.round(content.length / 4));
}
