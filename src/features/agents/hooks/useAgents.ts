import { useCallback, useEffect, useRef, useState } from "react";

import { getErrorMessage } from "../../../shared/lib/errors";
import { agentsApi } from "../api";
import type { Agent, AgentChanges, CreateAgentValues, Tool } from "../types";

export function useAgents(userId: string) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    setAgents([]);
    setSelectedId(null);
    setConnected(false);
    try {
      const [nextAgents, nextTools] = await Promise.all([
        agentsApi.list(),
        agentsApi.listTools(),
      ]);
      if (requestId !== requestSequence.current) return;
      setConnected(true);
      setAgents(nextAgents);
      setTools(nextTools);
      setSelectedId((current) =>
        current && nextAgents.some((agent) => agent.id === current)
          ? current
          : nextAgents[0]?.id || null,
      );
    } catch (reason) {
      if (requestId !== requestSequence.current) return;
      setAgents([]);
      setTools([]);
      setSelectedId(null);
      setConnected(false);
      setError(getErrorMessage(reason, "Could not reach the Agent Platform API."));
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => void refresh(), [refresh]);

  const createAgent = async (values: CreateAgentValues) => {
    const created = await agentsApi.create(values);
    setAgents((current) => [created, ...current]);
    setSelectedId(created.id);
    return created;
  };

  const updateAgent = async (agentId: string, changes: AgentChanges) => {
    try {
      const updated = await agentsApi.update(agentId, changes);
      setAgents((current) => current.map((agent) => (agent.id === updated.id ? updated : agent)));
      return updated;
    } catch (reason) {
      setError(getErrorMessage(reason, "Unable to save agent configuration."));
      return undefined;
    }
  };

  const deleteAgent = async (agentId: string) => {
    await agentsApi.remove(agentId);
    setAgents((current) => current.filter((agent) => agent.id !== agentId));
    setSelectedId((current) => (current === agentId ? null : current));
  };

  return {
    agents,
    tools,
    selectedId,
    selectedAgent: agents.find((agent) => agent.id === selectedId) || null,
    loading,
    connected,
    error,
    setError,
    setSelectedId,
    createAgent,
    updateAgent,
    deleteAgent,
    refresh,
  };
}
