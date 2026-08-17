import { useCallback, useEffect, useRef, useState } from "react";

import { getErrorMessage } from "../../../shared/lib/errors";
import { schedulesApi } from "../api";
import type { CreateScheduleValues, Schedule, ScheduleChanges } from "../types";

/** Cross-agent schedule management for the top-level Schedules dashboard.
 *
 * There is no "list every schedule for this owner" backend route (schedules
 * are only ever listed per-agent, see automation.controller) - this fetches
 * every agent's schedules in parallel and keeps them keyed by agent id, the
 * same shape useChatSessions.sessionsByAgent uses for the equivalent
 * cross-agent Sessions dashboard.
 */
export function useAllSchedules(userId: string, agentIds: string[]) {
  const [schedulesByAgent, setSchedulesByAgent] = useState<Record<string, Schedule[]>>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        agentIds.map(async (agentId) => [agentId, await schedulesApi.list(agentId)] as const),
      );
      if (requestId !== requestSequence.current) return;
      setSchedulesByAgent(Object.fromEntries(results));
    } catch (reason) {
      if (requestId !== requestSequence.current) return;
      setSchedulesByAgent({});
      setError(getErrorMessage(reason, "Could not load schedules."));
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
    // agentIds is an array literal recomputed by the caller each render;
    // join() gives a stable dependency so this only reruns when membership
    // actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, agentIds.join("\0")]);

  useEffect(() => void refresh(), [refresh]);

  const createSchedule = async (agentId: string, values: CreateScheduleValues) => {
    setError(null);
    try {
      const created = await schedulesApi.create(agentId, values);
      setSchedulesByAgent((current) => ({
        ...current,
        [agentId]: [created, ...(current[agentId] || [])],
      }));
      return created;
    } catch (reason) {
      setError(getErrorMessage(reason, "Unable to create schedule."));
      return undefined;
    }
  };

  const updateSchedule = async (agentId: string, scheduleId: string, changes: ScheduleChanges) => {
    setError(null);
    try {
      const updated = await schedulesApi.update(agentId, scheduleId, changes);
      setSchedulesByAgent((current) => {
        // A `changes.agent_id` that differs from `agentId` moved the
        // schedule server-side (see automation.controller) - it has to
        // move between the per-agent lists here too, not just be replaced
        // in place under its old agent, or it would keep showing (stale)
        // under an agent it no longer belongs to. Both lists here are
        // scrubbed of `updated.id` unconditionally (not just the "moved"
        // branch) - when `agentId === updated.agent_id` an object literal
        // with two entries for the same key collapses to the second, so an
        // unfiltered `current[updated.agent_id]` would silently survive
        // alongside the freshly-prepended `updated`, duplicating the card.
        const withoutOld = (current[agentId] || []).filter((schedule) => schedule.id !== updated.id);
        const newAgentList = (current[updated.agent_id] || []).filter((schedule) => schedule.id !== updated.id);
        return {
          ...current,
          [agentId]: withoutOld,
          [updated.agent_id]: [updated, ...newAgentList],
        };
      });
      return updated;
    } catch (reason) {
      setError(getErrorMessage(reason, "Unable to update schedule."));
      return undefined;
    }
  };

  const deleteSchedule = async (agentId: string, scheduleId: string) => {
    setDeleting(scheduleId);
    setError(null);
    try {
      await schedulesApi.remove(agentId, scheduleId);
      setSchedulesByAgent((current) => ({
        ...current,
        [agentId]: (current[agentId] || []).filter((schedule) => schedule.id !== scheduleId),
      }));
      return true;
    } catch (reason) {
      setError(getErrorMessage(reason, "Unable to delete schedule."));
      return false;
    } finally {
      setDeleting(null);
    }
  };

  const scheduleCount = Object.values(schedulesByAgent).reduce((count, list) => count + list.length, 0);

  return {
    schedulesByAgent,
    scheduleCount,
    loading,
    deleting,
    error,
    setError,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refresh,
  };
}
