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

type ToolStub = { name: string; description: string; parameters: Record<string, unknown> };

async function mockPlatform(
  page: Page,
  options: { documentCount?: number; initialTools?: ToolStub[] } = {},
) {
  let savedSettings = { ...settings };
  const savedSchedules: Array<Record<string, unknown>> = [];
  const deletedSessionIds: string[] = [];
  const allDocuments = Array.from({ length: options.documentCount ?? 0 }, (_, index) => (
    { source_id: `doc-${index}.pdf`, chunks_indexed: 1, status: "indexed" }
  ));
  let accountDeleted = false;
  const submittedFeedback: Array<Record<string, unknown>> = [];
  const createdAgents: Array<Record<string, unknown>> = [];
  let currentTools: ToolStub[] = options.initialTools ?? [
    { name: "extract_pdf", description: "Read a PDF", parameters: {} },
  ];
  await page.route("http://localhost:8000/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const respond = (body: unknown, status = 200, headers: Record<string, string> = {}) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers });
    if (path === "/auth/me") return respond({ id: "e2e-user", email: "e2e@example.com", display_name: "E2E User", avatar_url: null });
    if (path === "/auth/account" && request.method() === "DELETE") {
      accountDeleted = true;
      return route.fulfill({ status: 204 });
    }
    if (path === "/auth/logout") return route.fulfill({ status: 302, headers: { location: "/" } });
    if (path === "/settings") {
      if (request.method() === "PUT") savedSettings = JSON.parse(request.postData() || "{}");
      return respond(savedSettings);
    }
    if (path === "/feedback" && request.method() === "POST") {
      submittedFeedback.push(JSON.parse(request.postData() || "{}"));
      return respond({ id: "fb-1", created_at: new Date().toISOString() }, 201);
    }
    if (path === "/agents" && request.method() === "GET") return respond([agent]);
    if (path === "/agents" && request.method() === "POST") {
      const payload = JSON.parse(request.postData() || "{}");
      const knownNames = currentTools.map((tool) => tool.name);
      const unknown = ((payload.allowed_tools ?? []) as string[]).filter((name) => !knownNames.includes(name));
      if (unknown.length) return respond({ detail: `Unknown tool names: ${JSON.stringify(unknown)}` }, 422);
      const created = { ...agent, id: "new-agent", name: payload.name, allowed_tools: payload.allowed_tools };
      createdAgents.push(created);
      return respond(created, 201);
    }
    if (path === "/tools") return respond(currentTools);
    if (path === "/models") return respond({ provider: "ollama", default_model: "qwen3:8b", models: [{ id: "qwen3:8b", label: "qwen3:8b" }], temperature: { min: 0, max: 1, step: 0.1, default: 0.3 } });
    if (path === "/documents") {
      const limit = Number(url.searchParams.get("limit") || 20);
      const offset = Number(url.searchParams.get("offset") || 0);
      return respond({
        items: allDocuments.slice(offset, offset + limit),
        total: allDocuments.length,
        limit,
        offset,
      });
    }
    // Any agent's session list, not just the fixed CV Expert fixture's - a
    // newly created agent (id assigned by the POST /agents mock above) needs
    // this route to behave the same way a real backend would for any valid
    // agent id, or its workspace crashes reading `.items` off an unmocked
    // fallback response.
    if (/^\/agents\/[^/]+\/sessions$/.test(path)) return respond({ items: [], total: 0, limit: 20, offset: 0 });
    if (path.startsWith(`/agents/${agent.id}/sessions/`) && request.method() === "DELETE") {
      deletedSessionIds.push(decodeURIComponent(path.split("/").pop() || ""));
      return route.fulfill({ status: 204 });
    }
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
    if (path === `/agents/${agent.id}/draft/rewrite`) {
      const draft = JSON.parse(request.postData() || "{}").message;
      return respond({ message: `Enhanced: ${draft}` });
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
  return {
    deletedSessionIds,
    isAccountDeleted: () => accountDeleted,
    submittedFeedback,
    createdAgents,
    dropTool: (name: string) => { currentTools = currentTools.filter((tool) => tool.name !== name); },
  };
}

const trackers = new WeakMap<Page, {
  deletedSessionIds: string[];
  isAccountDeleted: () => boolean;
  submittedFeedback: Array<Record<string, unknown>>;
  createdAgents: Array<Record<string, unknown>>;
  dropTool: (name: string) => void;
}>();

test.beforeEach(async ({ page }) => { trackers.set(page, await mockPlatform(page)); });

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
  await page.getByPlaceholder("Message CV Expert").fill("Please review my CV");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Your CV is ready for review.")).toBeVisible();
  await expect(page.locator(".message-avatar-user .account-avatar-initials")).toHaveText("EU");
  await expect(page.locator(".message-avatar-assistant")).toBeVisible();
  await expect(page.getByRole("button", { name: "Read aloud" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start voice input" })).toBeVisible();
  await page.getByRole("button", { name: "More message actions" }).click();
  await expect(page.getByRole("menuitem", { name: "Attach file" })).toBeVisible();
});

test("expanding the system prompt opens a larger editor bound to the same value", async ({ page }) => {
  await page.goto("/agents/cv-expert");
  const inlineEditor = page.locator(".prompt-editor").first();
  await expect(inlineEditor).toHaveValue(agent.system_prompt);

  await page.getByRole("button", { name: "Expand editor" }).click();
  const expandedEditor = page.locator(".prompt-editor-expanded");
  await expect(expandedEditor).toBeVisible();
  await expect(expandedEditor).toHaveValue(agent.system_prompt);

  await expandedEditor.fill("Updated system prompt for testing.");
  await page.keyboard.press("Escape");
  await expect(expandedEditor).not.toBeVisible();
  await expect(inlineEditor).toHaveValue("Updated system prompt for testing.");
});

test("creating an agent refetches tools instead of sending a stale list that no longer matches the registry", async ({ page }) => {
  // The dashboard loads with a filesystem tool registered; by the time the
  // create-agent modal is submitted, that tool has dropped out of the
  // registry (e.g. its MCP server going away) - regression coverage for
  // CreateAgentModal sending a since-removed tool name and getting a 422
  // back, fixed by refetching /tools right before submit instead of
  // trusting the list as of when the modal opened.
  const tracker = trackers.set(page, await mockPlatform(page, {
    initialTools: [
      { name: "extract_pdf", description: "Read a PDF", parameters: {} },
      { name: "write_file", description: "Write a file", parameters: {} },
    ],
  })).get(page)!;
  await page.goto("/agents");
  await expect(page.getByRole("button", { name: "New agent" }).first()).toBeVisible();

  // The registry drifts while the dashboard (and, once opened, the modal)
  // is already showing the wider tool list.
  tracker.dropTool("write_file");

  await page.getByRole("button", { name: "New agent" }).first().click();
  await page.getByLabel("Name").fill("Fresh Agent");
  await page.getByRole("dialog").getByRole("button", { name: "Create agent" }).click();

  // The modal only closes on a successful creation (App.tsx's createAgent
  // keeps it open and shows the alert on failure) - waiting for it to close
  // is what actually waits out the async refetch-then-POST, rather than
  // racing the plain (non-retrying) createdAgents assertion below against it.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(tracker.createdAgents).toHaveLength(1);
  expect(tracker.createdAgents[0].allowed_tools).toEqual(["extract_pdf"]);
});

test("the Overview page shows a welcome header, KPIs, and links to an agent", async ({ page }) => {
  await page.goto("/overview");

  await expect(page.getByRole("heading", { name: "Welcome back, E2E" })).toBeVisible();
  await expect(page.locator(".stat-tile")).toHaveCount(4);
  await expect(page.locator(".stat-tile", { hasText: "Agents" })).toContainText("1");

  await page.getByRole("button", { name: "CV Expert" }).click();

  await expect(page).toHaveURL(/\/agents\/cv-expert$/);
});

test("sending feedback from Settings submits the category and message", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.getByRole("button", { name: "Report a bug" }).click();
  await page.getByLabel("What went wrong?").fill("The export button does nothing.");

  await page.getByRole("button", { name: "Send", exact: true }).click();

  await expect(page.getByText("Thanks!")).toBeVisible();
  await expect.poll(() => trackers.get(page)!.submittedFeedback).toEqual([
    { category: "bug", message: "The export button does nothing.", context_path: "/settings" },
  ]);
});

test("deleting the account requires typing DELETE, then calls the API and signs out", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Delete account" }).click();
  const confirmButton = page.getByRole("button", { name: "Permanently delete my data" });
  await expect(confirmButton).toBeDisabled();

  await page.getByLabel(/Type DELETE to confirm/).fill("nope");
  await expect(confirmButton).toBeDisabled();
  await page.getByLabel(/Type DELETE to confirm/).fill("DELETE");
  await expect(confirmButton).toBeEnabled();

  await confirmButton.click();

  await expect.poll(() => trackers.get(page)!.isAccountDeleted()).toBe(true);
});

test("the document library paginates with a Load more control", async ({ page }) => {
  await mockPlatform(page, { documentCount: 25 });
  await page.goto("/documents");

  await expect(page.locator(".management-row")).toHaveCount(20);
  await expect(page.getByRole("button", { name: /Load 5 more/ })).toBeVisible();

  await page.getByRole("button", { name: /Load 5 more/ }).click();

  await expect(page.locator(".management-row")).toHaveCount(25);
  await expect(page.getByRole("button", { name: /Load .* more/ })).toHaveCount(0);
});

test("enhancing a draft replaces the composer text with the rewritten message", async ({ page }) => {
  await page.goto("/agents/cv-expert");
  const composer = page.getByPlaceholder("Message CV Expert");
  await composer.fill("review my cv");
  const enhanceButton = page.getByRole("button", { name: "Enhance message" });
  await expect(enhanceButton).toBeEnabled();

  await enhanceButton.click();

  await expect(composer).toHaveValue("Enhanced: review my cv");
});

test("clearing a chat wipes its messages but keeps the same session open", async ({ page }) => {
  await page.goto("/agents/cv-expert");
  await page.getByPlaceholder("Message CV Expert").fill("Please review my CV");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Your CV is ready for review.")).toBeVisible();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Clear chat" }).click();

  await expect(page.getByText("Your CV is ready for review.")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "New conversation" })).toBeVisible();
  await expect(page.locator(".workspace")).toBeVisible();
  await expect.poll(() => trackers.get(page)!.deletedSessionIds.length).toBe(1);
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
  await page.getByLabel("Title").fill("Daily digest");
  await page.getByLabel("Message to send").fill("Summarize yesterday's activity.");
  await page.getByRole("button", { name: "Create schedule" }).click();

  await expect(page.getByText("No schedules yet")).not.toBeVisible();
  await expect(page.locator(".schedule-card")).toHaveCount(1);
  await expect(page.locator(".schedule-card")).toContainText("CV Expert");

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Delete schedule for CV Expert" }).click();
  await expect(page.getByText("No schedules yet")).toBeVisible();
});

