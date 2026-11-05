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

      DebugManager.addEP(BigNumber.fromLayered(12, 4017, 0));
      UpgradeManager.unlock("creator_will");
      DebugManager.setUpgradeLevel("buy_max_creator_will", 1);

      const upgrade = UpgradeManager.get("creator_will");
      const originalCanBuy = upgrade.canBuy.bind(upgrade);
      const originalBuy = upgrade.buy.bind(upgrade);
      upgrade.canBuy = function () {
        const canBuy = originalCanBuy();
        if (!canBuy) {
          window.__buyAllStopReason = {
            level: this.level,
            unlocked: this.unlocked,
            isUnlocked: this.isUnlocked(),
            maxLevel: this.maxLevel,
            cost: this.getCost().toString(),
            ep: EPManager.get().toString(),
            epLayer: EPManager.get().layer,
            hasEP: EPManager.has(this.getCost())
          };
        }
        return canBuy;
      };
      upgrade.buy = function () {
        const bought = originalBuy();
        if (!bought) {
          window.__buyAllBuyFailure = {
            level: this.level,
            cost: this.getCost().toString(),
            ep: EPManager.get().toString(),
            epLayer: EPManager.get().layer
          };
        }
        return bought;
      };
      upgrade.level = 0;

      const finalLevelCost = (() => {
        upgrade.level = targetLevel - 1;
        const cost = upgrade.getCost();
        upgrade.level = 0;
        return cost;
      })();

      if (!EPManager.get().greaterOrEqual(finalLevelCost)) {
        throw new Error("デバッグEPが最終購入分に達していません");
      }

      window.__buyAllYieldTicks = 0;
      window.__buyAllYieldTimer = setInterval(() => {
        window.__buyAllYieldTicks += 1;
      }, 0);

      return {
        debugMode: SettingsManager.isDebugMode(),
        ep: EPManager.get().toString(),
        epLayer: EPManager.get().layer,
        finalLevelCost: finalLevelCost.toString(),
        expectedPurchases: targetLevel
      };
    }, TARGET_LEVEL);

    const debugPanelVisible = await page.locator("#debug-panel").evaluate(element => !element.hidden);
    if (!debugPanelVisible) throw new Error("デバッグパネルが表示されていません");

    // UIのクリック経路ではなく、同じ実ゲーム用Managerの一括購入関数を直接実行する。
    const purchaseRun = await page.evaluate(async () => {
      const manager = (await import("./js/upgrades/Manager.js")).default;
      const bought = await manager.buyAll("creator_will");
      return {
        bought,
        level: manager.get("creator_will").level,
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
        stopReason: window.__buyAllStopReason || null,
        buyFailure: window.__buyAllBuyFailure || null,
        maxLevel: manager.get("creator_will").maxLevel,
        unlocked: manager.get("creator_will").isUnlocked()
      };
    });

    if (purchaseRun.bought !== setup.expectedPurchases || result.purchased !== setup.expectedPurchases) {
      throw new Error(`購入数が不正です: 戻り値=${purchaseRun.bought} / Lv=${result.purchased} / EP初期値=${setup.ep} / 最終Lvコスト=${setup.finalLevelCost} / 残EP=${result.remainingEP} / 停止理由=${JSON.stringify(result.stopReason)} / buy失敗=${JSON.stringify(result.buyFailure)} / maxLv=${result.maxLevel} / unlocked=${result.unlocked}`);
    }
    if (result.yieldTicks < 2) {
      throw new Error(`購入中のイベントループ応答が不足しています: ${result.yieldTicks}`);
    }
    if (errors.length) throw new Error(errors.join("\\n"));

    console.log(JSON.stringify({
      status: "PASS",
      test: "debug-ep-buy-all-over-10000-and-yield",
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
