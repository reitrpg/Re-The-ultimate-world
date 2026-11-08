const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const BASE_URL = "http://127.0.0.1:4173/";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(String(error)));

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForFunction(
      () => document.documentElement.dataset.appReady === "true",
      null,
      { timeout: 20000 }
    );

    const numeric = await page.evaluate(async () => {
      const [
        numberModule,
        epModule,
        resourceModule,
        converterModule,
        gameModule,
        upgradeModule,
        eventModule,
        birthModule,
        worldManagerModule
      ] = await Promise.all([
        import("./js/number/BigNumber.js"),
        import("./js/ep/Manager.js"),
        import("./js/resource/Manager.js"),
        import("./js/converter/Converter.js"),
        import("./js/core/game.js"),
        import("./js/upgrades/Manager.js"),
        import("./js/core/eventBus.js"),
        import("./js/rebirth/Manager.js"),
        import("./js/world/Manager.js")
      ]);

      const BigNumber = numberModule.default;
      const EPManager = epModule.default;
      const ResourceManager = resourceModule.default;
      const Converter = converterModule.default;
      const Game = gameModule.default;
      const UpgradeManager = upgradeModule.default;
      const eventBus = eventModule.default;
      const NewBirthManager = birthModule.default;
      const WorldManager = worldManagerModule.default;

      Game.stop();

      const negative = BigNumber.fromLayered(-938.4369599771804, 96.25, 0);
      const zero = BigNumber.zero();
      const signComparison = negative.compare(zero);

      const negativeResult = BigNumber.from(1).subtract(100);
      const exponentDifference = BigNumber
        .fromLayered(1, 1, 0)
        .subtract(BigNumber.fromLayered(1, 2, 0));

      const saturated = new BigNumber(Infinity);
      const parsedInfinityWasZeroed = BigNumber.from(Infinity).isZero();

      EPManager.set(negative);
      const negativeEPWasClamped = EPManager.get().isZero();
      const negativeGainRejected = EPManager.add(-1) === false;

      EPManager.set(25);
      const overspendRejected = EPManager.consume(26) === false;
      const balanceAfterRejectedSpend = EPManager.get().toNumber();
      const validSpendAccepted = EPManager.consume(5);
      const balanceAfterValidSpend = EPManager.get().toNumber();

      ResourceManager.resetAmounts(["plant", "metal", "magic"]);
      ResourceManager.add("plant", 30);
      const convertedCount = Converter.convertAll("plant_to_ep");
      const EPAfterConversion = EPManager.get().toNumber();
      const plantAfterConversion = ResourceManager.get("plant").amount.toNumber();

      EPManager.reset();
      ResourceManager.resetAmounts(["plant", "metal", "magic"]);
      const emptyConversionCount = Converter.convertAll("plant_to_ep");
      const EPAfterEmptyConversion = EPManager.get().toNumber();

      // Reproduce the reported sequence: real new birth, legacy negative EP
      // state, EP conversion, and navigation through every major tab.
      let activeWorld = WorldManager.getActive();
      if (!activeWorld) {
        activeWorld = WorldManager.create("numeric-ui-regression");
      }

      const originalLevel = activeWorld.level;
      const originalRequirement = activeWorld.getRequiredExperience;
      const negativeWorldGainRejected = activeWorld.gainExperience(negative) === false;
      const levelAfterNegativeGain = activeWorld.level;

      activeWorld.level = 10000;
      const highLevelRequirement = activeWorld.getRequiredExperience();
      activeWorld.level = 1e200;
      const largeLevelProductionBonus = activeWorld.getLevelProductionBonus();
      activeWorld.level = originalLevel;

      // A zero threshold used to make the level-up while-loop run forever.
      activeWorld.exp = BigNumber.from(11);
      activeWorld.getRequiredExperience = () => BigNumber.zero();
      const zeroThresholdDidNotHang = activeWorld.gainExperience(1) === false;
      activeWorld.getRequiredExperience = originalRequirement;
      activeWorld.exp = BigNumber.zero();

      activeWorld.totalExperience = BigNumber.from(625000);
      activeWorld.newBirthMultiplier = negative.clone();
      const productionBeforeBirth = {
        plant: 5,
        metal: 6,
        magic: 7
      };

      Object.entries(productionBeforeBirth).forEach(([id, rate]) => {
        ResourceManager.get(id).setProduction(rate);
        ResourceManager.add(id, 20);
      });

      EPManager.set(321);
      const realNewBirthAccepted = NewBirthManager.newBirth();
      const EPAfterNewBirth = EPManager.get().toNumber();
      const materialsAfterNewBirth = Object.fromEntries(
        ["plant", "metal", "magic"].map(id => [
          id,
          ResourceManager.get(id).amount.toNumber()
        ])
      );
      const productionAfterNewBirth = Object.fromEntries(
        ["plant", "metal", "magic"].map(id => [
          id,
          ResourceManager.get(id).production.toNumber()
        ])
      );

      // Inject the prior-version corruption directly to verify that the
      // manager repairs stale internal state before a post-birth conversion.
      EPManager.amount = negative.clone();
      const legacyNegativeEPWasRepaired = EPManager.get().isZero();
      ResourceManager.get("plant").amount = negative.clone();
      const negativeMaterialConversionRejected =
        Converter.convertAll("plant_to_ep") === 0;
      ResourceManager.add("plant", 30);
      const conversionAfterNewBirthCount = Converter.convertAll("plant_to_ep");
      const EPAfterNewBirthConversion = EPManager.get().toNumber();
      ResourceManager.resetAmounts(["plant", "metal", "magic"]);

      UpgradeManager.get("automation_unlock").level = 1;
      eventBus.emit("upgrade:update");

      return {
        signComparison,
        negativeCompareIsLess: negative.less(0),
        negativeResult: negativeResult.toNumber(),
        exponentDifference: exponentDifference.toNumber(),
        saturatedIsFinite: saturated.isFinite(),
        saturatedMantissa: saturated.mantissa,
        parsedInfinityWasZeroed,
        negativeEPWasClamped,
        negativeGainRejected,
        overspendRejected,
        balanceAfterRejectedSpend,
        validSpendAccepted,
        balanceAfterValidSpend,
        convertedCount,
        EPAfterConversion,
        plantAfterConversion,
        emptyConversionCount,
        EPAfterEmptyConversion,
        negativeWorldGainRejected,
        levelAfterNegativeGain,
        originalLevel,
        highLevelRequirementPositive: highLevelRequirement.isFinite() && highLevelRequirement.greater(0),
        largeLevelProductionBonusFinite: largeLevelProductionBonus.isFinite() && largeLevelProductionBonus.greater(0),
        zeroThresholdDidNotHang,
        realNewBirthAccepted,
        EPAfterNewBirth,
        materialsAfterNewBirth,
        productionBeforeBirth,
        productionAfterNewBirth,
        newBirthMultiplierPositive: activeWorld.newBirthMultiplier.isFinite() && activeWorld.newBirthMultiplier.greater(0),
        legacyNegativeEPWasRepaired,
        negativeMaterialConversionRejected,
        conversionAfterNewBirthCount,
        EPAfterNewBirthConversion,
        automationTabVisible: !document.querySelector('[data-tab="automation"]').hidden
      };
    });

    assert.equal(numeric.signComparison, -1, "Negative BigNumber must compare below zero");
    assert.equal(numeric.negativeCompareIsLess, true);
    assert.equal(numeric.negativeResult, -99, "Subtraction must preserve a negative result");
    assert.equal(numeric.exponentDifference, -999000, "Subtraction must handle different exponents");
    assert.equal(numeric.saturatedIsFinite, true, "Direct Infinity construction must not hang");
    assert.equal(numeric.parsedInfinityWasZeroed, true, "Parsed non-finite values must retain the safe zero fallback");
    assert.equal(numeric.negativeEPWasClamped, true, "EP balance must never remain negative");
    assert.equal(numeric.negativeGainRejected, true, "Negative EP gains must be rejected");
    assert.equal(numeric.overspendRejected, true, "EP overspending must be rejected");
    assert.equal(numeric.balanceAfterRejectedSpend, 25);
    assert.equal(numeric.validSpendAccepted, true);
    assert.equal(numeric.balanceAfterValidSpend, 20);
    assert.equal(numeric.convertedCount, 3);
    assert.ok(
      Math.abs(numeric.EPAfterConversion - 23) < 0.1,
      "Conversion should add three EP with only the small achievement bonus"
    );
    assert.equal(numeric.plantAfterConversion, 0);
    assert.equal(numeric.emptyConversionCount, 0);
    assert.equal(numeric.EPAfterEmptyConversion, 0);
    assert.equal(numeric.negativeWorldGainRejected, true, "Negative EXP gains must be ignored");
    assert.equal(numeric.levelAfterNegativeGain, numeric.originalLevel,
      "Negative EXP must not cause an unintended level-up");
    assert.equal(numeric.highLevelRequirementPositive, true,
      "High-level EXP requirements must not overflow to zero");
    assert.equal(numeric.largeLevelProductionBonusFinite, true,
      "Production bonus calculation must not loop through every world level");
    assert.equal(numeric.zeroThresholdDidNotHang, true,
      "A zero EXP requirement must not lock the game loop");
    assert.equal(numeric.realNewBirthAccepted, true, "Real new birth must complete");
    assert.equal(numeric.EPAfterNewBirth, 0, "New birth must reset EP");
    assert.ok(numeric.materialsAfterNewBirth.plant === 0,
      "New birth must reset plant amount");

    assert.deepEqual(numeric.materialsAfterNewBirth, {
      plant: 0,
      metal: 0,
      magic: 0
    }, "New birth must reset material balances");
    assert.deepEqual(numeric.productionAfterNewBirth, numeric.productionBeforeBirth,
      "New birth must preserve displayed material production");
    assert.equal(numeric.newBirthMultiplierPositive, true,
      "A corrupted negative new-birth multiplier must be repaired");
    assert.equal(numeric.legacyNegativeEPWasRepaired, true,
      "Legacy negative EP must be repaired before conversion");
    assert.equal(numeric.negativeMaterialConversionRejected, true,
      "Legacy negative material must not be converted into negative EP");
    assert.equal(numeric.conversionAfterNewBirthCount, 3,
      "EP conversion must remain usable after new birth");
    assert.ok(numeric.EPAfterNewBirthConversion > 0,
      "Post-new-birth conversion must add positive EP");
    assert.equal(numeric.automationTabVisible, true);

    const tabIds = ["world", "statistics", "achievements", "settings", "automation", "world"];
    for (const id of tabIds) {
      await page.locator('[data-tab="' + id + '"]').tap({ timeout: 5000 });
      await page.waitForFunction(tabId => {
        const button = document.querySelector('[data-tab="' + tabId + '"]');
        const panel = document.querySelector('[data-tab-panel="' + tabId + '"]');
        return Boolean(button && panel && !panel.hidden && button.classList.contains("active"));
      }, id, { timeout: 5000 });
    }

    await page.locator('[data-world-category="converter"]').tap({ timeout: 5000 });
    await page.waitForFunction(
      () => !document.querySelector("#world-category-converter").hidden,
      null,
      { timeout: 5000 }
    );

    await page.locator('[data-world-category="world"]').tap({ timeout: 5000 });
    await page.waitForFunction(
      () => !document.querySelector("#world-category-world").hidden,
      null,
      { timeout: 5000 }
    );

    assert.equal(pageErrors.length, 0, "Browser must not report uncaught page errors");

    console.log("[PASS] Signed BigNumber, EP transaction, converter, and tab navigation regression checks");
    console.log(JSON.stringify({ numeric, tabsTested: tabIds, pageErrors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error("[FAIL] Numeric/UI regression checks", error);
  process.exitCode = 1;
});
