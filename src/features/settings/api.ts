import { apiRequest } from "../../shared/api/client";
import type { AppSettings } from "../../shared/hooks/useAppSettings";

type ApiSettings = {
  theme: AppSettings["theme"]; locale: AppSettings["locale"]; compact: boolean;
  reduce_motion: boolean; show_sources: boolean; show_tool_activity: boolean;
  high_contrast: boolean; auto_read_responses: boolean; send_on_enter: boolean; sidebar_default_open: boolean;
  speech_voice_en: string; speech_voice_he: string;
  speech_input_locale: "auto" | "en" | "he";
};

const toApp = (value: ApiSettings): AppSettings => ({
  theme: value.theme, locale: value.locale, compact: value.compact,
  reduceMotion: value.reduce_motion, showSources: value.show_sources,
  showToolActivity: value.show_tool_activity,
  highContrast: value.high_contrast, autoReadResponses: value.auto_read_responses,
  sendOnEnter: value.send_on_enter, sidebarDefaultOpen: value.sidebar_default_open,
  englishVoice: value.speech_voice_en ?? "preferred", hebrewVoice: value.speech_voice_he ?? "preferred",
  speechInputLocale: value.speech_input_locale ?? "auto",
});
const toApi = (value: AppSettings): ApiSettings => ({
  theme: value.theme, locale: value.locale, compact: value.compact,
  reduce_motion: value.reduceMotion, show_sources: value.showSources,
  show_tool_activity: value.showToolActivity,
  high_contrast: value.highContrast, auto_read_responses: value.autoReadResponses,
  send_on_enter: value.sendOnEnter, sidebar_default_open: value.sidebarDefaultOpen,
  speech_voice_en: value.englishVoice, speech_voice_he: value.hebrewVoice,
  speech_input_locale: value.speechInputLocale,
});

export async function getSettings() { return toApp(await apiRequest<ApiSettings>("/settings")); }
export async function saveSettings(settings: AppSettings) {
  return toApp(await apiRequest<ApiSettings>("/settings", { method: "PUT", body: JSON.stringify(toApi(settings)) }));
}
