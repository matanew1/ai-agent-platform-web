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
      setSchedulesByAgent((current) => ({
        ...current,
        [agentId]: (current[agentId] || []).map((schedule) =>
          schedule.id === updated.id ? updated : schedule,
        ),
      }));
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
    } catch (reason) {
      setError(getErrorMessage(reason, "Unable to delete schedule."));
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
