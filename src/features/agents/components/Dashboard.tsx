import { useMemo, useState } from "react";
import { FileUp, Plus, Sparkles, Trash2, Wrench } from "lucide-react";

import { DashboardSidebar, type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE } from "../../../shared/config/constants";
import { Avatar } from "../../../shared/ui/Avatar";
import type { Agent } from "../types";

type DashboardProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  agents: Agent[];
  stats: { agents: number; sessions: number; documents: number };
  sessionCounts: Record<string, number>;
  onSignOut?: () => void;
  onCreate: () => void;
  onSelect: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onNavigate: (destination: DashboardDestination) => void;
};

export function Dashboard({ identity, connected, agents, stats, sessionCounts, onSignOut, onCreate, onSelect, onDelete, onNavigate }: DashboardProps) {
  const [query, setQuery] = useState("");
  const visibleAgents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? agents.filter((agent) => agent.name.toLowerCase().includes(normalized)) : agents;
  }, [agents, query]);

  return (
    <section className="dashboard-layout">
      <DashboardSidebar
        identity={identity}
        connected={connected}
        onSignOut={onSignOut}
        activeDestination="agents"
        onNavigate={onNavigate}
      />
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Agents</h1>
            <p>{stats.agents} agents · {stats.sessions} sessions · {stats.documents} documents</p>
          </div>
          <div className="dashboard-actions">
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search agents" placeholder="Search agents" />
            <button className="primary" type="button" onClick={onCreate}><Plus size={15} /> New agent</button>
          </div>
        </header>
        <div className="agent-grid">
          {!query && agents.length === 0 && (
            <section className="workspace-onboarding">
              <span className="workspace-onboarding-mark"><Sparkles size={20} /></span>
              <div>
                <p className="eyebrow">Start here</p>
                <h2>Build your first focused agent</h2>
                <p>Give it a role, add the documents it should know, then enable only the tools it needs.</p>
              </div>
              <div className="workspace-onboarding-steps">
                <span><Plus size={14} /> Create agent</span><span><FileUp size={14} /> Add documents</span><span><Wrench size={14} /> Enable tools</span>
              </div>
              <button className="primary" type="button" onClick={onCreate}>Create an agent <Plus size={15} /></button>
            </section>
          )}
          {visibleAgents.map((agent) => {
            const index = agents.findIndex((candidate) => candidate.id === agent.id);
            const isDraft = !agent.system_prompt.trim();
            return (
              <article className="agent-card" key={agent.id}>
                <button className="agent-card-open" type="button" onClick={() => onSelect(agent)} aria-label={`Open ${agent.name}`}>
                <div className="agent-card-head">
                  <Avatar name={agent.name} tone={index} />
                  <div>
                    <div className="agent-card-title">
                      <h2>{agent.name}</h2>
                      {index === 0 && !isDraft && <i />}
                      {isDraft && <span>draft</span>}
                    </div>
                    <small>{agent.model || DEFAULT_MODEL} · temp {(agent.temperature ?? DEFAULT_TEMPERATURE).toFixed(1)}</small>
                  </div>
                </div>
                <p className={isDraft ? "muted" : ""}>{isDraft ? "No system prompt yet." : agent.description?.trim() || summarizePrompt(agent.system_prompt)}</p>
                <footer>
                  {isDraft ? (
                    <span className="finish-setup">Finish setup</span>
                  ) : (
                    <>
                      <span>{agent.allowed_tools.length || "All"} tools</span>
                      <span>{sessionCounts[agent.id] || 0} {(sessionCounts[agent.id] || 0) === 1 ? "session" : "sessions"}</span>
                    </>
                  )}
                </footer>
                </button>
                <button className="agent-delete" type="button" onClick={() => onDelete(agent)} aria-label={`Delete ${agent.name}`} title="Delete agent"><Trash2 size={14} /></button>
              </article>
            );
          })}
          {!query && (
            <button className="new-agent-card" type="button" onClick={onCreate}>
              <span className="new-agent-plus">+</span>
              <strong>New agent</strong>
              <small>or start from a template</small>
            </button>
          )}
          {query && visibleAgents.length === 0 && <p className="no-results">No agents match "{query}".</p>}
        </div>
      </div>
    </section>
  );
}

function summarizePrompt(prompt: string) {
  const withoutRoleLead = prompt.replace(/^You are [^.]+\.\s*/i, "").trim();
  return withoutRoleLead || prompt;
}
