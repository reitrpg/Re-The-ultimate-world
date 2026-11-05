const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "http://127.0.0.1:4173/";
const SPEED = 10;
const TICK_MS = 1000;
const MAX_REAL_SECONDS = 60 * 60;
const FIXED_SEED = "WC-EP-1P8E308-20261105";
const TARGET_EP = { mantissa: 180, exponent: 102, layer: 0 };
const REPORT_DIR = path.join(process.cwd(), "test-results");
fs.mkdirSync(REPORT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push({ type: "pageerror", message: String(error) }));
  page.on("console", message => {
    if (message.type() === "error") errors.push({ type: "console", message: message.text() });
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForFunction(() => document.documentElement.dataset.appReady === "true", null, { timeout: 20000 });

  const result = await page.evaluate(async ({ speed, tickMs, maxRealSeconds, fixedSeed, targetEp }) => {
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
    const Settings = settingsModule.default;
    const Resources = resourceModule.default;
    const EP = epModule.default;
    const Upgrades = upgradeModule.default;
    const Research = researchModule.default;
    const Achievements = achievementModule.default;
    const eventBus = eventBusModule.default;
    const BigNumber = numberModule.default;
    const Converter = converterModule.default;
    const NewBirth = rebirthModule.default;
    const Statistics = statisticsModule.default;
    const Unlocks = unlockModule.default;
    const target = BigNumber.from(targetEp);

    Game.stop();
    Settings.set("debugMode", true);
    Settings.set("debugSpeedMultiplier", speed);
    Settings.set("tickSpeed", tickMs);

    EP.reset();
    Resources.clear();
    Research.reset();
    Upgrades.reset();
    WorldManager.clear();
    WorldManager.create(fixedSeed);
    Achievements.reset();
    Statistics.reset();
    Unlocks.reset();
    NewBirth.reset();

    const originalEmit = eventBus.emit;
    eventBus.emit = () => {};

    const snapshots = [];
    const actionCounts = {
      infiniteUpgradeLevelsBought: 0,
      limitedUpgradesBought: 0,
      conversions: 0,
      rebirths: 0,
      worldUnlocks: 0,
      researchPurchases: 0
    };
    const actions = [];
    let world = WorldManager.getActive();
    let status = "time-limit";
    let lastSnapshotSecond = -1;

    const trackedIds = ["divine_revelation", "heavenly_blessing", "world_tree"];
    const averageTrackedLevel = () =>
      trackedIds.reduce((sum, id) => sum + (Upgrades.get(id)?.level || 0), 0) / trackedIds.length;

    function capture(realSeconds, force = false) {
      if (!force && realSeconds - lastSnapshotSecond < 10) return;
      lastSnapshotSecond = realSeconds;
      world = WorldManager.getActive();
      snapshots.push({
        realSeconds,
        simulatedSeconds: realSeconds * speed,
        ep: EP.get().toString(),
        epReachedTarget: EP.get().greaterOrEqual(target),
        totalEP: Statistics.getTotalEP().toString(),
        resources: Object.fromEntries(["plant", "metal", "magic"].map(id => [
          id, Resources.get(id)?.amount?.toString?.() ?? "0"
        ])),
        worldLevel: world?.level ?? null,
        worldTotalExperience: world?.totalExperience?.toString?.() ?? "0",
        newBirthMultiplier: world?.newBirthMultiplier?.toString?.() ?? "1",
        nextNewBirthMultiplier: world?.getNewBirthMultiplier?.().toString?.() ?? "1",
        newBirthCount: NewBirth.getCount(),
        trackedUpgradeLevels: Object.fromEntries(trackedIds.map(id => [id, Upgrades.get(id)?.level ?? 0])),
        creatorWillLevel: Upgrades.get("creator_will")?.level ?? 0
      });
    }

    function buyLimited() {
      let bought = 0;
      for (let guard = 0; guard < 1000; guard++) {
        const candidates = Upgrades.getByType("limited")
          .filter(upgrade =>
            upgrade.id !== "automation_unlock" &&
            upgrade.isUnlocked() &&
            !upgrade.isMaxed() &&
            upgrade.canBuy()
          )
          .sort((a, b) => {
            const ca = a.getCost();
            const cb = b.getCost();
            if (ca.less(cb)) return -1;
            if (ca.greater(cb)) return 1;
            return a.id.localeCompare(b.id);
          });
        if (!candidates.length) break;
        const selected = candidates[0];
        if (!Upgrades.buy(selected.id)) break;
        bought++;
        actionCounts.limitedUpgradesBought++;
        actions.push({ second: currentSecond, type: "limited", id: selected.id, level: selected.level });
      }
      return bought;
    }

    function buyInfinite() {
      let boughtLevels = 0;
      for (let guard = 0; guard < 1000; guard++) {
        const candidates = Upgrades.getByType("infinite")
          .filter(upgrade => upgrade.isUnlocked() && !upgrade.isMaxed() && upgrade.canBuy())
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
        const bulkUnlock = Upgrades.get("buy_max_" + selected.id);
        const bought = bulkUnlock?.level >= 1
          ? Upgrades.buyAll(selected.id)
          : (Upgrades.buy(selected.id) ? 1 : 0);
        if (!bought) break;

        const gained = selected.level - before;
        boughtLevels += gained;
        actionCounts.infiniteUpgradeLevelsBought += gained;
        actions.push({
          second: currentSecond,
          type: bulkUnlock?.level >= 1 ? "infinite-buy-all" : "infinite",
          id: selected.id,
          levelsBought: gained,
          level: selected.level
        });
      }
      return boughtLevels;
    }

    function convertMaterials() {
      let converted = 0;
      for (const id of ["plant_to_ep", "metal_to_ep", "magic_to_ep"]) {
        const recipe = Converter.getRecipe(id);
        const resource = recipe && Resources.get(recipe.resourceId);
        if (!resource || resource.amount.less(recipe.resourceCost)) continue;
        const count = Converter.convertAll(id);
        if (count > 0) {
          converted++;
          actionCounts.conversions++;
          actions.push({ second: currentSecond, type: "convert-all", id, count });
        }
      }
      return converted;
    }

    let currentSecond = 0;
    capture(0, true);
    for (let second = 1; second <= maxRealSeconds; second++) {
      currentSecond = second;
      WorldManager.update(speed);
      Achievements.update({
        worldManager: WorldManager,
        upgradeManager: Upgrades,
        researchManager: Research
      });

      if (NewBirth.canNewBirth() && NewBirth.newBirth()) {
        actionCounts.rebirths++;
        actions.push({
          second,
          type: "new-birth",
          count: NewBirth.getCount(),
          multiplier: NewBirth.getMultiplier().toString(),
          trackedLevelsAfterReset: Object.fromEntries(trackedIds.map(id => [id, Upgrades.get(id)?.level ?? 0]))
        });
      }

      convertMaterials();
      for (let pass = 0; pass < 1000; pass++) {
        const limited = buyLimited();
        const infinite = buyInfinite();
        if (limited === 0 && infinite === 0) break;
      }

      Achievements.update({
        worldManager: WorldManager,
        upgradeManager: Upgrades,
        researchManager: Research
      });

      if (second % 10 === 0 || EP.get().greaterOrEqual(target)) {
        capture(second, true);
      }

      if (EP.get().greaterOrEqual(target)) {
        status = "reached-1.8e308-EP";
        break;
      }
    }

    eventBus.emit = originalEmit;
    world = WorldManager.getActive();
    return {
      status,
      targetEP: target.toString(),
      speed,
      tickSpeedMs: tickMs,
      realSeconds: currentSecond,
      simulatedSeconds: currentSecond * speed,
      ep: EP.get().toString(),
      epReachedTarget: EP.get().greaterOrEqual(target),
      totalEP: Statistics.getTotalEP().toString(),
      worldLevel: world?.level ?? null,
      worldTotalExperience: world?.totalExperience?.toString?.() ?? "0",
      newBirthMultiplier: world?.newBirthMultiplier?.toString?.() ?? "1",
      nextNewBirthMultiplier: world?.getNewBirthMultiplier?.().toString?.() ?? "1",
      newBirthCount: NewBirth.getCount(),
      averageTrackedUpgradeLevel: Number(averageTrackedLevel().toFixed(4)),
      trackedUpgradeLevels: Object.fromEntries(trackedIds.map(id => [id, Upgrades.get(id)?.level ?? 0])),
      creatorWillLevel: Upgrades.get("creator_will")?.level ?? 0,
      researchLevels: Object.fromEntries(Research.getAll().map(research => [research.id, research.level])),
      actionCounts,
      snapshots,
      actions,
      browserErrors: []
    };
  }, {
    speed: SPEED,
    tickMs: TICK_MS,
    maxRealSeconds: MAX_REAL_SECONDS,
    fixedSeed: FIXED_SEED,
    targetEp: TARGET_EP
  });

  await context.close();
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    method: {
      speed: SPEED,
      tickSpeedMs: TICK_MS,
      maxRealSeconds: MAX_REAL_SECONDS,
      fixedSeed: FIXED_SEED,
      target: "EP >= 1.8e308",
      targetRepresentation: "BigNumber { mantissa: 180, exponent: 102, layer: 0 }",
      gameRules: [
        "Uses the current repository code without debug resource grants.",
        "Each one-second test tick advances the game by 10 simulated seconds.",
        "New birth is executed whenever the game's eligibility condition is met.",
        "On new birth, infinite upgrade levels are reduced to one tenth with floor, including Creator's Will.",
        "Materials are converted using the current in-game 10:1 recipes.",
        "Affordable limited upgrades and infinite upgrades are purchased; automation unlock is intentionally not purchased.",
        "Research remains at level zero; no research effects are injected.",
        "No additional worlds are unlocked; the test follows the current first-world progression."
      ]
    },
    result
  };

  fs.writeFileSync(path.join(REPORT_DIR, "ep-threshold-study.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, "ep-threshold-study-summary.json"), JSON.stringify({
    status: result.status,
    targetEP: result.targetEP,
    speed: result.speed,
    tickSpeedMs: result.tickSpeedMs,
    realSeconds: result.realSeconds,
    simulatedSeconds: result.simulatedSeconds,
    ep: result.ep,
    epReachedTarget: result.epReachedTarget,
    totalEP: result.totalEP,
    worldLevel: result.worldLevel,
    worldTotalExperience: result.worldTotalExperience,
    newBirthMultiplier: result.newBirthMultiplier,
    nextNewBirthMultiplier: result.nextNewBirthMultiplier,
    newBirthCount: result.newBirthCount,
    averageTrackedUpgradeLevel: result.averageTrackedUpgradeLevel,
    trackedUpgradeLevels: result.trackedUpgradeLevels,
    creatorWillLevel: result.creatorWillLevel,
    actionCounts: result.actionCounts,
    browserErrors: errors
  }, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, "ep-threshold-study.csv"), [
    "realSeconds,simulatedSeconds,ep,newBirthMultiplier,nextNewBirthMultiplier,newBirthCount,worldLevel,divine_revelation,heavenly_blessing,world_tree,creator_will",
    ...result.snapshots.map(s => [
      s.realSeconds, s.simulatedSeconds, s.ep, s.newBirthMultiplier,
      s.nextNewBirthMultiplier, s.newBirthCount, s.worldLevel,
      s.trackedUpgradeLevels.divine_revelation,
      s.trackedUpgradeLevels.heavenly_blessing,
      s.trackedUpgradeLevels.world_tree, s.creatorWillLevel
    ].join(","))
  ].join("\n"));

  console.log("EP_THRESHOLD_STUDY_SUMMARY " + JSON.stringify({
    status: result.status,
    realSeconds: result.realSeconds,
    simulatedSeconds: result.simulatedSeconds,
    ep: result.ep,
    epReachedTarget: result.epReachedTarget,
    newBirthCount: result.newBirthCount,
    newBirthMultiplier: result.newBirthMultiplier,
    trackedUpgradeLevels: result.trackedUpgradeLevels,
    actionCounts,
    browserErrors: errors
  }));
  if (!result.epReachedTarget || errors.length) process.exitCode = 1;
})().catch(error => {
  console.error(error);
  process.exit(1);
});
