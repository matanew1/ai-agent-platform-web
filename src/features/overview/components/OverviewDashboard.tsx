import { useMemo, type ReactNode } from "react";
import { Bot, Clock, FileText, MessageSquare, Wrench } from "lucide-react";

import { DashboardSidebar, type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import type { Agent } from "../../agents/types";
import type { Session } from "../../chat/types";
import { sessionActivityByDay, linePaths, toolUsageCounts } from "../charts";
import { useI18n } from "../../../shared/i18n/I18nProvider";

type OverviewDashboardProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  agents: Agent[];
  sessionsByAgent: Record<string, Session[]>;
  totalSessionsByAgent: Record<string, number>;
  sessionCount: number;
  documentCount: number;
  scheduleCount: number;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
  onSelectAgent: (agent: Agent) => void;
};

const CHART_WIDTH = 480;
const CHART_HEIGHT = 96;
const ACTIVITY_DAYS = 14;
const TOP_AGENTS = 6;
const TOP_TOOLS = 6;

/**
 * The workspace's home page - a welcome header plus small, fully client-side
 * analytics (no new backend aggregation endpoint - see features/overview/charts.ts
 * for the derivations and their "bounded by what's already loaded" caveat).
 * Single-hue sequential color throughout (--accent): every chart here answers
 * "how much", never "which category", so no categorical palette is needed
 * (see the dataviz skill's choosing-a-form guidance).
 */
export function OverviewDashboard({
  identity,
  connected,
  agents,
  sessionsByAgent,
  totalSessionsByAgent,
  sessionCount,
  documentCount,
  scheduleCount,
  onSignOut,
  onNavigate,
  onSelectAgent,
}: OverviewDashboardProps) {
  const { t } = useI18n();

  const activity = useMemo(() => sessionActivityByDay(sessionsByAgent, ACTIVITY_DAYS), [sessionsByAgent]);
  const { line, area } = useMemo(() => linePaths(activity, CHART_WIDTH, CHART_HEIGHT), [activity]);
  const peakDay = Math.max(1, ...activity);

  const topAgents = useMemo(() => (
    [...agents]
      .map((agent) => ({ agent, count: totalSessionsByAgent[agent.id] ?? (sessionsByAgent[agent.id] || []).length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_AGENTS)
  ), [agents, sessionsByAgent, totalSessionsByAgent]);
  const maxAgentSessions = Math.max(1, ...topAgents.map((entry) => entry.count));

  const topTools = useMemo(() => toolUsageCounts(sessionsByAgent).slice(0, TOP_TOOLS), [sessionsByAgent]);
  const maxToolCount = Math.max(1, ...topTools.map((entry) => entry.count));

  return (
    <section className="dashboard-layout">
      <DashboardSidebar identity={identity} connected={connected} onSignOut={onSignOut} activeDestination="overview" onNavigate={onNavigate} />
      <div className="dashboard-main">
        <header className="dashboard-header overview-header">
          <div>
            <p className="eyebrow">{t("overview")}</p>
            <h1>{t("welcomeBack", { name: identity.displayName.split(" ")[0] || identity.displayName })}</h1>
            <p>{t("overviewSummary")}</p>
          </div>
        </header>
        <div className="overview-content">
          <div className="overview-kpis">
            <StatTile icon={<Bot size={16} />} label={t("agents")} value={agents.length} />
            <StatTile icon={<MessageSquare size={16} />} label={t("sessions")} value={sessionCount} />
            <StatTile icon={<FileText size={16} />} label={t("documents")} value={documentCount} />
            <StatTile icon={<Clock size={16} />} label={t("schedules")} value={scheduleCount} />
          </div>

          <section className="overview-card">
            <header><h2>{t("recentActivity")}</h2><p>{t("recentActivityHint", { count: String(ACTIVITY_DAYS) })}</p></header>
            {peakDay > 1 || activity.some((value) => value > 0) ? (
              <svg className="activity-chart" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={t("recentActivity")}>
                <path d={area} className="activity-area" />
                <path d={line} className="activity-line" />
              </svg>
            ) : (
              <p className="overview-empty">{t("noRecentActivity")}</p>
            )}
          </section>

          <div className="overview-grid">
            <section className="overview-card">
              <header><h2>{t("sessionsByAgent")}</h2></header>
              {topAgents.length ? (
                <ul className="overview-bars">
                  {topAgents.map(({ agent, count }) => (
                    <li key={agent.id}>
                      <button type="button" onClick={() => onSelectAgent(agent)}>{agent.name}</button>
                      <div className="overview-bar-track"><div className="overview-bar-fill" style={{ width: `${(count / maxAgentSessions) * 100}%` }} /></div>
                      <span>{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="overview-empty">{t("noAgents")}</p>
              )}
            </section>

            <section className="overview-card">
              <header><h2>{t("toolUsage")}</h2></header>
              {topTools.length ? (
                <ul className="overview-bars">
                  {topTools.map(({ name, count }) => (
                    <li key={name}>
                      <span className="overview-tool-name"><Wrench size={12} aria-hidden="true" /> {name}</span>
                      <div className="overview-bar-track"><div className="overview-bar-fill" style={{ width: `${(count / maxToolCount) * 100}%` }} /></div>
                      <span>{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="overview-empty">{t("noToolActivityYet")}</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-glyph" aria-hidden="true">{icon}</span>
      <div>
        <strong>{value.toLocaleString()}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
