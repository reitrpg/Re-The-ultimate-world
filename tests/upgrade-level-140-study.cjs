const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "http://127.0.0.1:4173/";
const SPEED = 10;
const TICK_MS = 1000;
const TARGET_AVERAGE_LEVEL = 140;
const MAX_REAL_SECONDS = 7 * 24 * 60 * 60;
const FIXED_SEED = "WC-10X-AVG140-20261014";
const REPORT_DIR = path.join(process.cwd(), "test-results");
fs.mkdirSync(REPORT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push({ type: "pageerror", message: String(e) }));
  page.on("console", m => {
    if (m.type() === "error") errors.push({ type: "console", message: m.text() });
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForFunction(() => document.documentElement.dataset.appReady === "true", null, { timeout: 20000 });

  const result = await page.evaluate(async ({ speed, tickMs, targetAverage, maxRealSeconds, fixedSeed }) => {
    const [
      gameModule, worldModule, settingsModule, resourceModule, epModule,
      upgradeModule, researchModule, achievementModule, eventBusModule,
      numberModule, converterModule, rebirthModule, statisticsModule,
      unlockModule
    ] = await Promise.all([
      import("./js/core/game.js"),
      import("./js/world/Manager.js"),
      import("./js/settings/Manager.js"),
      import("./js/resource/Manager.js"),
      import("./js/ep/Manager.js"),
      import("./js/upgrades/Manager.js"),
      import("./js/research/Manager.js"),
      import("./js/achievements/Manager.js"),
      import("./js/core/eventBus.js"),
      import("./js/number/BigNumber.js"),
      import("./js/converter/Converter.js"),
      import("./js/rebirth/Manager.js"),
      import("./js/statistics/Manager.js"),
      import("./js/world/UnlockManager.js")
    ]);

    const Game = gameModule.default;
    const WorldManager = worldModule.default;
    const SettingsManager = settingsModule.default;
    const ResourceManager = resourceModule.default;
    const EPManager = epModule.default;
    const UpgradeManager = upgradeModule.default;
    const ResearchManager = researchModule.default;
    const AchievementManager = achievementModule.default;
    const eventBus = eventBusModule.default;
    const BigNumber = numberModule.default;
    const Converter = converterModule.default;
    const NewBirthManager = rebirthModule.default;
    const StatisticsManager = statisticsModule.default;
    const UnlockManager = unlockModule.default;

    Game.stop();
    SettingsManager.set("debugMode", true);
    SettingsManager.set("debugSpeedMultiplier", speed);
    SettingsManager.set("tickSpeed", tickMs);

    // Start from a clean, reproducible game state. No debug resource grants are used.
    EPManager.reset();
    ResourceManager.clear();
    ResearchManager.reset();
    UpgradeManager.reset();
    WorldManager.clear();
    WorldManager.create(fixedSeed);
    AchievementManager.reset();
    StatisticsManager.reset();
    UnlockManager.reset();
    NewBirthManager.reset();

    const originalEmit = eventBus.emit;
    eventBus.emit = () => {};

    const trackedUpgrades = ["divine_revelation", "heavenly_blessing", "world_tree"];
    const infiniteUpgrades = UpgradeManager.getByType("infinite");
    const snapshots = [];
    const purchaseCounts = { infinite: 0, limited: 0, research: 0, rebirth: 0, conversions: 0 };
    const actionLog = [];
    let realSeconds = 0;
    let simulatedSeconds = 0;
    let world = WorldManager.getActive();

    const averageLevel = () => trackedUpgrades.reduce((sum, id) => sum + (UpgradeManager.get(id)?.level || 0), 0) / 3;

    function capture(force = false) {
      const average = averageLevel();
      const last = snapshots[snapshots.length - 1];
      if (!force && last && last.realSeconds === realSeconds) return;
      const levels = Object.fromEntries(trackedUpgrades.map(id => [id, UpgradeManager.get(id).level]));
      snapshots.push({
        realSeconds,
        simulatedSeconds,
        worldLevel: world.level,
        averageUpgradeLevel: Number(average.toFixed(4)),
        upgradeLevels: levels,
        creatorWillLevel: UpgradeManager.get("creator_will")?.level ?? 0,
        researchLevels: Object.fromEntries(ResearchManager.getAll().map(r => [r.id, r.level])),
        rebirthCount: NewBirthManager.getCount(),
        ep: String(EPManager.get()),
        resources: Object.fromEntries(["plant", "metal", "magic"].map(id => [id, String(ResourceManager.get(id)?.amount)]))
      });
    }

    function buyAffordableLimitedUpgrades() {
      // Buy each available limited upgrade as soon as possible; automation itself remains unused.
      let boughtThisPass = 0;
      const maxPurchasesPerPass = 1000;
      while (boughtThisPass < maxPurchasesPerPass) {
        const candidates = UpgradeManager.getByType("limited")
          .filter(u => u.id !== "automation_unlock" && u.isUnlocked() && !u.isMaxed() && u.canBuy())
          .sort((a, b) => {
            const ca = a.getCost();
            const cb = b.getCost();
            if (ca.less(cb)) return -1;
            if (ca.greater(cb)) return 1;
            return a.id.localeCompare(b.id);
          });
        if (!candidates.length) break;
        const selected = candidates[0];
        if (!UpgradeManager.buy(selected.id)) break;
        boughtThisPass++;
        purchaseCounts.limited++;
        actionLog.push({ realSeconds, action: "limited-upgrade", id: selected.id, level: selected.level });
      }
      return boughtThisPass;
    }

    function convertAllMaterials() {
      // Uses the game's actual 10:1 conversion recipes and the production conversion manager.
      for (const id of ["plant_to_ep", "metal_to_ep", "magic_to_ep"]) {
        const recipe = Converter.getRecipe(id);
        if (!recipe) continue;
        const before = ResourceManager.get(recipe.resourceId)?.amount;
        if (before && before.greaterOrEqual(recipe.resourceCost)) {
          const converted = Converter.convertAll(id);
          if (converted > 0) {
            purchaseCounts.conversions++;
            actionLog.push({ realSeconds, action: "convert-all", id, converted });
          }
        }
      }
    }

    function buyInfiniteUpgradesByAscendingCost() {
      if (averageLevel() >= targetAverage) return 0;
      let totalLevelsBought = 0;
      let guard = 0;
      while (guard++ < 1000 && averageLevel() < targetAverage) {
        const candidates = infiniteUpgrades
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
        const buyMaxUpgrade = UpgradeManager.get("buy_max_" + selected.id);
        let bought;
        if (buyMaxUpgrade?.level >= 1) {
          bought = UpgradeManager.buyAll(selected.id);
        } else {
          bought = UpgradeManager.buy(selected.id) ? 1 : 0;
        }
        if (!bought) break;

        const gained = selected.level - before;
        totalLevelsBought += gained;
        purchaseCounts.infinite += gained;
        if (gained > 0) actionLog.push({
          realSeconds,
          action: buyMaxUpgrade?.level >= 1 ? "buy-all-infinite" : "infinite-upgrade",
          id: selected.id,
          levelsBought: gained,
          level: selected.level
        });
      }
      return totalLevelsBought;
    }


    capture(true);
    let status = "time-limit";
    for (let tick = 1; tick <= maxRealSeconds; tick++) {
      realSeconds = tick;
      // 10x is only the measurement accelerator: 10 simulated seconds pass per real second.
      // Purchases/actions occur once per real-time tick and are never multiplied by 10.
      WorldManager.update(speed);
      AchievementManager.update({
        worldManager: WorldManager,
        upgradeManager: UpgradeManager,
        researchManager: ResearchManager
      });

      world = WorldManager.getActive();

      // Rebirth is used whenever its real in-game condition is met, since it permanently raises production.
      if (NewBirthManager.canNewBirth() && NewBirthManager.newBirth()) {
        purchaseCounts.rebirth++;
        actionLog.push({ realSeconds: tick, action: "rebirth", count: NewBirthManager.getCount() });
      }

      convertAllMaterials();
      // Research is intentionally unavailable in this study; only currently implemented first-section systems are used.
      // Repeated purchases are immediate manual actions, not actions multiplied by the 10x time accelerator.
      for (let actionPass = 0; actionPass < 1000 && averageLevel() < targetAverage; actionPass++) {
        const limitedBought = buyAffordableLimitedUpgrades() || 0;
        const infiniteBought = buyInfiniteUpgradesByAscendingCost() || 0;
        if (limitedBought === 0 && infiniteBought === 0) break;
      }
      AchievementManager.update({
        worldManager: WorldManager,
        upgradeManager: UpgradeManager,
        researchManager: ResearchManager
      });

      realSeconds = tick;
      simulatedSeconds += speed;

      const avg = averageLevel();
      if (tick % 10 === 0 || avg >= targetAverage || tick === 1) capture(true);
      if (avg >= targetAverage) {
        capture(true);
        status = "reached-average-level-140";
        break;
      }
    }

    eventBus.emit = originalEmit;
    return {
      status,
      speed,
      tickSpeedMs: tickMs,
      targetAverageLevel: targetAverage,
      averageDefinition: "Arithmetic mean of divine_revelation, heavenly_blessing and world_tree; creator_will excluded.",
      realSeconds,
      simulatedSeconds,
      worldLevel: world.level,
      averageUpgradeLevel: Number(averageLevel().toFixed(4)),
      upgradeLevels: Object.fromEntries(trackedUpgrades.map(id => [id, UpgradeManager.get(id).level])),
      creatorWillLevel: UpgradeManager.get("creator_will")?.level ?? 0,
      researchLevels: Object.fromEntries(ResearchManager.getAll().map(r => [r.id, r.level])),
      rebirthCount: NewBirthManager.getCount(),
      purchaseCounts,
      actionLog,
      snapshots,
      errors: []
    };
  }, { speed: SPEED, tickMs: TICK_MS, targetAverage: TARGET_AVERAGE_LEVEL, maxRealSeconds: MAX_REAL_SECONDS, fixedSeed: FIXED_SEED });

  await context.close();
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    method: {
      speed: SPEED,
      tickSpeedMs: TICK_MS,
      targetAverageLevel: TARGET_AVERAGE_LEVEL,
      seed: FIXED_SEED,
      measurementRule: "Each 1000 ms real-time test tick advances the game by 10 simulated seconds. The speed multiplier is not applied to purchase/action count.",
      playStrategy: [
        "Automation is not unlocked or used.",
        "Research is intentionally deferred until the second section; no research purchases or effects are used.",
        "Buy affordable limited upgrades immediately, excluding the automation unlock upgrade.",
        "Each buy-all unlock upgrade costs 1e3 EP and enables the matching infinite upgrade's buy-all button.",
        "Use the game's 10:1 material-to-EP conversion whenever materials are available.",
        "Repeated manual purchases are processed immediately; the 10x multiplier advances simulated game time only and does not multiply action counts.",
        "Use rebirth whenever the in-game condition is met.",
        "Achievements are evaluated using the production AchievementManager."
      ],
      averageDefinition: "Arithmetic mean of divine_revelation, heavenly_blessing and world_tree; creator_will excluded.",
      scopeNote: "The current repository contains no active equipment, story, or challenge gameplay modules, so these cannot be used in this run."
    },
    result,
    browserErrors: errors
  };

  fs.writeFileSync(path.join(REPORT_DIR, "upgrade-level-140-study.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, "upgrade-level-140-study-summary.json"), JSON.stringify({
    status: result.status,
    speed: result.speed,
    tickSpeedMs: result.tickSpeedMs,
    targetAverageLevel: result.targetAverageLevel,
    realSeconds: result.realSeconds,
    simulatedSeconds: result.simulatedSeconds,
    worldLevel: result.worldLevel,
    averageUpgradeLevel: result.averageUpgradeLevel,
    upgradeLevels: result.upgradeLevels,
    creatorWillLevel: result.creatorWillLevel,
    researchLevels: result.researchLevels,
    rebirthCount: result.rebirthCount,
    purchaseCounts: result.purchaseCounts,
    browserErrors: errors
  }, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, "upgrade-level-140-study.csv"), [
    "realSeconds,simulatedSeconds,worldLevel,averageUpgradeLevel,divine_revelation,heavenly_blessing,world_tree,creator_will,rebirthCount",
    ...result.snapshots.map(s => [
      s.realSeconds, s.simulatedSeconds, s.worldLevel, s.averageUpgradeLevel,
      s.upgradeLevels.divine_revelation, s.upgradeLevels.heavenly_blessing,
      s.upgradeLevels.world_tree, s.creatorWillLevel, s.rebirthCount
    ].join(","))
  ].join("\n"));

  console.log("LEVEL_140_STUDY_SUMMARY " + JSON.stringify({
    status: result.status,
    speed: result.speed,
    realSeconds: result.realSeconds,
    simulatedSeconds: result.simulatedSeconds,
    worldLevel: result.worldLevel,
    averageUpgradeLevel: result.averageUpgradeLevel,
    upgradeLevels: result.upgradeLevels,
    creatorWillLevel: result.creatorWillLevel,
    researchLevels: result.researchLevels,
    rebirthCount: result.rebirthCount,
    purchaseCounts: result.purchaseCounts,
    browserErrors: errors
  }));
  console.log("LEVEL_140_STUDY_SERIES " + JSON.stringify(result.snapshots.map(s => [
    s.realSeconds, s.averageUpgradeLevel, s.upgradeLevels.divine_revelation,
    s.upgradeLevels.heavenly_blessing, s.upgradeLevels.world_tree, s.worldLevel
  ])));
  if (result.status !== "reached-average-level-140" || errors.length) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  process.exit(1);
});
