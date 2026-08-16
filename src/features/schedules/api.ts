import { apiRequest } from "../../shared/api/client";
import type { CreateScheduleValues, Schedule, ScheduleChanges } from "./types";

export const schedulesApi = {
  list: (agentId: string) => apiRequest<Schedule[]>(`/agents/${agentId}/schedules`),
  create: (agentId: string, values: CreateScheduleValues) =>
    apiRequest<Schedule>(`/agents/${agentId}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  update: (agentId: string, scheduleId: string, changes: ScheduleChanges) =>
    apiRequest<Schedule>(`/agents/${agentId}/schedules/${scheduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    }),
  remove: (agentId: string, scheduleId: string) =>
    apiRequest<void>(`/agents/${agentId}/schedules/${scheduleId}`, {
      method: "DELETE",
    }),
};
