import { useEffect, useRef, useState } from "react";
import { getSettings, saveSettings } from "../../features/settings/api";

const keyFor = (userId: string) => `ai-platform:${userId}:settings`;

export type Locale = "en" | "he";
export type Theme = "dark" | "light" | "system";
export type SpeechInputLocale = "auto" | "en" | "he";
export type AppSettings = {
  theme: Theme; locale: Locale; compact: boolean; reduceMotion: boolean;
  showSources: boolean; showToolActivity: boolean;
  highContrast: boolean; autoReadResponses: boolean; sendOnEnter: boolean; sidebarDefaultOpen: boolean;
  englishVoice: string; hebrewVoice: string;
  speechInputLocale: SpeechInputLocale;
};

const defaults: AppSettings = {
  theme: "dark", locale: "en", compact: false, reduceMotion: false,
  showSources: true, showToolActivity: true,
  highContrast: false, autoReadResponses: false, sendOnEnter: true, sidebarDefaultOpen: true,
  englishVoice: "preferred", hebrewVoice: "preferred",
  speechInputLocale: "auto",
};

function initialSettings(userId: string): AppSettings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(keyFor(userId)) ?? "{}") };
  } catch { return defaults; }
}

export function useAppSettings(userId: string) {
  const [settings, setSettings] = useState<AppSettings>(() => initialSettings(userId));
  const hydrated = useRef(false);
  const changedBeforeHydration = useRef(false);
  const userRef = useRef(userId);

  useEffect(() => {
    if (userRef.current === userId) return;
    userRef.current = userId;
    hydrated.current = false;
    changedBeforeHydration.current = false;
    setSettings(initialSettings(userId));
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    void getSettings().then((remote) => {
      if (!cancelled && !changedBeforeHydration.current) setSettings(remote);
    }).catch(() => undefined).finally(() => { hydrated.current = true; });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(keyFor(userId), JSON.stringify(settings));
    const systemLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const light = settings.theme === "light" || (settings.theme === "system" && systemLight);
    document.documentElement.dataset.theme = light ? "light" : "dark";
    document.documentElement.lang = settings.locale;
    document.documentElement.dir = settings.locale === "he" ? "rtl" : "ltr";
    document.documentElement.dataset.density = settings.compact ? "compact" : "comfortable";
    document.documentElement.dataset.motion = settings.reduceMotion ? "reduced" : "full";
    document.documentElement.dataset.contrast = settings.highContrast ? "high" : "normal";
  }, [settings, userId]);

  useEffect(() => {
    if (!hydrated.current) return;
    const timeout = window.setTimeout(() => { void saveSettings(settings).catch(() => undefined); }, 350);
    return () => window.clearTimeout(timeout);
  }, [settings]);

  const updateSettings = (next: AppSettings) => {
    if (!hydrated.current) changedBeforeHydration.current = true;
    setSettings(next);
  };
  const reset = () => updateSettings(defaults);
  return { settings, setSettings: updateSettings, reset };
}
