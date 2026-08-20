import { useEffect, useState } from "react";

const STORAGE_KEY = "sidebar-collapsed";

/** Whether the primary sidebar renders as an icon-only rail instead of its
 * full width, persisted across sessions. Shared between the dashboard
 * sidebar and the workspace sidebar - both render the same Brand/
 * SidebarFooter chrome, so one toggle state covers either. */
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
