const { chromium } = require("playwright");

const BASE_URL = "http://127.0.0.1:4173/";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.dataset.appReady === "true");

    const setup = await page.evaluate(async () => {
      const [managerModule, eventBusModule] = await Promise.all([
        import("./js/upgrades/Manager.js"),
        import("./js/core/eventBus.js")
      ]);
      const manager = managerModule.default;
      const eventBus = eventBusModule.default;
      const upgrade = manager.get("creator_will");
      const unlock = manager.get("buy_max_creator_will");

      upgrade.unlocked = true;
      upgrade.level = 0;
      unlock.level = 1;

      const originalCanBuy = upgrade.canBuy;
      const originalBuy = upgrade.buy;
      let timerRanAtCompletion = null;
      upgrade.canBuy = function () {
        return this.level < 12050;
      };
      upgrade.buy = function () {
        this.level += 1;
        if (this.level === 1) {
          window.__buyAllTimerRan = false;
          setTimeout(() => { window.__buyAllTimerRan = true; }, 0);
        }
        if (this.level === 12050) {
          timerRanAtCompletion = window.__buyAllTimerRan === true;
        }
        return true;
      };

      eventBus.emit("upgrade:update");
      return {
        originalCanBuy: String(originalCanBuy),
        originalBuy: String(originalBuy),
        expectedPurchases: 12050
      };
    });

    const button = page.locator('[data-action="upgrade:buy-all"][data-upgrade-id="creator_will"]');
    if (await button.count() !== 1) throw new Error("全購入ボタンが表示されていません");
    await button.click({ timeout: 10000 });
    await page.waitForFunction(async () => {
      const manager = (await import("./js/upgrades/Manager.js")).default;
      return manager.get("creator_will").level === 12050 &&
        !manager.buyAllInProgress.has("creator_will");
    }, null, { timeout: 30000 });

    const result = await page.evaluate(async () => {
      const manager = (await import("./js/upgrades/Manager.js")).default;
      return {
        purchased: manager.get("creator_will").level,
        timerRanAtCompletion: window.__buyAllTimerRan === true
      };
    });

    if (result.purchased !== setup.expectedPurchases) {
      throw new Error(`購入数が不正です: ${result.purchased}`);
    }
    if (!result.timerRanAtCompletion) {
      throw new Error("大量購入中にイベントループへ制御が戻っていません");
    }
    if (errors.length) throw new Error(errors.join("\\n"));

    console.log(JSON.stringify({
      status: "PASS",
      test: "buy-all-over-10000-and-yield",
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
