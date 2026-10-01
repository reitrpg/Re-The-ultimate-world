import WorldManager from "../world/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

class StatisticsUI {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;

        [
            "world:update",
            "world:unlock",
            "world:create:success",
            "world:unlock:update",
            "resource:update",
            "research:update",
            "upgrade:update",
            "rebirth:update",
            "save:clear"
        ].forEach(event => {
            eventBus.on(event, () => this.render());
        });

        eventBus.on("tab:change", tab => {
            if (tab === "statistics") {
                this.render();
            }
        });

        this.render();
    }

    getRarityName(rarity) {
        const value = Math.max(1, Math.floor(Number(rarity) || 1));
        const tiers = [
            "コモン",
            "アンコモン",
            "レア",
            "スーパーレア",
            "エピック",
            "レジェンダリー"
        ];
        const tierIndex = Math.min(
            tiers.length - 1,
            Math.floor((value - 1) / 5)
        );
        const rank = ((value - 1) % 5) + 1;
        const numerals = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"];

        return tiers[tierIndex] + numerals[rank - 1];
    }

    createRow(label, value) {
        const row = document.createElement("div");
        row.className = "statistics-row";

        const name = document.createElement("span");
        name.textContent = label;

        const amount = document.createElement("strong");
        amount.textContent = value;

        row.appendChild(name);
        row.appendChild(amount);

        return row;
    }

    createSection(title) {
        const section = document.createElement("section");
        section.className = "statistics-section";

        const heading = document.createElement("h3");
        heading.textContent = title;

        const content = document.createElement("div");
        content.className = "statistics-section-content";

        section.appendChild(heading);
        section.appendChild(content);

        return { section, content };
    }

    renderRaritySection(content, world) {
        if (!world) {
            content.appendChild(this.createRow("現在の世界", "なし"));
            return;
        }

        content.appendChild(
            this.createRow("現在の世界", world.name)
        );
        content.appendChild(
            this.createRow(
                "レアリティ",
                this.getRarityName(world.rarity)
            )
        );
        content.appendChild(
            this.createRow(
                "内部レアリティ値",
                String(world.rarity)
            )
        );
        content.appendChild(
            this.createRow(
                "レアリティ倍率",
                "×" + Formatter.format(world.getRarityMultiplier())
            )
        );
        content.appendChild(
            this.createRow(
                "幸運値",
                Formatter.format(world.getLuck())
            )
        );
    }

    renderLuckSection(content, world) {
        const probabilities = world
            ? this.getLuckAdjustedProbabilities(world.getLuck())
            : this.getLuckAdjustedProbabilities(0);

        probabilities.forEach((probability, index) => {
            content.appendChild(
                this.createRow(
                    this.getRarityName(index + 1),
                    (probability * 100).toFixed(4) + "%"
                )
            );
        });
    }

    getLuckAdjustedProbabilities(luck) {
        const base = [0.5, 0.25, 0.15, 0.08, 0.02];
        let remainingLuck = Math.log1p(Math.max(0, Number(luck) || 0));

        for (let index = 0; index < base.length - 1; index += 1) {
            const cost = 10 * Math.pow(index + 1, 1.5);
            const transfer = Math.min(
                base[index],
                remainingLuck / cost
            );

            base[index] -= transfer;
            base[index + 1] += transfer;
            remainingLuck = Math.max(
                0,
                remainingLuck - transfer * cost
            );

            if (remainingLuck <= 0) break;
        }

        return base;
    }

    renderMultiplierSection(content, world) {
        const rebirth = world?.rebirthMultiplier || 1;
        const worldMultiplier = world?.getTotalMultiplier?.() || 1;

        content.appendChild(
            this.createRow(
                "世界基礎倍率",
                "×" + Formatter.format(worldMultiplier)
            )
        );
        content.appendChild(
            this.createRow(
                "転生倍率",
                "×" + Formatter.format(rebirth)
            )
        );
        content.appendChild(
            this.createRow(
                "研究倍率",
                "×" + Formatter.format(ResearchManager.getTotalMultiplier())
            )
        );
        content.appendChild(
            this.createRow(
                "強化倍率",
                "×" + Formatter.format(UpgradeManager.getTotalMultiplier())
            )
        );
        content.appendChild(
            this.createRow(
                "研究＋強化倍率",
                "×" + Formatter.format(
                    ResearchManager.getTotalMultiplier() *
                    UpgradeManager.getTotalMultiplier()
                )
            )
        );
    }

    renderResourceSection(content, world) {
        if (!world) {
            content.appendChild(this.createRow("対象世界", "なし"));
            return;
        }

        [
            ["plant", "植物"],
            ["metal", "金属"],
            ["magic", "魔力"]
        ].forEach(([id, label]) => {
            content.appendChild(
                this.createRow(
                    label + "補正",
                    "×" + world.getResourceMultiplier(id)
                )
            );
            content.appendChild(
                this.createRow(
                    label + "生産量",
                    Formatter.format(world.getResourceProduction(id)) + "/秒"
                )
            );
        });
    }

    render() {
        const container = document.getElementById("statistics-content");

        if (!container) return;

        container.innerHTML = "";

        const world = WorldManager.getActive();

        const title = document.createElement("h2");
        title.textContent = "統計・倍率";
        container.appendChild(title);

        const description = document.createElement("p");
        description.textContent =
            "現在の世界に適用されている幸運値・レアリティ・各種倍率を確認できます。";
        container.appendChild(description);

        const rarity = this.createSection("世界・レアリティ");
        this.renderRaritySection(rarity.content, world);
        container.appendChild(rarity.section);

        const luck = this.createSection("幸運によるレアリティ確率");
        this.renderLuckSection(luck.content, world);
        container.appendChild(luck.section);

        const multipliers = this.createSection("倍率");
        this.renderMultiplierSection(multipliers.content, world);
        container.appendChild(multipliers.section);

        const resources = this.createSection("資源生産");
        this.renderResourceSection(resources.content, world);
        container.appendChild(resources.section);
    }
}

export default new StatisticsUI();
