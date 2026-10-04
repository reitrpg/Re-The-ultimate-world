import eventBus from "../core/eventBus.js";
import AutomationManager from "../automation/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import Converter from "../converter/Converter.js";

const MODE_LABELS = {
    ratio: "割合式",
    proportional: "比例式",
    formula: "計算式",
    time: "時間式"
};

class AutomationUI {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;

        eventBus.on("automation:update", () => this.render());
        eventBus.on("upgrade:update", () => this.render());
        eventBus.on("converter:update", () => this.render());

        eventBus.on("input:pressed", payload => {
            const target = payload?.target;
            if (!target) return;

            if (target.dataset?.action === "automation:toggle") {
                const id = target.dataset.automationId;
                const type = target.dataset.automationType;
                const enabled = target.getAttribute("aria-pressed") !== "true";

                if (type === "converter") {
                    AutomationManager.setConverterAutomation(id, enabled);
                } else if (type === "upgrade") {
                    AutomationManager.setUpgradeAutomation(id, enabled);
                }
                return;
            }

            if (target.dataset?.action === "automation:mode") {
                const id = target.dataset.automationId;
                const keys = Object.keys(MODE_LABELS);
                const current = AutomationManager.getConverterMode(id);
                const index = Math.max(0, keys.indexOf(current));
                const nextMode = keys[(index + 1) % keys.length];
                AutomationManager.setConverterMode(id, nextMode);
            }
        });

