import { Check, Languages, Moon, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { ManagementPage } from "../../../components/layout/ManagementPage";
import type { AppSettings, Locale, Theme } from "../../../shared/hooks/useAppSettings";
import { useI18n } from "../../../shared/i18n/I18nProvider";

type Props = {
  identity: WorkspaceIdentity; connected: boolean; settings: AppSettings;
  onChange: (next: AppSettings) => void; onReset: () => void;
  onSignOut?: () => void; onNavigate: (destination: DashboardDestination) => void;
};

export function SettingsDashboard({ identity, connected, settings, onChange, onReset, onSignOut, onNavigate }: Props) {
  const { t } = useI18n();
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <ManagementPage identity={identity} connected={connected} activeDestination="settings" title={t("settingsTitle")} summary={t("settingsSummary")} onSignOut={onSignOut} onNavigate={onNavigate}>
      <div className="settings-grid">
        <SettingsCard icon={<Moon size={17} />} title={t("appearance")} description={t("appearanceDescription")}>
          <Segmented label={t("theme")} value={settings.theme} values={["dark", "light", "system"]} labels={{ dark: t("dark"), light: t("light"), system: t("system") }} onChange={(value) => set("theme", value as Theme)} />
          <Toggle label={t("compactLayout")} detail={t("compactLayoutDetail")} enabled={settings.compact} onChange={(value) => set("compact", value)} />
          <Toggle label={t("reduceMotion")} detail={t("reduceMotionDetail")} enabled={settings.reduceMotion} onChange={(value) => set("reduceMotion", value)} />
        </SettingsCard>
        <SettingsCard icon={<Languages size={17} />} title={t("workspaceSettings")} description={t("workspaceDescription")}>
          <Segmented label={t("language")} value={settings.locale} values={["en", "he"]} labels={{ en: t("english"), he: t("hebrew") }} onChange={(value) => set("locale", value as Locale)} />
          <p className="settings-note">{t("hebrewHint")}</p>
        </SettingsCard>
        <SettingsCard icon={<ShieldCheck size={17} />} title={t("privacy")} description={t("privacyDescription")}>
          <Toggle label={t("showSources")} detail={t("showSourcesDetail")} enabled={settings.showSources} onChange={(value) => set("showSources", value)} />
          <Toggle label={t("showToolActivity")} detail={t("showToolActivityDetail")} enabled={settings.showToolActivity} onChange={(value) => set("showToolActivity", value)} />
          <button className="settings-reset" type="button" onClick={() => { if (window.confirm(t("resetSettingsConfirm"))) onReset(); }}>{t("resetSettings")}</button>
        </SettingsCard>
      </div>
    </ManagementPage>
  );
}

function SettingsCard({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <section className="settings-card"><header><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div></header>{children}</section>;
}
function Toggle({ label, detail, enabled, onChange }: { label: string; detail: string; enabled: boolean; onChange: (next: boolean) => void }) {
  return <label className="settings-toggle"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={enabled} onChange={(event) => onChange(event.target.checked)} /></label>;
}
function Segmented({ label, value, values, labels, onChange }: { label: string; value: string; values: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <div className="settings-segment"><span>{label}</span><div>{values.map((item) => <button className={item === value ? "active" : ""} type="button" key={item} onClick={() => onChange(item)}>{item === value && <Check size={13} />}{labels?.[item] || item}</button>)}</div></div>;
}
