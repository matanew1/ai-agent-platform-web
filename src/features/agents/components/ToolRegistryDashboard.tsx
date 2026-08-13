import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Layers, Wrench } from "lucide-react";

import { type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { ManagementPage } from "../../../components/layout/ManagementPage";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import type { Tool } from "../types";

type ToolRegistryDashboardProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  tools: Tool[];
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
};

export function ToolRegistryDashboard({
  identity,
  connected,
  tools,
  onSignOut,
  onNavigate,
}: ToolRegistryDashboardProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const visibleTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tools;
    return tools.filter((tool) => (
      tool.name.toLowerCase().includes(normalized) || tool.description.toLowerCase().includes(normalized)
    ));
  }, [query, tools]);

  return (
    <ManagementPage
      identity={identity}
      connected={connected}
      activeDestination="tools"
      title={t("toolRegistry")}
      summary={t("toolsSummary", { count: String(tools.length) })}
      onSignOut={onSignOut}
      onNavigate={onNavigate}
      actions={(
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t("searchTools")}
          placeholder={t("searchTools")}
        />
      )}
    >
      {visibleTools.length ? (
        <div className="tool-registry-list" aria-label={t("registeredTools")}>
          {visibleTools.map((tool) => {
            const expanded = expandedTool === tool.name;
            const parameters = toolParameters(tool);
            return (
              <article className={`tool-registry-card ${expanded ? "expanded" : ""}`} key={tool.name}>
                <button
                  className="tool-card-summary"
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpandedTool(expanded ? null : tool.name)}
                >
                  <span className="tool-glyph" aria-hidden="true"><Wrench size={16} /></span>
                  <span className="management-row-copy">
                    <strong>{tool.name}</strong>
                    <small>{tool.description}</small>
                  </span>
                  <span className="tool-card-meta">
                    <span>{parameters.length} {t(parameters.length === 1 ? "argument" : "arguments")}</span>
                    <span className="status-pill available"><i />{t("available")}</span>
                    <b aria-hidden="true">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</b>
                  </span>
                </button>
                {expanded && (
                  <div className="tool-card-details">
                    <p className="eyebrow">{t("inputSchema")}</p>
                    {parameters.length ? (
                      <div className="tool-parameters">
                        {parameters.map((parameter) => (
                          <div key={parameter.name}>
                            <code>{parameter.name}</code>
                            <span>{parameter.type}{parameter.required ? ` · ${t("required")}` : ` · ${t("optional")}`}</span>
                            {parameter.description && <p>{parameter.description}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="tool-no-arguments">{t("noToolArguments")}</p>
                    )}
                    <details className="raw-schema">
                      <summary>{t("rawJsonSchema")}</summary>
                      <pre><code>{JSON.stringify(tool.parameters, null, 2)}</code></pre>
                    </details>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="management-empty">
          <span className="empty-mark"><Layers size={20} /></span>
          <h2>{query ? t("noMatchingTools") : t("noTools")}</h2>
          <p>{query ? t("tryToolSearch") : t("toolsHint")}</p>
        </div>
      )}
    </ManagementPage>
  );
}

type ParameterSummary = { name: string; type: string; description: string; required: boolean };

function toolParameters(tool: Tool): ParameterSummary[] {
  const properties = asRecord(tool.parameters.properties);
  const required = Array.isArray(tool.parameters.required)
    ? new Set(tool.parameters.required.filter((value): value is string => typeof value === "string"))
    : new Set<string>();
  return Object.entries(properties).map(([name, value]) => {
    const schema = asRecord(value);
    return {
      name,
      type: typeof schema.type === "string" ? schema.type : "value",
      description: typeof schema.description === "string" ? schema.description : "",
      required: required.has(name),
    };
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
