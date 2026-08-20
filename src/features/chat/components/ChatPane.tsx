import { FormEvent, RefObject, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Check, Copy, Eraser, Mic, MicOff, PanelLeftClose, PanelLeftOpen, Paperclip, Plus, Printer, Sparkles, Square, SquarePen, Volume2, VolumeX } from "lucide-react";

import { DEFAULT_MODEL } from "../../../shared/config/constants";
import { Avatar } from "../../../shared/ui/Avatar";
import { AccountAvatar } from "../../../shared/ui/AccountAvatar";
import { getErrorMessage } from "../../../shared/lib/errors";
import { rewriteDraft } from "../api";
import type { Session } from "../types";
import { AssistantMessageContent } from "./AssistantMessageContent";
import { useI18n } from "../../../shared/i18n/I18nProvider";

type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionErrorEventLike = { error: string };
type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null; onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void; stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function speechRecognitionConstructor() {
  const browser = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

function joinDictation(existing: string, dictated: string) {
  return [existing.trim(), dictated.trim()].filter(Boolean).join(existing.trim() && dictated.trim() ? " " : "");
}

type ChatPaneProps = {
  agent: { id: string; name: string; model?: string | null };
  userName: string;
  userAvatarUrl?: string | null;
  sidebarOpen: boolean;
  autoReadResponses: boolean;
  sendOnEnter: boolean;
  englishVoice: string;
  hebrewVoice: string;
  speechInputLocale: "auto" | "en" | "he";
  session: Session | null;
  draft: string;
  files: File[];
  streaming: boolean;
  uploadRef: RefObject<HTMLInputElement | null>;
  onDraft: (value: string) => void;
  onFiles: (files: File[]) => void;
  onSubmit: (event: FormEvent) => void;
  onStop: () => void;
  onNewSession: () => void;
  onClearSession: () => void;
  onToggleSidebar: () => void;
  onError?: (message: string | null) => void;
  showSources: boolean;
  showToolActivity: boolean;
};

export function ChatPane(props: ChatPaneProps) {
  const { t, locale } = useI18n();
  const { agent, userName, userAvatarUrl, session, draft, files, streaming, uploadRef, onDraft, onFiles, onSubmit, onStop, onNewSession, onClearSession, onToggleSidebar, onError, sidebarOpen, autoReadResponses, sendOnEnter, englishVoice, hebrewVoice, speechInputLocale, showSources, showToolActivity } = props;
  const [enhancing, setEnhancing] = useState(false);

  async function enhanceDraft() {
    if (!draft.trim() || enhancing) return;
    setEnhancing(true);
    onError?.(null);
    try {
      const result = await rewriteDraft(agent.id, draft);
      onDraft(result.message);
    } catch (reason) {
      onError?.(getErrorMessage(reason, "Could not enhance the message."));
    } finally {
      setEnhancing(false);
    }
  }
  const messagesRef = useRef<HTMLDivElement>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const keepListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const speakingMessageRef = useRef<string | null>(null);
  const autoReadMessageRef = useRef<string | null>(null);
  const latestContent = session?.messages.at(-1)?.content;
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = messagesRef.current;
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < 140) el.scrollTo({ top: el.scrollHeight, behavior: streaming ? "auto" : "smooth" });
    });
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [latestContent, session?.messages.length, streaming]);

  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => () => {
    keepListeningRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    recognitionRef.current?.stop();
  }, []);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const voiceSupported = typeof window !== "undefined" && Boolean(speechRecognitionConstructor());
  const toggleVoiceInput = () => {
    if (listening) {
      keepListeningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) return;
    const initialDraft = draftRef.current;
    const inputLanguage = speechInputLocale === "auto" ? locale : speechInputLocale;
    const language = inputLanguage === "he" ? "he-IL" : "en-US";
    let dictatedText = "";
    let blockedByError = false;
    keepListeningRef.current = true;

    const startRecognition = () => {
      const recognition = new Recognition();
      const resultSegments = new Map<number, string>();
      recognitionRef.current = recognition;
      recognition.lang = language;
      // Continuous mode lets the browser keep listening through short pauses.
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = () => setListening(true);
      recognition.onerror = (event) => {
        // Permission and service errors cannot recover without user action.
        blockedByError = event.error === "not-allowed" || event.error === "service-not-allowed";
      };
      recognition.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          resultSegments.set(index, event.results[index][0].transcript.trim());
        }
        const currentText = [...resultSegments.values()].filter(Boolean).join(" ");
        onDraft(joinDictation(initialDraft, [dictatedText, currentText].filter(Boolean).join(" ")));
      };
      recognition.onend = () => {
        const currentText = [...resultSegments.values()].filter(Boolean).join(" ");
        dictatedText = [dictatedText, currentText].filter(Boolean).join(" ").trim();
        recognitionRef.current = null;
        if (!keepListeningRef.current || blockedByError) {
          setListening(false);
          return;
        }
        // Chromium can end a recognition turn after a quiet gap. A brief grace
        // period avoids chopping a thought while still making the restart stable.
        restartTimerRef.current = setTimeout(startRecognition, 800);
      };
      try {
        recognition.start();
      } catch {
        recognitionRef.current = null;
        keepListeningRef.current = false;
        setListening(false);
      }
    };
    startRecognition();
  };

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  const speakMessage = (messageId: string, content: string) => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(toSpokenText(content));
    const language: "he-IL" | "en-US" = /[\u0590-\u05FF]/.test(content) ? "he-IL" : "en-US";
    utterance.lang = language;
    utterance.voice = preferredVoice(language, language === "he-IL" ? hebrewVoice : englishVoice);
    utterance.rate = 0.96;
    utterance.pitch = 1.04;
    speakingMessageRef.current = messageId;
    setSpeakingMessageId(messageId);
    utterance.onend = utterance.onerror = () => {
      if (speakingMessageRef.current === messageId) {
        speakingMessageRef.current = null;
        setSpeakingMessageId(null);
      }
    };
    window.speechSynthesis.speak(utterance);
  };
  const toggleSpeech = (messageId: string, content: string) => {
    if (speakingMessageRef.current === messageId) {
      window.speechSynthesis.cancel();
      speakingMessageRef.current = null;
      setSpeakingMessageId(null);
      return;
    }
    speakMessage(messageId, content);
  };

  const latestAssistantMessage = session?.messages.at(-1);
  useEffect(() => {
    if (!autoReadResponses || streaming || latestAssistantMessage?.role !== "assistant" || !latestAssistantMessage.content || autoReadMessageRef.current === latestAssistantMessage.id) return;
    autoReadMessageRef.current = latestAssistantMessage.id;
    speakMessage(latestAssistantMessage.id, latestAssistantMessage.content);
  }, [autoReadResponses, latestAssistantMessage?.content, latestAssistantMessage?.id, latestAssistantMessage?.role, streaming]);

  return (
    <section className="chat-pane">
      <header className="chat-head">
        <button className="sidebar-toggle" type="button" aria-label={sidebarOpen ? t("closeSidebar") : t("openSidebar")} aria-expanded={sidebarOpen} onClick={onToggleSidebar}>
          {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>
        <div className="chat-title"><h2>{session?.title || t("newSession")}</h2><p>{agent.name} · {session?.id.slice(0, 6) || t("new")} · {agent.model || DEFAULT_MODEL}</p></div>
        <div className="chat-actions">
          <button className="secondary" type="button" onClick={() => window.print()}><Printer size={14} /> {t("export")}</button>
          {!!session?.messages.length && (
            <button
              className="secondary"
              type="button"
              onClick={() => { if (window.confirm(t("clearSessionConfirm"))) onClearSession(); }}
            >
              <Eraser size={14} /> {t("clearSession")}
            </button>
          )}
          <button className="secondary" type="button" onClick={onNewSession}><SquarePen size={14} /> {t("newSession")}</button>
        </div>
      </header>
      <div className="messages" ref={messagesRef}>
        {!session?.messages.length && (
          <div className="empty-conversation">
            <Avatar name={agent.name} />
            <h3>{t("startConversation", { agent: agent.name })}</h3>
            <p>{t("attachDocument")}</p>
          </div>
        )}
        {session?.messages.map((message) => (
          <article className={`message ${message.role}`} key={message.id}>
            {message.role === "assistant" && <span className="message-avatar message-avatar-assistant" aria-label={agent.name}><Bot size={16} strokeWidth={1.8} /></span>}
            <div className="message-body">
              {message.role === "assistant" && message.meta && showToolActivity && (message.meta.tools.length > 0 || message.meta.chunks > 0) && (
                <div className="message-activity">
                  {message.meta.tools.length > 0 && (
                    <div className="meta-row" aria-label={t("toolsUsed")}>
                      <small>{t("toolsUsed")}</small>
                      {message.meta.tools.map((tool) => <span className="active" key={tool}>{tool}</span>)}
                    </div>
                  )}
                  {message.meta.chunks > 0 && (
                    <div className="meta-row" aria-label={t("retrievedContext")}>
                      <small>{t("retrieved")}</small>
                      <span className="active">{message.meta.chunks} {t(message.meta.chunks === 1 ? "chunk" : "chunks")}{message.meta.prepSeconds ? ` · ${formatDuration(message.meta.prepSeconds)}` : ""}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="bubble" dir="auto">
                {message.content ? (
                  message.role === "assistant" ? (
                    <AssistantMessageContent content={message.content} references={message.meta?.artifacts} sources={showSources ? message.meta?.sources : []} streaming={streaming && message === session?.messages.at(-1)} />
                  ) : message.content
                ) : (
                  <span className="typing">{t("thinking")}<span>.</span><span>.</span><span>.</span></span>
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
                  aria-label={t("copyMessage")}
                  onClick={() => {
                    void navigator.clipboard.writeText(message.content).then(() => {
                      setCopiedMessageId(message.id);
                      window.setTimeout(() => setCopiedMessageId((current) => current === message.id ? null : current), 1600);
                    });
                  }}
                >
                  {copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}
                  {copiedMessageId === message.id ? t("copied") : t("copy")}
                </button>
              )}
              {message.role === "assistant" && !!message.content && (
                <button
                  className={`message-copy message-speak ${speakingMessageId === message.id ? "speaking" : ""}`}
                  type="button"
                  disabled={!speechSupported}
                  aria-label={speakingMessageId === message.id ? t("stopReading") : t("readAloud")}
                  title={speechSupported ? (speakingMessageId === message.id ? t("stopReading") : t("readAloud")) : t("textToSpeechUnsupported")}
                  onClick={() => toggleSpeech(message.id, message.content)}
                >
                  {speakingMessageId === message.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  {speakingMessageId === message.id ? t("stopReading") : t("readAloud")}
                </button>
              )}
              {message.role === "assistant" && (
                <div className="message-status">
                  <span>{streaming && message === session?.messages.at(-1) ? t("streaming") : t("complete")}</span>
                  {streaming && message === session?.messages.at(-1) && <i><b /><b /><b /></i>}
                  {!!message.content && <span>{estimateTokens(message.content).toLocaleString()} {t("tokenShort")}</span>}
                  {!!message.content && <span>{t("stop")}</span>}
                </div>
              )}
            </div>
            {message.role === "user" && <span className="message-avatar message-avatar-user"><AccountAvatar name={userName} avatarUrl={userAvatarUrl} /></span>}
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
                aria-label={t("moreMessageActions")}
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
                    <Paperclip size={13} /> {t("attachFiles")}
                  </button>
                </div>
              )}
            </div>
            <textarea
              dir="auto"
              rows={1}
              value={draft}
              onChange={(event) => onDraft(event.target.value)}
              placeholder={t("messageAgent", { agent: agent.name })}
              onKeyDown={(event) => {
                const shouldSend = sendOnEnter ? !event.shiftKey : (event.metaKey || event.ctrlKey);
                if (event.key === "Enter" && shouldSend) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="composer-actions">
              <button
                className="enhance-draft"
                type="button"
                disabled={!draft.trim() || enhancing}
                aria-label={enhancing ? t("enhancingPrompt") : t("enhancePrompt")}
                title={enhancing ? t("enhancingPrompt") : t("enhancePrompt")}
                onClick={() => void enhanceDraft()}
              >
                <Sparkles size={16} className={enhancing ? "spin" : ""} />
              </button>
              <button
                className={`voice-input ${listening ? "listening" : ""}`}
                disabled={!voiceSupported}
                type="button"
                aria-label={listening ? t("stopVoiceInput") : t("startVoiceInput")}
                aria-pressed={listening}
                title={voiceSupported ? (listening ? t("stopVoiceInput") : t("startVoiceInput")) : t("voiceUnsupported")}
                onClick={toggleVoiceInput}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              {streaming ? (
                <button className="send stop-generation" type="button" aria-label={t("stopGeneration")} title={t("stopGeneration")} onClick={onStop}>
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button className="send" disabled={!session || !draft.trim()} aria-label={t("sendMessage")}>
                  <ArrowUp size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="composer-shortcuts"><span>{sendOnEnter ? "⇧⏎" : "⌘⏎"} {sendOnEnter ? t("newline") : t("sendMessage")}</span><span>⌘K {t("switchAgent")}</span><span>⌘U {t("upload")}</span></div>
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

function toSpokenText(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>*\-]+\s*/gm, "")
    .replace(/[*_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prefer warm, natural system voices over the browser's arbitrary default.
 * The fallback always stays within the language requested by the response. */
function preferredVoice(language: "he-IL" | "en-US", selectedVoiceUri: string) {
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find((voice) => voice.voiceURI === selectedVoiceUri && voice.lang.toLowerCase().startsWith(language.slice(0, 2)));
  if (selectedVoice) return selectedVoice;
  const preferredNames = language === "he-IL"
    ? ["carmit", "hila", "hebrew female", "he-il"]
    : ["samantha", "ava", "karen", "jenny", "aria", "zira", "google us english"];
  const lowerName = (voice: SpeechSynthesisVoice) => voice.name.toLowerCase();
  return preferredNames
    .map((name) => voices.find((voice) => voice.lang.toLowerCase().startsWith(language.slice(0, 2)) && lowerName(voice).includes(name)))
    .find((voice): voice is SpeechSynthesisVoice => Boolean(voice))
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(language.slice(0, 2)) && voice.localService)
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(language.slice(0, 2)))
    ?? null;
}
