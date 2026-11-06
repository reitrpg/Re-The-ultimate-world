const { chromium } = require("playwright");

const BASE_URL = "http://127.0.0.1:4173/";
const DEBUG_EP = { mantissa: 1, exponent: 1000 / 3, layer: 0 };
const EP_LIMIT = { mantissa: 180, exponent: 102, layer: 0 };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.dataset.appReady === "true");

    const setup = await page.evaluate(async ({ debugEP, epLimit }) => {
      const [
        settingsModule,
        debugModule,
        bigNumberModule,
        upgradeModule,
        epModule
      ] = await Promise.all([
        import("./js/settings/Manager.js"),
        import("./js/debug/Manager.js"),
        import("./js/number/BigNumber.js"),
        import("./js/upgrades/Manager.js"),
        import("./js/ep/Manager.js")
      ]);

      const Settings = settingsModule.default;
      const Debug = debugModule.default;
      const BigNumber = bigNumberModule.default;
      const Upgrades = upgradeModule.default;
      const EP = epModule.default;

      Settings.set("debugMode", true);
      if (!Settings.isDebugMode()) throw new Error("デバッグモードを有効化できませんでした");

      EP.reset();
      Debug.addEP(BigNumber.from(debugEP));
      const initialEP = EP.get();
      const limit = BigNumber.from(epLimit);
      if (!initialEP.greater(limit)) {
        throw new Error("デバッグモードで1e1000 EPを付与できず、1.8e308の閾値を超えられません");
      }

      Upgrades.unlock("creator_will");
      Debug.setUpgradeLevel("buy_max_creator_will", 1);
      const upgrade = Upgrades.get("creator_will");
      upgrade.level = 0;

      // 1e1000 EPで購入可能な最大Lvを、購入処理とは独立して事前計算する。
      let remaining = initialEP.clone();
      let expectedPurchases = 0;
      while (true) {
        const cost = upgrade.getCost();
        if (remaining.less(cost)) break;
        remaining = remaining.subtract(cost);
        upgrade.level += 1;
        expectedPurchases += 1;
      }
      const expectedLevel = upgrade.level;
      const expectedRemainingEP = remaining.toString();
      upgrade.level = 0;

      window.__buyAllYieldTicks = 0;
      window.__buyAllYieldTimer = setInterval(() => {
        window.__buyAllYieldTicks += 1;
      }, 0);

      return {
        debugMode: Settings.isDebugMode(),
        initialEP: initialEP.toString(),
        initialEPLayer: initialEP.layer,
        exceedsEPThreshold: initialEP.greater(limit),
        expectedPurchases,
        expectedLevel,
        expectedRemainingEP
      };
    }, { debugEP: DEBUG_EP, epLimit: EP_LIMIT });

    const debugPanelVisible = await page.locator("#debug-panel").evaluate(element => !element.hidden);
    if (!debugPanelVisible) throw new Error("デバッグパネルが表示されていません");

    const purchaseRun = await page.evaluate(async () => {
      const manager = (await import("./js/upgrades/Manager.js")).default;
      const startedAt = performance.now();
      const bought = await manager.buyAll("creator_will");
      return {
        bought,
        level: manager.get("creator_will").level,
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
        inProgress: manager.buyAllInProgress.has("creator_will")
      };
    });

    const result = await page.evaluate(async () => {
      clearInterval(window.__buyAllYieldTimer);
      const manager = (await import("./js/upgrades/Manager.js")).default;
      const epManager = (await import("./js/ep/Manager.js")).default;
      return {
        purchased: manager.get("creator_will").level,
        remainingEP: epManager.get().toString(),
        yieldTicks: window.__buyAllYieldTicks,
        nextCost: manager.get("creator_will").getCost().toString(),
        nextCostUnaffordable: !epManager.has(manager.get("creator_will").getCost())
      };
    });

    if (purchaseRun.bought !== setup.expectedPurchases ||
        result.purchased !== setup.expectedLevel) {
      throw new Error("購入可能最大数まで到達しませんでした: " + JSON.stringify({
        setup, purchaseRun, result
      }));
    }
    if (!result.nextCostUnaffordable) {
      throw new Error("購入終了時点で次のLvを購入できるEPが残っています");
    }
    if (result.yieldTicks < Math.floor(setup.expectedPurchases / 250)) {
      throw new Error("大量購入中にイベントループへ制御が返っていません: " + JSON.stringify(result));
    }
    if (errors.length) throw new Error(errors.join("\\n"));

    console.log(JSON.stringify({
      status: "PASS",
      test: "debug-1e1000-ep-unlimited-buy-all-load",
      ...setup,
      ...purchaseRun,
      ...result,
      browserErrors: errors
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
