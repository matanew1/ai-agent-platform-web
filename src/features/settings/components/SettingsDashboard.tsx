import { Check, Languages, MenuSquare, MessageSquareText, Moon, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { ManagementPage } from "../../../components/layout/ManagementPage";
import type { AppSettings, Locale, SpeechInputLocale, Theme } from "../../../shared/hooks/useAppSettings";
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
          <Toggle label={t("highContrast")} detail={t("highContrastDetail")} enabled={settings.highContrast} onChange={(value) => set("highContrast", value)} />
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
        <SettingsCard icon={<MessageSquareText size={17} />} title={t("chatPreferences")} description={t("chatPreferencesDescription")}>
          <Toggle label={t("sendOnEnter")} detail={t("sendOnEnterDetail")} enabled={settings.sendOnEnter} onChange={(value) => set("sendOnEnter", value)} />
          <Segmented label={t("speechInputLanguage")} value={settings.speechInputLocale} values={["auto", "en", "he"]} labels={{ auto: t("speechInputAuto"), en: t("english"), he: t("hebrew") }} onChange={(value) => set("speechInputLocale", value as SpeechInputLocale)} />
          <p className="settings-note">{t("speechInputLanguageHint")}</p>
          <Toggle label={t("autoReadResponses")} detail={t("autoReadResponsesDetail")} enabled={settings.autoReadResponses} onChange={(value) => set("autoReadResponses", value)} />
          <SpeechVoiceSelect label={t("englishVoice")} language="en" value={settings.englishVoice} onChange={(value) => set("englishVoice", value)} />
          <SpeechVoiceSelect label={t("hebrewVoice")} language="he" value={settings.hebrewVoice} onChange={(value) => set("hebrewVoice", value)} />
        </SettingsCard>
        <SettingsCard icon={<MenuSquare size={17} />} title={t("navigation")} description={t("navigationDescription")}>
          <Toggle label={t("sidebarDefaultOpen")} detail={t("sidebarDefaultOpenDetail")} enabled={settings.sidebarDefaultOpen} onChange={(value) => set("sidebarDefaultOpen", value)} />
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

function SpeechVoiceSelect({ label, language, value, onChange }: { label: string; language: "en" | "he"; value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const update = () => setVoices(window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith(language)));
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, [language]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  const available = voices.some((voice) => voice.voiceURI === value);
  const preview = () => {
    if (!("speechSynthesis" in window)) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(language === "he" ? t("voicePreviewHebrew") : t("voicePreviewEnglish"));
    utterance.lang = language === "he" ? "he-IL" : "en-US";
    utterance.voice = voices.find((voice) => voice.voiceURI === value) ?? null;
    utterance.rate = 0.96;
    utterance.pitch = 1.04;
    utterance.onend = utterance.onerror = () => { setPlaying(false); utteranceRef.current = null; };
    utteranceRef.current = utterance;
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  };
  return (
    <div className="settings-select">
      <span>{label}</span>
      <div className="settings-select-control">
        <select value={available || value === "preferred" ? value : "preferred"} onChange={(event) => onChange(event.target.value)}>
          <option value="preferred">{t("preferredVoice")}</option>
          {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}
        </select>
        <button className={`settings-voice-test ${playing ? "playing" : ""}`} type="button" disabled={!voices.length && value !== "preferred"} aria-label={playing ? t("stopVoicePreview") : t("testVoice")} title={playing ? t("stopVoicePreview") : t("testVoice")} onClick={preview}>
          {playing ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>
      <small>{voices.length ? t("voiceSelectionHint") : t("noLocalVoices")}</small>
    </div>
  );
}
