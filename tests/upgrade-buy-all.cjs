const { chromium } = require("playwright");

const BASE_URL = "http://127.0.0.1:4173/";
const TARGET_LEVEL = 12050;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.dataset.appReady === "true");

    const setup = await page.evaluate(async targetLevel => {
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

      const SettingsManager = settingsModule.default;
      const DebugManager = debugModule.default;
      const BigNumber = bigNumberModule.default;
      const UpgradeManager = upgradeModule.default;
      const EPManager = epModule.default;

      // 実際のデバッグモード経由で、購入総額を十分に上回るEPを付与する。
      SettingsManager.set("debugMode", true);
      if (!SettingsManager.isDebugMode()) {
        throw new Error("デバッグモードを有効化できませんでした");
      }

      DebugManager.addEP(BigNumber.fromLayered(1, 5000, 1));
      UpgradeManager.unlock("creator_will");
      DebugManager.setUpgradeLevel("buy_max_creator_will", 1);

      const upgrade = UpgradeManager.get("creator_will");
      upgrade.level = 0;

      const finalLevelCost = (() => {
        upgrade.level = targetLevel - 1;
        const cost = upgrade.getCost().toString();
        upgrade.level = 0;
        return cost;
      })();

      if (EPManager.get().layer !== 1 || !EPManager.get().greaterOrEqual(BigNumber.fromLayered(1, 4018, 0))) {
        throw new Error("デバッグEPが必要量に達していません");
      }

      window.__buyAllYieldTicks = 0;
      window.__buyAllYieldTimer = setInterval(() => {
        window.__buyAllYieldTicks += 1;
      }, 0);

      return {
        debugMode: SettingsManager.isDebugMode(),
        ep: EPManager.get().toString(),\n        epLayer: EPManager.get().layer,
        finalLevelCost,
        expectedPurchases: targetLevel
      };
    }, TARGET_LEVEL);

    const debugPanelVisible = await page.locator("#debug-panel").evaluate(element => !element.hidden);
    if (!debugPanelVisible) throw new Error("デバッグパネルが表示されていません");

    const button = page.locator('[data-action="upgrade:buy-all"][data-upgrade-id="creator_will"]');
    if (await button.count() !== 1) throw new Error("全購入ボタンが表示されていません");
    await button.click({ timeout: 10000 });

    await page.waitForFunction(async targetLevel => {
      const manager = (await import("./js/upgrades/Manager.js")).default;
      return manager.get("creator_will").level === targetLevel &&
        !manager.buyAllInProgress.has("creator_will");
    }, TARGET_LEVEL, { timeout: 120000 });

    const result = await page.evaluate(async () => {
      clearInterval(window.__buyAllYieldTimer);
      const manager = (await import("./js/upgrades/Manager.js")).default;
      const epManager = (await import("./js/ep/Manager.js")).default;
      return {
        purchased: manager.get("creator_will").level,
        remainingEP: epManager.get().toString(),
        yieldTicks: window.__buyAllYieldTicks
      };
    });

    if (result.purchased !== setup.expectedPurchases) {
      throw new Error(`購入数が不正です: ${result.purchased} / EP初期値=${setup.ep} / 最終Lvコスト=${setup.finalLevelCost} / 残EP=${result.remainingEP}`);
    }
    if (result.yieldTicks < 2) {
      throw new Error(`購入中のイベントループ応答が不足しています: ${result.yieldTicks}`);
    }
    if (errors.length) throw new Error(errors.join("\\n"));

    console.log(JSON.stringify({
      status: "PASS",
      test: "debug-ep-buy-all-over-10000-and-yield",
      ...setup,
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
