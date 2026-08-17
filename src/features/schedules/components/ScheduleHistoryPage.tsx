import { ArrowLeft, Clock, Trash2 } from "lucide-react";

import { DashboardSidebar, type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { AssistantMessageContent } from "../../chat/components/AssistantMessageContent";
import type { Session } from "../../chat/types";
import { Avatar } from "../../../shared/ui/Avatar";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import type { Agent } from "../../agents/types";
import { describeCron } from "../cronPresets";
import { formatRelative } from "../formatRelative";
import type { Schedule } from "../types";

type ScheduleHistoryPageProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  agent: Agent | null;
  schedule: Schedule | null;
  session: Session | null;
  loading: boolean;
  deleting: string | null;
  error: string | null;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
  onBack: () => void;
  onToggle: () => void;
  onDelete: () => void;
};

/** A read-only history view for one schedule's runs - deliberately not the
 * chat workspace: there is no composer here, nothing is live or editable
 * beyond enable/disable and delete, and the route (`/schedules/:id`) is a
 * sibling of `/agents/:slug`, not nested under it, so a schedule's run log
 * stays reachable and shareable independent of the agent workspace UI.
 *
 * The backend only retains the most recent run per schedule
 * (`Schedule.last_run_session_id`/`last_run_at` - see
 * automation.service.ScheduleService.record_run), so "history" here is
 * really "the latest run" today; the layout (a list of run entries) is
 * shaped to extend to true multi-run history without a rewrite once the
 * backend persists more than one. */
export function ScheduleHistoryPage({
  identity,
  connected,
  agent,
  schedule,
  session,
  loading,
  deleting,
  error,
  onSignOut,
  onNavigate,
  onBack,
  onToggle,
  onDelete,
}: ScheduleHistoryPageProps) {
  const { t, locale } = useI18n();

  const requestDelete = () => {
    if (!agent || !schedule) return;
    if (window.confirm(t("deleteScheduleConfirm", { agent: agent.name, cron: describeCron(schedule.cron_expression, t) }))) {
      onDelete();
    }
  };

  return (
    <section className="dashboard-layout">
      <DashboardSidebar
        identity={identity}
        connected={connected}
        activeDestination="schedules"
        onSignOut={onSignOut}
        onNavigate={onNavigate}
      />
      <div className="dashboard-main schedule-history-page">
        <header className="dashboard-header">
          <div>
            <button type="button" className="schedule-history-back" onClick={onBack}>
              <ArrowLeft size={14} /> {t("schedules")}
            </button>
            {agent && schedule ? (
              <div className="schedule-history-title">
                <Avatar name={agent.name} />
                <div>
                  <h1>{agent.name}</h1>
                  <p>{describeCron(schedule.cron_expression, t)}</p>
                </div>
                <span className={`schedule-status-pill ${schedule.enabled ? "on" : ""}`}>
                  {schedule.enabled ? t("enabled") : t("disabledLabel")}
                </span>
              </div>
            ) : (
              <h1>{t("schedules")}</h1>
            )}
          </div>
          {schedule && (
            <div className="dashboard-actions">
              <button type="button" className="schedule-toggle" aria-pressed={schedule.enabled} onClick={onToggle}>
                {schedule.enabled ? t("disableSchedule") : t("enableSchedule")}
              </button>
              <button type="button" className="danger" disabled={deleting === schedule.id} onClick={requestDelete}>
                <Trash2 size={14} /> {t("deleteSchedule")}
              </button>
            </div>
          )}
        </header>

        <div className="schedule-history-content">
          {error && <p className="panel-footnote warning">{error}</p>}
          {loading ? (
            <p className="panel-footnote">{t("loadingSchedules")}</p>
          ) : !schedule || !agent ? (
            <div className="management-empty">
              <span className="empty-mark"><Clock size={20} /></span>
              <h2>{t("noSchedules")}</h2>
            </div>
          ) : (
            <>
              <div className="schedule-history-message">
                <p className="inspector-kicker">{t("triggerMessage")}</p>
                <p>{schedule.trigger_message}</p>
              </div>
              <p className="inspector-kicker schedule-history-runs-heading">
                {t("viewRunLog")}
                {schedule.last_run_at && <span>{t("lastRun", { time: formatRelative(schedule.last_run_at, locale) })}</span>}
              </p>
              {!session ? (
                <div className="management-empty">
                  <span className="empty-mark"><Clock size={20} /></span>
                  <h2>{t("noRunsYet")}</h2>
                </div>
              ) : (
                <div className="schedule-run-log">
                  {session.messages.map((message) => (
                    <article className={`message ${message.role}`} key={message.id}>
                      {message.role === "assistant" && <span className="message-avatar message-avatar-assistant" aria-label={agent.name}>{agent.name.slice(0, 1)}</span>}
                      <div className="message-body">
                        <div className="bubble" dir="auto">
                          {message.role === "assistant" ? <AssistantMessageContent content={message.content} /> : message.content}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
