import { ChangeEvent, useEffect, useRef, useState } from "react";

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

type WorkspacePageProps = {
  initialTab: "config" | "documents" | "traces";
  identity: WorkspaceIdentity;
  agents: Agent[];
  agent: Agent;
  tools: Tool[];
  modelCatalog: ModelCatalog;
  loadingModels: boolean;
  sessions: Session[];
  selectedSessionId: string | null;
  currentSession: Session | null;
  documents: IndexedDocument[];
  loadingDocuments: boolean;
  uploadingDocument: boolean;
  deletingDocument: string | null;
  onSelectAgent: (agent: Agent) => void;
  onSelectSession: (sessionId: string) => void;
  onCreateAgent: () => void;
  onNewSession: () => void;
  onUpdateSession: (agentId: string, sessionId: string, updater: (session: Session) => Session) => void;
  onSaveAgent: (agentId: string, changes: AgentChanges) => Promise<unknown>;
  onDeleteAgent: (agentId: string) => Promise<void>;
  onUploadDocument: (event: ChangeEvent<HTMLInputElement>) => void;
  onDeleteDocument: (sourceId: string) => void;
  onError: (message: string | null) => void;
  onDocumentsIndexed: (documents: IndexedChatDocument[]) => void;
  onDashboard: () => void;
  onSignOut?: () => void;
};

export function WorkspacePage(props: WorkspacePageProps) {
  const [tab, setTab] = useState<"config" | "documents" | "traces">(props.initialTab);
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
    if (!window.confirm(`Delete ${props.agent.name}? This cannot be undone.`)) return;
    await props.onDeleteAgent(props.agent.id);
  };

  return (
    <section className="workspace">
      <WorkspaceSidebar
        identity={props.identity}
        agents={props.agents}
        selectedAgentId={props.agent.id}
        sessions={props.sessions}
        selectedSessionId={props.selectedSessionId}
        onSelectAgent={props.onSelectAgent}
        onSelectSession={props.onSelectSession}
        onCreateAgent={props.onCreateAgent}
        onDashboard={props.onDashboard}
        onSignOut={props.onSignOut}
      />
      <ChatPane
        agent={props.agent}
        session={props.currentSession}
        draft={chat.draft}
        files={chat.files}
        streaming={chat.streaming}
        uploadRef={attachmentRef}
        onDraft={chat.setDraft}
        onFiles={chat.setFiles}
        onSubmit={chat.send}
        onNewSession={props.onNewSession}
      />
      <aside className="inspector">
        <nav className="inspector-tabs" role="tablist" aria-label="Agent inspector">
          <button id="config-tab" role="tab" aria-selected={tab === "config"} aria-controls="config-panel" className={tab === "config" ? "active" : ""} onClick={() => setTab("config")}>Configuration</button>
          <button id="documents-tab" role="tab" aria-selected={tab === "documents"} aria-controls="documents-panel" className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}>Documents</button>
          <button id="traces-tab" role="tab" aria-selected={tab === "traces"} aria-controls="traces-panel" className={tab === "traces" ? "active" : ""} onClick={() => setTab("traces")}>Traces</button>
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
      </aside>
    </section>
  );
}

function TracesPanel({ session }: { session: Session | null }) {
  const assistantMessages = session?.messages.filter((message) => message.role === "assistant") || [];
  return (
    <div className="inspector-content traces-panel">
      <p className="inspector-kicker">Current session</p>
      {assistantMessages.length === 0 ? (
        <div className="trace-empty"><span>◎</span><h3>No traces yet</h3><p>Tool calls and retrieval activity appear here after an agent responds.</p></div>
      ) : assistantMessages.map((message, index) => (
        <div className="trace-row" key={message.id}>
          <i />
          <div><strong>Assistant turn {index + 1}</strong><span>{message.meta?.tools.length || 0} tools · {message.meta?.chunks || 0} chunks</span></div>
        </div>
      ))}
    </div>
  );
}
