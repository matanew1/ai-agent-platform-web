import { useEffect, useState } from "react";

import { DEFAULT_MODEL, DEFAULT_TEMPERATURE } from "../../../shared/config/constants";
import { modelsApi } from "../api";
import type { ModelCatalog } from "../types";

const FALLBACK_MODEL_CATALOG: ModelCatalog = {
  provider: "ollama",
  default_model: DEFAULT_MODEL,
  models: [{ id: DEFAULT_MODEL, label: DEFAULT_MODEL }],
  temperature: { min: 0, max: 2, step: 0.1, default: DEFAULT_TEMPERATURE },
};

export function useModelCatalog() {
  const [catalog, setCatalog] = useState(FALLBACK_MODEL_CATALOG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    modelsApi.catalog(controller.signal)
      .then((response) => setCatalog(normalizeCatalog(response)))
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setCatalog(FALLBACK_MODEL_CATALOG);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { catalog, loading };
}

function normalizeCatalog(catalog: ModelCatalog): ModelCatalog {
  const defaultModel = catalog.default_model?.trim() || DEFAULT_MODEL;
  const models = (Array.isArray(catalog.models) ? catalog.models : [])
    .filter((model) => model && typeof model.id === "string" && model.id.trim())
    .map((model) => ({ id: model.id.trim(), label: model.label?.trim() || model.id.trim() }));

  const min = finiteOr(catalog.temperature?.min, 0);
  const maxCandidate = finiteOr(catalog.temperature?.max, 2);
  const max = maxCandidate > min ? maxCandidate : 2;
  const stepCandidate = finiteOr(catalog.temperature?.step, 0.1);
  const step = stepCandidate > 0 ? stepCandidate : 0.1;
  const defaultTemperature = Math.min(
    max,
    Math.max(min, finiteOr(catalog.temperature?.default, DEFAULT_TEMPERATURE)),
  );

  return {
    provider: catalog.provider?.trim() || "runtime",
    default_model: defaultModel,
    models,
    temperature: { min, max, step, default: defaultTemperature },
  };
}

function finiteOr(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? value as number : fallback;
}
