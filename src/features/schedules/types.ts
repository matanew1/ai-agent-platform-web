export type Schedule = {
  id: string;
  agent_id: string;
  cron_expression: string;
  trigger_message: string;
  enabled: boolean;
  next_run_at: string;
  last_run_at?: string | null;
  last_run_session_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateScheduleValues = Pick<Schedule, "cron_expression" | "trigger_message">;
export type ScheduleChanges = Partial<Pick<Schedule, "cron_expression" | "trigger_message" | "enabled">>;

/** A session created by a fired schedule gets a client-facing id starting
 * with this marker (see automation.runner.ScheduleRunner on the backend),
 * so the chat UI can badge it without a dedicated session field - the
 * backend already strips the `owner_id:agent_id:` prefix before a session
 * id reaches the client (see agent.controller), so this only needs to
 * check the remaining segment. */
export function isScheduledSessionId(sessionId: string) {
  return sessionId.startsWith("scheduled-");
}
