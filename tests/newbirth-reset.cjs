const { chromium } = require("playwright");

const BASE_URL = "http://127.0.0.1:4173/";

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

    const result = await page.evaluate(async () => {
      const [gameModule, worldModule, resourceModule, epModule, rebirthModule, numberModule, settingsModule] =
        await Promise.all([
          import("./js/core/game.js"),
          import("./js/world/Manager.js"),
          import("./js/resource/Manager.js"),
          import("./js/ep/Manager.js"),
          import("./js/rebirth/Manager.js"),
          import("./js/number/BigNumber.js"),
          import("./js/settings/Manager.js")
        ]);

      const Game = gameModule.default;
      const Worlds = worldModule.default;
      const Resources = resourceModule.default;
      const EP = epModule.default;
      const NewBirth = rebirthModule.default;
      const BigNumber = numberModule.default;
      const Settings = settingsModule.default;

      Game.stop();
      Settings.set("debugMode", true);
      Worlds.clear();
      Resources.clear();
      EP.reset();

      const world = Worlds.create("WC-NEWBIRTH-RESET-TEST");
      world.totalExperience = BigNumber.from(2000000);
      world.exp = BigNumber.from(12345);

      EP.add(BigNumber.from(987654321));
      for (const id of ["plant", "metal", "magic"]) {
        Resources.add(id, BigNumber.from(123456));
        Resources.get(id).production = BigNumber.from(789);
      }

      const before = {
        canNewBirth: NewBirth.canNewBirth(),
        ep: EP.get().toString(),
        resources: Object.fromEntries(["plant", "metal", "magic"].map(id => [
          id,
          {
            amount: Resources.get(id).amount.toString(),
            production: Resources.get(id).production.toString()
          }
        ]))
      };

      if (!before.canNewBirth) {
        throw new Error("テスト用ワールドが新生可能条件を満たしません");
      }

      const succeeded = NewBirth.newBirth();
      const after = {
        succeeded,
        ep: EP.get().toString(),
        resources: Object.fromEntries(["plant", "metal", "magic"].map(id => [
          id,
          {
            amount: Resources.get(id).amount.toString(),
            production: Resources.get(id).production.toString()
          }
        ])),
        newBirthCount: NewBirth.getCount(),
        newBirthMultiplier: NewBirth.getMultiplier().toString(),
        worldLevel: world.level,
        worldExp: world.exp.toString()
      };

      return { before, after };
    });

    if (!result.after.succeeded) throw new Error("新生処理が失敗しました");
    if (result.after.ep !== "0") throw new Error("新生後にEPがリセットされていません");
    for (const id of ["plant", "metal", "magic"]) {
      if (result.after.resources[id].amount !== "0") {
        throw new Error(id + "の所持量がリセットされていません");
      }
      if (result.after.resources[id].production !== result.before.resources[id].production) {
        throw new Error(id + "の生産量が不必要に変更されています");
      }
    }
    if (result.after.newBirthCount !== 1) throw new Error("新生回数が正しく増加していません");
    if (result.after.worldLevel !== 1 || result.after.worldExp !== "0") {
      throw new Error("新生時のワールドLv/EXPリセットが正常ではありません");
    }
    if (errors.length) throw new Error(errors.join("\\n"));

    console.log(JSON.stringify({
      status: "PASS",
      test: "new-birth-resets-ep-and-three-material-amounts",
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