        this.render();
    }

    createToggle(label, enabled, onToggle) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "automation-toggle-button";
        button.dataset.action = "automation:toggle";
        button.dataset.actionOn = "down";
        button.dataset.automationType = "";
        button.textContent = enabled ? "ON" : "OFF";
        button.setAttribute("aria-pressed", String(enabled));
        button.setAttribute("aria-label", label + "自動化");
        button.dataset.automationHandler = "toggle";
        return button;
    }

    getConverterLabel(resourceId) {
        if (resourceId === "plant") return "EP変換:植物";
        if (resourceId === "metal") return "EP変換:金属";
        return "EP変換:魔力";
    }

    getPrimaryValue(id, resourceId, mode) {
        if (mode === "ratio") {
            return String(Math.round(AutomationManager.getConverterRate(resourceId) * 100));
        }
        if (mode === "proportional") {
            return String(AutomationManager.getConverterThreshold(id));
        }
        if (mode === "formula") {
            return AutomationManager.getConverterFormula(id);
        }
        return String(AutomationManager.getConverterSeconds(id));
    }

    createModeButton(label, modeValue, onChange) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "automation-mode-button";
        button.dataset.action = "automation:mode";
        button.dataset.actionOn = "down";
        button.textContent = MODE_LABELS[modeValue] || modeValue;
        button.setAttribute("aria-label", label + "自動化種類");
        return button;
    }

    createConverterRow(recipe) {
        const label = this.getConverterLabel(recipe.resourceId);
        const modeValue = AutomationManager.getConverterMode(recipe.id);

        const row = document.createElement("div");
        row.className = "automation-item automation-converter-item";

        const name = document.createElement("span");
        name.className = "automation-type";
        name.textContent = label;

        const body = document.createElement("div");
        body.className = "automation-row-body";

        const value = document.createElement("input");
        value.type = modeValue === "formula" ? "text" : "number";
        value.className = "automation-value";
        value.value = this.getPrimaryValue(recipe.id, recipe.resourceId, modeValue);
        value.setAttribute("aria-label", label + "設定値");
        value.title = modeValue === "ratio" ? "割合（%）" : modeValue === "proportional" ? "A（指定値）" : modeValue === "formula" ? "計算式" : "秒数";

        const mode = this.createModeButton(
            label,
            modeValue,
            nextMode => AutomationManager.setConverterMode(recipe.id, nextMode)
        );
        mode.dataset.automationId = recipe.id;

        const extra = document.createElement("div");
        extra.className = "automation-mode-extra";

        if (modeValue === "proportional") {
            const multiplier = document.createElement("input");
            multiplier.type = "number";
            multiplier.min = "0.000001";
            multiplier.step = "0.1";
            multiplier.value = String(AutomationManager.getConverterMultiplier(recipe.id));
            multiplier.className = "automation-extra-value";
            multiplier.title = "B倍率";
            multiplier.setAttribute("aria-label", label + "B倍率");
            multiplier.addEventListener("change", () => {
                AutomationManager.setConverterMultiplier(recipe.id, multiplier.value);
            });
            extra.appendChild(multiplier);

            const suffix = document.createElement("span");
            suffix.textContent = "倍";
            extra.appendChild(suffix);
        }

        if (modeValue === "formula") {
            const threshold = document.createElement("input");
            threshold.type = "number";
            threshold.step = "any";
            threshold.value = String(AutomationManager.getConverterFormulaThreshold(recipe.id));
            threshold.className = "automation-extra-value";
            threshold.title = "指定値";
            threshold.setAttribute("aria-label", label + "指定値");
            threshold.addEventListener("change", () => {
                AutomationManager.setConverterFormulaThreshold(recipe.id, threshold.value);
            });
            extra.appendChild(threshold);

            const suffix = document.createElement("span");
            suffix.textContent = "を超えたら発動";
            extra.appendChild(suffix);
        }

        if (modeValue === "time") {
            const suffix = document.createElement("span");
            suffix.textContent = "秒ごと";
            extra.appendChild(suffix);
        }

        if (modeValue === "formula") {
            const help = document.createElement("small");
            help.className = "automation-formula-help";
            help.textContent = "変数: plant / metal / magic / EP / resource / totalMaterials　関数: floor / ceil / round / abs / sqrt / log / log10 / min / max / pow";
            extra.appendChild(help);
        }

        const config = document.createElement("div");
        config.className = "automation-config";
        config.append(value, extra);

        const toggle = this.createToggle(
            label,
            AutomationManager.isConverterAutomationEnabled(recipe.id),
            enabled => AutomationManager.setConverterAutomation(recipe.id, enabled)
        );
        toggle.dataset.automationId = recipe.id;
        toggle.dataset.automationType = "converter";

        value.addEventListener("change", () => {
            if (modeValue === "ratio") {
                const number = Number(value.value);
                if (Number.isFinite(number)) AutomationManager.setConverterRate(recipe.resourceId, number / 100);
            } else if (modeValue === "proportional") {
                AutomationManager.setConverterThreshold(recipe.id, value.value);
            } else if (modeValue === "formula") {
                AutomationManager.setConverterFormula(recipe.id, value.value);
            } else {
                AutomationManager.setConverterSeconds(recipe.id, value.value);
            }
        });

        body.append(value, extra, mode, toggle);
        row.append(name, body);
        return row;
    }

    createUpgradeRow(upgrade) {
        const row = document.createElement("div");
        row.className = "automation-item";

        const name = document.createElement("span");
        name.className = "automation-type";
        name.textContent = upgrade.name;

        const value = document.createElement("input");
        value.type = "number";
        value.min = "0";
        value.max = "100";
        value.step = "1";
        value.value = String(Math.round(AutomationManager.getUpgradeSpendRate(upgrade.id) * 100));
        value.className = "automation-value";
        value.setAttribute("aria-label", upgrade.name + "使用率");
        value.addEventListener("change", () => {
            let next = Number(value.value);
            if (!Number.isFinite(next)) next = 0;
            next = Math.min(100, Math.max(0, Math.round(next)));
            value.value = String(next);
            AutomationManager.setUpgradeSpendRate(upgrade.id, next / 100);
        });

        const body = document.createElement("div");
        body.className = "automation-row-body";

        const mode = document.createElement("button");
        mode.type = "button";
        mode.className = "automation-mode-button automation-mode-label";
        mode.textContent = "割合式";
        mode.disabled = true;
        mode.setAttribute("aria-label", upgrade.name + "自動化種類");

        const toggle = this.createToggle(
            upgrade.name,
            AutomationManager.isUpgradeAutomationEnabled(upgrade.id),
            enabled => AutomationManager.setUpgradeAutomation(upgrade.id, enabled)
        );
        toggle.dataset.automationId = upgrade.id;
        toggle.dataset.automationType = "upgrade";

        body.append(value, mode, toggle);
        row.append(name, body);
        return row;
    }

    createHeading(text) {
        const heading = document.createElement("h3");
        heading.textContent = text;
        return heading;
    }

    render() {
        const container = document.getElementById("automation-content");
        if (!container) return;

        const tabButton = document.querySelector("[data-tab='automation']");
        const unlocked = UpgradeManager.get("automation_unlock")?.level >= 1;

        if (tabButton) {
            tabButton.hidden = !unlocked;
            tabButton.setAttribute("aria-hidden", String(!unlocked));
        }

        if (!unlocked) {
            container.innerHTML = "<p>有限強化「自動化解禁」を購入すると使用できます。</p>";
            return;
        }

        container.innerHTML = "";

        UpgradeManager
            .getByType("infinite")
            .filter(upgrade => upgrade.isUnlocked())
            .forEach(upgrade => container.appendChild(this.createUpgradeRow(upgrade)));

        Converter.getRecipes().forEach(recipe => {
            container.appendChild(this.createConverterRow(recipe));
        });
    }
}

export default new AutomationUI();
