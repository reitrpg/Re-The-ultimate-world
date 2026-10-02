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

    createMultiplierGroup(title, renderContent, open = false) {
        const group = document.createElement("section");
        group.className = "statistics-multiplier-group";
        group.dataset.open = String(open);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "statistics-multiplier-toggle";
        button.setAttribute("aria-expanded", String(open));

        const label = document.createElement("span");
        label.textContent = title;

        const arrow = document.createElement("span");
        arrow.className = "statistics-multiplier-arrow";
        arrow.textContent = "⌄";
        arrow.setAttribute("aria-hidden", "true");

        button.appendChild(label);
        button.appendChild(arrow);

        const content = document.createElement("div");
        content.className = "statistics-multiplier-content";
        content.hidden = !open;

        renderContent(content);

        button.addEventListener("click", () => {
            const nextOpen = content.hidden;
            content.hidden = !nextOpen;
            group.dataset.open = String(nextOpen);
            button.setAttribute("aria-expanded", String(nextOpen));
        });

        group.appendChild(button);
        group.appendChild(content);

        return group;
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
        const multipliers = this.createSection("倍率");

        const rebirth = world?.rebirthMultiplier || 1;
        const worldMultiplier = world?.getTotalMultiplier?.() || 1;
        const research = ResearchManager.getTotalMultiplier();
        const upgrade = UpgradeManager.getTotalMultiplier();
        const uniqueType = world?.getUniqueEffectType?.() || "none";
        const uniqueName = world?.getUniqueEffectName?.() || "なし";
        const uniqueMultiplier = world?.getUniqueEffectMultiplier?.() ?? 1;

        multipliers.content.appendChild(
            this.createMultiplierGroup(
                "素材別",
                content => {
                    content.appendChild(
                        this.createRow("世界基礎倍率", "×" + Formatter.format(worldMultiplier))
                    );
                    content.appendChild(
                        this.createRow("転生倍率", "×" + Formatter.format(rebirth))
                    );

                    if (world && uniqueType !== "ep_conversion" && uniqueType !== "luck") {
                        content.appendChild(
                            this.createRow("固有効果", uniqueName)
                        );
                        content.appendChild(
                            this.createRow(
                                "固有効果倍率",
                                "×" + Formatter.format(uniqueMultiplier)
                            )
                        );
                    }

                    [
                        ["plant", "植物"],
                        ["metal", "金属"],
                        ["magic", "魔力"]
                    ].forEach(([id, label]) => {
                        content.appendChild(
                            this.createRow(
                                label + "補正",
                                "×" + Formatter.format(world?.getResourceMultiplier?.(id) ?? 1)
                            )
                        );
                        content.appendChild(
                            this.createRow(
                                label + "生産量",
                                Formatter.format(world?.getResourceProduction?.(id) ?? 0) + "/秒"
                            )
                        );
                    });
                },
                true
            )
        );

        multipliers.content.appendChild(
            this.createMultiplierGroup(
                "EP",
                content => {
                    if (world && uniqueType === "ep_conversion") {
                        content.appendChild(
                            this.createRow("固有効果", uniqueName)
                        );
                        content.appendChild(
                            this.createRow(
                                "EP変換倍率",
                                "×" + Formatter.format(uniqueMultiplier)
                            )
                        );
                    } else {
                        content.appendChild(
                            this.createRow("EP変換倍率", "×1")
                        );
                    }
                }
            )
        );

        multipliers.content.appendChild(
            this.createMultiplierGroup(
                "研究",
                content => {
                    content.appendChild(
                        this.createRow("研究倍率", "×" + Formatter.format(research))
                    );
                    content.appendChild(
                        this.createRow("強化倍率", "×" + Formatter.format(upgrade))
                    );
                    content.appendChild(
                        this.createRow(
                            "研究＋強化倍率",
                            "×" + Formatter.format(research * upgrade)
                        )
                    );
                }
            )
        );

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
