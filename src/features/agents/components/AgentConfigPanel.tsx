import { type CSSProperties, useEffect, useState } from "react";

import { rangePercentage } from "../../models/range";
import type { ModelCatalog } from "../../models/types";
import type { Agent, AgentChanges, Tool } from "../types";

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
  const [prompt, setPrompt] = useState(agent.system_prompt);
  const [allowedTools, setAllowedTools] = useState(agent.allowed_tools);
  const [model, setModel] = useState(agent.model || modelCatalog.default_model);
  const [temperature, setTemperature] = useState(agent.temperature ?? modelCatalog.temperature.default);

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

  // Auto-save 3s after the last edit to any field, instead of requiring an
  // explicit click on the save-state button - that button (and its
  // "unsaved"/"saving…"/"saved" labeling) still works for an immediate save.
  // Re-armed on every change to prompt/allowedTools/model/temperature, so a
  // burst of edits (e.g. typing in the prompt) only fires one save 3s after
  // the user stops, not one per keystroke. Guarded the same way the button
  // is (not already saving, models loaded, at least one tool allowed) so
  // this can't fire a request the manual save path would also reject.
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
        <label>System prompt</label>
        <button className={`save-state ${changed ? "unsaved" : ""}`} type="button" title={changed ? "Save configuration" : "Configuration saved"} disabled={!changed || saving || loadingModels || allowedTools.length === 0} onClick={save}>
          {saving ? "saving…" : changed ? "unsaved" : "saved"}
        </button>
      </div>
      <textarea className="prompt-editor" value={prompt} maxLength={8000} disabled={saving} onChange={(event) => setPrompt(event.target.value)} />
      <div className="prompt-meta"><span>applies to next message</span><span>{prompt.length} / 8000</span></div>
      <div className="config-block model-block">
        <div className="field-label">
          <label htmlFor="agent-model">Model</label>
          <span className="model-provider">{loadingModels ? "loading…" : modelCatalog.provider}</span>
        </div>
        <div className="model-select-wrap">
          <select
            id="agent-model"
            value={model}
            disabled={saving || loadingModels || !hasSelectableModels}
            onChange={(event) => setModel(event.target.value)}
          >
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <span aria-hidden="true">⌄</span>
        </div>
        {!loadingModels && !hasSelectableModels && (
          <p className="panel-footnote warning">No chat-capable models are installed for this provider.</p>
        )}
        <label className="temperature-control" htmlFor="agent-temperature">
          <span>temp</span>
          <input
            id="agent-temperature"
            type="range"
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
      <div className="field-label tool-heading"><label>Allowed tools</label></div>
      <div className="tool-list">
        {tools.map((tool) => {
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
      {allowedTools.length === 0 && <p className="panel-footnote warning">Select at least one tool. The backend currently treats an empty list as “allow all.”</p>}
      <button className="danger inspector-delete" onClick={onDelete}>Delete agent</button>
    </div>
  );
}
