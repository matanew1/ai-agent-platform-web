import { initials } from "../lib/format";

type AccountAvatarProps = {
  name: string;
  /** A real photo from the auth provider (WorkOS AuthKit), when it has one.
   * Falls back to the account's initials when there isn't one. */
  avatarUrl?: string | null;
};

/** The signed-in account's avatar - a WorkOS profile photo when one exists,
 * otherwise the account's initials, sized and shaped by the ancestor-scoped
 * `.account-avatar` rules in styles.css (sidebar footer, profile page, chat
 * bubbles all render this at different sizes via that same class). */
export function AccountAvatar({ name, avatarUrl }: AccountAvatarProps) {
  if (avatarUrl) {
    return (
      <span className="account-avatar account-avatar-photo">
        <img src={avatarUrl} alt={name} referrerPolicy="no-referrer" />
      </span>
    );
  }
  return <span className="account-avatar account-avatar-initials">{initials(name)}</span>;
}
