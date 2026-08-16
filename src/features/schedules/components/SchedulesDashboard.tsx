import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock, Trash2 } from "lucide-react";

import { type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { ManagementPage } from "../../../components/layout/ManagementPage";
import { Avatar } from "../../../shared/ui/Avatar";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import type { Agent } from "../../agents/types";
import { CRON_PRESETS, CUSTOM_PRESET, describeCron, presetIdForCron } from "../cronPresets";
import type { Schedule } from "../types";

type SchedulesDashboardProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  agents: Agent[];
  schedulesByAgent: Record<string, Schedule[]>;
  loading: boolean;
  deleting: string | null;
  error: string | null;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
  onCreate: (agentId: string, values: { cron_expression: string; trigger_message: string }) => Promise<unknown>;
  onToggle: (agentId: string, scheduleId: string, enabled: boolean) => void;
  onDelete: (agentId: string, scheduleId: string) => void;
};

export function SchedulesDashboard({
  identity,
  connected,
  agents,
  schedulesByAgent,
  loading,
  deleting,
  error,
  onSignOut,
  onNavigate,
  onCreate,
  onToggle,
  onDelete,
}: SchedulesDashboardProps) {
  const { t, locale } = useI18n();
  const [formAgentId, setFormAgentId] = useState(agents[0]?.id || "");
  const [presetId, setPresetId] = useState(presetIdForCron(CRON_PRESETS[1].cron));
  const [cronExpression, setCronExpression] = useState(CRON_PRESETS[1].cron);
  const [triggerMessage, setTriggerMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!agents.some((agent) => agent.id === formAgentId)) setFormAgentId(agents[0]?.id || "");
  }, [agents, formAgentId]);

  const entries = useMemo(() => agents.flatMap((agent, agentIndex) => (
    (schedulesByAgent[agent.id] || []).map((schedule) => ({ agent, agentIndex, schedule }))
  )).sort((left, right) => Date.parse(left.schedule.next_run_at) - Date.parse(right.schedule.next_run_at)), [agents, schedulesByAgent]);

  const summary = loading
    ? t("loadingSchedules")
    : t("scheduleCount", { schedules: String(entries.length), agents: String(agents.length) });

  const selectPreset = (id: string) => {
    setPresetId(id);
    const preset = CRON_PRESETS.find((candidate) => candidate.id === id);
    if (preset) setCronExpression(preset.cron);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formAgentId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await onCreate(formAgentId, { cron_expression: cronExpression, trigger_message: triggerMessage });
      if (!created) {
        setCreateError(error || t("scheduleCreateFailed"));
        return;
      }
      setTriggerMessage("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ManagementPage
      identity={identity}
      connected={connected}
      activeDestination="schedules"
      title={t("schedules")}
      summary={summary}
      onSignOut={onSignOut}
      onNavigate={onNavigate}
    >
      <form className="schedule-form schedule-dashboard-form" onSubmit={submit}>
        <label htmlFor="schedule-dashboard-agent">
          {t("agentForSchedule")}
          <span className="model-select-wrap">
            <select
              id="schedule-dashboard-agent"
              dir="ltr"
              value={formAgentId}
              disabled={!agents.length || creating}
              onChange={(event) => setFormAgentId(event.target.value)}
            >
              {!agents.length && <option value="">{t("noAgents")}</option>}
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
            <span aria-hidden="true">⌄</span>
          </span>
        </label>
        <label htmlFor="schedule-dashboard-preset">
          {t("cronExpression")}
          <span className="model-select-wrap">
            <select
              id="schedule-dashboard-preset"
              dir="ltr"
              value={presetId}
              disabled={creating}
              onChange={(event) => selectPreset(event.target.value)}
            >
              {CRON_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{t(preset.labelKey)}</option>
              ))}
              <option value={CUSTOM_PRESET}>{t("presetCustom")}</option>
            </select>
            <span aria-hidden="true">⌄</span>
          </span>
        </label>
        {presetId === CUSTOM_PRESET && (
          <label>
            {t("customCronExpression")}
            <input
              dir="ltr"
              value={cronExpression}
              maxLength={120}
              placeholder={t("cronExpressionPlaceholder")}
              disabled={creating}
              onChange={(event) => setCronExpression(event.target.value)}
              required
            />
          </label>
        )}
        <p className="panel-footnote">{describeCron(cronExpression, t)}</p>
        <label>
          {t("triggerMessage")}
          <textarea
            dir="auto"
            value={triggerMessage}
            maxLength={8000}
            placeholder={t("triggerMessagePlaceholder")}
            disabled={creating}
            onChange={(event) => setTriggerMessage(event.target.value)}
            required
          />
        </label>
        {createError && <p className="panel-footnote warning">{createError}</p>}
        <button className="primary wide" disabled={creating || !formAgentId || !cronExpression.trim() || !triggerMessage.trim()}>
          {creating ? t("creatingSchedule") : t("createSchedule")}
        </button>
      </form>

      {error && <p className="panel-footnote warning">{error}</p>}

      {loading && entries.length === 0 ? (
        <div className="skeleton">
          <div className="skeleton-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-list-row">
                <div className="skeleton-block" style={{ width: "28px", height: "28px", borderRadius: "6px" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div className="skeleton-block skeleton-line-sm" />
                  <div className="skeleton-block skeleton-line-md" style={{ height: "10px", width: "30%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : entries.length ? (
        <div className="management-list" aria-label={t("schedules")}>
          {entries.map(({ agent, agentIndex, schedule }) => (
            <article className="management-row schedule-management-row" key={`${agent.id}:${schedule.id}`}>
              <span className="schedule-row-open">
                <Avatar name={agent.name} small tone={agentIndex} />
                <span className="management-row-copy">
                  <strong dir="auto">{describeCron(schedule.cron_expression, t)}</strong>
                  <small>
                    {agent.name} ·{" "}
                    {schedule.enabled
                      ? t("nextRun", { time: formatRelative(schedule.next_run_at, locale) })
                      : t("scheduleDisabled")}
                    {schedule.last_run_at ? ` · ${t("lastRun", { time: formatRelative(schedule.last_run_at, locale) })}` : ""}
                  </small>
                </span>
              </span>
              <button
                type="button"
                className="schedule-toggle"
                aria-pressed={schedule.enabled}
                title={schedule.enabled ? t("disableSchedule") : t("enableSchedule")}
                onClick={() => onToggle(agent.id, schedule.id, !schedule.enabled)}
              >
                {schedule.enabled ? t("enabled") : t("disabledLabel")}
              </button>
              <button
                className="row-action danger"
                type="button"
                disabled={deleting === schedule.id}
                aria-label={t("deleteSchedule")}
                onClick={() => onDelete(agent.id, schedule.id)}
              >
                {deleting === schedule.id ? t("deleting") : <Trash2 size={14} />}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="management-empty">
          <span className="empty-mark"><Clock size={20} /></span>
          <h2>{t("noSchedules")}</h2>
          <p>{t("noSchedulesHint")}</p>
        </div>
      )}
    </ManagementPage>
  );
}

function formatRelative(iso: string, locale: string): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return iso;
  const diffMinutes = Math.round((target - Date.now()) / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absMinutes < 60) return formatter.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  return formatter.format(Math.round(diffHours / 24), "day");
}
