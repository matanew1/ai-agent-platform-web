import { Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "../i18n/I18nProvider";

const AVATARS = ["violet", "blue", "teal", "rose", "amber", "slate"] as const;
const keyFor = (userId: string) => `ai-platform:${userId}:account-avatar`;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}

export function AccountAvatar({ name, userId, compact = false }: { name: string; userId: string; compact?: boolean }) {
  const { t } = useI18n();
  const [avatar, setAvatar] = useState<(typeof AVATARS)[number]>(() => {
    const stored = localStorage.getItem(keyFor(userId));
    return AVATARS.includes(stored as (typeof AVATARS)[number]) ? stored as (typeof AVATARS)[number] : "violet";
  });
  const [open, setOpen] = useState(false);

  useEffect(() => { localStorage.setItem(keyFor(userId), avatar); }, [avatar, userId]);

  return (
    <div className={`account-avatar-picker ${compact ? "compact" : ""}`}>
      <button className={`account-avatar account-avatar-${avatar}`} type="button" aria-label={t("chooseAvatar")} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {initials(name)}
        {!compact && <ChevronDown size={11} aria-hidden="true" />}
      </button>
      {open && (
        <div className="account-avatar-menu" role="menu" aria-label={t("chooseAvatar")}>
          <span>{t("chooseAvatar")}</span>
          <div>
            {AVATARS.map((option) => (
              <button key={option} className={`account-avatar account-avatar-${option}`} type="button" role="menuitem" aria-label={t("avatarColor", { color: option })} onClick={() => { setAvatar(option); setOpen(false); }}>
                {avatar === option ? <Check size={13} /> : initials(name)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
