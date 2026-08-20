import { Settings } from "lucide-react";

import { AccountAvatar } from "../../shared/ui/AccountAvatar";

type SidebarFooterProps = {
  identity: { id: string; displayName: string; email: string; avatarUrl?: string | null };
  settingsLabel: string;
  signOutLabel: string;
  profileLabel: string;
  settingsActive?: boolean;
  onSettings: () => void;
  onProfile: () => void;
  onSignOut?: () => void;
};

/** Shared fixed footer for dashboard and agent workspace sidebars. */
export function SidebarFooter({ identity, settingsLabel, signOutLabel, profileLabel, settingsActive = false, onSettings, onProfile, onSignOut }: SidebarFooterProps) {
  return (
    <footer className="sidebar-footer">
      <div className="sidebar-bottom-nav">
        <button className={`sidebar-settings ${settingsActive ? "active" : ""}`} type="button" aria-current={settingsActive ? "page" : undefined} title={settingsLabel} onClick={onSettings}>
          <Settings size={15} />
          <span className="sidebar-label">{settingsLabel}</span>
        </button>
      </div>
      <div className="sidebar-account">
        <AccountAvatar name={identity.displayName} avatarUrl={identity.avatarUrl} />
        <button type="button" className="sidebar-account-open sidebar-label" onClick={onProfile} aria-label={profileLabel}>
          <span><strong>{identity.displayName}</strong><small>{identity.email}</small></span>
        </button>
        {onSignOut && <button type="button" className="sidebar-label" onClick={onSignOut}>{signOutLabel}</button>}
      </div>
    </footer>
  );
}
