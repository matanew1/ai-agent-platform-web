import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Maximize2, Trash2, X } from "lucide-react";

import { Tooltip } from "../../../components/Tooltip";
import { describeModel } from "../../models/describeModel";
import { rangePercentage } from "../../models/range";
import type { ModelCatalog } from "../../models/types";
import { groupToolsBySource, sourceIcon } from "../toolGrouping";
import type { Agent, AgentChanges, Tool } from "../types";
import { useI18n } from "../../../shared/i18n/I18nProvider";

type AgentConfigPanelProps = {
  agent: Agent;
  tools: Tool[];
  saving: boolean;
  modelCatalog: ModelCatalog;
  loadingModels: boolean;
  onSave: (changes: AgentChanges) => Promise<unknown>;
  onDelete: () => void;
};

export function AgentConfigPanel({ agent, tools, saving, modelCatalog, loadingModels, onSave, onDelete }: AgentConfigPanelProps) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState(agent.system_prompt);
  const [allowedTools, setAllowedTools] = useState(agent.allowed_tools);
  const [model, setModel] = useState(agent.model || modelCatalog.default_model);
  const [temperature, setTemperature] = useState(agent.temperature ?? modelCatalog.temperature.default);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [promptExpanded, setPromptExpanded] = useState(false);
  const toolGroups = useMemo(() => groupToolsBySource(tools), [tools]);

  useEffect(() => {
    if (!promptExpanded) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setPromptExpanded(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [promptExpanded]);

  function toggleGroup(source: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  }

  useEffect(() => {
    setPrompt(agent.system_prompt);
    setAllowedTools(agent.allowed_tools.length ? agent.allowed_tools : tools.map((tool) => tool.name));
  }, [agent.id, agent.system_prompt, agent.allowed_tools, tools]);

  useEffect(() => {
    setModel(agent.model || modelCatalog.default_model);
    setTemperature(agent.temperature ?? modelCatalog.temperature.default);
  }, [agent.id, agent.model, agent.temperature, modelCatalog.default_model, modelCatalog.temperature.default]);

  const savedModel = agent.model || modelCatalog.default_model;
  const savedTemperature = agent.temperature ?? modelCatalog.temperature.default;
  const hasSelectableModels = modelCatalog.models.length > 0;
  const modelOptions = modelCatalog.models.some((option) => option.id === model)
    ? modelCatalog.models
    : [{ id: model, label: `${model} (configured)` }, ...modelCatalog.models];

  const changed = prompt !== agent.system_prompt ||
    allowedTools.join("\0") !== (agent.allowed_tools.length ? agent.allowed_tools : tools.map((tool) => tool.name)).join("\0") ||
    model !== savedModel ||
    temperature !== savedTemperature;

  const save = () => {
    const changes: AgentChanges = {};
    if (prompt !== agent.system_prompt) changes.system_prompt = prompt;
    if (allowedTools.join("\0") !== (agent.allowed_tools.length ? agent.allowed_tools : tools.map((tool) => tool.name)).join("\0")) {
      changes.allowed_tools = allowedTools;
    }
    if (model !== savedModel) changes.model = model;
    if (temperature !== savedTemperature) changes.temperature = temperature;
    return onSave(changes);
  };

  useEffect(() => {
    if (!changed || saving || loadingModels || allowedTools.length === 0) return;
    const timeoutId = setTimeout(() => {
      void save();
    }, 3000);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, allowedTools, model, temperature, saving, loadingModels]);

  return (
    <div className="inspector-content">
      <div className="field-label">
        <label>{t("systemPrompt")}<button type="button" className="prompt-expand" title={t("expandSystemPrompt")} aria-label={t("expandSystemPrompt")} onClick={() => setPromptExpanded(true)}><Maximize2 size={12} /></button></label>
        <button className={`save-state ${changed ? "unsaved" : ""}`} type="button" title={changed ? t("saveConfiguration") : t("configurationSaved")} disabled={!changed || saving || loadingModels || allowedTools.length === 0} onClick={save}>
          {saving ? t("saving") : changed ? t("unsaved") : t("saved")}
        </button>
      </div>
      <textarea dir="auto" className="prompt-editor" value={prompt} maxLength={8000} disabled={saving} onChange={(event) => setPrompt(event.target.value)} />
      <div className="prompt-meta"><span>{t("appliesNextMessage")}</span><span>{prompt.length} / 8000</span></div>
      {promptExpanded && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPromptExpanded(false)}>
          <div className="modal prompt-expand-modal" role="dialog" aria-modal="true" aria-labelledby="expand-prompt-title">
            <button type="button" className="close" onClick={() => setPromptExpanded(false)} aria-label={t("close")}><X size={20} /></button>
            <p className="eyebrow">{agent.name}</p>
            <h2 id="expand-prompt-title">{t("systemPrompt")}</h2>
            <textarea dir="auto" autoFocus className="prompt-editor prompt-editor-expanded" value={prompt} maxLength={8000} disabled={saving} onChange={(event) => setPrompt(event.target.value)} />
            <div className="prompt-meta"><span>{t("appliesNextMessage")}</span><span>{prompt.length} / 8000</span></div>
          </div>
        </div>
      )}
      <div className="config-block model-block">
        <div className="field-label">
          <label htmlFor="agent-model">{t("model")}{hasSelectableModels && <Tooltip text={describeModel(model, t)} label={t("model")} />}</label>
          <span className="model-provider">{loadingModels ? t("loading") : modelCatalog.provider}</span>
        </div>
        <div className="model-select-wrap">
          <select
            id="agent-model"
            dir="ltr"
            value={model}
            disabled={saving || loadingModels || !hasSelectableModels}
            onChange={(event) => setModel(event.target.value)}
          >
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id} title={describeModel(option.id, t)}>{option.label}</option>
            ))}
          </select>
          <span aria-hidden="true">⌄</span>
        </div>
        {!loadingModels && !hasSelectableModels && (
          <p className="panel-footnote warning">{t("noProviderModels")}</p>
        )}
        <label className="temperature-control" htmlFor="agent-temperature">
          <span>{t("temperature")}<Tooltip text={t("temperatureHint")} label={t("temperature")} /></span>
          <input
            id="agent-temperature"
            type="range"
            dir="ltr"
            min={modelCatalog.temperature.min}
            max={modelCatalog.temperature.max}
            step={modelCatalog.temperature.step}
            value={temperature}
            disabled={saving || loadingModels}
            onChange={(event) => setTemperature(Number(event.target.value))}
            style={{ "--range-value": `${rangePercentage(temperature, modelCatalog.temperature.min, modelCatalog.temperature.max)}%` } as CSSProperties}
          />
          <output>{temperature.toFixed(1)}</output>
        </label>
      </div>
      <div className="field-label tool-heading"><label>{t("allowedTools")}</label></div>
      <div className="tool-tree">
        {toolGroups.map((group) => {
          const collapsed = collapsedGroups.has(group.source);
          const GroupIcon = sourceIcon(group.source);
          const groupLabel = group.source === "local"
            ? t("localTools")
            : t("mcpServerGroup", { name: group.source });
          return (
            <div className="tool-group" key={group.source}>
              <button
                className="tool-group-header"
                type="button"
                aria-expanded={!collapsed}
                onClick={() => toggleGroup(group.source)}
              >
                <b aria-hidden="true">{collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</b>
                <span className="tool-group-glyph" aria-hidden="true"><GroupIcon size={16} /></span>
                <strong>{groupLabel}</strong>
                <span className="tool-group-count">{t("toolGroupCount", { count: String(group.tools.length) })}</span>
              </button>
              {!collapsed && (
                <div className="tool-list">
                  {group.tools.map((tool) => {
                    const enabled = allowedTools.includes(tool.name);
                    return (
                      <label key={tool.name}>
                        <span><strong>{tool.name}</strong></span>
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={saving}
                          onChange={() => setAllowedTools((current) =>
                            enabled ? current.filter((name) => name !== tool.name) : [...current, tool.name],
                          )}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {allowedTools.length === 0 && <p className="panel-footnote warning">{t("selectTool")}</p>}
      <button className="danger inspector-delete" onClick={onDelete}><Trash2 size={13} /> {t("deleteAgent")}</button>
    </div>
  );
}
