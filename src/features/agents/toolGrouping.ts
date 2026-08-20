import { Clock, FolderOpen, Globe, Search, Server, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Tool } from "./types";

// None of these MCP servers have an official brand glyph in lucide-react, so each
// gets a generic icon matched to what it actually does; anything not listed here
// (a future server) falls back to a plain Server icon rather than guessing.
const SOURCE_ICONS: Record<string, LucideIcon> = {
  local: Wrench,
  fetch: Globe,
  time: Clock,
  tavily: Search,
  filesystem: FolderOpen,
};

export function sourceIcon(source: string): LucideIcon {
  return SOURCE_ICONS[source] ?? Server;
}

export type ToolGroup<T extends Tool = Tool> = { source: string; tools: T[] };

/**
 * Bucket tools by their `source` ("local", or an MCP server's mcp-servers.yaml
 * key), "local" first then MCP servers alphabetically - keeps grouping order
 * stable as servers are added/removed rather than following registration order.
 */
export function groupToolsBySource<T extends Tool = Tool>(tools: T[]): ToolGroup<T>[] {
  const bySource = new Map<string, T[]>();
  for (const tool of tools) {
    const source = tool.source ?? "local";
    const existing = bySource.get(source);
    if (existing) existing.push(tool);
    else bySource.set(source, [tool]);
  }
  return [...bySource.entries()]
    .sort(([a], [b]) => (a === "local" ? -1 : b === "local" ? 1 : a.localeCompare(b)))
    .map(([source, groupTools]) => ({ source, tools: groupTools }));
}
