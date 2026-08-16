import { useEffect, useState } from "react";

import App from "../../../app/App";
import { apiResponse } from "../../../shared/api/client";
import { apiUrl } from "../../../shared/api/url";
import { LoadingScreen } from "../../../shared/ui/LoadingScreen";
import type { AuthenticatedUser } from "../types";
import { AuthWelcome } from "./AuthWelcome";
import { LegalPage, type LegalDocument } from "../../legal/components/LegalPage";

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
  const legalDocument = legalDocumentForPath(window.location.pathname);
  const [state, setState] = useState<GateState>({ status: "loading" });
  const [authFailed, setAuthFailed] = useState(
    () => new URLSearchParams(window.location.search).has("auth_error"),
  );

  useEffect(() => {
    if (legalDocument) return;
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
  }, [legalDocument]);

  if (legalDocument) return <LegalPage document={legalDocument} />;

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

function legalDocumentForPath(pathname: string): LegalDocument | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/terms") return "terms";
  if (path === "/privacy") return "privacy";
  if (path === "/cookies") return "cookies";
  return null;
}
