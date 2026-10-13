const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "http://127.0.0.1:4173/";
const SPEEDS = [1, 10, 100, 1000];
const MAX_REAL_SECONDS = 24 * 60 * 60;
const REPORT_DIR = path.join(process.cwd(), "test-results");
fs.mkdirSync(REPORT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const errors = [];

  async function preparePage(speed) {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on("pageerror", e => errors.push({ speed, type: "pageerror", message: String(e) }));
    page.on("console", m => {
      if (m.type() === "error") errors.push({ speed, type: "console", message: m.text() });
    });
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.dataset.appReady === "true", null, { timeout: 20000 });
    await page.locator('[data-tab="settings"]').tap();
    await page.waitForFunction(() => !document.querySelector("#settings-tab").hidden);
    if (!(await page.locator("#settings-debug").isChecked())) {
      await page.locator("#settings-debug").check();
    }
    await page.locator("#settings-debug-speed").selectOption(String(speed));
    await page.locator("#settings-tick-speed").fill("1000");
    await page.locator("#settings-tick-speed").dispatchEvent("change");
    page.once("dialog", dialog => dialog.accept());
    await page.locator("#debug-reset").tap();
    await page.waitForTimeout(250);
    await page.locator('[data-tab="world"]').tap();
    await page.waitForFunction(() => !document.querySelector("#world-tab").hidden);
    await page.waitForFunction(() => document.querySelectorAll(".world-card").length > 0, null, { timeout: 10000 });
    return { context, page };
  }

  for (const speed of SPEEDS) {
    const { context, page } = await preparePage(speed);
    const result = await page.evaluate(async ({ speed, maxRealSeconds }) => {
      const [
        gameModule, worldModule, settingsModule, resourceModule, epModule,
        upgradeModule, achievementModule, eventBusModule, numberModule
      ] = await Promise.all([
        import("./js/core/game.js"),
        import("./js/world/Manager.js"),
        import("./js/settings/Manager.js"),
        import("./js/resource/Manager.js"),
        import("./js/ep/Manager.js"),
        import("./js/upgrades/Manager.js"),
        import("./js/achievements/Manager.js"),
        import("./js/core/eventBus.js"),
        import("./js/number/BigNumber.js")
      ]);

      const Game = gameModule.default;
      const WorldManager = worldModule.default;
      const SettingsManager = settingsModule.default;
      const ResourceManager = resourceModule.default;
      const EPManager = epModule.default;
      const UpgradeManager = upgradeModule.default;
      const AchievementManager = achievementModule.default;
      const eventBus = eventBusModule.default;
      const BigNumber = numberModule.default;

      Game.stop();
      SettingsManager.set("debugMode", true);
      SettingsManager.set("debugSpeedMultiplier", speed);
      SettingsManager.set("tickSpeed", 1000);

      const originalEmit = eventBus.emit;
      eventBus.emit = () => {};
      const upgradeList = UpgradeManager.getByType("infinite").filter(u => u.id !== "creator_will");
      const allInfinite = UpgradeManager.getByType("infinite");
      const world = WorldManager.getActive();
      if (!world) throw new Error("No active world after debug reset");

      const avgLevel = () => upgradeList.reduce((sum, u) => sum + u.level, 0) / Math.max(1, upgradeList.length);
      const snapshots = [];
      const purchases = [];
      let conversionFallbackCount = 0;
      let realSeconds = 0;
      let simSeconds = 0;
      let previousAverage = avgLevel();

      function buyCheapestAffordable() {
        let guard = 0;
        while (guard++ < 1) {
          const candidates = allInfinite
            .filter(u => u.isUnlocked() && !u.isMaxed() && u.canBuy())
            .sort((a, b) => {
              const ca = a.getCost();
              const cb = b.getCost();
              if (ca.less(cb)) return -1;
              if (ca.greater(cb)) return 1;
              return a.id.localeCompare(b.id);
            });
          if (!candidates.length) break;
          const selected = candidates[0];
          const before = selected.level;
          if (!UpgradeManager.buy(selected.id)) break;
          purchases.push({ realSeconds, simulatedSeconds: simSeconds, id: selected.id, level: before + 1 });
        }
      }

      function convertResources() {
        // Match the current recipes: 10 units of any material yield 1 EP.
        // Bulk conversion avoids making millions of individual UI conversions.
        for (const id of ["plant", "metal", "magic"]) {
          const resource = ResourceManager.get(id);
          const amount = resource?.amount?.toNumber?.();
          if (!Number.isFinite(amount) || amount < 10) continue;
          const count = Math.floor(amount / 10);
          if (count <= 0) continue;
          ResourceManager.consume(id, BigNumber.from(count * 10));
          EPManager.add(BigNumber.from(count).multiply(AchievementManager.getTotalMultiplier()));
        }
      }

      function capture(force = false) {
        const average = avgLevel();
        if (!force && snapshots.length && snapshots[snapshots.length - 1].realSeconds === realSeconds) return;
        snapshots.push({
          realSeconds,
          simulatedSeconds: simSeconds,
          worldLevel: world.level,
          worldExp: String(world.exp),
          averageUpgradeLevel: Number(average.toFixed(4)),
          upgradeLevels: Object.fromEntries(upgradeList.map(u => [u.id, u.level])),
          creatorWillLevel: UpgradeManager.get("creator_will")?.level ?? 0,
          ep: String(EPManager.get()),
          resources: Object.fromEntries(["plant", "metal", "magic"].map(id => [id, String(ResourceManager.get(id)?.amount)]))
        });
        previousAverage = average;
      }

      capture(true);
      for (let tick = 1; tick <= maxRealSeconds; tick++) {
        // One deterministic test tick represents the configured 1000 ms game-loop interval.
        world.update(speed);
        AchievementManager.update({
          worldManager: WorldManager,
          upgradeManager: UpgradeManager,
          researchManager: undefined
        });
        convertResources();
        realSeconds = tick;
        simSeconds += speed;
        buyCheapestAffordable();

        const avg = avgLevel();
        if (tick % 30 === 0 || world.level >= 100 || avg !== previousAverage) capture(true);
        if (world.level >= 100) {
          capture(true);
          break;
        }
      }

      eventBus.emit = originalEmit;
      return {
        speed,
        tickSpeedMs: 1000,
        status: world.level >= 100 ? "reached-level-100" : "time-limit",
        realSeconds,
        simulatedSeconds: simSeconds,
        worldLevel: world.level,
        averageUpgradeLevel: Number(avgLevel().toFixed(4)),
        upgradeLevels: Object.fromEntries(upgradeList.map(u => [u.id, u.level])),
        creatorWillLevel: UpgradeManager.get("creator_will")?.level ?? 0,
        purchasesCount: purchases.length,
        conversionFallbackCount,
        purchaseLog: purchases.slice(0, 200),
        snapshots
      };
    }, { speed, maxRealSeconds: MAX_REAL_SECONDS });

    results.push(result);
    await context.close();
    console.log("SPEED_STUDY_SUMMARY " + JSON.stringify({ speed: result.speed, status: result.status, realSeconds: result.realSeconds, simulatedSeconds: result.simulatedSeconds, worldLevel: result.worldLevel, averageUpgradeLevel: result.averageUpgradeLevel, upgradeLevels: result.upgradeLevels, creatorWillLevel: result.creatorWillLevel, purchasesCount: result.purchasesCount }));
    console.log("SPEED_STUDY_SERIES " + JSON.stringify(result.snapshots.map(s => [s.realSeconds, s.averageUpgradeLevel, s.worldLevel])));
    if (result.status !== "reached-level-100") {
      console.warn("SPEED_STUDY_LIMIT " + JSON.stringify({ speed, realSeconds: result.realSeconds, worldLevel: result.worldLevel }));
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    method: {
      tickSpeedMs: 1000,
      speeds: SPEEDS,
      purchaseRule: "Each tick converts all plant/metal/magic to EP, then buys one currently cheapest affordable infinite upgrade per game tick. Creator's Will participates in purchasing but is excluded from the average.",
      averageDefinition: "Arithmetic mean of levels for divine_revelation, heavenly_blessing, and world_tree.",
      timeDefinition: "realSeconds = 1000 ms game-loop ticks; simulatedSeconds = realSeconds multiplied by the speed multiplier.",
      caveat: "Deterministic browser simulation using production World.update, UpgradeManager and AchievementManager logic, with the current material-to-EP rate (10:1) applied in bulk. UI event emissions are muted during the loop for speed; research is not purchased or tested."
    },
    results,
    errors
  };
  fs.writeFileSync(path.join(REPORT_DIR, "upgrade-speed-study.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, "upgrade-speed-study.csv"), [
    "speed,realSeconds,simulatedSeconds,worldLevel,averageUpgradeLevel,divine_revelation,heavenly_blessing,world_tree,creator_will",
    ...results.flatMap(r => r.snapshots.map(s => [
      r.speed, s.realSeconds, s.simulatedSeconds, s.worldLevel, s.averageUpgradeLevel,
      s.upgradeLevels.divine_revelation, s.upgradeLevels.heavenly_blessing,
      s.upgradeLevels.world_tree, s.creatorWillLevel
    ].join(",")))
  ].join("\n"));
  fs.writeFileSync(path.join(REPORT_DIR, "upgrade-speed-study-summary.json"), JSON.stringify(results.map(r => ({
    speed: r.speed,
    status: r.status,
    realSeconds: r.realSeconds,
    simulatedSeconds: r.simulatedSeconds,
    worldLevel: r.worldLevel,
    averageUpgradeLevel: r.averageUpgradeLevel,
    upgradeLevels: r.upgradeLevels,
    creatorWillLevel: r.creatorWillLevel,
    purchasesCount: r.purchasesCount,
    conversionFallbackCount: r.conversionFallbackCount
  })), null, 2));

  await browser.close();
  if (results.some(r => r.status !== "reached-level-100")) {
    console.error("At least one speed failed to reach World Lv100 within the test horizon.");
    process.exitCode = 1;
  }
  if (errors.length) {
    console.error("Browser errors during speed study:", JSON.stringify(errors));
    process.exitCode = 1;
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
