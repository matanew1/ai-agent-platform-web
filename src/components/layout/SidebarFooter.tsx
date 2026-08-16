import { Settings } from "lucide-react";

import { AccountAvatar } from "../../shared/ui/AccountAvatar";

type SidebarFooterProps = {
  identity: { id: string; displayName: string; email: string };
  settingsLabel: string;
  signOutLabel: string;
  settingsActive?: boolean;
  onSettings: () => void;
  onSignOut?: () => void;
};

/** Shared fixed footer for dashboard and agent workspace sidebars. */
export function SidebarFooter({ identity, settingsLabel, signOutLabel, settingsActive = false, onSettings, onSignOut }: SidebarFooterProps) {
  return (
    <footer className="sidebar-footer">
      <div className="sidebar-bottom-nav">
        <button className={`sidebar-settings ${settingsActive ? "active" : ""}`} type="button" aria-current={settingsActive ? "page" : undefined} onClick={onSettings}>
          <Settings size={15} />
          {settingsLabel}
        </button>
      </div>
      <div className="sidebar-account">
        <AccountAvatar name={identity.displayName} userId={identity.id} />
        <span><strong>{identity.displayName}</strong><small>{identity.email}</small></span>
        {onSignOut && <button type="button" onClick={onSignOut}>{signOutLabel}</button>}
      </div>
    </footer>
  );
}
