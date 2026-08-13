import { type CSSProperties, FormEvent, useEffect, useState } from "react";

import { DEFAULT_PROMPT } from "../../../shared/config/constants";
import { rangePercentage } from "../../models/range";
import type { ModelCatalog } from "../../models/types";
import type { CreateAgentValues, Tool } from "../types";

type CreateAgentModalProps = {
  tools: Tool[];
  modelCatalog: ModelCatalog;
  loadingModels: boolean;
  onClose: () => void;
  onCreate: (values: CreateAgentValues) => Promise<void>;
};

export function CreateAgentModal({ tools, modelCatalog, loadingModels, onClose, onCreate }: CreateAgentModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [model, setModel] = useState(modelCatalog.default_model);
  const [temperature, setTemperature] = useState(modelCatalog.temperature.default);
  const [saving, setSaving] = useState(false);
  const hasSelectableModels = modelCatalog.models.length > 0;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    const nextModel = modelCatalog.models.some((option) => option.id === modelCatalog.default_model)
      ? modelCatalog.default_model
      : modelCatalog.models[0]?.id ?? "";
    setModel(nextModel);
    setTemperature(modelCatalog.temperature.default);
  }, [modelCatalog.default_model, modelCatalog.models, modelCatalog.temperature.default]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!model || !hasSelectableModels) return;
    setSaving(true);
    try {
      await onCreate({
        name,
        description: description.trim() || undefined,
        system_prompt: prompt,
        allowed_tools: tools.map((tool) => tool.name),
        model,
        temperature,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="create-agent-title" onSubmit={submit}>
        <button type="button" className="close" onClick={onClose} aria-label="Close">×</button>
        <p className="eyebrow">New agent</p>
        <h2 id="create-agent-title">Give your agent a role.</h2>
        <label>Name<input autoFocus value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="e.g. Research Scout" required /></label>
        <label>Short description<input value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="What this agent is responsible for" /></label>
        <div className="modal-runtime-grid">
          <label htmlFor="create-agent-model">
            <span className="modal-field-heading"><span>Model</span><span className="model-provider">{loadingModels ? "loading…" : modelCatalog.provider}</span></span>
            <span className="model-select-wrap">
              <select
                id="create-agent-model"
                value={model}
                disabled={saving || loadingModels || !hasSelectableModels}
                onChange={(event) => setModel(event.target.value)}
              >
                {hasSelectableModels ? modelCatalog.models.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                )) : <option value="">No chat models installed</option>}
              </select>
              <span aria-hidden="true">⌄</span>
            </span>
          </label>
          <label htmlFor="create-agent-temperature">
            Temperature
            <span className="modal-temperature-control">
              <input
                id="create-agent-temperature"
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
            </span>
          </label>
        </div>
        {!loadingModels && !hasSelectableModels && (
          <p className="panel-footnote warning">Install a chat-capable model before creating an agent.</p>
        )}
        <label>System prompt<textarea value={prompt} maxLength={8000} onChange={(event) => setPrompt(event.target.value)} required /></label>
        <button className="primary wide" disabled={saving || loadingModels || !hasSelectableModels}>{saving ? "Creating…" : loadingModels ? "Loading models…" : "Create agent"}</button>
      </form>
    </div>
  );
}
