const { chromium } = require("playwright");

const BASE_URL = "http://127.0.0.1:4173/";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    const result = await page.evaluate(async () => {
      const [{ default: World }, { default: BigNumber }] = await Promise.all([
        import("./js/world/World.js"),
        import("./js/number/BigNumber.js")
      ]);

      const world = new World("WORLD-EXP-MULTI-LEVEL-TEST");
      const startLevel = world.level;
      const gained = BigNumber.from(1000000);
      const leveledUp = world.gainExperience(gained);
      return {
        startLevel,
        level: world.level,
        exp: world.exp.toString(),
        required: world.getRequiredExperience().toString(),
        leveledUp,
        totalExperience: world.totalExperience.toString()
      };
    });

    if (!result.leveledUp) throw new Error("経験値を獲得してもLvが上昇しません");
    if (result.level - result.startLevel < 2) {
      throw new Error("大量の経験値を獲得しても複数Lv上昇しません: " + JSON.stringify(result));
    }
    if (Number(result.exp) >= Number(result.required)) {
      throw new Error("次のLvに必要な経験値以上の余剰EXPが残っています");
    }
    if (result.totalExperience !== "1000000") {
      throw new Error("累計経験値が正しく加算されていません");
    }
    if (errors.length) throw new Error(errors.join("\\n"));

    console.log(JSON.stringify({
      status: "PASS",
      test: "world-exp-can-increase-multiple-levels",
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
