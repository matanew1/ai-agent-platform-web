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

/** `Schedule.last_run_session_id` comes back from `/agents/{id}/schedules`
 * as the *full* session id ScheduleRunner constructed and stored
 * server-side (`owner_id:agent_id:scheduled-...`) - unlike
 * `GET /agents/{id}/sessions`, this route never strips the prefix, since
 * it isn't a session route at all. Strip it the same way here so the
 * result can be used as a plain `Session.id` (see useChatSessions). */
export function lastRunClientSessionId(schedule: Schedule, ownerId: string): string | null {
  if (!schedule.last_run_session_id) return null;
  const prefix = `${ownerId}:${schedule.agent_id}:`;
  return schedule.last_run_session_id.startsWith(prefix)
    ? schedule.last_run_session_id.slice(prefix.length)
    : schedule.last_run_session_id;
}
