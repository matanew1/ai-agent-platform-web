import { useEffect, useMemo, useState } from "react";
import { ChevronRight, MessageSquarePlus, Trash2 } from "lucide-react";

import { type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { ManagementPage } from "../../../components/layout/ManagementPage";
import { Avatar } from "../../../shared/ui/Avatar";
import type { Agent } from "../../agents/types";
import { isScheduledSessionId } from "../../schedules/types";
import type { Session } from "../types";
import { useI18n } from "../../../shared/i18n/I18nProvider";

type SessionsDashboardProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  agents: Agent[];
  sessionsByAgent: Record<string, Session[]>;
  totalByAgent: Record<string, number>;
  loading: boolean;
  loadingMoreAgentId: string | null;
  deletingSession: string | null;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
  onOpenSession: (agent: Agent, sessionId: string) => void;
  onNewSession: (agent: Agent) => void;
  onDeleteSession: (agentId: string, sessionId: string) => void;
  onLoadMoreSessions: (agentId: string) => void;
};

export function SessionsDashboard({
  identity,
  connected,
  agents,
  sessionsByAgent,
  totalByAgent,
  loading,
  loadingMoreAgentId,
  deletingSession,
  onSignOut,
  onNavigate,
  onOpenSession,
  onNewSession,
  onDeleteSession,
  onLoadMoreSessions,
}: SessionsDashboardProps) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [newSessionAgentId, setNewSessionAgentId] = useState(agents[0]?.id || "");

  useEffect(() => {
    if (!agents.some((agent) => agent.id === newSessionAgentId)) {
      setNewSessionAgentId(agents[0]?.id || "");
    }
  }, [agents, newSessionAgentId]);

  const entries = useMemo(() => agents.flatMap((agent, agentIndex) => (
    // Runs a schedule produced are reached through the Schedules
    // dashboard's "View log" link, not this one - keeps manually-started
    // conversations separate from unattended runs (see WorkspacePage's
    // identical filter for the "Sessions" inspector tab's per-agent list).
    (sessionsByAgent[agent.id] || [])
      .filter((session) => !isScheduledSessionId(session.id))
      .map((session) => ({ agent, agentIndex, session }))
  )).sort((left, right) => right.session.updatedAt - left.session.updatedAt), [agents, sessionsByAgent]);

  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entries;
    return entries.filter(({ agent, session }) => (
      session.title.toLowerCase().includes(normalized) || agent.name.toLowerCase().includes(normalized)
    ));
  }, [entries, query]);

  const selectedAgent = agents.find((agent) => agent.id === newSessionAgentId) || null;
  const totalSessions = agents.reduce((sum, agent) => sum + (totalByAgent[agent.id] ?? (sessionsByAgent[agent.id] || []).length), 0);
  const summary = loading
    ? t("loadingSessions")
    : t("sessionCount", { sessions: String(totalSessions), agents: String(agents.length) });
  const agentsWithMore = agents.filter((agent) => (
    (sessionsByAgent[agent.id] || []).length < (totalByAgent[agent.id] ?? 0)
  ));

  const requestDelete = (agentId: string, session: Session) => {
    if (window.confirm(t("deleteSessionConfirm", { name: session.title }))) {
      onDeleteSession(agentId, session.id);
    }
  };

  return (
    <ManagementPage
      identity={identity}
      connected={connected}
      activeDestination="sessions"
      title={t("sessions")}
      summary={summary}
      onSignOut={onSignOut}
      onNavigate={onNavigate}
      actions={(
        <>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t("searchSessions")}
            placeholder={t("searchSessions")}
          />
          <select
            className="management-select"
            aria-label={t("agentForSession")}
            value={newSessionAgentId}
            disabled={!agents.length}
            onChange={(event) => setNewSessionAgentId(event.target.value)}
          >
            {!agents.length && <option value="">{t("noAgents")}</option>}
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
          <button
            className="primary"
            type="button"
            disabled={!selectedAgent}
            onClick={() => selectedAgent && onNewSession(selectedAgent)}
          >
            <MessageSquarePlus size={15} /> {t("newSession")}
          </button>
        </>
      )}
    >
      {loading && entries.length === 0 ? (
        <div className="skeleton">
          <div className="skeleton-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-list-row">
                <div className="skeleton-block" style={{ width: "28px", height: "28px", borderRadius: "6px" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div className="skeleton-block skeleton-line-sm" />
                  <div className="skeleton-block skeleton-line-md" style={{ height: "10px", width: "30%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : visibleEntries.length ? (
        <div className="management-list" aria-label={t("sessions")}>
          {visibleEntries.map(({ agent, agentIndex, session }) => (
            <article
              className="management-row session-management-row"
              key={`${agent.id}:${session.id}`}
            >
              <button className="session-row-open" type="button" onClick={() => onOpenSession(agent, session.id)}>
                <Avatar name={agent.name} small tone={agentIndex} />
                <span className="management-row-copy">
                  <strong>{session.title}</strong>
                  <small>{agent.name} · {session.messages.length} {t(session.messages.length === 1 ? "message" : "messages")}</small>
                </span>
                <span className="management-row-side">
                  <time dateTime={new Date(session.updatedAt).toISOString()}>{formatUpdatedAt(session.updatedAt, locale, t)}</time>
                  <ChevronRight size={18} />
                </span>
              </button>
              <button
                className="row-action danger"
                type="button"
                disabled={deletingSession === `${agent.id}:${session.id}`}
                aria-label={t("deleteSession", { name: session.title })}
                onClick={() => requestDelete(agent.id, session)}
              >
                {deletingSession === `${agent.id}:${session.id}` ? t("deleting") : <Trash2 size={14} />}
              </button>
            </article>
          ))}
          {/* Search only filters sessions already loaded per agent - a match
             outside what's loaded must still be reachable via Load more
             rather than reporting no results with no way to page it in, so
             this stays available regardless of whether a query is active. */}
          {agentsWithMore.length > 0 && (
            <button
              className="load-more"
              type="button"
              disabled={!!loadingMoreAgentId}
              onClick={() => agentsWithMore.forEach((agent) => onLoadMoreSessions(agent.id))}
            >
              {loadingMoreAgentId ? t("loading") : t("loadMore", {
                count: String(agentsWithMore.reduce((sum, agent) => (
                  sum + (totalByAgent[agent.id] ?? 0) - (sessionsByAgent[agent.id] || []).length
                ), 0)),
              })}
            </button>
          )}
        </div>
      ) : (
        <div className="management-empty">
          <span className="empty-mark"><MessageSquarePlus size={20} /></span>
          <h2>{query ? t("noMatchingSessions") : t("noSessions")}</h2>
          <p>{query ? (agentsWithMore.length > 0 ? t("noMatchingLoadedSessions") : t("tryDifferentSession")) : t("sessionHint")}</p>
          {query && agentsWithMore.length > 0 && (
            <button
              className="load-more"
              type="button"
              disabled={!!loadingMoreAgentId}
              onClick={() => agentsWithMore.forEach((agent) => onLoadMoreSessions(agent.id))}
            >
              {loadingMoreAgentId ? t("loading") : t("loadMore", {
                count: String(agentsWithMore.reduce((sum, agent) => (
                  sum + (totalByAgent[agent.id] ?? 0) - (sessionsByAgent[agent.id] || []).length
                ), 0)),
              })}
            </button>
          )}
          {!query && selectedAgent && <button className="primary" type="button" onClick={() => onNewSession(selectedAgent)}>{t("startSession")}</button>}
        </div>
      )}
    </ManagementPage>
  );
}

function formatUpdatedAt(updatedAt: number, locale: string, t: ReturnType<typeof useI18n>["t"]) {
  const elapsed = Math.max(0, Date.now() - updatedAt);
  if (elapsed < 60_000) return t("now");
  if (elapsed < 3_600_000) return t("agoMinutes", { count: String(Math.floor(elapsed / 60_000)) });
  if (elapsed < 86_400_000) return t("agoHours", { count: String(Math.floor(elapsed / 3_600_000)) });
  return new Date(updatedAt).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}
