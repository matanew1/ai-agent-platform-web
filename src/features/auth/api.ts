import { apiRequest } from "../../shared/api/client";

/** Deletes every agent, session, document, and schedule the caller owns.
 * Does not delete the WorkOS identity itself - see
 * authentication.controller.delete_account. Callers should follow this with
 * the normal sign-out navigation (AuthGate's onSignOut) once it resolves. */
export function deleteAccount() {
  return apiRequest<void>("/auth/account", { method: "DELETE" });
}
