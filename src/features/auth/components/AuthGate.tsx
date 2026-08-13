import { useEffect, useState } from "react";

import App from "../../../app/App";
import { apiResponse } from "../../../shared/api/client";
import { apiUrl } from "../../../shared/api/url";
import { LoadingScreen } from "../../../shared/ui/LoadingScreen";
import type { AuthenticatedUser } from "../types";
import { AuthWelcome } from "./AuthWelcome";

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
