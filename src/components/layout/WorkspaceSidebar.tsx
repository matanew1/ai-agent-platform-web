import { ArrowLeft, Plus } from "lucide-react";
import type { Agent } from "../../features/agents/types";
import type { Session } from "../../features/chat/types";
import { Avatar } from "../../shared/ui/Avatar";
import type { WorkspaceIdentity } from "./DashboardSidebar";

type WorkspaceSidebarProps = {
  agents: Agent[];
  identity: WorkspaceIdentity;
  selectedAgentId: string;
  sessions: Session[];
  selectedSessionId: string | null;
  onSelectAgent: (agent: Agent) => void;
  onSelectSession: (sessionId: string) => void;
  onCreateAgent: () => void;
  onDashboard: () => void;
  onSignOut?: () => void;
};

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <button className="sidebar-workspace" type="button" onClick={props.onDashboard}>
          <span className="eyebrow">Workspace</span><strong>{props.identity.displayName}</strong>
        </button>
        <button className="icon-button" onClick={props.onCreateAgent} aria-label="Create agent"><Plus size={18} /></button>
      </div>
      <p className="eyebrow label">Agents</p>
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
        <p className="eyebrow">Sessions · {props.agents.find((agent) => agent.id === props.selectedAgentId)?.name}</p>
      </div>
      <nav className="session-list">
        {props.sessions.map((session) => (
          <button key={session.id} className={session.id === props.selectedSessionId ? "active" : ""} onClick={() => props.onSelectSession(session.id)}>
            <strong>{session.title}</strong>
            <span>{session.messages.length} messages · {formatSessionDate(session.updatedAt)}</span>
          </button>
        ))}
      </nav>
      <div className="workspace-sidebar-account">
        <span><strong>{props.identity.displayName}</strong><small>{props.identity.email}</small></span>
        {props.onSignOut && <button type="button" onClick={props.onSignOut}>Sign out</button>}
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
