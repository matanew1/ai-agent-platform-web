import { Bot, FileText, Layers, MessageSquare, Settings } from "lucide-react";
import type { ComponentType } from "react";
import { Brand } from "../../shared/ui/Brand";
import { APP_VERSION } from "../../shared/config/version";
import { useI18n } from "../../shared/i18n/I18nProvider";
import { AccountAvatar } from "../../shared/ui/AccountAvatar";

export type DashboardDestination = "agents" | "sessions" | "documents" | "tools" | "settings";

export type WorkspaceIdentity = {
  id: string;
  displayName: string;
  email: string;
};

type NavItem = {
  label: "agents" | "sessions" | "documents" | "tools" | "settings";
  destination: DashboardDestination | null;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const navigation: NavItem[] = [
  { label: "agents", destination: "agents", icon: Bot },
  { label: "sessions", destination: "sessions", icon: MessageSquare },
  { label: "documents", destination: "documents", icon: FileText },
  { label: "tools", destination: "tools", icon: Layers },
  { label: "settings", destination: "settings", icon: Settings },
];

type DashboardSidebarProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
  activeDestination: DashboardDestination;
};

export function DashboardSidebar({ identity, connected, onSignOut, onNavigate, activeDestination }: DashboardSidebarProps) {
  const { t } = useI18n();
  return (
    <aside className="dashboard-sidebar">
      <Brand />
      <small className="app-version">AI Platform v{APP_VERSION}</small>
      <div className="workspace-identity" title={identity.email}>
        <span className="eyebrow">{t("workspace")}</span>
        <strong>{identity.displayName}</strong>
      </div>
      <nav className="dashboard-nav" aria-label="Workspace navigation">
        {navigation.map((item) => {
          const disabled = item.destination === null;
          const active = item.destination === activeDestination;
          const Icon = item.icon;
          return (
            <button
              key={item.destination}
              type="button"
              aria-current={active ? "page" : undefined}
              aria-disabled={disabled}
              className={active ? "active" : ""}
              onClick={() => !disabled && item.destination && onNavigate(item.destination)}
            >
              <span className="nav-icon"><Icon size={15} /></span>
              {t(item.label)}
            </button>
          );
        })}
      </nav>
      <div className={`workspace-connection ${connected ? "connected" : "disconnected"}`}>
        <i />
        <span>{connected ? t("apiConnected") : t("apiUnavailable")}</span>
      </div>
      <div className="sidebar-account">
        <AccountAvatar name={identity.displayName} userId={identity.id} />
        <span><strong>{identity.displayName}</strong><small>{identity.email}</small></span>
        {onSignOut && <button type="button" onClick={onSignOut}>{t("signOut")}</button>}
      </div>
    </aside>
  );
}
