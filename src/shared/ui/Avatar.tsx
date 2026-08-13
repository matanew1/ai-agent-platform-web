import { initials } from "../lib/format";

type AvatarProps = { name: string; small?: boolean; tone?: number };

export function Avatar({ name, small = false, tone }: AvatarProps) {
  const classes = ["avatar", small && "small", tone !== undefined && `tone-${tone % 4}`]
    .filter(Boolean)
    .join(" ");
  return <span className={classes}>{initials(name)}</span>;
}
