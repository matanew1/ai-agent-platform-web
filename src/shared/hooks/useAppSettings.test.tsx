import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../features/settings/api", () => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn().mockResolvedValue(undefined),
}));

import { getSettings } from "../../features/settings/api";
import { useAppSettings } from "./useAppSettings";

describe("useAppSettings", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(getSettings).mockReset();
  });

  it("keeps browser settings scoped to the signed-in user", async () => {
    vi.mocked(getSettings).mockResolvedValue({ theme: "dark", locale: "en", compact: false, reduceMotion: false, showSources: true, showToolActivity: true, highContrast: false, autoReadResponses: false, sendOnEnter: true, sidebarDefaultOpen: true, englishVoice: "preferred", hebrewVoice: "preferred", speechInputLocale: "auto" });
    const { result } = renderHook(() => useAppSettings("user-a"));

    await waitFor(() => expect(getSettings).toHaveBeenCalled());
    act(() => result.current.setSettings({ ...result.current.settings, locale: "he" }));

    expect(localStorage.getItem("ai-platform:user-a:settings")).toContain('"locale":"he"');
    expect(localStorage.getItem("ai-platform:user-b:settings")).toBeNull();
  });

  it("does not overwrite a local edit while the initial request is pending", async () => {
    let resolveRemote!: (value: Awaited<ReturnType<typeof getSettings>>) => void;
    vi.mocked(getSettings).mockReturnValue(new Promise((resolve) => { resolveRemote = resolve; }));
    const { result } = renderHook(() => useAppSettings("user-a"));

    act(() => result.current.setSettings({ ...result.current.settings, locale: "he" }));
    await act(async () => resolveRemote({ theme: "light", locale: "en", compact: false, reduceMotion: false, showSources: false, showToolActivity: false, highContrast: false, autoReadResponses: false, sendOnEnter: true, sidebarDefaultOpen: true, englishVoice: "preferred", hebrewVoice: "preferred", speechInputLocale: "auto" }));

    expect(result.current.settings.locale).toBe("he");
  });
});
