import { Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "../i18n/I18nProvider";

const AVATARS = [
  { id: "cat", label: "cat" },
  { id: "dog", label: "dog" },
  { id: "fox", label: "fox" },
  { id: "penguin", label: "penguin" },
  { id: "koala", label: "koala" },
  { id: "rabbit", label: "rabbit" },
] as const;
type AvatarId = (typeof AVATARS)[number]["id"];
const keyFor = (userId: string) => `ai-platform:${userId}:account-avatar`;
export const accountAvatarChangedEvent = "ai-platform:account-avatar-changed";

function isAvatarId(value: string | null): value is AvatarId {
  return AVATARS.some((avatar) => avatar.id === value);
}

export function accountAvatarSrc(id: AvatarId) {
  return `${import.meta.env.BASE_URL}avatars/${id}.svg`;
}

export function currentAccountAvatar(userId: string): AvatarId {
  const stored = localStorage.getItem(keyFor(userId));
  return isAvatarId(stored) ? stored : "cat";
}

export function AccountAvatar({ name, userId, compact = false }: { name: string; userId: string; compact?: boolean }) {
  const { t } = useI18n();
  const [avatar, setAvatar] = useState<AvatarId>(() => {
    return currentAccountAvatar(userId);
  });
  const [open, setOpen] = useState(false);

  useEffect(() => { localStorage.setItem(keyFor(userId), avatar); }, [avatar, userId]);

  return (
    <div className={`account-avatar-picker ${compact ? "compact" : ""}`}>
      <button className={`account-avatar account-avatar-${avatar}`} type="button" aria-label={t("chooseAvatar")} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <img src={accountAvatarSrc(avatar)} alt="" />
        {!compact && <ChevronDown size={11} aria-hidden="true" />}
      </button>
      {open && (
        <div className="account-avatar-menu" role="menu" aria-label={t("chooseAvatar")}>
          <span>{t("chooseAvatar")}</span>
          <div>
            {AVATARS.map((option) => (
              <button key={option.id} className={`account-avatar account-avatar-${option.id}`} type="button" role="menuitem" aria-label={t("avatarAnimal", { animal: option.label })} onClick={() => { setAvatar(option.id); window.dispatchEvent(new CustomEvent(accountAvatarChangedEvent, { detail: { userId, avatar: option.id } })); setOpen(false); }}>
                <img src={accountAvatarSrc(option.id)} alt="" />
                {avatar === option.id && <Check className="account-avatar-selected" size={13} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
