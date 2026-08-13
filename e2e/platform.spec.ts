import { expect, test, type Page } from "@playwright/test";

const agent = {
  id: "cv-expert", name: "CV Expert", description: "Reviews CVs for hiring systems.",
  system_prompt: "You are a helpful CV expert.", allowed_tools: ["extract_pdf"], model: "qwen3:8b", temperature: 0.3,
  version: 1, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

const settings = {
  theme: "dark", locale: "en", compact: false, reduce_motion: false, show_sources: true, show_tool_activity: true,
  high_contrast: false, auto_read_responses: false, send_on_enter: true, sidebar_default_open: true,
  speech_voice_en: "preferred", speech_voice_he: "preferred",
};

async function mockPlatform(page: Page) {
  let savedSettings = { ...settings };
  await page.route("http://localhost:8000/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const respond = (body: unknown, status = 200, headers: Record<string, string> = {}) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers });
    if (path === "/auth/me") return respond({ id: "e2e-user", email: "e2e@example.com", display_name: "E2E User", avatar_url: null });
    if (path === "/settings") {
      if (request.method() === "PUT") savedSettings = JSON.parse(request.postData() || "{}");
      return respond(savedSettings);
    }
    if (path === "/agents") return respond([agent]);
    if (path === "/tools") return respond([{ name: "extract_pdf", description: "Read a PDF", parameters: {} }]);
    if (path === "/models") return respond({ provider: "ollama", default_model: "qwen3:8b", models: [{ id: "qwen3:8b", label: "qwen3:8b" }], temperature: { min: 0, max: 1, step: 0.1, default: 0.3 } });
    if (path === "/documents") return respond([]);
    if (path === `/agents/${agent.id}/sessions`) return respond([]);
    if (path === `/agents/${agent.id}/chat/stream`) return route.fulfill({
      status: 200, contentType: "text/plain", body: "Your CV is ready for review.",
      headers: { "X-Tools-Invoked": "[\"extract_pdf\"]", "X-Chunks-Retrieved": "1", "X-Retrieved-Sources": "[]" },
    });
    return respond({});
  });
}

test.beforeEach(async ({ page }) => { await mockPlatform(page); });

test("settings persist, support Hebrew RTL, voices, and global accessibility controls", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByText("High contrast").click();
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await page.locator(".settings-grid > .settings-card").nth(1).getByRole("button", { name: "עברית" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByText("קול באנגלית")).toBeVisible();
  await expect(page.getByRole("button", { name: "בדיקת קול" }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("ai-platform:e2e-user:settings") || "")).toContain('"locale":"he"');
});

test("workspace drawer, avatars, chat streaming, voice controls, and attachments work together", async ({ page }) => {
  await page.goto("/agents/cv-expert");
  await expect(page.getByRole("heading", { name: "New conversation" })).toBeVisible();
  await page.getByRole("button", { name: "Close sidebar" }).click();
  await expect(page.locator(".workspace")).toHaveClass(/sidebar-closed/);
  await page.getByRole("button", { name: "Open sidebar" }).click();
  await expect(page.locator(".workspace")).toHaveClass(/sidebar-open/);
  await page.getByRole("button", { name: "Choose avatar" }).click();
  await page.locator(".account-avatar-menu .account-avatar").nth(2).click();
  await page.getByPlaceholder("Message CV Expert").fill("Please review my CV");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Your CV is ready for review.")).toBeVisible();
  await expect(page.locator(".message-avatar-user")).toHaveAttribute("src", /fox\.svg$/);
  await expect(page.locator(".message-avatar-assistant")).toBeVisible();
  await expect(page.getByRole("button", { name: "Read aloud" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start voice input" })).toBeVisible();
  await page.getByRole("button", { name: "More message actions" }).click();
  await expect(page.getByRole("menuitem", { name: "Attach file" })).toBeVisible();
});

test("Hebrew message bubbles self-align right-to-left while the interface stays English", async ({ page }) => {
  await page.goto("/agents/cv-expert");
  const bubble = page.locator(".bubble").first();
  await page.getByPlaceholder("Message CV Expert").fill("עברית");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(bubble).toHaveAttribute("dir", "auto");
  await expect(bubble).toHaveCSS("direction", "rtl");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("main screens and configuration controls stay within their containers", async ({ page }) => {
  for (const route of ["/agents", "/sessions", "/documents", "/tools", "/settings", "/agents/cv-expert"]) {
    await page.goto(route);
    await expect(page.locator("main.app-shell")).toBeVisible();
    const overflowing = await page.evaluate(() => {
      const tolerance = 1;
      return [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 &&
            (rect.left < -tolerance || rect.right > window.innerWidth + tolerance);
        })
        .slice(0, 8)
        .map((element) => `${element.tagName.toLowerCase()}.${element.className}`);
    });
    expect(overflowing, `${route} has visible horizontal overflow`).toEqual([]);
  }

  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/agents/cv-expert");
  const temperature = page.locator(".temperature-control");
  await expect(temperature).toBeVisible();
  const fits = await temperature.evaluate((element) => {
    const parent = element.parentElement!.getBoundingClientRect();
    return [...element.children].every((child) => {
      const rect = child.getBoundingClientRect();
      return rect.left >= parent.left - 1 && rect.right <= parent.right + 1;
    });
  });
  expect(fits).toBe(true);
});
