import { FormEvent, useState } from "react";
import { Clock, Trash2 } from "lucide-react";

import type { Schedule } from "../types";
import { useI18n } from "../../../shared/i18n/I18nProvider";

type SchedulePanelProps = {
  schedules: Schedule[];
  loading: boolean;
  deleting: string | null;
  onCreate: (values: { cron_expression: string; trigger_message: string }) => Promise<unknown>;
  onToggle: (scheduleId: string, enabled: boolean) => void;
  onDelete: (scheduleId: string) => void;
};

export function SchedulePanel({ schedules, loading, deleting, onCreate, onToggle, onDelete }: SchedulePanelProps) {
  const { t } = useI18n();
  const [cronExpression, setCronExpression] = useState("");
  const [triggerMessage, setTriggerMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await onCreate({ cron_expression: cronExpression, trigger_message: triggerMessage });
      if (!created) {
        setCreateError(t("scheduleCreateFailed"));
        return;
      }
      setCronExpression("");
      setTriggerMessage("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="inspector-content schedule-panel">
      <form className="schedule-form" onSubmit={submit}>
        <label>
          {t("cronExpression")}
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
        <button className="primary wide" disabled={creating || !cronExpression.trim() || !triggerMessage.trim()}>
          {creating ? t("creatingSchedule") : t("createSchedule")}
        </button>
      </form>

      {loading ? (
        <p className="panel-footnote">{t("loadingSchedules")}</p>
      ) : schedules.length === 0 ? (
        <div className="documents-empty">
          <div className="upload-mark"><Clock size={20} /></div>
          <h3>{t("noSchedules")}</h3>
          <p>{t("noSchedulesHint")}</p>
        </div>
      ) : (
        <div className="document-list schedule-list">
          {schedules.map((schedule) => (
            <div key={schedule.id}>
              <span><Clock size={14} /></span>
              <p>
                <strong dir="ltr">{schedule.cron_expression}</strong>
                <small>
                  {schedule.enabled
                    ? t("nextRun", { time: formatRelativeTime(schedule.next_run_at) })
                    : t("scheduleDisabled")}
                  {schedule.last_run_at ? ` · ${t("lastRun", { time: formatRelativeTime(schedule.last_run_at) })}` : ""}
                </small>
              </p>
              <button
                type="button"
                className="schedule-toggle"
                aria-pressed={schedule.enabled}
                title={schedule.enabled ? t("disableSchedule") : t("enableSchedule")}
                onClick={() => onToggle(schedule.id, !schedule.enabled)}
              >
                {schedule.enabled ? t("enabled") : t("disabledLabel")}
              </button>
              <button
                type="button"
                disabled={deleting === schedule.id}
                aria-label={t("deleteSchedule")}
                onClick={() => onDelete(schedule.id)}
              >
                {deleting === schedule.id ? "…" : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="panel-footnote">{t("scheduleHint")}</p>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return iso;
  const diffMinutes = Math.round((target - Date.now()) / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (absMinutes < 60) return formatter.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  return formatter.format(Math.round(diffHours / 24), "day");
}
