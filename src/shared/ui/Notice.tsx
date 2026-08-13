type NoticeProps = { message: string; onDismiss: () => void };

export function Notice({ message, onDismiss }: NoticeProps) {
  const { t } = useI18n();
  return (
    <div className="notice" role="alert">
      <span>{message}</span>
      <button onClick={onDismiss}>{t("dismiss")}</button>
    </div>
  );
}
import { useI18n } from "../i18n/I18nProvider";
