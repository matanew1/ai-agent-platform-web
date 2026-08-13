export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function sessionTitle(text: string): string {
  return text.trim().slice(0, 32) || "New conversation";
}
