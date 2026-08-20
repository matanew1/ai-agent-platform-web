import { useState } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";

import { type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { ManagementPage } from "../../../components/layout/ManagementPage";
import { AccountAvatar } from "../../../shared/ui/AccountAvatar";
import { deleteAccount } from "../../auth/api";
import { getErrorMessage } from "../../../shared/lib/errors";
import { useI18n } from "../../../shared/i18n/I18nProvider";

type ProfileDashboardProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
};

/**
 * Read-only view of the account WorkOS AuthKit authenticated - name, email,
 * and photo exactly as the identity provider returned them at sign-in
 * (`GET /auth/me`; the photo is WorkOS's `profile_picture_url`, threaded
 * through as `identity.avatarUrl` - see authentication/repository.py). No
 * editing here: this app doesn't call back to WorkOS's user-management API.
 *
 * The one exception is the danger-zone delete-account action below - not an
 * edit, an erase, and scoped to this app's own data only (see
 * authentication.account_service.AccountService): the WorkOS identity
 * itself survives, so the same account can sign back in to a fresh,
 * empty workspace.
 */
export function ProfileDashboard({ identity, connected, onSignOut, onNavigate }: ProfileDashboardProps) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmPhrase = "DELETE";

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      onSignOut?.();
    } catch (reason) {
      setError(getErrorMessage(reason, "Could not delete the account. Try again."));
      setDeleting(false);
    }
  };

  return (
    <ManagementPage identity={identity} connected={connected} activeDestination="profile" title={t("profile")} summary={t("profileSummary")} onSignOut={onSignOut} onNavigate={onNavigate}>
      <section className="profile-card">
        <div className="profile-avatar-row">
          <AccountAvatar name={identity.displayName} avatarUrl={identity.avatarUrl} />
          <p className="settings-note">{identity.avatarUrl ? t("providerPhoto") : t("noProviderPhoto")}</p>
        </div>
        <dl className="profile-fields">
          <div><dt>{t("name")}</dt><dd>{identity.displayName}</dd></div>
          <div><dt>{t("emailLabel")}</dt><dd dir="ltr">{identity.email}</dd></div>
          <div><dt>{t("memberIdLabel")}</dt><dd dir="ltr" className="profile-id">{identity.id}</dd></div>
        </dl>
      </section>
      <section className="settings-card">
        <header><span><ShieldCheck size={17} /></span><div><h2>{t("accountDetails")}</h2><p>{t("signedInWith", { provider: "WorkOS AuthKit" })}</p></div></header>
      </section>
      <section className="settings-card danger-zone">
        <header><span><AlertTriangle size={17} /></span><div><h2>{t("dangerZone")}</h2><p>{t("deleteAccountHint")}</p></div></header>
        <button className="danger" type="button" onClick={() => setConfirming(true)}>{t("deleteAccount")}</button>
      </section>
      {confirming && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !deleting && setConfirming(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
            <button type="button" className="close" onClick={() => setConfirming(false)} disabled={deleting} aria-label={t("close")}><X size={20} /></button>
            <p className="eyebrow">{t("dangerZone")}</p>
            <h2 id="delete-account-title">{t("deleteAccountConfirmTitle")}</h2>
            <p className="settings-note">{t("deleteAccountConfirmBody")}</p>
            <label>
              {t("deleteAccountConfirmPrompt", { phrase: confirmPhrase })}
              <input dir="ltr" value={confirmText} onChange={(event) => setConfirmText(event.target.value)} autoFocus />
            </label>
            {error && <p className="panel-footnote warning">{error}</p>}
            <button
              className="danger wide"
              type="button"
              disabled={confirmText !== confirmPhrase || deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? t("deleting") : t("deleteAccountConfirmButton")}
            </button>
          </div>
        </div>
      )}
    </ManagementPage>
  );
}
