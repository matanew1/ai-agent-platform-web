import { useEffect, useState } from "react";
import { CircleAlert as AlertCircle } from "lucide-react";

import App from "../../../app/App";
import { apiResponse } from "../../../shared/api/client";
import { apiUrl } from "../../../shared/api/url";
import { LoadingScreen } from "../../../shared/ui/LoadingScreen";
import { Notice } from "../../../shared/ui/Notice";
import type { AuthenticatedUser } from "../types";

type MeResponse = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function toAuthenticatedUser(body: MeResponse): AuthenticatedUser {
  return {
    id: body.id,
    email: body.email ?? "",
    displayName: body.display_name || body.email || body.id,
    avatarUrl: body.avatar_url,
  };
}

type GateState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: AuthenticatedUser };

export function AuthGate() {
  const [state, setState] = useState<GateState>({ status: "loading" });
  const [authFailed, setAuthFailed] = useState(
    () => new URLSearchParams(window.location.search).has("auth_error"),
  );

  useEffect(() => {
    let cancelled = false;
    apiResponse("/auth/me")
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setState({ status: "signed-out" });
          return;
        }
        const body = (await response.json()) as MeResponse;
        setState({ status: "signed-in", user: toAuthenticatedUser(body) });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "signed-out" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") return <LoadingScreen />;

  if (state.status === "signed-out") {
    const returnTo = encodeURIComponent(window.location.pathname);
    return (
      <AuthWelcome
        authFailed={authFailed}
        onDismissError={() => setAuthFailed(false)}
        onSignIn={() => {
          window.location.href = apiUrl(`/auth/login?return_to=${returnTo}`);
        }}
        onSignUp={() => {
          window.location.href = apiUrl(
            `/auth/login?return_to=${returnTo}&screen_hint=sign-up`,
          );
        }}
      />
    );
  }

  return (
    <App
      currentUser={state.user}
      onSignOut={() => {
        window.location.href = apiUrl("/auth/logout");
      }}
    />
  );
}

function AuthWelcome({
  onSignIn,
  onSignUp,
  authFailed,
  onDismissError,
}: {
  onSignIn: () => void;
  onSignUp: () => void;
  authFailed: boolean;
  onDismissError: () => void;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <span className="auth-mark">AP</span>
        <p className="eyebrow">Agent Platform</p>
        <h1>Build agents that work with you.</h1>
        <p>Sign in to access your agents, retained sessions, documents, and tool registry.</p>
        {authFailed && (
          <div style={{ margin: "16px 0 0" }}>
            <Notice message="Sign-in failed or was cancelled. Please try again." onDismiss={onDismissError} />
          </div>
        )}
        <div className="auth-actions">
          <button className="primary" type="button" onClick={onSignIn}>Sign in</button>
          <button type="button" onClick={onSignUp}>Create account</button>
        </div>
        <small>Authentication and session security are provided by WorkOS AuthKit.</small>
      </section>
    </div>
  );
}
