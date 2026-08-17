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
  const savedSchedules: Array<Record<string, unknown>> = [];
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
    if (path === `/agents/${agent.id}/schedules`) {
      if (request.method() === "POST") {
        const values = JSON.parse(request.postData() || "{}");
        const now = new Date().toISOString();
        const created = {
          id: `sched-${savedSchedules.length + 1}`, agent_id: agent.id, enabled: true,
          next_run_at: new Date(Date.now() + 3_600_000).toISOString(), last_run_at: null, last_run_session_id: null,
          created_at: now, updated_at: now, ...values,
        };
        savedSchedules.push(created);
        return respond(created, 201);
      }
      return respond(savedSchedules);
    }
    if (path.startsWith(`/agents/${agent.id}/schedules/`)) {
      const scheduleId = path.split("/").pop();
      const index = savedSchedules.findIndex((schedule) => schedule.id === scheduleId);
      if (request.method() === "DELETE") {
        if (index >= 0) savedSchedules.splice(index, 1);
        return route.fulfill({ status: 204 });
      }
      if (request.method() === "PATCH" && index >= 0) {
        savedSchedules[index] = { ...savedSchedules[index], ...JSON.parse(request.postData() || "{}") };
        return respond(savedSchedules[index]);
      }
    }
    if (path === `/agents/${agent.id}/chat/stream`) {
      const message = JSON.parse(request.postData() || "{}").message;
      if (message === "Stop this response") await new Promise((resolve) => setTimeout(resolve, 500));
      return route.fulfill({
        status: 200, contentType: "text/plain", body: "Your CV is ready for review.",
        headers: { "X-Tools-Invoked": "[\"extract_pdf\"]", "X-Chunks-Retrieved": "1", "X-Retrieved-Sources": "[]" },
      });
    }
    return respond({});
  });
}

test.beforeEach(async ({ page }) => { await mockPlatform(page); });

test("settings persist, support Hebrew RTL, voices, and global accessibility controls", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByText("High contrast").click();
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  await page.locator(".settings-card").filter({ has: page.getByRole("heading", { name: "Workspace" }) }).getByRole("button", { name: "עברית" }).click();
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

test("stopping a response aborts the browser request", async ({ page }) => {
  await page.goto("/agents/cv-expert");
  await page.getByPlaceholder("Message CV Expert").fill("Stop this response");
  await page.getByRole("button", { name: "Send message" }).click();
  const stop = page.getByRole("button", { name: "Stop generating" });
  await expect(stop).toBeVisible({ timeout: 15_000 });
  const abortedRequest = page.waitForEvent("requestfailed", (request) => (
    request.url().endsWith(`/agents/${agent.id}/chat/stream`) && request.failure()?.errorText.includes("ABORTED")
  ));
  await stop.click();
  await abortedRequest;
  await expect(page.getByText("Response stopped.")).toBeVisible();
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

test("creating a schedule from the Schedules dashboard lists it as a card and supports deletion", async ({ page }) => {
  await page.goto("/schedules");
  await expect(page.getByText("No schedules yet")).toBeVisible();

  await page.getByRole("button", { name: "New schedule" }).first().click();
  await page.getByLabel("Message to send").fill("Summarize yesterday's activity.");
  await page.getByRole("button", { name: "Create schedule" }).click();

  await expect(page.getByText("No schedules yet")).not.toBeVisible();
  await expect(page.locator(".schedule-card")).toHaveCount(1);
  await expect(page.locator(".schedule-card")).toContainText("CV Expert");

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Delete schedule for CV Expert" }).click();
  await expect(page.getByText("No schedules yet")).toBeVisible();
});

test("editing a schedule updates its message", async ({ page }) => {
  await page.goto("/schedules");
  await page.getByRole("button", { name: "New schedule" }).first().click();
  await page.getByLabel("Message to send").fill("Summarize yesterday's activity.");
  await page.getByRole("button", { name: "Create schedule" }).click();
  await expect(page.locator(".schedule-card")).toHaveCount(1);

  await page.getByRole("button", { name: "Edit schedule for CV Expert" }).click();
  await expect(page.getByRole("heading", { name: "Edit schedule" })).toBeVisible();
  await page.getByLabel("Message to send").fill("Summarize this week instead.");
  await page.getByRole("button", { name: "Save configuration" }).click();

  await expect(page.locator(".schedule-card")).toContainText("Summarize this week instead.");
});

test("clicking a schedule card opens its dedicated history page, not the chat workspace", async ({ page }) => {
  await page.goto("/schedules");
  await page.getByRole("button", { name: "New schedule" }).first().click();
  await page.getByLabel("Message to send").fill("Summarize yesterday's activity.");
  await page.getByRole("button", { name: "Create schedule" }).click();
  await expect(page.locator(".schedule-card")).toHaveCount(1);

  await page.locator(".schedule-card-open").click();

  await expect(page).toHaveURL(/\/schedules\/sched-1$/);
  await expect(page.locator(".dashboard-layout")).toBeVisible();
  await expect(page.getByRole("heading", { name: "CV Expert" })).toBeVisible();
  await expect(page.getByText("No runs yet")).toBeVisible();
  await expect(page.getByPlaceholder("Message CV Expert")).toHaveCount(0);

  await page.locator(".schedule-history-back").click();
  await expect(page).toHaveURL(/\/schedules$/);
});

test("main screens and configuration controls stay within their containers", async ({ page }) => {
  for (const route of ["/agents", "/sessions", "/schedules", "/schedules/sched-1", "/documents", "/tools", "/settings", "/agents/cv-expert"]) {
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
