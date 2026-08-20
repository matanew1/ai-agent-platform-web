import { useEffect, useMemo, useState } from "react";

import { CreateAgentModal } from "../features/agents/components/CreateAgentModal";
import { Dashboard } from "../features/agents/components/Dashboard";
import { ToolRegistryDashboard } from "../features/agents/components/ToolRegistryDashboard";
import { useAgents } from "../features/agents/hooks/useAgents";
import type { Agent, CreateAgentValues } from "../features/agents/types";
import { SessionsDashboard } from "../features/chat/components/SessionsDashboard";
import { useChatSessions } from "../features/chat/hooks/useChatSessions";
import { DocumentsDashboard } from "../features/documents/components/DocumentsDashboard";
import { OverviewDashboard } from "../features/overview/components/OverviewDashboard";
import { ProfileDashboard } from "../features/profile/components/ProfileDashboard";
import { SettingsDashboard } from "../features/settings/components/SettingsDashboard";
import { useDocuments } from "../features/documents/hooks/useDocuments";
import { useModelCatalog } from "../features/models/hooks/useModelCatalog";
import { ScheduleHistoryPage } from "../features/schedules/components/ScheduleHistoryPage";
import { SchedulesDashboard } from "../features/schedules/components/SchedulesDashboard";
import { useAllSchedules } from "../features/schedules/hooks/useAllSchedules";
import { lastRunClientSessionId, type Schedule } from "../features/schedules/types";
import type { AuthenticatedUser } from "../features/auth/types";
import { WorkspacePage } from "../pages/workspace/WorkspacePage";
import type { DashboardDestination } from "../components/layout/DashboardSidebar";
import { getErrorMessage } from "../shared/lib/errors";
import { LoadingScreen } from "../shared/ui/LoadingScreen";
import { Notice } from "../shared/ui/Notice";
import { useAppSettings } from "../shared/hooks/useAppSettings";
import { I18nProvider } from "../shared/i18n/I18nProvider";

type View = "overview" | "dashboard" | "workspace" | "sessions" | "schedules" | "schedule-detail" | "documents" | "tools" | "settings" | "profile";
type InspectorTab = "sessions" | "config" | "documents";

type Route = { view: View; agentSlug: string | null; scheduleId: string | null };

type AppProps = {
  currentUser: AuthenticatedUser;
  onSignOut?: () => void;
};

