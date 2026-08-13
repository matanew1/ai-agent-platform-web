export type Agent = {
  id: string;
  name: string;
  description?: string | null;
  system_prompt: string;
  allowed_tools: string[];
  model?: string | null;
  temperature?: number | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type AgentChanges = Partial<Pick<Agent, "name" | "description" | "system_prompt" | "allowed_tools" | "model" | "temperature">>;
export type CreateAgentValues = Pick<Agent, "name" | "system_prompt" | "allowed_tools"> & Pick<AgentChanges, "description" | "model" | "temperature">;

export type Tool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};
