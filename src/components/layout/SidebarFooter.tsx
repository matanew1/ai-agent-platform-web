import { LogOut, Settings } from "lucide-react";

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

/** Shared fixed footer for dashboard and agent workspace sidebars.
 *
 * The avatar and the sign-out icon are each a control's one guaranteed-visible
 * element when the sidebar is collapsed to its icon rail - `.sidebar-label`
 * (see styles.css) only ever hides a trailing *text* span next to an icon,
 * never a whole button with nothing else to show. Putting `sidebar-label`
 * directly on a button that has no icon (as this used to, on both the
 * profile-open and sign-out buttons) makes that control disappear entirely
 * once collapsed - a real dead end, since this footer is the only sign-out
 * and profile entry point in the app. */
export function SidebarFooter({ identity, settingsLabel, signOutLabel, profileLabel, settingsActive = false, onSettings, onProfile, onSignOut }: SidebarFooterProps) {
  return (
    <footer className="sidebar-footer">
      <div className="sidebar-bottom-nav">
        <button className={`sidebar-settings ${settingsActive ? "active" : ""}`} type="button" aria-current={settingsActive ? "page" : undefined} aria-label={settingsLabel} title={settingsLabel} onClick={onSettings}>
          <Settings size={15} />
          <span className="sidebar-label">{settingsLabel}</span>
        </button>
      </div>
      <div className="sidebar-account">
        <button type="button" className="sidebar-account-open" onClick={onProfile} aria-label={profileLabel} title={profileLabel}>
          <AccountAvatar name={identity.displayName} avatarUrl={identity.avatarUrl} />
          <span className="sidebar-label"><strong>{identity.displayName}</strong><small>{identity.email}</small></span>
        </button>
        {onSignOut && (
          <button type="button" className="sidebar-sign-out" onClick={onSignOut} aria-label={signOutLabel} title={signOutLabel}>
            <LogOut size={14} />
            <span className="sidebar-label">{signOutLabel}</span>
          </button>
        )}
      </div>
    </footer>
  );
}
