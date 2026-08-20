import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { getErrorMessage } from "../../../shared/lib/errors";
import { useI18n } from "../../../shared/i18n/I18nProvider";
import { submitFeedback, type FeedbackCategory } from "../api";

type FeedbackModalProps = {
  onClose: () => void;
};

/** A lightweight bug-report / feedback form - one message, one category, the
 * current route for triage context (see feedback.schemas.CreateFeedbackRequest). */
export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { t } = useI18n();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && !sending && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, sending]);

  const submit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await submitFeedback(category, message.trim(), window.location.pathname);
      setSent(true);
    } catch (reason) {
      setError(getErrorMessage(reason, "Could not send this. Try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !sending && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <button type="button" className="close" onClick={onClose} disabled={sending} aria-label={t("close")}><X size={20} /></button>
        <p className="eyebrow">{t("feedbackAndSupport")}</p>
        {sent ? (
          <>
            <h2 id="feedback-title">{t("feedbackSentTitle")}</h2>
            <p className="settings-note">{t("feedbackSentBody")}</p>
            <button className="primary wide" type="button" onClick={onClose}>{t("close")}</button>
          </>
        ) : (
          <>
            <h2 id="feedback-title">{t("sendFeedback")}</h2>
            <div className="feedback-category">
              <button type="button" className={category === "bug" ? "active" : ""} onClick={() => setCategory("bug")}>{t("reportABug")}</button>
              <button type="button" className={category === "feedback" ? "active" : ""} onClick={() => setCategory("feedback")}>{t("generalFeedback")}</button>
            </div>
            <label>
              {category === "bug" ? t("bugMessageLabel") : t("feedbackMessageLabel")}
              <textarea dir="auto" value={message} maxLength={4000} disabled={sending} onChange={(event) => setMessage(event.target.value)} required autoFocus />
            </label>
            {error && <p className="panel-footnote warning">{error}</p>}
            <button className="primary wide" type="button" disabled={!message.trim() || sending} onClick={() => void submit()}>
              {sending ? t("sending") : t("send")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
