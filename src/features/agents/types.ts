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
  /** Where the tool comes from: "local" for an in-process tool, or the MCP
   * server's name (e.g. "fetch", "tavily") for one adapted from an external
   * server. Always present in the backend response, but treated as optional
   * here so a client build briefly ahead of the backend degrades gracefully
   * (everything just groups under "local"). */
  source?: string;
};
