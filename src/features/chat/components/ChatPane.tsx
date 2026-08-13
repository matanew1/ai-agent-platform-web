import { FormEvent, RefObject, useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Copy, Paperclip, Plus, Printer, SquarePen } from "lucide-react";

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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
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
        <div><h2>{session?.title || "New conversation"}</h2><p>{agent.name} · {session?.id.slice(0, 6) || "new"} · {agent.model || DEFAULT_MODEL}</p></div>
        <div className="chat-actions">
          <button className="secondary" type="button" onClick={() => window.print()}><Printer size={14} /> Export</button>
          <button className="secondary" type="button" onClick={onNewSession}><SquarePen size={14} /> New session</button>
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
              {message.role === "assistant" && message.meta && (
                <div className="message-activity">
                  <div className="meta-row" aria-label="Tools used">
                    <small>Tools</small>
                    {message.meta.tools.length > 0
                      ? message.meta.tools.map((tool) => <span className="active" key={tool}>{tool}</span>)
                      : <span>None</span>}
                  </div>
                  {message.meta.chunks > 0 && (
                    <div className="meta-row" aria-label="Retrieved context">
                      <small>Retrieved</small>
                      <span className="active">{message.meta.chunks} {message.meta.chunks === 1 ? "chunk" : "chunks"}{message.meta.prepSeconds ? ` · ${formatDuration(message.meta.prepSeconds)}` : ""}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="bubble">
                {message.content ? (
                  message.role === "assistant" ? (
                    <AssistantMessageContent content={message.content} references={message.meta?.artifacts} sources={message.meta?.sources} />
                  ) : message.content
                ) : (
                  <span className="typing">Thinking<span>.</span><span>.</span><span>.</span></span>
                )}
                {!!message.files?.length && (
                  <div className="attachment-row">
                    {message.files.map((file) => <span key={file}>{file}</span>)}
                  </div>
                )}
              </div>
              {!!message.content && (
                <button
                  className="message-copy"
                  type="button"
                  aria-label="Copy message"
                  onClick={() => {
                    void navigator.clipboard.writeText(message.content).then(() => {
                      setCopiedMessageId(message.id);
                      window.setTimeout(() => setCopiedMessageId((current) => current === message.id ? null : current), 1600);
                    });
                  }}
                >
                  {copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}
                  {copiedMessageId === message.id ? "Copied" : "Copy"}
                </button>
              )}
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
                <Plus size={18} />
              </button>
              {actionsOpen && (
                <div className="composer-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => {
                    setActionsOpen(false);
                    uploadRef.current?.click();
                  }}>
                    <Paperclip size={13} /> Attach files
                  </button>
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
                <ArrowUp size={16} />
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
