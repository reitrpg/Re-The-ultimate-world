import WorldManager from "../world/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import StatisticsManager from "../statistics/Manager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

class StatisticsUI {
    constructor() {
        this.initialized = false;
        this.page = "statistics";
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
            "statistics:update",
            "save:clear",
            "settings:update"
        ].forEach(event => {
            eventBus.on(event, () => this.render());
        });

        eventBus.on("tab:change", tab => {
            if (tab === "statistics") this.render();
        });

        this.render();
    }

    setPage(page) {
        if (!["statistics", "multipliers", "abilities"].includes(page)) return;
        this.page = page;
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

    formatDuration(seconds) {
        let remaining = Math.max(0, Math.floor(Number(seconds) || 0));
        const days = Math.floor(remaining / 86400);
        remaining %= 86400;
        const hours = Math.floor(remaining / 3600);
        remaining %= 3600;
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;

        return [
            days > 0 ? days + "日" : "",
            hours > 0 ? hours + "時間" : "",
            minutes > 0 ? minutes + "分" : "",
            secs + "秒"
        ].filter(Boolean).join(" ");
    }

    renderNavigation(container) {
        const navigation = document.createElement("div");
        navigation.className = "statistics-subtabs";

        [
            ["statistics", "統計"],
            ["multipliers", "倍率"],
            ["abilities", "能力値"]
        ].forEach(([page, label]) => {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.statisticsPage = page;
            button.textContent = label;
            button.classList.toggle("active", this.page === page);
            button.addEventListener("click", () => this.setPage(page));
            navigation.appendChild(button);
        });

        container.appendChild(navigation);
    }

    renderStatisticsPage(container) {
        const section = this.createSection("ゲーム統計");

        section.content.appendChild(
            this.createRow(
                "ゲーム時間(オンライン)",
                this.formatDuration(StatisticsManager.getOnlineTime())
            )
        );
        section.content.appendChild(
            this.createRow(
                "ゲーム時間(全て)",
                this.formatDuration(StatisticsManager.getTotalGameTime())
            )
        );
        section.content.appendChild(
            this.createRow(
                "転生回数",
                String(StatisticsManager.getRebirthCount())
            )
        );
        section.content.appendChild(
            this.createRow(
                "総取得素材",
                Formatter.format(StatisticsManager.getTotalResources())
            )
        );
        section.content.appendChild(
            this.createRow(
                "総取得EP",
                Formatter.format(StatisticsManager.getTotalEP())
            )
        );

        container.appendChild(section.section);
    }

    getLuckAdjustedProbabilities(luck) {
        const base = [0.5, 0.25, 0.15, 0.08, 0.02];
        const currentLuck = Math.max(1, Number(luck) || 1);

        if (currentLuck < 2) return [1, 0, 0, 0, 0];

        let remainingLuck = Math.log1p(currentLuck);

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

    renderMultiplierPage(container, world) {
        const rarity = this.createSection("世界・レアリティ");

        if (!world) {
            rarity.content.appendChild(this.createRow("現在の世界", "なし"));
        } else {
            rarity.content.appendChild(this.createRow("現在の世界", world.name));
            rarity.content.appendChild(
                this.createRow("レアリティ", this.getRarityName(world.rarity))
            );
            rarity.content.appendChild(
                this.createRow("内部レアリティ値", String(world.rarity))
            );
            rarity.content.appendChild(
                this.createRow(
                    "レアリティ倍率",
                    "×" + Formatter.format(world.getRarityMultiplier())
                )
            );

            const probabilities = this.getLuckAdjustedProbabilities(world.getLuck());
            probabilities.forEach((probability, index) => {
                rarity.content.appendChild(
                    this.createRow(
                        this.getRarityName(index + 1),
                        (probability * 100).toFixed(4) + "%"
                    )
                );
            });
        }

        container.appendChild(rarity.section);

        const multipliers = this.createSection("倍率");

        const rebirth = world?.rebirthMultiplier || 1;
        const worldMultiplier = world?.getTotalMultiplier?.() || 1;
        const research = ResearchManager.getTotalMultiplier();
        const upgrade = UpgradeManager.getTotalMultiplier();

        multipliers.content.appendChild(
            this.createRow("世界基礎倍率", "×" + Formatter.format(worldMultiplier))
        );
        multipliers.content.appendChild(
            this.createRow("転生倍率", "×" + Formatter.format(rebirth))
        );
        multipliers.content.appendChild(
            this.createRow("研究倍率", "×" + Formatter.format(research))
        );
        multipliers.content.appendChild(
            this.createRow("強化倍率", "×" + Formatter.format(upgrade))
        );
        multipliers.content.appendChild(
            this.createRow(
                "研究＋強化倍率",
                "×" + Formatter.format(research * upgrade)
            )
        );

        if (world) {
            [
                ["plant", "植物"],
                ["metal", "金属"],
                ["magic", "魔力"]
            ].forEach(([id, label]) => {
                multipliers.content.appendChild(
                    this.createRow(
                        label + "補正",
                        "×" + world.getResourceMultiplier(id)
                    )
                );
                multipliers.content.appendChild(
                    this.createRow(
                        label + "生産量",
                        Formatter.format(world.getResourceProduction(id)) + "/秒"
                    )
                );
            });
        }

        container.appendChild(multipliers.section);
    }

    renderAbilitiesPage(container, world) {
        const section = this.createSection("能力値");

        section.content.appendChild(
            this.createRow(
                "幸運",
                Formatter.format(world?.getLuck?.() ?? 1)
            )
        );

        if (world) {
            section.content.appendChild(
                this.createRow("レアリティ", this.getRarityName(world.rarity))
            );
            section.content.appendChild(
                this.createRow("レアリティ倍率", "×" + Formatter.format(world.getRarityMultiplier()))
            );
        }

        container.appendChild(section.section);
    }

    render() {
        const container = document.getElementById("statistics-content");
        if (!container) return;

        container.innerHTML = "";

        const title = document.createElement("h2");
        title.textContent = "統計・倍率";
        container.appendChild(title);

        this.renderNavigation(container);

        const content = document.createElement("div");
        content.className = "statistics-page-content";

        const world = WorldManager.getActive();

        if (this.page === "statistics") {
            this.renderStatisticsPage(content);
        } else if (this.page === "multipliers") {
            this.renderMultiplierPage(content, world);
        } else {
            this.renderAbilitiesPage(content, world);
        }

        container.appendChild(content);
    }
}

export default new StatisticsUI();
