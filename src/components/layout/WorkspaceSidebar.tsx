import { Plus, Trash2 } from "lucide-react";
import type { Agent } from "../../features/agents/types";
import type { Session } from "../../features/chat/types";
import { Avatar } from "../../shared/ui/Avatar";
import { Brand } from "../../shared/ui/Brand";
import { APP_VERSION } from "../../shared/config/version";
import { useI18n } from "../../shared/i18n/I18nProvider";
import { AccountAvatar } from "../../shared/ui/AccountAvatar";
import type { WorkspaceIdentity } from "./DashboardSidebar";

type WorkspaceSidebarProps = {
  agents: Agent[];
  identity: WorkspaceIdentity;
  selectedAgentId: string;
  sessions: Session[];
  selectedSessionId: string | null;
  deletingSessionId?: string | null;
  onSelectAgent: (agent: Agent) => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onCreateAgent: () => void;
  onDashboard: () => void;
  onSignOut?: () => void;
};

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const { t } = useI18n();
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <button className="sidebar-workspace" type="button" onClick={props.onDashboard}>
          <Brand />
          <small className="app-version">AI Platform v{APP_VERSION}</small>
        </button>
        <button className="icon-button" onClick={props.onCreateAgent} aria-label={t("newAgent")}><Plus size={18} /></button>
      </div>
      <p className="eyebrow label">{t("agents")}</p>
      <nav className="agent-list">
        {props.agents.map((agent, index) => (
          <button key={agent.id} className={agent.id === props.selectedAgentId ? "active" : ""} onClick={() => props.onSelectAgent(agent)}>
            <Avatar name={agent.name} small tone={index} />
            <span>{agent.name}</span>
            {agent.id === props.selectedAgentId && <i />}
          </button>
        ))}
      </nav>
      <div className="sessions-head">
        <p className="eyebrow">{t("sessions")} · {props.agents.find((agent) => agent.id === props.selectedAgentId)?.name}</p>
      </div>
      <nav className="session-list">
        {props.sessions.map((session) => (
          <div className={`session-item ${session.id === props.selectedSessionId ? "active" : ""}`} key={session.id}>
            <button className="session-select" onClick={() => props.onSelectSession(session.id)}>
              <strong>{session.title}</strong>
              <span>{session.messages.length} messages · {formatSessionDate(session.updatedAt)}</span>
            </button>
            <button
              aria-label={`Delete ${session.title}`}
              className="session-delete"
              disabled={props.deletingSessionId === session.id}
              onClick={() => props.onDeleteSession(session.id)}
              title={t("deleteSession")}
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </nav>
      <div className="workspace-sidebar-account">
        <AccountAvatar name={props.identity.displayName} userId={props.identity.id} compact />
        <span><strong>{props.identity.displayName}</strong><small>{props.identity.email}</small></span>
        {props.onSignOut && <button type="button" onClick={props.onSignOut}>{t("signOut")}</button>}
      </div>
    </aside>
  );
}

function formatSessionDate(updatedAt: number) {
  const elapsed = Date.now() - updatedAt;
  if (elapsed < 60_000) return "now";
  if (elapsed < 86_400_000) return "today";
  return new Date(updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
