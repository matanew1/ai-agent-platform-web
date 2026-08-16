import { useCallback, useEffect, useRef, useState } from "react";

import { getErrorMessage } from "../../../shared/lib/errors";
import { schedulesApi } from "../api";
import type { CreateScheduleValues, Schedule, ScheduleChanges } from "../types";

export function useSchedules(agentId: string) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const next = await schedulesApi.list(agentId);
      if (requestId !== requestSequence.current) return;
      setSchedules(next);
    } catch (reason) {
      if (requestId !== requestSequence.current) return;
      setSchedules([]);
      setError(getErrorMessage(reason, "Could not load schedules for this agent."));
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [agentId]);

  useEffect(() => void refresh(), [refresh]);

  const createSchedule = async (values: CreateScheduleValues) => {
    try {
      const created = await schedulesApi.create(agentId, values);
      setSchedules((current) => [created, ...current]);
      return created;
    } catch (reason) {
      setError(getErrorMessage(reason, "Unable to create schedule."));
      return undefined;
    }
  };

  const updateSchedule = async (scheduleId: string, changes: ScheduleChanges) => {
    try {
      const updated = await schedulesApi.update(agentId, scheduleId, changes);
      setSchedules((current) =>
        current.map((schedule) => (schedule.id === updated.id ? updated : schedule)),
      );
      return updated;
    } catch (reason) {
      setError(getErrorMessage(reason, "Unable to update schedule."));
      return undefined;
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    await schedulesApi.remove(agentId, scheduleId);
    setSchedules((current) => current.filter((schedule) => schedule.id !== scheduleId));
  };

  return {
    schedules,
    loading,
    error,
    setError,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refresh,
  };
}
