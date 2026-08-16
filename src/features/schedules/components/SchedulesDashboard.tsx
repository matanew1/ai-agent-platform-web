import { useMemo, useState } from "react";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";

import { DashboardSidebar, type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { Avatar } from "../../../shared/ui/Avatar";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import type { Agent } from "../../agents/types";
import { describeCron } from "../cronPresets";
import type { Schedule, ScheduleChanges } from "../types";
import { ScheduleModal } from "./ScheduleModal";

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
  onUpdate: (agentId: string, scheduleId: string, changes: ScheduleChanges) => Promise<unknown>;
  onToggle: (agentId: string, scheduleId: string, enabled: boolean) => Promise<unknown>;
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
  onUpdate,
  onToggle,
  onDelete,
}: SchedulesDashboardProps) {
  const { t, locale } = useI18n();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<{ agent: Agent; schedule: Schedule } | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const toggle = async (agentId: string, schedule: Schedule) => {
    setToggling(schedule.id);
    try {
      await onToggle(agentId, schedule.id, !schedule.enabled);
    } finally {
      setToggling(null);
    }
  };

  const entries = useMemo(() => agents.flatMap((agent, agentIndex) => (
    (schedulesByAgent[agent.id] || []).map((schedule) => ({ agent, agentIndex, schedule }))
  )).sort((left, right) => Date.parse(left.schedule.next_run_at) - Date.parse(right.schedule.next_run_at)), [agents, schedulesByAgent]);

  const activeCount = entries.filter(({ schedule }) => schedule.enabled).length;
  const summary = loading
    ? t("loadingSchedules")
    : t("scheduleSummary", { active: String(activeCount), total: String(entries.length), agents: String(agents.length) });

  const requestDelete = (agent: Agent, schedule: Schedule) => {
    if (window.confirm(t("deleteScheduleConfirm", { agent: agent.name, cron: describeCron(schedule.cron_expression, t) }))) {
      onDelete(agent.id, schedule.id);
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
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{t("schedules")}</h1>
            <p>{summary}</p>
          </div>
          <div className="dashboard-actions">
            <button className="primary" type="button" disabled={!agents.length} onClick={() => setShowCreate(true)}>
              <Plus size={15} /> {t("newSchedule")}
            </button>
          </div>
        </header>

        {error && <p className="panel-footnote warning schedule-dashboard-error">{error}</p>}

        <div className="schedule-grid">
          {!loading && entries.length === 0 && (
            <section className="workspace-onboarding">
              <span className="workspace-onboarding-mark"><Sparkles size={20} /></span>
              <div>
                <p className="eyebrow">{t("startHere")}</p>
                <h2>{t("noSchedules")}</h2>
                <p>{t("noSchedulesHint")}</p>
              </div>
              <button className="primary" type="button" disabled={!agents.length} onClick={() => setShowCreate(true)}>
                {t("newSchedule")} <Plus size={15} />
              </button>
            </section>
          )}

          {loading && entries.length === 0 && Array.from({ length: 3 }).map((_, i) => (
            <div className="schedule-card skeleton-card" key={i} aria-hidden="true">
              <div className="skeleton-block" style={{ width: "32px", height: "32px", borderRadius: "8px" }} />
              <div className="skeleton-block skeleton-line-sm" style={{ marginTop: 12 }} />
              <div className="skeleton-block skeleton-line-md" style={{ height: "10px", width: "60%", marginTop: 8 }} />
            </div>
          ))}

          {entries.map(({ agent, agentIndex, schedule }) => (
            <article className={`schedule-card ${schedule.enabled ? "" : "schedule-card-paused"}`} key={`${agent.id}:${schedule.id}`}>
              <header className="schedule-card-head">
                <Avatar name={agent.name} tone={agentIndex} />
                <div>
                  <div className="agent-card-title">
                    <h2>{agent.name}</h2>
                    {schedule.enabled && <i />}
                  </div>
                  <small>{describeCron(schedule.cron_expression, t)}</small>
                </div>
                <span className={`schedule-status-pill ${schedule.enabled ? "on" : ""}`}>
                  {schedule.enabled ? t("enabled") : t("disabledLabel")}
                </span>
              </header>
              <p>{schedule.trigger_message}</p>
              <footer>
                <span>
                  {schedule.enabled
                    ? t("nextRun", { time: formatRelative(schedule.next_run_at, locale) })
                    : t("scheduleDisabled")}
                </span>
                {schedule.last_run_at && <span>{t("lastRun", { time: formatRelative(schedule.last_run_at, locale) })}</span>}
              </footer>
              <div className="schedule-card-actions">
                <button
                  type="button"
                  className="schedule-toggle"
                  aria-pressed={schedule.enabled}
                  disabled={toggling === schedule.id}
                  title={schedule.enabled ? t("disableSchedule") : t("enableSchedule")}
                  onClick={() => toggle(agent.id, schedule)}
                >
                  {schedule.enabled ? t("disableSchedule") : t("enableSchedule")}
                </button>
                <span className="schedule-card-icon-actions">
                  <button
                    type="button"
                    className="schedule-icon-button"
                    aria-label={t("editScheduleFor", { agent: agent.name })}
                    onClick={() => setEditing({ agent, schedule })}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="schedule-icon-button schedule-icon-button-danger"
                    disabled={deleting === schedule.id}
                    aria-label={t("deleteScheduleFor", { agent: agent.name })}
                    onClick={() => requestDelete(agent, schedule)}
                  >
                    {deleting === schedule.id ? "…" : <Trash2 size={14} />}
                  </button>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {showCreate && (
        <ScheduleModal
          agents={agents}
          defaultAgentId={agents[0]?.id || ""}
          error={error}
          onClose={() => setShowCreate(false)}
          onCreate={onCreate}
        />
      )}

      {editing && (
        <ScheduleModal
          agents={agents}
          defaultAgentId={editing.agent.id}
          schedule={editing.schedule}
          scheduleAgentName={editing.agent.name}
          error={error}
          onClose={() => setEditing(null)}
          onUpdate={(values) => onUpdate(editing.agent.id, editing.schedule.id, values)}
        />
      )}
    </section>
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
