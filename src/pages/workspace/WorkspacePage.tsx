import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { DashboardSidebar, type DashboardDestination, type WorkspaceIdentity } from "../../components/layout/DashboardSidebar";
import { AgentConfigPanel } from "../../features/agents/components/AgentConfigPanel";
import type { Agent, AgentChanges, Tool } from "../../features/agents/types";
import { ChatPane } from "../../features/chat/components/ChatPane";
import { useStreamingChat } from "../../features/chat/hooks/useStreamingChat";
import type { Session } from "../../features/chat/types";
import type { IndexedChatDocument } from "../../features/chat/types";
import { isScheduledSessionId } from "../../features/schedules/types";
import { DocumentsPanel } from "../../features/documents/components/DocumentsPanel";
import type { IndexedDocument } from "../../features/documents/types";
import type { ModelCatalog } from "../../features/models/types";
import type { AppSettings } from "../../shared/hooks/useAppSettings";
import { useSidebarCollapsed } from "../../shared/hooks/useSidebarCollapsed";
import { useI18n } from "../../shared/i18n/I18nProvider";

type InspectorTab = "sessions" | "config" | "documents";

type WorkspacePageProps = {
  initialTab: InspectorTab;
  identity: WorkspaceIdentity;
  connected: boolean;
  agents: Agent[];
  agent: Agent;
  tools: Tool[];
  modelCatalog: ModelCatalog;
  loadingModels: boolean;
  sessions: Session[];
  selectedSessionId: string | null;
  deletingSessionId: string | null;
  currentSession: Session | null;
  documents: IndexedDocument[];
  loadingDocuments: boolean;
  uploadingDocument: boolean;
  deletingDocument: string | null;
  onSelectAgent: (agent: Agent) => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onClearSession: (sessionId: string) => Promise<void>;
  onNewSession: () => void;
  onUpdateSession: (agentId: string, sessionId: string, updater: (session: Session) => Session) => void;
  onSaveAgent: (agentId: string, changes: AgentChanges) => Promise<unknown>;
  onDeleteAgent: (agentId: string) => Promise<void>;
  onUploadDocument: (event: ChangeEvent<HTMLInputElement>) => void;
  onDeleteDocument: (sourceId: string) => void;
  onError: (message: string | null) => void;
  onDocumentsIndexed: (documents: IndexedChatDocument[]) => void;
  showSources: boolean;
  showToolActivity: boolean;
  autoReadResponses: AppSettings["autoReadResponses"];
  sendOnEnter: AppSettings["sendOnEnter"];
  sidebarDefaultOpen: AppSettings["sidebarDefaultOpen"];
  englishVoice: AppSettings["englishVoice"];
  hebrewVoice: AppSettings["hebrewVoice"];
  speechInputLocale: AppSettings["speechInputLocale"];
  onNavigate: (destination: DashboardDestination) => void;
  onSettings: () => void;
  onProfile: () => void;
  onSignOut?: () => void;
};