test("testing a schedule message previews a real reply without saving a session", async ({ page }) => {
  await page.goto("/schedules");
  await page.getByRole("button", { name: "New schedule" }).first().click();
  await page.getByLabel("Title").fill("Daily digest");
  await page.getByLabel("Message to send").fill("Please review my CV");
  await expect(page.getByText("extract_pdf")).toBeVisible();

  await page.getByRole("button", { name: "Test message" }).click();

  await expect(page.getByText("Your CV is ready for review.")).toBeVisible();
  // The test run persists a real session server-side like an interactive
  // turn does - confirm it actually gets cleaned up rather than lingering
  // in the agent's session list.
  await expect.poll(() => trackers.get(page)!.deletedSessionIds.length).toBe(1);
  expect(trackers.get(page)!.deletedSessionIds[0]).toMatch(/^test-/);
});

test("editing a schedule updates its message", async ({ page }) => {
  await page.goto("/schedules");
  await page.getByRole("button", { name: "New schedule" }).first().click();
  await page.getByLabel("Title").fill("Daily digest");
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
  await page.getByLabel("Title").fill("Daily digest");
  await page.getByLabel("Message to send").fill("Summarize yesterday's activity.");
  await page.getByRole("button", { name: "Create schedule" }).click();
  await expect(page.locator(".schedule-card")).toHaveCount(1);

  await page.locator(".schedule-card-open").click();

  await expect(page).toHaveURL(/\/schedules\/sched-1$/);
  await expect(page.locator(".dashboard-layout")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Daily digest" })).toBeVisible();
  await expect(page.getByText("No runs yet")).toBeVisible();
  await expect(page.getByPlaceholder("Message CV Expert")).toHaveCount(0);

  await page.locator(".schedule-history-back").click();
  await expect(page).toHaveURL(/\/schedules$/);
});

test("main screens and configuration controls stay within their containers", async ({ page }) => {
  for (const route of ["/overview", "/agents", "/sessions", "/schedules", "/schedules/sched-1", "/documents", "/tools", "/settings", "/profile", "/agents/cv-expert"]) {
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
