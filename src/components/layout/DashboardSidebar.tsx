import { Bot, FileText, KeyRound, Layers, MessageSquare } from "lucide-react";
import type { ComponentType } from "react";
import { Brand } from "../../shared/ui/Brand";

export type DashboardDestination = "agents" | "sessions" | "documents" | "tools";

export type WorkspaceIdentity = {
  displayName: string;
  email: string;
};

type NavItem = {
  label: string;
  destination: DashboardDestination | null;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const navigation: NavItem[] = [
  { label: "Agents", destination: "agents", icon: Bot },
  { label: "Sessions", destination: "sessions", icon: MessageSquare },
  { label: "Documents", destination: "documents", icon: FileText },
  { label: "Tool registry", destination: "tools", icon: Layers },
  { label: "API keys", destination: null, icon: KeyRound },
];

type DashboardSidebarProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
  activeDestination: DashboardDestination;
};

export function DashboardSidebar({ identity, connected, onSignOut, onNavigate, activeDestination }: DashboardSidebarProps) {
  return (
    <aside className="dashboard-sidebar">
      <Brand />
      <div className="workspace-identity" title={identity.email}>
        <span className="eyebrow">Workspace</span>
        <strong>{identity.displayName}</strong>
      </div>
      <nav className="dashboard-nav" aria-label="Workspace navigation">
        {navigation.map((item) => {
          const disabled = item.destination === null;
          const active = item.destination === activeDestination;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              aria-current={active ? "page" : undefined}
              aria-disabled={disabled}
              className={active ? "active" : ""}
              onClick={() => !disabled && item.destination && onNavigate(item.destination)}
            >
              <span className="nav-icon"><Icon size={15} /></span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className={`workspace-connection ${connected ? "connected" : "disconnected"}`}>
        <i />
        <span>{connected ? "API connected" : "API unavailable"}</span>
      </div>
      <div className="sidebar-account">
        <span className="sidebar-account-avatar" aria-hidden="true">{initials(identity.displayName)}</span>
        <span><strong>{identity.displayName}</strong><small>{identity.email}</small></span>
        {onSignOut && <button type="button" onClick={onSignOut}>Sign out</button>}
      </div>
    </aside>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}
