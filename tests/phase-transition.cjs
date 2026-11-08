const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  try {
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => document.documentElement.dataset.appReady === "true",
      null,
      { timeout: 20000 }
    );

    const result = await page.evaluate(async () => {
      const [
        epModule,
        numberModule,
        worldModule,
        resourceModule,
        upgradeModule,
        plasmaModule,
        transitionModule,
        unlockModule
      ] = await Promise.all([
        import("./js/ep/Manager.js"),
        import("./js/number/BigNumber.js"),
        import("./js/world/Manager.js"),
        import("./js/resource/Manager.js"),
        import("./js/upgrades/Manager.js"),
        import("./js/plasma/Manager.js"),
        import("./js/plasma/PhaseTransition.js"),
        import("./js/world/UnlockManager.js")
      ]);

      const EP = epModule.default;
      const BigNumber = numberModule.default;
      const Worlds = worldModule.default;
      const Resources = resourceModule.default;
      const Upgrades = upgradeModule.default;
      const Plasma = plasmaModule.default;
      const Transition = transitionModule.default;
      const Unlock = unlockModule.default;

      Transition.wait = async () => {};
      Transition.initialize();

      Worlds.clear();
      Unlock.reset();
      Resources.resetAmounts(["plant", "metal", "magic"]);
      Resources.get("plant").setProduction(17);
      Resources.add("plant", 50);
      Worlds.create("phase-transition-test");
      Upgrades.get("divine_revelation").level = 8;

      EP.set(BigNumber.from({
        mantissa: 180,
        exponent: 102,
        layer: 0
      }));

      await new Promise(resolve => {
        const check = () => {
          if (Plasma.isUnlocked()) resolve();
          else setTimeout(check, 0);
        };
        check();
      });

      return {
        plasmaUnlocked: Plasma.isUnlocked(),
        plasmaEnergy: Plasma.getEnergy().toString(),
        epReset: EP.get().isZero(),
        worldsReset: Worlds.getCount() === 0,
        materialsReset: ["plant", "metal", "magic"].every(
          id => Resources.get(id).amount.isZero()
        ),
        productionPreserved: Resources.get("plant").production.toNumber() === 17,
        upgradesReset: Upgrades.get("divine_revelation").level === 0,
        plasmaTabVisible: !document.querySelector("[data-tab='plasma']").hidden,
        plasmaTabActive: document.querySelector("[data-tab='plasma']").classList.contains("active"),
        overlayRemoved: !document.getElementById("phase-transition-overlay"),
        bodyRestored: !document.body.classList.contains("phase-transition-active")
      };
    });

    assert.equal(result.plasmaUnlocked, true);
    assert.equal(result.plasmaEnergy, "1");
    assert.equal(result.epReset, true);
    assert.equal(result.worldsReset, true);
    assert.equal(result.materialsReset, true);
    assert.equal(result.productionPreserved, true);
    assert.equal(result.upgradesReset, true);
    assert.equal(result.plasmaTabVisible, true);
    assert.equal(result.plasmaTabActive, true);
    assert.equal(result.overlayRemoved, true);
    assert.equal(result.bodyRestored, true);

    console.log("[PASS] EP phase-one completion cinematic and plasma unlock");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error("[FAIL] Phase transition test", error);
  process.exitCode = 1;
});
