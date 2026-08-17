import { describe, expect, it } from "vitest";

import { isScheduledSessionId, lastRunClientSessionId, type Schedule } from "./types";

function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "sched-1", agent_id: "agent-1", title: "Daily digest", cron_expression: "0 8 * * *",
    trigger_message: "hi", enabled: true, next_run_at: "2026-01-02T08:00:00Z",
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", ...overrides,
  };
}

describe("isScheduledSessionId", () => {
  it("recognizes a client-facing scheduled-run session id", () => {
    expect(isScheduledSessionId("scheduled-sched-1-abc123")).toBe(true);
  });

  it("does not match a regular user-started session id", () => {
    expect(isScheduledSessionId("new-conversation-abc123")).toBe(false);
  });
});

describe("lastRunClientSessionId", () => {
  it("strips the owner_id:agent_id: prefix the schedules route doesn't strip on its own", () => {
    const result = lastRunClientSessionId(
      schedule({ last_run_session_id: "owner-1:agent-1:scheduled-sched-1-abc123" }),
      "owner-1",
    );
    expect(result).toBe("scheduled-sched-1-abc123");
  });

  it("returns null when the schedule has never run", () => {
    expect(lastRunClientSessionId(schedule({ last_run_session_id: null }), "owner-1")).toBeNull();
    expect(lastRunClientSessionId(schedule({}), "owner-1")).toBeNull();
  });

  it("returns the raw id unchanged if it doesn't start with the expected prefix", () => {
    // Defensive fallback - shouldn't happen against the real backend, but
    // a caller passing the wrong owner_id/agent_id shouldn't silently
    // produce a mismatched id.
    const result = lastRunClientSessionId(
      schedule({ last_run_session_id: "other-owner:agent-1:scheduled-sched-1-abc123" }),
      "owner-1",
    );
    expect(result).toBe("other-owner:agent-1:scheduled-sched-1-abc123");
  });
});
