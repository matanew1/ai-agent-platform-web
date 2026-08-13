import { apiRequest } from "../../shared/api/client";
import type { AppSettings } from "../../shared/hooks/useAppSettings";

type ApiSettings = {
  theme: AppSettings["theme"]; locale: AppSettings["locale"]; compact: boolean;
  reduce_motion: boolean; show_sources: boolean; show_tool_activity: boolean;
};

const toApp = (value: ApiSettings): AppSettings => ({
  theme: value.theme, locale: value.locale, compact: value.compact,
  reduceMotion: value.reduce_motion, showSources: value.show_sources,
  showToolActivity: value.show_tool_activity,
});
const toApi = (value: AppSettings): ApiSettings => ({
  theme: value.theme, locale: value.locale, compact: value.compact,
  reduce_motion: value.reduceMotion, show_sources: value.showSources,
  show_tool_activity: value.showToolActivity,
});

export async function getSettings() { return toApp(await apiRequest<ApiSettings>("/settings")); }
export async function saveSettings(settings: AppSettings) {
  return toApp(await apiRequest<ApiSettings>("/settings", { method: "PUT", body: JSON.stringify(toApi(settings)) }));
}
