import { Bot, Clock, FileText, LayoutDashboard, Layers, MessageSquare, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ComponentType } from "react";
import { Brand } from "../../shared/ui/Brand";
import { APP_VERSION } from "../../shared/config/version";
import { useI18n } from "../../shared/i18n/I18nProvider";
import { SidebarFooter } from "./SidebarFooter";

export type DashboardDestination = "overview" | "agents" | "sessions" | "schedules" | "documents" | "tools" | "settings" | "profile";

export type WorkspaceIdentity = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
};

type NavItem = {
  label: "overview" | "agents" | "sessions" | "schedules" | "documents" | "tools";
  destination: DashboardDestination | null;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const navigationGroups: { heading: "workspace" | "operate"; items: NavItem[] }[] = [
  {
    heading: "workspace",
    items: [
      { label: "overview", destination: "overview", icon: LayoutDashboard },
      { label: "agents", destination: "agents", icon: Bot },
      { label: "sessions", destination: "sessions", icon: MessageSquare },
    ],
  },
  {
    heading: "operate",
    items: [
      { label: "schedules", destination: "schedules", icon: Clock },
      { label: "documents", destination: "documents", icon: FileText },
      { label: "tools", destination: "tools", icon: Layers },
    ],
  },
];

type DashboardSidebarProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
  activeDestination: DashboardDestination;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function DashboardSidebar({ identity, connected, onSignOut, onNavigate, activeDestination, collapsed, onToggleCollapsed }: DashboardSidebarProps) {
  const { t } = useI18n();
  return (
    <aside className={`dashboard-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header-row">
        <Brand />
        <button
          type="button"
          className="sidebar-collapse-toggle"
          aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>
      <small className="app-version">Wyrmind v{APP_VERSION}</small>
      <nav className="dashboard-nav" aria-label="Workspace navigation">
        {navigationGroups.map((group) => (
          <div className="dashboard-nav-group" key={group.heading}>
            <p className="eyebrow dashboard-nav-heading">{t(group.heading)}</p>
            {group.items.map((item) => {
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
                  title={t(item.label)}
                  onClick={() => !disabled && item.destination && onNavigate(item.destination)}
                >
                  <span className="nav-icon"><Icon size={15} /></span>
                  <span className="sidebar-label">{t(item.label)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className={`workspace-connection ${connected ? "connected" : "disconnected"}`}>
        <i />
        <span>{connected ? t("apiConnected") : t("apiUnavailable")}</span>
      </div>
      <SidebarFooter
        identity={identity}
        settingsLabel={t("settings")}
        signOutLabel={t("signOut")}
        profileLabel={t("viewProfile")}
        settingsActive={activeDestination === "settings"}
        onSettings={() => onNavigate("settings")}
        onProfile={() => onNavigate("profile")}
        onSignOut={onSignOut}
      />
    </aside>
  );
}