export default function App({ currentUser, onSignOut }: AppProps) {
  const [route, setRoute] = useState<Route>(readRoute);
  const [workspaceTab, setWorkspaceTab] = useState<InspectorTab>("config");
  const [showCreate, setShowCreate] = useState(false);
  const settingsState = useAppSettings(currentUser.id);
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
  const schedules = useAllSchedules(currentUser.id, agentIds);
  const identity = useMemo(() => ({
    id: currentUser.id,
    displayName: currentUser.displayName,
    email: currentUser.email,
    avatarUrl: currentUser.avatarUrl,
  }), [currentUser.id, currentUser.displayName, currentUser.email, currentUser.avatarUrl]);

  const stats = useMemo(() => ({
    agents: agentsState.agents.length,
    sessions: sessions.sessionCount,
    documents: documents.total,
  }), [agentsState.agents.length, documents.total, sessions.sessionCount]);

  const scheduleDetail = useMemo(() => {
    if (!route.scheduleId) return null;
    for (const agent of agentsState.agents) {
      const found = (schedules.schedulesByAgent[agent.id] || []).find((candidate) => candidate.id === route.scheduleId);
      if (found) return { agent, schedule: found };
    }
    return null;
  }, [route.scheduleId, agentsState.agents, schedules.schedulesByAgent]);

  const scheduleDetailSession = useMemo(() => {
    if (!scheduleDetail) return null;
    const sessionId = lastRunClientSessionId(scheduleDetail.schedule, identity.id);
    if (!sessionId) return null;
    return (sessions.sessionsByAgent[scheduleDetail.agent.id] || []).find((session) => session.id === sessionId) || null;
  }, [scheduleDetail, sessions.sessionsByAgent, identity.id]);

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
    setRoute({ view: "workspace", agentSlug: agentSlug(agent), scheduleId: null });
  };

  const openDashboard = () => {
    navigateDashboard("agents");
  };

  const navigateDashboard = (destination: DashboardDestination) => {
    const path = destination === "agents" ? "/agents" : `/${destination}`;
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setRoute({ view: destination === "agents" ? "dashboard" : destination, agentSlug: null, scheduleId: null });
  };

  const openSession = (agent: Agent, sessionId: string) => {
    sessions.selectAgentSession(agent.id, sessionId);
    openAgent(agent);
  };

  const openScheduleHistory = (schedule: Schedule) => {
    const path = `/schedules/${schedule.id}`;
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setRoute({ view: "schedule-detail", agentSlug: null, scheduleId: schedule.id });
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
    <I18nProvider locale={settingsState.settings.locale}>
    <main className="app-shell">
      {agentsState.error && <Notice message={agentsState.error} onDismiss={() => agentsState.setError(null)} />}
      {agentsState.loading ? (
        <LoadingScreen />
      ) : route.view === "workspace" && agentsState.selectedAgent ? (
        <WorkspacePage
          identity={identity}
          connected={agentsState.connected}
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
          onClearSession={(sessionId) => sessions.clearSession(agentsState.selectedAgent!.id, sessionId)}
          onNewSession={() => sessions.createSession()}
          onUpdateSession={sessions.updateSession}
          onSaveAgent={agentsState.updateAgent}
          onDeleteAgent={deleteAgent}
          onUploadDocument={documents.upload}
          onDeleteDocument={documents.remove}
          onError={agentsState.setError}
          onDocumentsIndexed={documents.addIndexed}
          showSources={settingsState.settings.showSources}
          showToolActivity={settingsState.settings.showToolActivity}
          autoReadResponses={settingsState.settings.autoReadResponses}
          sendOnEnter={settingsState.settings.sendOnEnter}
          sidebarDefaultOpen={settingsState.settings.sidebarDefaultOpen}
          englishVoice={settingsState.settings.englishVoice}
          hebrewVoice={settingsState.settings.hebrewVoice}
          speechInputLocale={settingsState.settings.speechInputLocale}
          onNavigate={navigateDashboard}
          onSettings={() => navigateDashboard("settings")}
          onProfile={() => navigateDashboard("profile")}
          onSignOut={onSignOut}
          initialTab={workspaceTab}
        />
      ) : route.view === "overview" ? (
        <OverviewDashboard
          identity={identity}
          connected={agentsState.connected}
          agents={agentsState.agents}
          sessionsByAgent={sessions.sessionsByAgent}
          totalSessionsByAgent={sessions.totalByAgent}
          sessionCount={sessions.sessionCount}
          documentCount={documents.total}
          scheduleCount={schedules.scheduleCount}
          onSignOut={onSignOut}
          onNavigate={navigateDashboard}
          onSelectAgent={openAgent}
        />
      ) : route.view === "sessions" ? (
        <SessionsDashboard
          identity={identity}
          connected={agentsState.connected}
          agents={agentsState.agents}
          sessionsByAgent={sessions.sessionsByAgent}
          totalByAgent={sessions.totalByAgent}
          loading={sessions.catalogLoading}
          loadingMoreAgentId={sessions.loadingMoreAgentId}
          deletingSession={sessions.deletingSession}
          onSignOut={onSignOut}
          onNavigate={navigateDashboard}
          onOpenSession={openSession}
          onNewSession={newSession}
          onDeleteSession={sessions.removeSession}
          onLoadMoreSessions={sessions.loadMoreSessions}
        />
      ) : route.view === "schedules" ? (
        <SchedulesDashboard
          identity={identity}
          connected={agentsState.connected}
          agents={agentsState.agents}
          schedulesByAgent={schedules.schedulesByAgent}
          loading={schedules.loading}
          deleting={schedules.deleting}
          error={schedules.error}
          onSignOut={onSignOut}
          onNavigate={navigateDashboard}
          onCreate={schedules.createSchedule}
          onUpdate={schedules.updateSchedule}
          onToggle={(agentId, scheduleId, enabled) => schedules.updateSchedule(agentId, scheduleId, { enabled })}
          onDelete={(agentId, scheduleId) => void schedules.deleteSchedule(agentId, scheduleId)}
          onSelectSchedule={openScheduleHistory}
        />
      ) : route.view === "schedule-detail" ? (
        <ScheduleHistoryPage
          identity={identity}
          connected={agentsState.connected}
          agent={scheduleDetail?.agent || null}
          schedule={scheduleDetail?.schedule || null}
          session={scheduleDetailSession}
          loading={schedules.loading || sessions.catalogLoading}
          deleting={schedules.deleting}
          error={schedules.error}
          onSignOut={onSignOut}
          onNavigate={navigateDashboard}
          onBack={() => navigateDashboard("schedules")}
          onToggle={() => scheduleDetail && void schedules.updateSchedule(scheduleDetail.agent.id, scheduleDetail.schedule.id, { enabled: !scheduleDetail.schedule.enabled })}
          onDelete={() => {
            if (!scheduleDetail) return;
            void schedules.deleteSchedule(scheduleDetail.agent.id, scheduleDetail.schedule.id).then((deleted) => {
              if (deleted) navigateDashboard("schedules");
            });
          }}
        />
      ) : route.view === "documents" ? (
        <DocumentsDashboard
          identity={identity}
          connected={agentsState.connected}
          documents={documents.documents}
          total={documents.total}
          loading={documents.loading}
          loadingMore={documents.loadingMore}
          uploading={documents.uploading}
          deleting={documents.deleting}
          onSignOut={onSignOut}
          onNavigate={navigateDashboard}
          onUpload={documents.upload}
          onDelete={documents.remove}
          onLoadMore={documents.loadMore}
        />
      ) : route.view === "tools" ? (
        <ToolRegistryDashboard
          identity={identity}
          connected={agentsState.connected}
          tools={agentsState.tools}
          onSignOut={onSignOut}
          onNavigate={navigateDashboard}
        />
      ) : route.view === "profile" ? (
        <ProfileDashboard
          identity={identity}
          connected={agentsState.connected}
          onSignOut={onSignOut}
          onNavigate={navigateDashboard}
        />
      ) : route.view === "settings" ? (
        <SettingsDashboard
          identity={identity}
          connected={agentsState.connected}
          settings={settingsState.settings}
          onChange={settingsState.setSettings}
          onReset={settingsState.reset}
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
    </I18nProvider>
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
  const agentMatch = window.location.pathname.match(/^\/agents\/([^/]+)\/?$/);
  if (agentMatch) return { view: "workspace", agentSlug: decodeURIComponent(agentMatch[1]), scheduleId: null };
  const scheduleMatch = window.location.pathname.match(/^\/schedules\/([^/]+)\/?$/);
  if (scheduleMatch) return { view: "schedule-detail", agentSlug: null, scheduleId: decodeURIComponent(scheduleMatch[1]) };
  const view = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (view === "overview" || view === "sessions" || view === "schedules" || view === "documents" || view === "tools" || view === "settings" || view === "profile") {
    return { view, agentSlug: null, scheduleId: null };
  }
  return { view: "dashboard", agentSlug: null, scheduleId: null };
}
