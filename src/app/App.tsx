import { useEffect, useMemo, useState } from "react";

import { CreateAgentModal } from "../features/agents/components/CreateAgentModal";
import { Dashboard } from "../features/agents/components/Dashboard";
import { ToolRegistryDashboard } from "../features/agents/components/ToolRegistryDashboard";
import { useAgents } from "../features/agents/hooks/useAgents";
import type { Agent, CreateAgentValues } from "../features/agents/types";
import { SessionsDashboard } from "../features/chat/components/SessionsDashboard";
import { useChatSessions } from "../features/chat/hooks/useChatSessions";
import { DocumentsDashboard } from "../features/documents/components/DocumentsDashboard";
import { useDocuments } from "../features/documents/hooks/useDocuments";
import { useModelCatalog } from "../features/models/hooks/useModelCatalog";
import type { AuthenticatedUser } from "../features/auth/types";
import { WorkspacePage } from "../pages/workspace/WorkspacePage";
import type { DashboardDestination } from "../components/layout/DashboardSidebar";
import { getErrorMessage } from "../shared/lib/errors";
import { LoadingScreen } from "../shared/ui/LoadingScreen";
import { Notice } from "../shared/ui/Notice";

type View = "dashboard" | "workspace" | "sessions" | "documents" | "tools";
type InspectorTab = "config" | "documents" | "traces";

type Route = { view: View; agentSlug: string | null };

type AppProps = {
  currentUser: AuthenticatedUser;
  onSignOut?: () => void;
};