export function WorkspacePage(props: WorkspacePageProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<InspectorTab>(props.initialTab);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [saving, setSaving] = useState(false);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);
  const chat = useStreamingChat({
    agent: props.agent,
    session: props.currentSession,
    updateSession: props.onUpdateSession,
    onError: props.onError,
    onDocumentsIndexed: (documents) => {
      props.onDocumentsIndexed(documents);
      if (documents.length) setTab("documents");
    },
  });

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        attachmentRef.current?.click();
      }
      if (event.key.toLowerCase() === "k" && props.agents.length > 1) {
        event.preventDefault();
        const currentIndex = props.agents.findIndex((agent) => agent.id === props.agent.id);
        props.onSelectAgent(props.agents[(currentIndex + 1) % props.agents.length]);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [props.agent.id, props.agents, props.onSelectAgent]);

  const saveAgent = async (changes: AgentChanges) => {
    setSaving(true);
    try {
      return await props.onSaveAgent(props.agent.id, changes);
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async () => {
    if (!window.confirm(`${t("deleteAgent")} ${props.agent.name}?`)) return;
    await props.onDeleteAgent(props.agent.id);
  };

  const deleteSession = (sessionId: string) => {
    const session = props.sessions.find((candidate) => candidate.id === sessionId);
    if (!session || !window.confirm(t("deleteSessionConfirm", { name: session.title }))) return;
    void props.onDeleteSession(sessionId);
  };

  return (
    <section className={`workspace ${collapsed ? "collapsed" : ""}`}>
      <DashboardSidebar
        identity={props.identity}
        connected={props.connected}
        activeDestination="agents"
        onNavigate={props.onNavigate}
        onSignOut={props.onSignOut}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <ChatPane
        agent={props.agent}
        userName={props.identity.displayName}
        userAvatarUrl={props.identity.avatarUrl}
        autoReadResponses={props.autoReadResponses}
        sendOnEnter={props.sendOnEnter}
        englishVoice={props.englishVoice}
        hebrewVoice={props.hebrewVoice}
        speechInputLocale={props.speechInputLocale}
        session={props.currentSession}
        draft={chat.draft}
        files={chat.files}
        streaming={chat.streaming}
        uploadRef={attachmentRef}
        onDraft={chat.setDraft}
        onFiles={chat.setFiles}
        onSubmit={chat.send}
        onStop={chat.stop}
        onNewSession={props.onNewSession}
        onClearSession={() => { if (props.currentSession) void props.onClearSession(props.currentSession.id); }}
        onError={props.onError}
        showSources={props.showSources}
        showToolActivity={props.showToolActivity}
      />
      <aside className="inspector">
        <nav className="inspector-tabs" role="tablist" aria-label={t("configuration")}>
          <button id="sessions-tab" role="tab" aria-selected={tab === "sessions"} aria-controls="sessions-panel" className={tab === "sessions" ? "active" : ""} onClick={() => setTab("sessions")}>{t("sessions")}</button>
          <button id="config-tab" role="tab" aria-selected={tab === "config"} aria-controls="config-panel" className={tab === "config" ? "active" : ""} onClick={() => setTab("config")}>{t("configuration")}</button>
          <button id="documents-tab" role="tab" aria-selected={tab === "documents"} aria-controls="documents-panel" className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}>{t("documents")}</button>
        </nav>
        {tab === "sessions" && (
          <div className="inspector-panel" id="sessions-panel" role="tabpanel" aria-labelledby="sessions-tab">
            <div className="inspector-content">
              <p className="inspector-kicker">{t("sessions")} · {props.agent.name}</p>
              <nav className="session-list">
                {/* Sessions produced by a fired schedule are reached through the
                   Schedules dashboard's "View log" link, not this list - keeps
                   manually-started conversations and unattended runs visually
                   separate rather than mixed together with just a badge. */}
                {props.sessions.filter((session) => !isScheduledSessionId(session.id)).map((session) => (
                  <div className={`session-item ${session.id === props.selectedSessionId ? "active" : ""}`} key={session.id}>
                    <button className="session-select" onClick={() => props.onSelectSession(session.id)}>
                      <strong>{session.title}</strong>
                      <span>{session.messages.length} messages · {formatSessionDate(session.updatedAt)}</span>
                    </button>
                    <button
                      aria-label={`Delete ${session.title}`}
                      className="session-delete"
                      disabled={props.deletingSessionId === session.id}
                      onClick={() => deleteSession(session.id)}
                      title={t("deleteSession")}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        )}
        {tab === "config" && (
          <div className="inspector-panel" id="config-panel" role="tabpanel" aria-labelledby="config-tab">
            <AgentConfigPanel
              key={props.agent.id}
              agent={props.agent}
              tools={props.tools}
              saving={saving}
              modelCatalog={props.modelCatalog}
              loadingModels={props.loadingModels}
              onSave={saveAgent}
              onDelete={deleteAgent}
            />
          </div>
        )}
        {tab === "documents" && (
          <div className="inspector-panel" id="documents-panel" role="tabpanel" aria-labelledby="documents-tab">
            <DocumentsPanel
              documents={props.documents}
              loading={props.loadingDocuments}
              uploading={props.uploadingDocument}
              deleting={props.deletingDocument}
              inputRef={documentRef}
              onUpload={props.onUploadDocument}
              onDelete={props.onDeleteDocument}
            />
          </div>
        )}
      </aside>
    </section>
  );
}

function formatSessionDate(updatedAt: number) {
  const elapsed = Date.now() - updatedAt;
  if (elapsed < 60_000) return "now";
  if (elapsed < 86_400_000) return "today";
  return new Date(updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
