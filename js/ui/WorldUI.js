import WorldManager from "../world/Manager.js";
import UnlockManager from "../world/UnlockManager.js";
import Formatter from "../utils/Formatter.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import NewBirthManager from "../rebirth/Manager.js";
import eventBus from "../core/eventBus.js";

class WorldUI {
    constructor() {
        this.initialized = false;
        this.category = "world";
        this.renderQueued = false;
        this.lastRenderTime = 0;
        this.renderInterval = 100;
        this.expRefreshQueued = false;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;
        this.registerEvents();

        eventBus.on("action:world:category", payload => {
            const button = payload?.target?.closest?.("[data-world-category]");
            if (button) this.setCategory(button.dataset.worldCategory);
        });

        eventBus.on("action:world:rename", payload => {
            const button = payload?.target?.closest?.("[data-action='world:rename']");
            if (button) {
                this.renameWorld(Number(button.dataset.worldIndex));
            }
        });

        eventBus.on("world:tick", () => this.refreshExperience());

        eventBus.on("action:newbirth:request", payload => {
            const button = payload?.target?.closest?.("[data-action='newbirth:request']");
            if (button) {
                NewBirthManager.newBirth(Number(button.dataset.worldIndex));
            }
        });

        this.render();
    }

    setCategory(category) {
        if (category !== "world" && category !== "converter") return;

        this.category = category;
        this.renderCategory();
    }

    renderCategory() {
        document.querySelectorAll("[data-world-category-panel]").forEach(panel => {
            panel.hidden = panel.dataset.worldCategoryPanel !== this.category;
        });

        document.querySelectorAll("[data-world-category]").forEach(button => {
            const active = button.dataset.worldCategory === this.category;
            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", String(active));
        });
    }

    registerEvents() {
        [
            "world:update",
            "world:unlock",
            "world:create:success",
            "world:create:failed",
            "research:update",
            "upgrade:update",
            "newbirth:update",
            "world:unlock:update",
            "save:clear"
        ].forEach(event => {
            eventBus.on(event, () => this.scheduleRender());
        });

        eventBus.on("world:unlock:failed", failure => {
            if (!failure) return;

            eventBus.emit("notification:show", {
                type: "warning",
                message: this.getUnlockFailureMessage(failure)
            });
        });
    }

    scheduleRender() {
        if (this.renderQueued) return;

        this.renderQueued = true;

        const now = Date.now();
        const elapsed = now - this.lastRenderTime;
        const delay = Math.max(0, this.renderInterval - elapsed);

        window.setTimeout(() => {
            this.renderQueued = false;
            this.lastRenderTime = Date.now();
            this.render();
        }, delay);
    }

