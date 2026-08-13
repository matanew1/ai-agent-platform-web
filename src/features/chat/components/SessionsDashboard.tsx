import { useEffect, useMemo, useState } from "react";

import { type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { ManagementPage } from "../../../components/layout/ManagementPage";
import { Avatar } from "../../../shared/ui/Avatar";
import type { Agent } from "../../agents/types";
import type { Session } from "../types";

type SessionsDashboardProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  agents: Agent[];
  sessionsByAgent: Record<string, Session[]>;
  loading: boolean;
  deletingSession: string | null;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
  onOpenSession: (agent: Agent, sessionId: string) => void;
  onNewSession: (agent: Agent) => void;
  onDeleteSession: (agentId: string, sessionId: string) => void;
};

export function SessionsDashboard({
  identity,
  connected,
  agents,
  sessionsByAgent,
  loading,
  deletingSession,
  onSignOut,
  onNavigate,
  onOpenSession,
  onNewSession,
  onDeleteSession,
}: SessionsDashboardProps) {
  const [query, setQuery] = useState("");
  const [newSessionAgentId, setNewSessionAgentId] = useState(agents[0]?.id || "");

  useEffect(() => {
    if (!agents.some((agent) => agent.id === newSessionAgentId)) {
      setNewSessionAgentId(agents[0]?.id || "");
    }
  }, [agents, newSessionAgentId]);

  const entries = useMemo(() => agents.flatMap((agent, agentIndex) => (
    (sessionsByAgent[agent.id] || []).map((session) => ({ agent, agentIndex, session }))
  )).sort((left, right) => right.session.updatedAt - left.session.updatedAt), [agents, sessionsByAgent]);

  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entries;
    return entries.filter(({ agent, session }) => (
      session.title.toLowerCase().includes(normalized) || agent.name.toLowerCase().includes(normalized)
    ));
  }, [entries, query]);

  const selectedAgent = agents.find((agent) => agent.id === newSessionAgentId) || null;
  const summary = loading
    ? "Loading retained conversations…"
    : `${entries.length} ${entries.length === 1 ? "session" : "sessions"} across ${agents.length} ${agents.length === 1 ? "agent" : "agents"}`;

  const requestDelete = (agentId: string, session: Session) => {
    if (window.confirm(`Delete “${session.title}” and its retained history?`)) {
      onDeleteSession(agentId, session.id);
    }
  };

  return (
    <ManagementPage
      identity={identity}
      connected={connected}
      activeDestination="sessions"
      title="Sessions"
      summary={summary}
      onSignOut={onSignOut}
      onNavigate={onNavigate}
      actions={(
        <>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search sessions"
            placeholder="Search sessions"
          />
          <select
            className="management-select"
            aria-label="Agent for new session"
            value={newSessionAgentId}
            disabled={!agents.length}
            onChange={(event) => setNewSessionAgentId(event.target.value)}
          >
            {!agents.length && <option value="">No agents</option>}
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
          <button
            className="primary"
            type="button"
            disabled={!selectedAgent}
            onClick={() => selectedAgent && onNewSession(selectedAgent)}
          >
            New session
          </button>
        </>
      )}
    >
      {loading && entries.length === 0 ? (
        <div className="management-empty compact"><span className="empty-mark">•••</span><h2>Loading sessions</h2></div>
      ) : visibleEntries.length ? (
        <div className="management-list" aria-label="Sessions">
          {visibleEntries.map(({ agent, agentIndex, session }) => (
            <article
              className="management-row session-management-row"
              key={`${agent.id}:${session.id}`}
            >
              <button className="session-row-open" type="button" onClick={() => onOpenSession(agent, session.id)}>
                <Avatar name={agent.name} small tone={agentIndex} />
                <span className="management-row-copy">
                  <strong>{session.title}</strong>
                  <small>{agent.name} · {session.messages.length} {session.messages.length === 1 ? "message" : "messages"}</small>
                </span>
                <span className="management-row-side">
                  <time dateTime={new Date(session.updatedAt).toISOString()}>{formatUpdatedAt(session.updatedAt)}</time>
                  <i aria-hidden="true">›</i>
                </span>
              </button>
              <button
                className="row-action danger"
                type="button"
                disabled={deletingSession === `${agent.id}:${session.id}`}
                aria-label={`Delete ${session.title}`}
                onClick={() => requestDelete(agent.id, session)}
              >
                {deletingSession === `${agent.id}:${session.id}` ? "Deleting…" : "Delete"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="management-empty">
          <span className="empty-mark">◇</span>
          <h2>{query ? "No matching sessions" : "No sessions yet"}</h2>
          <p>{query ? "Try a different session or agent name." : "Start a conversation with an agent and it will appear here."}</p>
          {!query && selectedAgent && <button className="primary" type="button" onClick={() => onNewSession(selectedAgent)}>Start a session</button>}
        </div>
      )}
    </ManagementPage>
  );
}

function formatUpdatedAt(updatedAt: number) {
  const elapsed = Math.max(0, Date.now() - updatedAt);
  if (elapsed < 60_000) return "now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  return new Date(updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
