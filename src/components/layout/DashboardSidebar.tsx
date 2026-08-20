import { Bot, Clock, FileText, LayoutDashboard, Layers, MessageSquare } from "lucide-react";
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

const navigation: NavItem[] = [
  { label: "overview", destination: "overview", icon: LayoutDashboard },
  { label: "agents", destination: "agents", icon: Bot },
  { label: "sessions", destination: "sessions", icon: MessageSquare },
  { label: "schedules", destination: "schedules", icon: Clock },
  { label: "documents", destination: "documents", icon: FileText },
  { label: "tools", destination: "tools", icon: Layers },
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
      <small className="app-version">Wyrmind v{APP_VERSION}</small>
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
