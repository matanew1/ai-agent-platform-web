/**
 * A short, locale-aware description for a model picker option.
 *
 * The backend model catalog only returns provider-native ids (e.g.
 * "qwen3:8b") - no family/size metadata (see modules/model/src/model/schemas.py).
 * Ollama tags encode that in the id itself (family prefix, ":size" suffix), so
 * this reads it from the id rather than requiring a backend change; anything
 * that doesn't match a known family falls back to a generic blurb.
 */

import type { useI18n } from "../../shared/i18n/I18nProvider";

type Translator = ReturnType<typeof useI18n>["t"];

const FAMILY_PATTERNS: [RegExp, string][] = [
  [/^qwen/i, "Qwen"],
  [/^(meta-)?llama/i, "Llama"],
  [/^mixtral/i, "Mixtral"],
  [/^mistral/i, "Mistral"],
  [/^gemma/i, "Gemma"],
  [/^phi/i, "Phi"],
  [/^deepseek/i, "DeepSeek"],
  [/^codellama/i, "Code Llama"],
  [/^granite/i, "Granite"],
  [/^bge/i, "BGE"],
];

export function describeModel(modelId: string, t: Translator): string {
  const [namePart, tag] = modelId.split(":");
  const sizeMatch = tag?.match(/(\d+(?:\.\d+)?[bBmM])\b/);
  const family = FAMILY_PATTERNS.find(([pattern]) => pattern.test(namePart ?? ""))?.[1];
  if (!family) return t("modelDescriptionGenericFallback");
  return sizeMatch
    ? t("modelDescriptionSized", { family, size: sizeMatch[1].toUpperCase() })
    : t("modelDescriptionUnsized", { family });
}
