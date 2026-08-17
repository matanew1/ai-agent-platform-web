import { FormEvent, useEffect, useRef, useState } from "react";
import { FlaskConical, X } from "lucide-react";

import { deleteSession, streamChat } from "../../chat/api";
import type { Agent } from "../../agents/types";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { CRON_PRESETS, CUSTOM_PRESET, describeCron, presetIdForCron } from "../cronPresets";
import type { CreateScheduleValues, Schedule, ScheduleChanges } from "../types";

type ScheduleModalProps = {
  agents: Agent[];
  defaultAgentId: string;
  /** Present for edit mode; absent for create mode. The agent a schedule
   * belongs to can't change after creation (see automation.controller's
   * per-agent scoping), so editing only ever touches cron/message/tools. */
  schedule?: Schedule;
  scheduleAgentName?: string;
  error: string | null;
  onClose: () => void;
  onCreate?: (agentId: string, values: CreateScheduleValues) => Promise<unknown>;
  onUpdate?: (values: ScheduleChanges) => Promise<unknown>;
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
  const [title, setTitle] = useState(schedule?.title || "");
  const [description, setDescription] = useState(schedule?.description || "");
  const [presetId, setPresetId] = useState(presetIdForCron(schedule?.cron_expression || CRON_PRESETS[1].cron));
  const [cronExpression, setCronExpression] = useState(schedule?.cron_expression || CRON_PRESETS[1].cron);
  const [triggerMessage, setTriggerMessage] = useState(schedule?.trigger_message || "");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedAgent = agents.find((agent) => agent.id === agentId) || null;
  const agentIsUnrestricted = !selectedAgent?.allowed_tools.length;
  const [selectedTools, setSelectedTools] = useState<string[]>(
    schedule?.tools ?? selectedAgent?.allowed_tools ?? [],
  );

  const [testing, setTesting] = useState(false);
  const [testReply, setTestReply] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const testAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      testAbortRef.current?.abort();
    };
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

  const changeAgent = (id: string) => {
    setAgentId(id);
    const agent = agents.find((candidate) => candidate.id === id);
    setSelectedTools(agent?.allowed_tools ?? []);
  };

  const toggleTool = (toolName: string) => {
    setSelectedTools((current) =>
      current.includes(toolName) ? current.filter((name) => name !== toolName) : [...current, toolName],
    );
  };

  const runTest = async () => {
    if (!agentId || !triggerMessage.trim()) return;
    // Superseding a still-running test (a fast second click, or the
    // component unmounting - see the escape/unmount effect above) aborts
    // it first, so its state updates are suppressed below rather than
    // interleaving with this run's or firing after unmount.
    testAbortRef.current?.abort();
    const controller = new AbortController();
    testAbortRef.current = controller;
    setTesting(true);
    setTestError(null);
    setTestReply("");
    const testSessionId = `test-${crypto.randomUUID()}`;
    try {
      await streamChat({
        agentId,
        sessionId: testSessionId,
        message: triggerMessage,
        files: [],
        tools: agentIsUnrestricted ? undefined : selectedTools,
        signal: controller.signal,
        onChunk: (chunk) => {
          if (controller.signal.aborted) return;
          setTestReply((current) => (current || "") + chunk);
        },
      });
    } catch (reason) {
      if (!controller.signal.aborted) {
        setTestError(reason instanceof Error ? reason.message : "Test message failed.");
      }
    } finally {
      // Only the run that's still current gets to flip `testing` back off -
      // a superseded/aborted run's `finally` must not clobber the state a
      // newer run (or unmount) already moved past.
      if (!controller.signal.aborted) setTesting(false);
      // The test run persists a real session server-side just like an
      // interactive turn does - clean it up regardless of how this run
      // ended, so it never lingers as a stray "test-..." conversation.
      void deleteSession(agentId, testSessionId).catch(() => {
        // Best effort - a leftover test session is harmless clutter, not
        // worth surfacing an error over.
      });
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing && !agentId) return;
    setSaving(true);
    setLocalError(null);
    try {
      const tools = agentIsUnrestricted || selectedTools.length === selectedAgent?.allowed_tools.length
        ? null
        : selectedTools;
      const values = {
        title,
        // Always an explicit value (never omitted): the backend
        // distinguishes an omitted field ("leave it alone") from an
        // explicit null ("clear it") - see ScheduleService's _UnsetType.
        // Sending `undefined` here would get dropped by JSON.stringify,
        // silently no-op'ing an attempt to clear an existing description.
        description: description.trim() || null,
        cron_expression: cronExpression,
        trigger_message: triggerMessage,
        tools,
      };
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
        <label htmlFor="schedule-modal-title-input">
          {t("scheduleTitle")}
          <input
            id="schedule-modal-title-input"
            dir="auto"
            autoFocus
            value={title}
            maxLength={200}
            placeholder={t("scheduleTitlePlaceholder")}
            disabled={saving}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        {editing ? (
          <p className="schedule-modal-agent">{scheduleAgentName}</p>
        ) : (
          <label htmlFor="schedule-modal-agent">
            {t("agentForSchedule")}
            <select id="schedule-modal-agent" dir="ltr" value={agentId} disabled={saving || !agents.length} onChange={(event) => changeAgent(event.target.value)}>
              {!agents.length && <option value="">{t("noAgents")}</option>}
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
        )}
        <label htmlFor="schedule-modal-description">
          {t("scheduleDescription")}
          <textarea
            id="schedule-modal-description"
            dir="auto"
            value={description}
            maxLength={1000}
            placeholder={t("scheduleDescriptionPlaceholder")}
            disabled={saving}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label htmlFor="schedule-modal-preset">
          {t("cronExpression")}
          <select id="schedule-modal-preset" dir="ltr" value={presetId} disabled={saving} onChange={(event) => selectPreset(event.target.value)}>
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
        {selectedAgent && (
          <div className="schedule-tools-field">
            <p className="inspector-kicker">{t("scheduleTools")}</p>
            {agentIsUnrestricted ? (
              <p className="panel-footnote">{t("scheduleToolsUnrestricted")}</p>
            ) : (
              <div className="tool-list">
                {selectedAgent.allowed_tools.map((toolName) => (
                  <label key={toolName}>
                    <span><strong>{toolName}</strong></span>
                    <input type="checkbox" checked={selectedTools.includes(toolName)} disabled={saving} onChange={() => toggleTool(toolName)} />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="schedule-test-block">
          <button
            type="button"
            className="schedule-test-button"
            disabled={testing || !agentId || !triggerMessage.trim()}
            onClick={() => void runTest()}
          >
            <FlaskConical size={14} /> {testing ? t("testingMessage") : t("testMessage")}
          </button>
          {(testReply !== null || testError) && (
            <div className="schedule-test-preview">
              {testError ? <p className="panel-footnote warning">{testError}</p> : <p dir="auto">{testReply || (testing ? t("thinking") : "")}</p>}
            </div>
          )}
        </div>
        {localError && <p className="panel-footnote warning">{localError}</p>}
        <button className="primary wide" disabled={saving || (!editing && !agentId) || !title.trim() || !cronExpression.trim() || !triggerMessage.trim()}>
          {saving ? t("creatingSchedule") : editing ? t("saveConfiguration") : t("createSchedule")}
        </button>
      </form>
    </div>
  );
}
