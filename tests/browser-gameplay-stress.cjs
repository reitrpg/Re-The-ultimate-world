const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "http://127.0.0.1:4173/";
const REPORT_DIR = path.join(process.cwd(), "test-results");
fs.mkdirSync(REPORT_DIR, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  testType: "long-running-real-time-stress",
  checks: [],
  browserErrors: [],
  consoleErrors: [],
  pageErrors: []
};

function check(name, ok, details = {}) {
  report.checks.push({ name, status: ok ? "PASS" : "FAIL", ...details });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}`, JSON.stringify(details));
  if (!ok) throw new Error(`Stress test failed: ${name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
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
    check("App initializes for the isolated stress run", true, {
      version: await page.locator("#app-version").innerText(),
      title: await page.title()
    });

    await page.locator('[data-tab="settings"]').tap();
    await page.waitForFunction(() => !document.querySelector("#settings-tab").hidden);
    if (!(await page.locator("#settings-debug").isChecked())) {
      await page.locator("#settings-debug").check();
      await page.waitForFunction(() => !document.querySelector("#debug-panel").hidden);
    }
    await page.locator("#settings-debug-speed").selectOption("1000");
    await page.locator("#settings-tick-speed").fill("1");
    await page.locator("#settings-tick-speed").dispatchEvent("change");

    // Create a fresh test world through the app's visible reset control.
    page.once("dialog", dialog => dialog.accept());
    await page.locator("#debug-reset").tap();
    await page.waitForTimeout(500);
    await page.locator('[data-tab="world"]').tap();
    await page.waitForFunction(() => !document.querySelector("#world-tab").hidden);
    await page.waitForFunction(() => document.querySelectorAll(".world-card").length > 0, null, { timeout: 10000 });

    const readState = () => page.evaluate(async () => {
      const [gameModule, worldModule, settingsModule, resourceModule, epModule] = await Promise.all([
        import("./js/core/game.js"),
        import("./js/world/Manager.js"),
        import("./js/settings/Manager.js"),
        import("./js/resource/Manager.js"),
        import("./js/ep/Manager.js")
      ]);
      const world = worldModule.default.getActive();
      const resource = id => resourceModule.default.get(id)?.amount?.toString?.() ?? "0";
      const ep = epModule.default.get();
      return {
        running: gameModule.default.running,
        tickSpeed: settingsModule.default.getTickSpeed(),
        multiplier: settingsModule.default.getGameSpeedMultiplier(),
        debugMode: settingsModule.default.isDebugMode(),
        level: world?.level ?? null,
        exp: world?.exp?.toString?.() ?? String(world?.exp),
        plant: resource("plant"),
        metal: resource("metal"),
        magic: resource("magic"),
        ep: ep?.toString?.() ?? String(ep)
      };
    });

    const initial = await readState();
    check("Stress configuration uses the real 1000x interval loop",
      initial.running && initial.debugMode && initial.multiplier === 1000 && initial.tickSpeed === 1,
      initial
    );

    // Test-only autosave cadence. This is set through the settings manager and
    // SaveManager; no research UI or research data is queried by this test.
    const autosaveSetup = await page.evaluate(async () => {
      const [saveModule, settingsModule] = await Promise.all([
        import("./js/core/save.js"),
        import("./js/settings/Manager.js")
      ]);
      const save = saveModule.default;
      const settings = settingsModule.default;
      const previousInterval = settings.getAutoSaveInterval();
      settings.set("autoSaveInterval", 5000);
      save.restartAutoSave();
      return { previousInterval, activeInterval: settings.getAutoSaveInterval() };
    });

    await page.evaluate(async () => {
      const game = (await import("./js/core/game.js")).default;
      const samples = [];
      let previous = performance.now();
      const originalUpdate = game.update;
      game.__wcStressOriginalUpdate = originalUpdate;
      game.__wcStressCadenceSamples = samples;
      game.update = function (...args) {
        const now = performance.now();
        if (samples.length < 500000) samples.push(now - previous);
        previous = now;
        return originalUpdate.apply(this, args);
      };
    });

    const checkpoints = [1, 5, 15, 30, 60, 120, 180, 240, 300];
    const samples = [];
    const startedAt = Date.now();
    for (const targetSeconds of checkpoints) {
      const targetAt = startedAt + targetSeconds * 1000;
      while (Date.now() < targetAt) {
        await page.waitForTimeout(Math.min(250, Math.max(10, targetAt - Date.now())));
      }
      const state = await readState();
      samples.push({
        elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
        level: state.level,
        exp: state.exp,
        plant: state.plant,
        metal: state.metal,
        magic: state.magic,
        ep: state.ep,
        heapUsedBytes: await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null)
      });
      console.log("[SAMPLE]", JSON.stringify(samples[samples.length - 1]));
    }

    const final = await readState();
    const progression = await page.evaluate(async ({ before, after }) => {
      const BigNumber = (await import("./js/number/BigNumber.js")).default;
      return {
        plantIncreased: BigNumber.from(after.plant).greater(BigNumber.from(before.plant)),
        metalIncreased: BigNumber.from(after.metal).greater(BigNumber.from(before.metal)),
        magicIncreased: BigNumber.from(after.magic).greater(BigNumber.from(before.magic)),
        expChanged: after.exp !== before.exp,
        levelIncreased: after.level > before.level
      };
    }, { before: initial, after: final });

    const cadence = await page.evaluate(async () => {
      const game = (await import("./js/core/game.js")).default;
      const samples = game.__wcStressCadenceSamples || [];
      game.update = game.__wcStressOriginalUpdate || game.update;
      delete game.__wcStressOriginalUpdate;
      delete game.__wcStressCadenceSamples;
      const sorted = [...samples].sort((a, b) => a - b);
      const percentile = p => sorted.length
        ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]
        : null;
      return {
        updateCount: samples.length,
        medianIntervalMs: percentile(0.5),
        p95IntervalMs: percentile(0.95),
        maxIntervalMs: samples.length ? Math.max(...samples) : null
      };
    });

    check("Five minutes of real-time accelerated progression completes",
      Date.now() - startedAt >= 300000 && samples.length === checkpoints.length,
      { elapsedMs: Date.now() - startedAt, samples: samples.length }
    );
    check("Actual simulation state advances during the stress run",
      progression.plantIncreased || progression.metalIncreased || progression.magicIncreased ||
      progression.expChanged || progression.levelIncreased,
      { initial, final, progression }
    );
    check("Real game loop maintains observable cadence under load",
      cadence.updateCount >= 1000 && cadence.medianIntervalMs !== null && cadence.p95IntervalMs !== null,
      cadence
    );

    const autosave = await page.evaluate(async () => {
      const save = (await import("./js/core/save.js")).default;
      const raw = localStorage.getItem("world_creator_save");
      let parsed = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch (_) {}
      save.stopAutoSave();
      const settings = (await import("./js/settings/Manager.js")).default;
      settings.set("autoSaveInterval", 30000);
      return {
        exists: Boolean(raw),
        validJson: Boolean(parsed && typeof parsed === "object"),
        version: parsed?.version ?? null,
        timestamp: parsed?.timestamp ?? null
      };
    });
    check("Autosave produces valid current-format data during the stress run",
      autosave.exists && autosave.validJson && autosave.version === 8 && Number.isFinite(autosave.timestamp),
      { configuration: autosaveSetup, autosave }
    );

    check("No uncaught JavaScript exceptions", report.pageErrors.length === 0, { errors: report.pageErrors });
    check("No console errors", report.consoleErrors.length === 0, { errors: report.consoleErrors });
    check("No failed network requests", report.browserErrors.length === 0, { errors: report.browserErrors });

    report.finishedAt = new Date().toISOString();
    report.summary = "PASS";
    report.realTimeProgression = {
      durationSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
      speedMultiplier: 1000,
      tickSpeedMs: 1,
      checkpoints: samples,
      cadence,
      progression,
      autosave
    };
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.summary = "FAIL";
    report.failure = String(error?.stack || error);
    try {
      await page.screenshot({ path: path.join(REPORT_DIR, "stress-failure.png"), fullPage: true });
      fs.writeFileSync(path.join(REPORT_DIR, "stress-failure-page.html"), await page.content());
    } catch (_) {}
    throw error;
  } finally {
    fs.writeFileSync(path.join(REPORT_DIR, "browser-gameplay-stress.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