export default function App({ currentUser, onSignOut }: AppProps) {
  const [route, setRoute] = useState<Route>(readRoute);
  const [workspaceTab, setWorkspaceTab] = useState<InspectorTab>("config");
  const [showCreate, setShowCreate] = useState(false);
  const agentsState = useAgents(currentUser.id);
  const modelsState = useModelCatalog();
  const agentIds = useMemo(() => agentsState.agents.map((agent) => agent.id), [agentsState.agents]);
  const sessions = useChatSessions(
    currentUser.id,
    route.view === "workspace" ? agentsState.selectedId : null,
    agentsState.setError,
    agentIds,
  );
  const documents = useDocuments(currentUser.id, agentsState.setError);
  const identity = useMemo(() => ({
    displayName: currentUser.displayName,
    email: currentUser.email,
  }), [currentUser.displayName, currentUser.email]);

  const stats = useMemo(() => ({
    agents: agentsState.agents.length,
    sessions: sessions.sessionCount,
    documents: documents.documents.length,
  }), [agentsState.agents.length, documents.documents.length, sessions.sessionCount]);

  useEffect(() => {
    if (window.location.pathname === "/") window.history.replaceState({}, "", "/agents");
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (route.view !== "workspace" || !route.agentSlug || !agentsState.agents.length) return;
    const routeAgent = agentsState.agents.find((agent) => agent.id === route.agentSlug || agentSlug(agent) === route.agentSlug);
    if (routeAgent && routeAgent.id !== agentsState.selectedId) agentsState.setSelectedId(routeAgent.id);
  }, [agentsState.agents, agentsState.selectedId, agentsState.setSelectedId, route]);

  const openAgent = (agent: Agent, inspectorTab: InspectorTab = "config") => {
    agentsState.setSelectedId(agent.id);
    setWorkspaceTab(inspectorTab);
    const path = `/agents/${agentSlug(agent)}`;
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setRoute({ view: "workspace", agentSlug: agentSlug(agent) });
  };

  const openDashboard = () => {
    navigateDashboard("agents");
  };

  const navigateDashboard = (destination: DashboardDestination) => {
    const path = destination === "agents" ? "/agents" : `/${destination}`;
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setRoute({ view: destination === "agents" ? "dashboard" : destination, agentSlug: null });
  };

  const openSession = (agent: Agent, sessionId: string) => {
    sessions.selectAgentSession(agent.id, sessionId);
    openAgent(agent);
  };

  const newSession = (agent: Agent) => {
    sessions.createSession(agent.id);
    openAgent(agent);
  };

  const createAgent = async (values: CreateAgentValues) => {
    try {
      const agent = await agentsState.createAgent(values);
      setShowCreate(false);
      openAgent(agent);
    } catch (reason) {
      agentsState.setError(getErrorMessage(reason, "Could not create the agent."));
    }
  };

  const deleteAgent = async (agentId: string) => {
    try {
      await agentsState.deleteAgent(agentId);
      sessions.removeAgentSessions(agentId);
      openDashboard();
    } catch (reason) {
      agentsState.setError(getErrorMessage(reason, "Could not delete the agent."));
    }
  };

  return (
    <main className="app-shell">
      {agentsState.error && <Notice message={agentsState.error} onDismiss={() => agentsState.setError(null)} />}
      {agentsState.loading ? (
        <LoadingScreen />
      ) : route.view === "workspace" && agentsState.selectedAgent ? (
        <WorkspacePage
          identity={identity}
          agents={agentsState.agents}
          agent={agentsState.selectedAgent}
          tools={agentsState.tools}
          modelCatalog={modelsState.catalog}
          loadingModels={modelsState.loading}
          sessions={sessions.sessions}
          selectedSessionId={sessions.selectedSessionId}
          deletingSessionId={sessions.deletingSession?.split(":").slice(1).join(":") || null}
          currentSession={sessions.currentSession}
          documents={documents.documents}
          loadingDocuments={documents.loading}
          uploadingDocument={documents.uploading}
          deletingDocument={documents.deleting}
          onSelectAgent={openAgent}
          onSelectSession={sessions.selectSession}
          onDeleteSession={(sessionId) => sessions.removeSession(agentsState.selectedAgent!.id, sessionId)}
          onCreateAgent={() => setShowCreate(true)}
          onNewSession={() => sessions.createSession()}
          onUpdateSession={sessions.updateSession}
          onSaveAgent={agentsState.updateAgent}
          onDeleteAgent={deleteAgent}
          onUploadDocument={documents.upload}
          onDeleteDocument={documents.remove}
          onError={agentsState.setError}
          onDocumentsIndexed={documents.addIndexed}
          onDashboard={openDashboard}
          onSignOut={onSignOut}
          initialTab={workspaceTab}
        />
      ) : route.view === "sessions" ? (
        <SessionsDashboard
          identity={identity}
          connected={agentsState.connected}
          agents={agentsState.agents}
          sessionsByAgent={sessions.sessionsByAgent}
          loading={sessions.catalogLoading}
          deletingSession={sessions.deletingSession}
          onSignOut={onSignOut}
          onNavigate={navigateDashboard}
          onOpenSession={openSession}
          onNewSession={newSession}
          onDeleteSession={sessions.removeSession}
        />
      ) : route.view === "documents" ? (
        <DocumentsDashboard
          identity={identity}
          connected={agentsState.connected}
          documents={documents.documents}
          loading={documents.loading}
          uploading={documents.uploading}
          deleting={documents.deleting}
          onSignOut={onSignOut}
          onNavigate={navigateDashboard}
          onUpload={documents.upload}
          onDelete={documents.remove}
        />
      ) : route.view === "tools" ? (
        <ToolRegistryDashboard
          identity={identity}
          connected={agentsState.connected}
          tools={agentsState.tools}
          onSignOut={onSignOut}
          onNavigate={navigateDashboard}
        />
      ) : (
        <Dashboard
          identity={identity}
          connected={agentsState.connected}
          agents={agentsState.agents}
          stats={stats}
          sessionCounts={sessions.sessionCounts}
          onSignOut={onSignOut}
          onCreate={() => setShowCreate(true)}
          onSelect={(agent) => openAgent(agent)}
          onDelete={(agent) => {
            if (window.confirm(`Delete “${agent.name}” and its configuration? This cannot be undone.`)) {
              void deleteAgent(agent.id);
            }
          }}
          onNavigate={navigateDashboard}
        />
      )}
      {showCreate && (
        <CreateAgentModal
          tools={agentsState.tools}
          modelCatalog={modelsState.catalog}
          loadingModels={modelsState.loading}
          onClose={() => setShowCreate(false)}
          onCreate={createAgent}
        />
      )}
    </main>
  );
}

function agentSlug(agent: Agent) {
  return agent.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || agent.id;
}

function readRoute(): Route {
  const match = window.location.pathname.match(/^\/agents\/([^/]+)\/?$/);
  if (match) return { view: "workspace", agentSlug: decodeURIComponent(match[1]) };
  const view = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (view === "sessions" || view === "documents" || view === "tools") {
    return { view, agentSlug: null };
  }
  return { view: "dashboard", agentSlug: null };
}
