const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "http://127.0.0.1:4173/";
const REPORT_DIR = path.join(process.cwd(), "test-results");
fs.mkdirSync(REPORT_DIR, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  checks: [],
  browserErrors: [],
  consoleErrors: [],
  pageErrors: [],
};

function check(name, ok, details = {}) {
  report.checks.push({ name, status: ok ? "PASS" : "FAIL", ...details });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}`, JSON.stringify(details));
  if (!ok) throw new Error(`Browser gameplay check failed: ${name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on("pageerror", error => report.pageErrors.push(String(error)));
  page.on("console", message => {
    if (message.type() === "error") report.consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => {
    report.browserErrors.push({ url: request.url(), error: request.failure()?.errorText });
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.dataset.appReady === "true", null, { timeout: 20000 });
    check("App initializes in Chromium", true, {
      version: await page.locator("#app-version").innerText(),
      title: await page.title(),
    });

    check("Main gameplay panels render", 
      await page.locator("#world-list").count() === 1 &&
      await page.locator("#resource-list").count() === 1 &&
      await page.locator("#upgrade-infinite-list").count() === 1 &&
      await page.locator("#converter-list").count() === 1
    );

    // Exercise real pointer input: the custom InputManager routes pointerup to app actions.
    await page.locator('[data-tab="settings"]').tap();
    await page.waitForFunction(() => !document.querySelector("#settings-tab").hidden);
    check("Touch navigation opens Settings", await page.locator("#settings-tab").isVisible());

    await page.locator("#settings-debug").check();
    await page.waitForFunction(() => !document.querySelector("#debug-panel").hidden);
    await page.locator("#settings-debug-speed").selectOption("1000");
    await page.locator("#settings-tick-speed").fill("10");
    await page.locator("#settings-tick-speed").dispatchEvent("change");
    check("Debug speed selector enables at 1000x",
      await page.locator("#settings-debug-speed").inputValue() === "1000" &&
      !(await page.locator("#settings-debug-speed").isDisabled())
    );

    // Use the visible reset action to create a clean, playable world through the app.
    // This is a UI action; no game module state is modified by the test.
    page.once("dialog", dialog => dialog.accept());
    await page.locator("#debug-reset").tap();
    await page.waitForTimeout(500);
    await page.locator('[data-tab="world"]').tap();
    await page.waitForFunction(() => !document.querySelector("#world-tab").hidden);
    await page.waitForFunction(() => document.querySelectorAll(".world-card").length > 0, null, { timeout: 10000 });
    check("World can be created through the in-app debug reset",
      await page.locator(".world-card").count() > 0,
      { worldCards: await page.locator(".world-card").count() }
    );

    // Observe real production and leveling through the game's timer at 1000x.
    const initialCard = await page.locator(".world-card").first().innerText();
    const initialResourceHud = await page.locator("#resource-list").innerText();
    await page.waitForTimeout(1800);
    const finalCard = await page.locator(".world-card").first().innerText();
    const finalResourceHud = await page.locator("#resource-list").innerText();
    check("Accelerated gameplay updates the live world card",
      initialCard !== finalCard,
      { before: initialCard.slice(0, 500), after: finalCard.slice(0, 500) }
    );
    check("Resource HUD remains rendered during production",
      /植物|金属|魔力/.test(finalResourceHud),
      { before: initialResourceHud.slice(0, 300), after: finalResourceHud.slice(0, 300) }
    );

    // Confirm the EP conversion controls are available and interactable when
    // the produced resources make conversion possible.
    await page.locator('[data-world-category="converter"]').tap();
    await page.waitForFunction(() => !document.querySelector("#world-category-converter").hidden);
    const convertAll = page.locator('[data-action="converter:convert-all"][data-recipe-id="plant_to_ep"]');
    check("EP converter panel renders", await convertAll.count() === 1);
    if (await convertAll.isEnabled()) {
      const epBefore = await page.locator("#ep-value").innerText();
      await convertAll.tap();
      await page.waitForTimeout(300);
      const epAfter = await page.locator("#ep-value").innerText();
      check("EP converter accepts a touch action", epAfter !== epBefore, { epBefore, epAfter });
    }

    check("No uncaught JavaScript exceptions", report.pageErrors.length === 0, { errors: report.pageErrors });
    check("No console errors", report.consoleErrors.length === 0, { errors: report.consoleErrors });
    check("No failed network requests", report.browserErrors.length === 0, { errors: report.browserErrors });

    report.finishedAt = new Date().toISOString();
    report.summary = "PASS";
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.summary = "FAIL";
    report.failure = String(error?.stack || error);
    try {
      await page.screenshot({ path: path.join(REPORT_DIR, "failure.png"), fullPage: true });
      fs.writeFileSync(path.join(REPORT_DIR, "failure-page.html"), await page.content());
    } catch (_) {}
    throw error;
  } finally {
    fs.writeFileSync(path.join(REPORT_DIR, "browser-gameplay.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
