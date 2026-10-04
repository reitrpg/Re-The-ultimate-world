import WorldManager from "../world/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import StatisticsManager from "../statistics/Manager.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";
import AchievementManager from "../achievements/Manager.js";

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
            "research:update",
            "upgrade:update",
            "rebirth:update",
            "save:clear",
            "settings:update",
            "achievement:update",
            "achievement:achieved"
        ].forEach(event => {
            eventBus.on(event, () => this.render());
        });

        eventBus.on("tab:change", tab => {
            if (tab === "statistics") this.render();
        });

        eventBus.on("action:statistics:set-page", payload => {
            const pageButton =
                payload?.target?.closest?.("[data-action='statistics:set-page']");

            if (pageButton) {
                this.setPage(pageButton.dataset.statisticsPage);
            }
        });

        eventBus.on("action:statistics:toggle", payload => {
            const multiplierToggle =
                payload?.target?.closest?.("[data-action='statistics:toggle']");

            if (multiplierToggle) {
                this.toggleMultiplierGroup(multiplierToggle);
            }
        });

        this.render();
    }

    toggleMultiplierGroup(toggle) {
        const group = toggle.closest?.(".statistics-multiplier-group");
        if (!group) return;

        const content = group.querySelector(".statistics-multiplier-content");
        if (!content) return;

        const nextOpen = content.hidden;
        content.hidden = !nextOpen;
        group.dataset.open = String(nextOpen);
        toggle.setAttribute("aria-expanded", String(nextOpen));

        const arrow = toggle.querySelector(".statistics-multiplier-arrow");
        if (arrow) {
            arrow.textContent = nextOpen ? "⌃" : "⌄";
        }
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
        button.dataset.action = "statistics:toggle";
        button.setAttribute("aria-expanded", String(open));

        const label = document.createElement("span");
        label.textContent = title;

        const arrow = document.createElement("span");
        arrow.className = "statistics-multiplier-arrow";
        arrow.textContent = open ? "⌃" : "⌄";
        arrow.setAttribute("aria-hidden", "true");

        button.appendChild(label);
        button.appendChild(arrow);

        const content = document.createElement("div");
        content.className = "statistics-multiplier-content";
        content.hidden = !open;

        renderContent(content);

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
            button.dataset.action = "statistics:set-page";
            button.textContent = label;
            button.classList.toggle("active", this.page === page);
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

        section.content.appendChild(
            this.createRow(
                "実績達成数",
                AchievementManager.getAchievedCount() +
                " / " +
                AchievementManager.getAll().length
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

        const resourceSection = this.createMultiplierGroup(
            "素材系",
            content => {
                const resourceDefinitions = [
                    ["plant", "植物"],
                    ["metal", "金属"],
                    ["magic", "魔力"]
                ];

                resourceDefinitions.forEach(([resourceId, label]) => {
                    const resourceMultiplier =
                        world?.getResourceUniqueEffectMultiplier?.(resourceId) ?? 1;

                    content.appendChild(
                        this.createMultiplierGroup(
                            label,
                            resourceContent => {
                                resourceContent.appendChild(
                                    this.createRow(
                                        "固有効果倍率",
                                        "×" + Formatter.format(resourceMultiplier)
                                    )
                                );
                            }
                        )
                    );
                });
            },
            false
        );

        multipliers.content.appendChild(resourceSection);

        const epMultiplier = world?.getEPConversionMultiplier?.() ?? 1;
        multipliers.content.appendChild(
            this.createMultiplierGroup(
                "EP",
                content => {
                    content.appendChild(
                        this.createRow(
                            "EP変換倍率",
                            "×" + Formatter.format(epMultiplier)
                        )
                    );
                }
            )
        );

        const research = ResearchManager.getTotalMultiplier();
        const upgrade = UpgradeManager.getTotalMultiplier();

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