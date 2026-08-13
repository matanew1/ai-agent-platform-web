import { type CSSProperties, FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";

import { DEFAULT_PROMPT } from "../../../shared/config/constants";
import { rangePercentage } from "../../models/range";
import type { ModelCatalog } from "../../models/types";
import type { CreateAgentValues, Tool } from "../types";
import { useI18n } from "../../../shared/i18n/I18nProvider";

type CreateAgentModalProps = {
  tools: Tool[];
  modelCatalog: ModelCatalog;
  loadingModels: boolean;
  onClose: () => void;
  onCreate: (values: CreateAgentValues) => Promise<void>;
};

export function CreateAgentModal({ tools, modelCatalog, loadingModels, onClose, onCreate }: CreateAgentModalProps) {
  const { t } = useI18n();
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
        <button type="button" className="close" onClick={onClose} aria-label={t("close")}><X size={20} /></button>
        <p className="eyebrow">{t("newAgent")}</p>
        <h2 id="create-agent-title">{t("newAgentTitle")}</h2>
        <label>{t("name")}<input dir="auto" autoFocus value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder={t("namePlaceholder")} required /></label>
        <label>{t("shortDescription")}<input dir="auto" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder={t("descriptionPlaceholder")} /></label>
        <div className="modal-runtime-grid">
          <label htmlFor="create-agent-model">
            <span className="modal-field-heading"><span>{t("model")}</span><span className="model-provider">{loadingModels ? t("loading") : modelCatalog.provider}</span></span>
            <span className="model-select-wrap">
              <select
                id="create-agent-model"
                dir="ltr"
                value={model}
                disabled={saving || loadingModels || !hasSelectableModels}
                onChange={(event) => setModel(event.target.value)}
              >
                {hasSelectableModels ? modelCatalog.models.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                )) : <option value="">{t("noChatModels")}</option>}
              </select>
              <span aria-hidden="true">⌄</span>
            </span>
          </label>
          <label htmlFor="create-agent-temperature">
            {t("temperature")}
            <span className="modal-temperature-control">
              <input
                id="create-agent-temperature"
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
            </span>
          </label>
        </div>
        {!loadingModels && !hasSelectableModels && (
          <p className="panel-footnote warning">{t("installChatModel")}</p>
        )}
        <label>{t("systemPrompt")}<textarea dir="auto" value={prompt} maxLength={8000} onChange={(event) => setPrompt(event.target.value)} required /></label>
        <button className="primary wide" disabled={saving || loadingModels || !hasSelectableModels}>{saving ? t("creating") : loadingModels ? t("loading") : t("createAgent")}</button>
      </form>
    </div>
  );
}
