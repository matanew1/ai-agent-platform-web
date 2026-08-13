import { ArrowRight, FileText, ShieldCheck, Sparkles } from "lucide-react";

import { Brand } from "../../../shared/ui/Brand";
import { Notice } from "../../../shared/ui/Notice";
import { useI18n } from "../../../shared/i18n/I18nProvider";

type AuthWelcomeProps = {
  authFailed: boolean;
  onDismissError: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
};

/** Signed-out product homepage and login entry point. */
export function AuthWelcome({ authFailed, onDismissError, onSignIn, onSignUp }: AuthWelcomeProps) {
  const { t } = useI18n();
  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <Brand />
        <p className="eyebrow">{t("privateWorkspace")}</p>
        <h1>{t("authHeadline")}</h1>
        <p className="auth-lede">{t("authDescription")}</p>
        <div className="auth-benefits" aria-label={t("privateWorkspace")}>
          <span><FileText size={16} /> {t("groundedDocuments")}</span>
          <span><Sparkles size={16} /> {t("toolsPerAgent")}</span>
          <span><ShieldCheck size={16} /> {t("privateAccess")}</span>
        </div>
      </section>
      <section className="auth-card" aria-label={t("signInPlatform")}>
        <p className="eyebrow">{t("welcome")}</p>
        <h2>{t("continueWorkspace")}</h2>
        <p>{t("signInDescription")}</p>
        {authFailed && <div className="auth-notice"><Notice message={t("signInFailed")} onDismiss={onDismissError} /></div>}
        <div className="auth-actions">
          <button className="primary" type="button" onClick={onSignIn}>{t("signIn")} <ArrowRight size={16} /></button>
          <button type="button" onClick={onSignUp}>{t("createAccount")}</button>
        </div>
        <small>{t("authSecured")}</small>
      </section>
    </main>
  );
}
