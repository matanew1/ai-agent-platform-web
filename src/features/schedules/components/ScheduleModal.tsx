import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";

import type { Agent } from "../../agents/types";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { CRON_PRESETS, CUSTOM_PRESET, describeCron, presetIdForCron } from "../cronPresets";
import type { Schedule } from "../types";

type ScheduleModalProps = {
  agents: Agent[];
  defaultAgentId: string;
  /** Present for edit mode; absent for create mode. The agent a schedule
   * belongs to can't change after creation (see automation.controller's
   * per-agent scoping), so editing only ever touches cron/message. */
  schedule?: Schedule;
  scheduleAgentName?: string;
  error: string | null;
  onClose: () => void;
  onCreate?: (agentId: string, values: { cron_expression: string; trigger_message: string }) => Promise<unknown>;
  onUpdate?: (values: { cron_expression: string; trigger_message: string }) => Promise<unknown>;
};

export function ScheduleModal({
  agents,
  defaultAgentId,
  schedule,
  scheduleAgentName,
  error,
  onClose,
  onCreate,
  onUpdate,
}: ScheduleModalProps) {
  const { t } = useI18n();
  const editing = schedule !== undefined;
  const [agentId, setAgentId] = useState(defaultAgentId);
  const [presetId, setPresetId] = useState(presetIdForCron(schedule?.cron_expression || CRON_PRESETS[1].cron));
  const [cronExpression, setCronExpression] = useState(schedule?.cron_expression || CRON_PRESETS[1].cron);
  const [triggerMessage, setTriggerMessage] = useState(schedule?.trigger_message || "");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  // onCreate/onUpdate set the hook's error state as a side effect of the
  // same call this awaits, but that state update lands in the *next*
  // render - reading the `error` prop synchronously right after `await`
  // below would see the value from the render that started this submit,
  // not the fresh one. Mirroring it via effect picks up the real message
  // once the parent actually re-renders with it.
  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  const selectPreset = (id: string) => {
    setPresetId(id);
    const preset = CRON_PRESETS.find((candidate) => candidate.id === id);
    if (preset) setCronExpression(preset.cron);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing && !agentId) return;
    setSaving(true);
    setLocalError(null);
    try {
      const values = { cron_expression: cronExpression, trigger_message: triggerMessage };
      const result = editing ? await onUpdate?.(values) : await onCreate?.(agentId, values);
      if (!result) {
        setLocalError((current) => current || t("scheduleCreateFailed"));
        return;
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title" onSubmit={submit}>
        <button type="button" className="close" onClick={onClose} aria-label={t("close")}><X size={20} /></button>
        <p className="eyebrow">{t("schedules")}</p>
        <h2 id="schedule-modal-title">{editing ? t("editSchedule") : t("scheduleHint")}</h2>
        {editing ? (
          <p className="schedule-modal-agent">{scheduleAgentName}</p>
        ) : (
          <label htmlFor="schedule-modal-agent">
            {t("agentForSchedule")}
            <select id="schedule-modal-agent" dir="ltr" autoFocus value={agentId} disabled={saving || !agents.length} onChange={(event) => setAgentId(event.target.value)}>
              {!agents.length && <option value="">{t("noAgents")}</option>}
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
        )}
        <label htmlFor="schedule-modal-preset">
          {t("cronExpression")}
          <select id="schedule-modal-preset" dir="ltr" autoFocus={editing} value={presetId} disabled={saving} onChange={(event) => selectPreset(event.target.value)}>
            {CRON_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{t(preset.labelKey)}</option>)}
            <option value={CUSTOM_PRESET}>{t("presetCustom")}</option>
          </select>
        </label>
        {presetId === CUSTOM_PRESET && (
          <label>
            {t("customCronExpression")}
            <input dir="ltr" value={cronExpression} maxLength={120} placeholder={t("cronExpressionPlaceholder")} disabled={saving} onChange={(event) => setCronExpression(event.target.value)} required />
          </label>
        )}
        <p className="schedule-preview">{describeCron(cronExpression, t)}</p>
        <label>
          {t("triggerMessage")}
          <textarea dir="auto" value={triggerMessage} maxLength={8000} placeholder={t("triggerMessagePlaceholder")} disabled={saving} onChange={(event) => setTriggerMessage(event.target.value)} required />
        </label>
        {localError && <p className="panel-footnote warning">{localError}</p>}
        <button className="primary wide" disabled={saving || (!editing && !agentId) || !cronExpression.trim() || !triggerMessage.trim()}>
          {saving ? t("creatingSchedule") : editing ? t("saveConfiguration") : t("createSchedule")}
        </button>
      </form>
    </div>
  );
}
