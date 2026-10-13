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
    await page.locator("#settings-tick-speed").fill("1");
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

    // Inspect singleton state through read-only module imports while the real
    // interval loop runs. This distinguishes a rendering issue from a stalled simulation.
    const readGameState = () => page.evaluate(async () => {
      const [gameModule, worldModule, settingsModule, resourceModule] = await Promise.all([
        import("./js/core/game.js"),
        import("./js/world/Manager.js"),
        import("./js/settings/Manager.js"),
        import("./js/resource/Manager.js"),
        import("./js/ep/Manager.js")
      ]);
      const world = worldModule.default.getActive();
      const plant = resourceModule.default.get("plant");
      const ep = epModule.default.get();
      return {
        running: gameModule.default.running,
        tickSpeed: settingsModule.default.getTickSpeed(),
        multiplier: settingsModule.default.getGameSpeedMultiplier(),
        level: world?.level ?? null,
        exp: world?.exp?.toString?.() ?? String(world?.exp),
        plant: plant?.amount?.toString?.() ?? String(plant?.amount),
        plantProduction: plant?.production?.toString?.() ?? String(plant?.production),
        ep: ep?.toString?.() ?? String(ep)
      };
    });
    const initialState = await readGameState();
    await page.waitForTimeout(1800);
    const finalState = await readGameState();
    check("Game loop is running with accelerated settings",
      finalState.running && finalState.tickSpeed === 1 && finalState.multiplier === 1000,
      { before: initialState, after: finalState }
    );
    check("Actual simulation advances resources or world EXP",
      finalState.plant !== initialState.plant ||
      finalState.exp !== initialState.exp ||
      finalState.level > initialState.level,
      { before: initialState, after: finalState }
    );

    // Real-time accelerated play: confirm the normal interval loop advances
    // without altering Date.now() or manually invoking game.update().
    const liveProgressStartedAt = Date.now();
    let liveState = finalState;
    while (Date.now() - liveProgressStartedAt < 15000) {
      await page.waitForTimeout(250);
      liveState = await readGameState();
      if (liveState.level > finalState.level) break;
    }
    check("Regular accelerated game loop advances world level",
      liveState.level > finalState.level,
      {
        elapsedMs: Date.now() - liveProgressStartedAt,
        before: finalState,
        after: liveState
      }
    );
    check("Regular accelerated game loop continues producing resources",
      Number(liveState.plant.replace(/[^0-9.eE+-]/g, "")) >= 0 &&
      liveState.plant !== finalState.plant,
      { before: finalState.plant, after: liveState.plant }
    );

    // Separately test level-100 balance deterministically by advancing virtual
    // time through the native update function. This is a simulation test, not
    // evidence that the real-time browser reaches Lv100 in the same duration.
    const acceleratedResult = await page.evaluate(async () => {
      const [gameModule, worldModule] = await Promise.all([
        import("./js/core/game.js"),
        import("./js/world/Manager.js")
      ]);
      const game = gameModule.default;
      const worldManager = worldModule.default;
      game.stop();
      const originalNow = Date.now;
      let virtualNow = originalNow();
      let iterations = 0;
      try {
        while ((worldManager.getActive()?.level ?? 0) < 100 && iterations < 20000) {
          virtualNow += 1000;
          Date.now = () => virtualNow;
          game.update();
          iterations += 1;
        }
      } finally {
        Date.now = originalNow;
        game.start();
      }
      const world = worldManager.getActive();
      return {
        iterations,
        level: world?.level ?? null,
        exp: world?.exp?.toString?.() ?? String(world?.exp),
        totalExperience: world?.totalExperience?.toString?.() ?? String(world?.totalExperience),
        newBirthCount: world?.newBirthCount ?? null
      };
    });
    check("Native simulation reaches world Lv100 in deterministic virtual time",
      acceleratedResult.level >= 100,
      acceleratedResult
    );
    // The test resumes the normal interval after the deterministic simulation.
    await page.waitForTimeout(150);

    // Rebirth is performed through the visible world-card control.
    await page.locator('[data-tab="world"]').tap();
    await page.waitForFunction(() => !document.querySelector("#world-tab").hidden);
    const worldToggle = page.locator(".world-card-toggle").first();
    if (await worldToggle.count() && await worldToggle.getAttribute("aria-expanded") === "false") {
      await worldToggle.tap();
    }
    const rebirthButton = page.locator('[data-action="newbirth:request"]').first();
    check("Rebirth control is rendered at a qualifying level", await rebirthButton.count() === 1);
    await rebirthButton.scrollIntoViewIfNeeded();
    await rebirthButton.tap({ timeout: 10000 });
    await page.waitForTimeout(250);
    const postRebirth = await page.evaluate(async () => {
      const worldModule = await import("./js/world/Manager.js");
      const world = worldModule.default.getActive();
      return { level: world?.level ?? null, newBirthCount: world?.newBirthCount ?? null };
    });
    check("Rebirth executes through the actual UI action",
      postRebirth.newBirthCount >= 1,
      postRebirth
    );

    // Grant resources through the visible in-app debug button, then convert
    // them through the actual converter control using pointer input.
    await page.locator('[data-tab="settings"]').tap();
    await page.waitForFunction(() => !document.querySelector("#settings-tab").hidden);
    await page.locator("#debug-add-material").tap();
    await page.waitForTimeout(200);
    const plantAfterGrant = await readGameState();
    check("Debug resource grant adds plant material",
      plantAfterGrant.plant !== finalState.plant,
      { before: finalState.plant, after: plantAfterGrant.plant }
    );
    await page.locator('[data-tab="world"]').tap();
    await page.waitForFunction(() => !document.querySelector("#world-tab").hidden);
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


    // Start a test-only 5-second autosave interval before the five-minute load run.
    const autosaveStress = await page.evaluate(async () => {
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

    // Compare 10x and 100x using the real interval loop and real elapsed wall time.
    // 1x is measured below for 60 seconds; 1000x is measured below for 300 seconds.
    const speedComparison = [];
    await page.locator('[data-tab="settings"]').tap();
    await page.waitForFunction(() => !document.querySelector("#settings-tab").hidden);
    if (!(await page.locator("#settings-debug").isChecked())) {
      await page.locator("#settings-debug").check();
      await page.waitForFunction(() => !document.querySelector("#debug-panel").hidden);
    }
    for (const multiplier of [10, 100]) {
      await page.locator("#settings-debug-speed").selectOption(String(multiplier));
      const speedState = await readGameState();
      check(`Debug speed set to ${multiplier}x for real-time measurement`,
        speedState.multiplier === multiplier,
        speedState
      );
      const startedAt = Date.now();
      const initial = await readGameState();
      const samples = [];
      for (const targetSeconds of [1, 5, 15, 30]) {
        const targetAt = startedAt + targetSeconds * 1000;
        while (Date.now() < targetAt) {
          await page.waitForTimeout(Math.min(250, Math.max(10, targetAt - Date.now())));
        }
        const state = await readGameState();
        samples.push({
          elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
          level: state.level,
          exp: state.exp,
          plant: state.plant,
          plantProduction: state.plantProduction,
          ep: state.ep
        });
      }
      const final = await readGameState();
      const plantIncreased = await page.evaluate(async ({ before, after }) => {
        const BigNumber = (await import("./js/number/BigNumber.js")).default;
        return BigNumber.from(after).greater(BigNumber.from(before));
      }, { before: initial.plant, after: final.plant });
      check(`Real-time ${multiplier}x simulation progresses for 30 seconds`,
        final.multiplier === multiplier && (final.level > initial.level || plantIncreased),
        { multiplier, durationSeconds: Date.now() - startedAt, initial, final, samples }
      );
      speedComparison.push({
        multiplier,
        durationSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
        initial,
        samples,
        final,
        plantIncreased
      });
    }
    report.speedComparison = {
      testedMultipliers: [1, 10, 100, 1000],
      note: "1x: 60 seconds; 10x and 100x: 30 seconds each; 1000x: 300 seconds. These are independent wall-clock measurements, not virtual-time results.",
      measurements: speedComparison
    };
    await page.locator("#settings-debug-speed").selectOption("1000");
    await page.locator('[data-tab="world"]').tap();
    await page.waitForFunction(() => !document.querySelector("#world-tab").hidden);

    // 1) Measure five minutes of real-time progression at 1000x. This does not patch Date.now()
    // and does not invoke game.update() manually.
    await page.evaluate(async () => {
      const game = (await import("./js/core/game.js")).default;
      if (game.__wcOriginalUpdate) throw new Error("Game cadence instrumentation already active");
      const originalUpdate = game.update;
      const samples = [];
      let previous = performance.now();
      game.__wcOriginalUpdate = originalUpdate;
      game.__wcCadenceSamples = samples;
      game.update = function (...args) {
        const now = performance.now();
        if (samples.length < 100000) samples.push(now - previous);
        previous = now;
        return originalUpdate.apply(this, args);
      };
    });
    const timeSeries = [];
    const seriesStart = Date.now();
    const seriesInitial = await readGameState();
    for (const targetSeconds of [1, 5, 15, 30, 60, 120, 180, 240, 300]) {
      const targetAt = seriesStart + targetSeconds * 1000;
      while (Date.now() < targetAt) {
        await page.waitForTimeout(Math.min(250, Math.max(10, targetAt - Date.now())));
      }
      const state = await readGameState();
      timeSeries.push({
        elapsedSeconds: Number(((Date.now() - seriesStart) / 1000).toFixed(2)),
        level: state.level,
        exp: state.exp,
        plant: state.plant,
        ep: state.ep,
        heapUsedBytes: await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null),
        metal: (await page.evaluate(async () => {
          const m = await import("./js/resource/Manager.js");
          return m.default.get("metal")?.amount?.toString?.() ?? "0";
        })),
        magic: (await page.evaluate(async () => {
          const m = await import("./js/resource/Manager.js");
          return m.default.get("magic")?.amount?.toString?.() ?? "0";
        }))
      });
    }
    const seriesFinal = await readGameState();
    const cadence = await page.evaluate(async () => {
      const game = (await import("./js/core/game.js")).default;
      const samples = game.__wcCadenceSamples || [];
      game.update = game.__wcOriginalUpdate || game.update;
      delete game.__wcOriginalUpdate;
      delete game.__wcCadenceSamples;
      const sorted = [...samples].sort((a, b) => a - b);
      const percentile = p => sorted.length
        ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]
        : null;
      return {
        updateCount: samples.length,
        medianIntervalMs: percentile(0.5),
        p95IntervalMs: percentile(0.95),
        maxIntervalMs: samples.length ? samples.reduce((max, value) => Math.max(max, value), -Infinity) : null
      };
    });
    check("Real-time progression sampled through 300 seconds",
      seriesFinal.level >= seriesInitial.level &&
      seriesFinal.plant !== seriesInitial.plant &&
      timeSeries.length === 9,
      { samples: timeSeries, initial: seriesInitial, final: seriesFinal }
    );
    check("Real interval loop remains active during five-minute accelerated load",
      cadence.updateCount >= 1000 &&
      cadence.medianIntervalMs !== null &&
      cadence.p95IntervalMs !== null &&
      cadence.maxIntervalMs !== null,
      cadence
    );
    report.realTimeProgression = { samples: timeSeries, durationSeconds: 300, cadence };

    const autosaveResult = await page.evaluate(async () => {
      const save = (await import("./js/core/save.js")).default;
      const raw = localStorage.getItem("world_creator_save");
      let parsed = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch (_) {}
      save.stopAutoSave();
      const settings = (await import("./js/settings/Manager.js")).default;
      settings.set("autoSaveInterval", 30000);
      save.restartAutoSave();
      return {
        exists: Boolean(raw),
        validJson: Boolean(parsed && typeof parsed === "object"),
        version: parsed?.version ?? null,
        timestamp: parsed?.timestamp ?? null
      };
    });
    check("Autosave remains valid during the accelerated long-run test",
      autosaveResult.exists && autosaveResult.validJson && autosaveResult.version === 8,
      { configuration: autosaveStress, result: autosaveResult }
    );
    report.stress = {
      durationSeconds: 300,
      cadence,
      heapSamples: timeSeries.map(sample => ({
        elapsedSeconds: sample.elapsedSeconds,
        heapUsedBytes: sample.heapUsedBytes
      })),
      autosave: autosaveResult
    };

    // 2) Exercise real upgrade purchase controls. The research subsystem is sealed
    // and deliberately excluded from this test suite.
    const creatorWillButton = page.locator('[data-action="upgrade:buy"][data-upgrade-id="creator_will"]');
    if (await creatorWillButton.count() === 1) {
      const beforeUpgrade = await page.evaluate(async () => {
        const m = await import("./js/upgrades/Manager.js");
        return m.default.get("creator_will")?.level ?? 0;
      });
      if (await creatorWillButton.isEnabled()) await creatorWillButton.tap();
      await page.waitForTimeout(100);
      const afterUpgrade = await page.evaluate(async () => {
        const m = await import("./js/upgrades/Manager.js");
        return m.default.get("creator_will")?.level ?? 0;
      });
      check("Upgrade purchase through visible UI changes its level",
        afterUpgrade > beforeUpgrade,
        { before: beforeUpgrade, after: afterUpgrade }
      );
    } else {
      check("Upgrade purchase control is present", false, { selector: '[data-action="upgrade:buy"][data-upgrade-id="creator_will"]' });
    }

    await page.locator('[data-tab="settings"]').tap();
    await page.waitForFunction(() => !document.querySelector("#settings-tab").hidden);
    if (await page.locator("#settings-debug").isChecked()) await page.locator("#settings-debug").uncheck();
    await page.locator("#settings-tick-speed").fill("1000");
    await page.locator("#settings-tick-speed").dispatchEvent("change");
    await page.waitForTimeout(100);
    const normalSpeedState = await page.evaluate(async () => {
      const [settingsModule, gameModule] = await Promise.all([
        import("./js/settings/Manager.js"),
        import("./js/core/game.js")
      ]);
      return {
        debugMode: settingsModule.default.isDebugMode(),
        speedMultiplier: settingsModule.default.getGameSpeedMultiplier(),
        tickSpeed: settingsModule.default.getTickSpeed(),
        running: gameModule.default.running
      };
    });
    check("Persistence tests run at normal game speed",
      !normalSpeedState.debugMode && normalSpeedState.speedMultiplier === 1 &&
      normalSpeedState.tickSpeed === 1000 && normalSpeedState.running,
      normalSpeedState
    );

    // Verify actual 1x progression separately from debug acceleration.
    // This samples the normal browser interval loop over real elapsed time.
    const normalSeriesStart = Date.now();
    const normalSeriesInitial = await readGameState();
    const normalTimeSeries = [];
    for (const targetSeconds of [1, 5, 15, 30, 60]) {
      const targetAt = normalSeriesStart + targetSeconds * 1000;
      while (Date.now() < targetAt) {
        await page.waitForTimeout(Math.min(250, Math.max(10, targetAt - Date.now())));
      }
      const state = await readGameState();
      normalTimeSeries.push({
        elapsedSeconds: Number(((Date.now() - normalSeriesStart) / 1000).toFixed(2)),
        level: state.level,
        exp: state.exp,
        plant: state.plant,
        plantProduction: state.plantProduction,
        ep: state.ep
      });
    }
    const normalSeriesFinal = await readGameState();
    const normalSeriesIncreased = await page.evaluate(async ({ before, after }) => {
      const module = await import("./js/number/BigNumber.js");
      const BigNumber = module.default;
      return BigNumber.from(after).greater(BigNumber.from(before));
    }, { before: normalSeriesInitial.plant, after: normalSeriesFinal.plant });
    check("Normal 1x game loop progresses over 60 real seconds",
      normalSpeedState.speedMultiplier === 1 &&
      normalTimeSeries.length === 5 &&
      (normalSeriesFinal.level > normalSeriesInitial.level || normalSeriesIncreased),
      { samples: normalTimeSeries, initial: normalSeriesInitial, final: normalSeriesFinal }
    );
    report.normalSpeedProgression = {
      samples: normalTimeSeries,
      durationSeconds: 60,
      initial: normalSeriesInitial,
      final: normalSeriesFinal
    };

    // 3) Save/reload/restore through the actual SaveManager and page lifecycle; research remains out of scope.
    const beforeReload = await page.evaluate(async () => {
      const [saveModule, worldModule, resourceModule, epModule, statisticsModule] = await Promise.all([
        import("./js/core/save.js"),
        import("./js/world/Manager.js"),
        import("./js/resource/Manager.js"),
        import("./js/ep/Manager.js"),
        import("./js/statistics/Manager.js")
      ]);
      saveModule.default.save();
      return {
        worldCount: worldModule.default.getAll().length,
        level: worldModule.default.getActive()?.level ?? null,
        plant: resourceModule.default.get("plant")?.amount?.toString?.() ?? "0",
        ep: epModule.default.get()?.toString?.() ?? null,
        upgradeLevel: (await import("./js/upgrades/Manager.js")).default.get("creator_will")?.level ?? 0,
        offlineTime: statisticsModule.default.getOfflineTime(),
        saved: Boolean(localStorage.getItem("world_creator_save"))
      };
    });
    check("SaveManager writes a restorable save", beforeReload.saved && beforeReload.worldCount > 0, beforeReload);
    await page.addInitScript(() => {
      // beforeunload updates the timestamp on the old document; set the
      // synthetic closed duration again before the new app initializes.
      localStorage.setItem("world_creator_last_time", String(Date.now() - 60000));
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.appReady === "true", null, { timeout: 20000 });
    const afterReload = await page.evaluate(async () => {
      const [worldModule, resourceModule, epModule, statisticsModule] = await Promise.all([
        import("./js/world/Manager.js"),
        import("./js/resource/Manager.js"),
        import("./js/ep/Manager.js"),
        import("./js/statistics/Manager.js")
      ]);
      return {
        worldCount: worldModule.default.getAll().length,
        level: worldModule.default.getActive()?.level ?? null,
        plant: resourceModule.default.get("plant")?.amount?.toString?.() ?? "0",
        ep: epModule.default.get()?.toString?.() ?? null,
        upgradeLevel: (await import("./js/upgrades/Manager.js")).default.get("creator_will")?.level ?? 0,
        offlineTime: statisticsModule.default.getOfflineTime()
      };
    });
    check("Saved world and resources restore after page reload",
      afterReload.worldCount === beforeReload.worldCount &&
      afterReload.level === beforeReload.level &&
      afterReload.upgradeLevel === beforeReload.upgradeLevel &&
      afterReload.plant !== "0",
      { before: beforeReload, after: afterReload }
    );

    // Offline progression uses a synthetic last-play timestamp, while the
    // calculation itself runs during normal app initialization.
    const offlineBefore = beforeReload.plant;
    const offlineAfter = afterReload.plant;
    const offlineIncreased = await page.evaluate(async ({ before, after }) => {
      const module = await import("./js/number/BigNumber.js");
      const BigNumber = module.default;
      return BigNumber.from(after).greater(BigNumber.from(before));
    }, { before: offlineBefore, after: offlineAfter });
    check("Offline progress applies the synthetic 60-second closed interval",
      offlineIncreased &&
      afterReload.offlineTime >= beforeReload.offlineTime + 60,
      {
        before: offlineBefore,
        after: offlineAfter,
        offlineTimeBefore: beforeReload.offlineTime,
        offlineTimeAfter: afterReload.offlineTime,
        elapsedSyntheticMs: 60000
      }
    );
    report.persistence = { beforeReload, afterReload, offlineBefore, offlineAfter, syntheticOfflineMs: 60000 };

    // Malformed-save recovery is isolated in a separate browser context.
    const malformedContext = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
    const malformedPage = await malformedContext.newPage();
    await malformedPage.addInitScript(() => localStorage.setItem("world_creator_save", "{ definitely not valid JSON"));
    await malformedPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await malformedPage.waitForFunction(() => document.documentElement.dataset.appReady === "true", null, { timeout: 20000 });
    const malformedResult = await malformedPage.evaluate(() => ({
      appReady: document.documentElement.dataset.appReady === "true",
      saveRemoved: localStorage.getItem("world_creator_save") === null,
      worldCards: document.querySelectorAll(".world-card").length
    }));
    check("Malformed save is rejected and removed without preventing app startup",
      malformedResult.appReady && malformedResult.saveRemoved,
      malformedResult
    );
    await malformedContext.close();

    // Change only the version marker in an otherwise valid serialized save.
    const legacyRaw = await page.evaluate(() => {
      const raw = localStorage.getItem("world_creator_save");
      return raw ? raw.replace(/"version"\s*:\s*8/, '"version":1') : null;
    });
    const legacyContext = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
    const legacyPage = await legacyContext.newPage();
    await legacyPage.addInitScript(raw => {
      if (raw) localStorage.setItem("world_creator_save", raw);
      localStorage.setItem("world_creator_last_time", String(Date.now()));
    }, legacyRaw);
    await legacyPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await legacyPage.waitForFunction(() => document.documentElement.dataset.appReady === "true", null, { timeout: 20000 });
    const legacyResult = await legacyPage.evaluate(() => {
      const raw = localStorage.getItem("world_creator_save");
      let parsed = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch (_) {}
      return {
        appReady: document.documentElement.dataset.appReady === "true",
        saveRetained: Boolean(raw),
        version: parsed?.version ?? null,
        worldCards: document.querySelectorAll(".world-card").length
      };
    });
    check("Legacy version save loads without crashing and remains available",
      Boolean(legacyRaw) && legacyResult.appReady && legacyResult.saveRetained && legacyResult.version === 1,
      { legacyResult }
    );
    report.saveRecovery = { malformed: malformedResult, legacy: legacyResult };
    await legacyContext.close();

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
