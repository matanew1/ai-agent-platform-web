import { useMemo, useState } from "react";
import { FileUp, Plus, Sparkles, Trash2, Wrench } from "lucide-react";

import { DashboardSidebar, type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE } from "../../../shared/config/constants";
import { Avatar } from "../../../shared/ui/Avatar";
import { useSidebarCollapsed } from "../../../shared/hooks/useSidebarCollapsed";
import { useI18n } from "../../../shared/i18n/I18nProvider";
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
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const visibleAgents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? agents.filter((agent) => agent.name.toLowerCase().includes(normalized)) : agents;
  }, [agents, query]);

  return (
    <section className={`dashboard-layout ${collapsed ? "collapsed" : ""}`}>
      <DashboardSidebar
        identity={identity}
        connected={connected}
        onSignOut={onSignOut}
        activeDestination="agents"
        onNavigate={onNavigate}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{t("agents")}</h1>
            <p>{stats.agents} {t("agents")} · {stats.sessions} {t("sessions")} · {stats.documents} {t("documents")}</p>
          </div>
          <div className="dashboard-actions">
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("searchAgents")} placeholder={t("searchAgents")} />
            <button className="primary" type="button" onClick={onCreate}><Plus size={15} /> {t("newAgent")}</button>
          </div>
        </header>
        <div className="agent-grid">
          {!query && agents.length === 0 && (
            <section className="workspace-onboarding">
              <span className="workspace-onboarding-mark"><Sparkles size={20} /></span>
              <div>
                <p className="eyebrow">{t("startHere")}</p>
                <h2>{t("firstAgentTitle")}</h2>
                <p>{t("firstAgentHint")}</p>
              </div>
              <div className="workspace-onboarding-steps">
                <span><Plus size={14} /> {t("createAgent")}</span><span><FileUp size={14} /> {t("addDocuments")}</span><span><Wrench size={14} /> {t("enableTools")}</span>
              </div>
              <button className="primary" type="button" onClick={onCreate}>{t("createAgent")} <Plus size={15} /></button>
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
                      {isDraft && <span>{t("draft")}</span>}
                    </div>
                    <small>{agent.model || DEFAULT_MODEL} · temp {(agent.temperature ?? DEFAULT_TEMPERATURE).toFixed(1)}</small>
                  </div>
                </div>
                <p className={isDraft ? "muted" : ""}>{isDraft ? t("noSystemPrompt") : agent.description?.trim() || summarizePrompt(agent.system_prompt)}</p>
                <footer>
                  {isDraft ? (
                    <span className="finish-setup">{t("finishSetup")}</span>
                  ) : (
                    <>
                      <span>{agent.allowed_tools.length ? t("toolsCount", { count: String(agent.allowed_tools.length) }) : `${t("all")} ${t("tools")}`}</span>
                      <span>{sessionCounts[agent.id] || 0} {t((sessionCounts[agent.id] || 0) === 1 ? "session" : "sessions")}</span>
                    </>
                  )}
                </footer>
                </button>
                <button className="agent-delete" type="button" onClick={() => onDelete(agent)} aria-label={`${t("deleteAgent")} ${agent.name}`} title={t("deleteAgent")}><Trash2 size={14} /></button>
              </article>
            );
          })}
          {!query && (
            <button className="new-agent-card" type="button" onClick={onCreate}>
              <span className="new-agent-plus">+</span>
              <strong>{t("newAgent")}</strong>
              <small>{t("orTemplate")}</small>
            </button>
          )}
          {query && visibleAgents.length === 0 && <p className="no-results">{t("noMatchingAgents", { query })}</p>}
        </div>
      </div>
    </section>
  );
}

function summarizePrompt(prompt: string) {
  const withoutRoleLead = prompt.replace(/^You are [^.]+\.\s*/i, "").trim();
  return withoutRoleLead || prompt;
}
