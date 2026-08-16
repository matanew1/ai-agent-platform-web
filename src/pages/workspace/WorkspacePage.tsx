import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";

import { WorkspaceSidebar } from "../../components/layout/WorkspaceSidebar";
import type { WorkspaceIdentity } from "../../components/layout/DashboardSidebar";
import { AgentConfigPanel } from "../../features/agents/components/AgentConfigPanel";
import type { Agent, AgentChanges, Tool } from "../../features/agents/types";
import { ChatPane } from "../../features/chat/components/ChatPane";
import { useStreamingChat } from "../../features/chat/hooks/useStreamingChat";
import type { Session } from "../../features/chat/types";
import type { IndexedChatDocument } from "../../features/chat/types";
import { DocumentsPanel } from "../../features/documents/components/DocumentsPanel";
import type { IndexedDocument } from "../../features/documents/types";
import type { ModelCatalog } from "../../features/models/types";
import { SchedulePanel } from "../../features/schedules/components/SchedulePanel";
import { useSchedules } from "../../features/schedules/hooks/useSchedules";
import type { AppSettings } from "../../shared/hooks/useAppSettings";
import { useI18n } from "../../shared/i18n/I18nProvider";

type WorkspacePageProps = {
  initialTab: "config" | "documents" | "traces" | "schedule";
  identity: WorkspaceIdentity;
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
  onCreateAgent: () => void;
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
  onDashboard: () => void;
  onSettings: () => void;
  onSignOut?: () => void;
};

export function WorkspacePage(props: WorkspacePageProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"config" | "documents" | "traces" | "schedule">(props.initialTab);
  const schedules = useSchedules(props.agent.id);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === "undefined" || (window.innerWidth > 768 && props.sidebarDefaultOpen));
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

  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const deleteSchedule = async (scheduleId: string) => {
    setDeletingScheduleId(scheduleId);
    try {
      await schedules.deleteSchedule(scheduleId);
    } finally {
      setDeletingScheduleId(null);
    }
  };

  return (
    <section className={`workspace ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <WorkspaceSidebar
        identity={props.identity}
        agents={props.agents}
        selectedAgentId={props.agent.id}
        sessions={props.sessions}
        selectedSessionId={props.selectedSessionId}
        deletingSessionId={props.deletingSessionId}
        onSelectAgent={props.onSelectAgent}
        onSelectSession={props.onSelectSession}
        onDeleteSession={deleteSession}
        onCreateAgent={props.onCreateAgent}
        onDashboard={props.onDashboard}
        onSettings={props.onSettings}
        onSignOut={props.onSignOut}
      />
      <ChatPane
        agent={props.agent}
        userId={props.identity.id}
        sidebarOpen={sidebarOpen}
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
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        showSources={props.showSources}
        showToolActivity={props.showToolActivity}
      />
      <aside className="inspector">
        <nav className="inspector-tabs" role="tablist" aria-label={t("configuration")}>
          <button id="config-tab" role="tab" aria-selected={tab === "config"} aria-controls="config-panel" className={tab === "config" ? "active" : ""} onClick={() => setTab("config")}>{t("configuration")}</button>
          <button id="documents-tab" role="tab" aria-selected={tab === "documents"} aria-controls="documents-panel" className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}>{t("documents")}</button>
          <button id="traces-tab" role="tab" aria-selected={tab === "traces"} aria-controls="traces-panel" className={tab === "traces" ? "active" : ""} onClick={() => setTab("traces")}>{t("traces")}</button>
          <button id="schedule-tab" role="tab" aria-selected={tab === "schedule"} aria-controls="schedule-panel" className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}>{t("schedules")}</button>
        </nav>
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
        {tab === "traces" && <div className="inspector-panel" id="traces-panel" role="tabpanel" aria-labelledby="traces-tab"><TracesPanel session={props.currentSession} /></div>}
        {tab === "schedule" && (
          <div className="inspector-panel" id="schedule-panel" role="tabpanel" aria-labelledby="schedule-tab">
            <SchedulePanel
              schedules={schedules.schedules}
              loading={schedules.loading}
              deleting={deletingScheduleId}
              onCreate={schedules.createSchedule}
              onToggle={(scheduleId, enabled) => void schedules.updateSchedule(scheduleId, { enabled })}
              onDelete={(scheduleId) => void deleteSchedule(scheduleId)}
            />
          </div>
        )}
      </aside>
    </section>
  );
}

function TracesPanel({ session }: { session: Session | null }) {
  const { t } = useI18n();
  const assistantMessages = session?.messages.filter((message) => message.role === "assistant") || [];
  return (
    <div className="inspector-content traces-panel">
      <p className="inspector-kicker">{t("currentSession")}</p>
      {assistantMessages.length === 0 ? (
        <div className="trace-empty"><span><Activity size={24} /></span><h3>{t("noTraces")}</h3><p>{t("traceHint")}</p></div>
      ) : assistantMessages.map((message, index) => (
        <div className="trace-row" key={message.id}>
          <i />
          <div><strong>{t("assistantTurn", { number: String(index + 1) })}</strong><span>{message.meta?.tools.length || 0} {t("tools")} · {message.meta?.chunks || 0} {t("chunks")}</span></div>
        </div>
      ))}
    </div>
  );
}
