import { apiRequest } from "../../shared/api/client";
import type { Agent, AgentChanges, CreateAgentValues, Tool } from "./types";

export const agentsApi = {
  list: () => apiRequest<Agent[]>("/agents"),
  listTools: () => apiRequest<Tool[]>("/tools"),
  create: (values: CreateAgentValues) =>
    apiRequest<Agent>("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
  update: (agentId: string, changes: AgentChanges) =>
    apiRequest<Agent>(`/agents/${agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    }),
  remove: (agentId: string) =>
    apiRequest<void>(`/agents/${agentId}`, {
      method: "DELETE",
    }),
};
