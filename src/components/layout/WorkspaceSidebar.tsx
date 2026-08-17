import { Plus, Trash2 } from "lucide-react";
import type { Agent } from "../../features/agents/types";
import type { Session } from "../../features/chat/types";
import { isScheduledSessionId } from "../../features/schedules/types";
import { Avatar } from "../../shared/ui/Avatar";
import { Brand } from "../../shared/ui/Brand";
import { APP_VERSION } from "../../shared/config/version";
import { useI18n } from "../../shared/i18n/I18nProvider";
import type { WorkspaceIdentity } from "./DashboardSidebar";
import { SidebarFooter } from "./SidebarFooter";

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
  onSettings: () => void;
  onSignOut?: () => void;
};

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const { t } = useI18n();
  return (
    <aside className="sidebar">
      <header className="workspace-sidebar-header">
        <button className="workspace-sidebar-brand" type="button" onClick={props.onDashboard}>
          <Brand />
        </button>
        <small className="app-version">AI Platform v{APP_VERSION}</small>
      </header>
      <div className="workspace-sidebar-center">
        <div className="workspace-sidebar-section-heading">
          <p className="eyebrow">{t("agents")}</p>
          <button className="icon-button" onClick={props.onCreateAgent} aria-label={t("newAgent")}><Plus size={18} /></button>
        </div>
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
                onClick={() => props.onDeleteSession(session.id)}
                title={t("deleteSession")}
                type="button"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </nav>
      </div>
      <SidebarFooter identity={props.identity} settingsLabel={t("settings")} signOutLabel={t("signOut")} onSettings={props.onSettings} onSignOut={props.onSignOut} />
    </aside>
  );
}

function formatSessionDate(updatedAt: number) {
  const elapsed = Date.now() - updatedAt;
  if (elapsed < 60_000) return "now";
  if (elapsed < 86_400_000) return "today";
  return new Date(updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
