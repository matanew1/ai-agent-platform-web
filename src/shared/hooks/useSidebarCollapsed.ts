import { useEffect, useState } from "react";

const STORAGE_KEY = "sidebar-collapsed";

/** Whether the primary sidebar renders as an icon-only rail instead of its
 * full width, persisted across sessions. Every page that has a sidebar
 * (every dashboard page and the agent workspace) renders the same
 * DashboardSidebar component, so this one hook covers all of them - there
 * is no separate workspace-specific sidebar left to keep in sync. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return [collapsed, () => setCollapsed((value) => !value)];
}
