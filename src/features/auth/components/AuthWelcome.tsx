import { ArrowRight, FileText, ShieldCheck, Sparkles } from "lucide-react";

import { Brand } from "../../../shared/ui/Brand";
import { Notice } from "../../../shared/ui/Notice";

type AuthWelcomeProps = {
  authFailed: boolean;
  onDismissError: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
};

/** Signed-out product homepage and login entry point. */
export function AuthWelcome({ authFailed, onDismissError, onSignIn, onSignUp }: AuthWelcomeProps) {
  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <Brand />
        <p className="eyebrow">Private AI workspace</p>
        <h1>Turn your documents into work your agents can use.</h1>
        <p className="auth-lede">Create focused agents, attach knowledge, and keep every conversation in one secure workspace.</p>
        <div className="auth-benefits" aria-label="Platform benefits">
          <span><FileText size={16} /> Grounded in your documents</span>
          <span><Sparkles size={16} /> Tools you choose per agent</span>
          <span><ShieldCheck size={16} /> Private, owner-scoped access</span>
        </div>
      </section>
      <section className="auth-card" aria-label="Sign in to AI Platform">
        <p className="eyebrow">Welcome</p>
        <h2>Continue to your workspace</h2>
        <p>Sign in to access your agents, documents, tools, and retained sessions.</p>
        {authFailed && <div className="auth-notice"><Notice message="Sign-in failed or was cancelled. Please try again." onDismiss={onDismissError} /></div>}
        <div className="auth-actions">
          <button className="primary" type="button" onClick={onSignIn}>Sign in <ArrowRight size={16} /></button>
          <button type="button" onClick={onSignUp}>Create account</button>
        </div>
        <small>Authentication is secured by WorkOS AuthKit.</small>
      </section>
    </main>
  );
}
