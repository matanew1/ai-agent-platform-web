import { useI18n } from "../i18n/I18nProvider";

export function LoadingScreen() {
  const { t } = useI18n();
  return (
    <div className="loading">
      <div className="loading-screen-inner">
        <span className="loading-spinner" />
        <span>{t("connectingWorkspace")}</span>
      </div>
    </div>
  );
}
