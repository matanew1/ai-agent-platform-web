import type { ReactNode } from "react";

import { DashboardSidebar, type DashboardDestination, type WorkspaceIdentity } from "./DashboardSidebar";

type ManagementPageProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  activeDestination: DashboardDestination;
  title: string;
  summary: string;
  actions?: ReactNode;
  children: ReactNode;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
};

export function ManagementPage({
  identity,
  connected,
  activeDestination,
  title,
  summary,
  actions,
  children,
  onSignOut,
  onNavigate,
}: ManagementPageProps) {
  return (
    <section className="dashboard-layout">
      <DashboardSidebar
        identity={identity}
        connected={connected}
        activeDestination={activeDestination}
        onSignOut={onSignOut}
        onNavigate={onNavigate}
      />
      <div className="dashboard-main">
        <header className="dashboard-header management-header">
          <div>
            <h1>{title}</h1>
            <p>{summary}</p>
          </div>
          {actions && <div className="dashboard-actions management-actions">{actions}</div>}
        </header>
        <div className="management-content">{children}</div>
      </div>
    </section>
  );
}