    getUnlockFailureMessage(failure) {
        switch (failure.code) {
            case "INSUFFICIENT_EP":
                return "EPが不足しています。必要: " +
                    Formatter.format(failure.required) +
                    " / 現在: " +
                    Formatter.format(failure.current);

            case "EP_CONSUME_FAILED":
                return "EPの消費に失敗しました。もう一度試してください。";

            default:
                return "世界の解放に失敗しました。";
        }
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

    renameWorld(index) {
        const world = WorldManager.get(index);

        if (!world) return;

        const name = window.prompt("世界名を入力してください", world.name);

        if (name === null) return;

        const trimmed = name.trim();

        if (!trimmed) return;

        world.name = trimmed;
        world.nameCustom = true;
        eventBus.emit("world:update");
    }

    createWorldCard(world, index) {
        const card = document.createElement("article");
        card.className = "world-card";
        card.dataset.action = "world:select";
        card.dataset.worldIndex = String(index);

        const name = document.createElement("h3");
        name.className = "world-card-title";
        name.textContent = world.name;

        const divider = () => {
            const element = document.createElement("div");
            element.className = "world-card-divider";
            element.textContent = "────────────────────";
            element.setAttribute("aria-hidden", "true");
            return element;
        };

        const createSectionTitle = text => {
            const title = document.createElement("strong");
            title.className = "world-card-section-title";
            title.textContent = text;
            return title;
        };

        const createRow = (label, value) => {
            const row = document.createElement("p");
            row.className = "world-card-row";
            row.textContent = label + ": " + value;
            return row;
        };

        const info = document.createElement("div");
        info.className = "world-card-section world-card-info";
        info.appendChild(createSectionTitle("世界情報"));
        info.appendChild(
            createRow("レアリティ", this.getRarityName(world.rarity))
        );
        info.appendChild(
            createRow(
                "レアリティ倍率",
                "×" + Formatter.format(world.getRarityMultiplier())
            )
        );
        info.appendChild(
            createRow(
                "特徴",
                world.getResourceFeatureName("plant")
            )
        );
        info.appendChild(
            createRow(
                "固有効果",
                world.getUniqueEffectName()
            )
        );
        info.appendChild(createRow("Lv", String(world.level)));
        info.appendChild(
            createRow(
                "EXP",
                Formatter.format(world.exp) +
                "/" +
                Formatter.format(world.getRequiredExperience())
            )
        );
        info.appendChild(
            createRow(
                "基礎能力",
                "×" + Formatter.format(world.getTotalMultiplier())
            )
        );

        const production = document.createElement("div");
        production.className = "world-card-section world-production";
        production.appendChild(createSectionTitle("生産"));

        const list = document.createElement("ul");

        const globalMultiplier =
            ResearchManager.getTotalMultiplier() *
            UpgradeManager.getTotalMultiplier();

        [["plant", "植物"], ["metal", "金属"], ["magic", "魔力"]].forEach(
            ([id, label]) => {
                const item = document.createElement("li");
                const rate =
                    world.getResourceProduction(id).multiply(globalMultiplier);

                item.textContent =
                    label +
                    ": +" +
                    Formatter.format(rate) +
                    "/秒 (×" +
                    Formatter.format(world.getResourceMultiplier(id)) +
                    ")";

                list.appendChild(item);
            }
        );

        production.appendChild(list);

        const newBirth = document.createElement("div");
        newBirth.className = "world-card-section world-newbirth";
        newBirth.appendChild(createSectionTitle("新生"));

        newBirth.appendChild(
            createRow(
                "新生倍率",
                "×" + Formatter.format(NewBirthManager.getMultiplier(index))
            )
        );

        newBirth.appendChild(
            createRow(
                "今回の倍率",
                "×" + Formatter.format(world.getNewBirthMultiplier())
            )
        );

        const newBirthButton = document.createElement("button");
        newBirthButton.type = "button";
        newBirthButton.dataset.action = "newbirth:request";
        newBirthButton.dataset.worldIndex = String(index);
        newBirthButton.textContent = "世界新生";
        newBirthButton.disabled = !world.canNewBirth();

        newBirth.appendChild(newBirthButton);

        const renameButton = document.createElement("button");
        renameButton.type = "button";
        renameButton.className = "world-rename-button";
        renameButton.textContent = "✎";
        renameButton.setAttribute("aria-label", "世界名を変更");
        renameButton.dataset.action = "world:rename";
        renameButton.dataset.worldIndex = String(index);

        const nameRow = document.createElement("div");
        nameRow.className = "world-name-row";
        nameRow.appendChild(name);
        nameRow.appendChild(renameButton);

        card.appendChild(nameRow);
        card.appendChild(divider());
        card.appendChild(info);
        card.appendChild(divider());
        card.appendChild(production);
        card.appendChild(divider());
        card.appendChild(newBirth);
        card.appendChild(divider());

        if (index === WorldManager.getActiveIndex()) {
            card.classList.add("active");
            card.setAttribute("aria-current", "true");
        }

        return card;
    }
    renderWorldList() {
        const container = document.getElementById("world-list");

        if (!container) return;

        container.innerHTML = "";

        WorldManager.getAll().forEach((world, index) => {
            container.appendChild(
                this.createWorldCard(world, index)
            );
        });
    }

    renderNextWorld() {
        const container = document.getElementById("next-world");

        if (!container) return;

        const cost = UnlockManager.getUnlockCost();

        container.innerHTML = "";

        const costText = document.createElement("p");
        costText.className = "next-world-cost";
        costText.textContent =
            "必要EP: " +
            Formatter.format(cost) +
            " EP";

        const button = document.createElement("button");
        button.id = "unlock-world";
        button.type = "button";
        button.dataset.action = "world:create:request";
        button.textContent = "世界作成";

        container.appendChild(costText);
        container.appendChild(button);
    }

    refreshExperience() {
        const value = document.getElementById("world-exp-value");
        const world = WorldManager.getActive();

        if (!value || !world) return;

        value.textContent =
            "EXP: " +
            Formatter.format(world.exp) +
            " / " +
            Formatter.format(world.getRequiredExperience());
    }

    render() {
        this.renderCategory();

        try {
            this.renderWorldList();
        } catch (error) {
            console.error("World list render failed:", error);
            eventBus.emit("error:update", error);
        }

        this.refreshExperience();

        try {
            this.renderNextWorld();
        } catch (error) {
            console.error("World creation UI render failed:", error);
            eventBus.emit("error:update", error);
        }
    }
}

export default new WorldUI();
