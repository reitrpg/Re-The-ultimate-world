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

        this.render();
    }

    createToggle(label, enabled, onToggle) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "automation-toggle-button";
        button.textContent = enabled ? "ON" : "OFF";
        button.setAttribute("aria-pressed", String(enabled));
        button.setAttribute("aria-label", label + "自動化");
        button.addEventListener("click", () => {
            onToggle(button.getAttribute("aria-pressed") !== "true");
        });
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

    createConverterRow(recipe) {
        const label = this.getConverterLabel(recipe.resourceId);
        const modeValue = AutomationManager.getConverterMode(recipe.id);

        const row = document.createElement("div");
        row.className = "automation-item automation-converter-item";

        const name = document.createElement("span");
        name.className = "automation-type";
        name.textContent = label;

        const value = document.createElement("input");
        value.type = modeValue === "formula" ? "text" : "number";
        value.className = "automation-value";
        value.value = this.getPrimaryValue(recipe.id, recipe.resourceId, modeValue);
        value.setAttribute("aria-label", label + "設定値");
        value.title = modeValue === "ratio" ? "割合（%）" : modeValue === "proportional" ? "A（指定値）" : modeValue === "formula" ? "計算式" : "秒数";

        const mode = document.createElement("select");
        mode.className = "automation-mode";
        mode.setAttribute("aria-label", label + "モード");
        Object.entries(MODE_LABELS).forEach(([key, text]) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = text;
            mode.appendChild(option);
        });
        mode.value = modeValue;

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

        value.addEventListener("change", () => {
            if (mode.value === "ratio") {
                const number = Number(value.value);
                if (Number.isFinite(number)) AutomationManager.setConverterRate(recipe.resourceId, number / 100);
            } else if (mode.value === "proportional") {
                AutomationManager.setConverterThreshold(recipe.id, value.value);
            } else if (mode.value === "formula") {
                AutomationManager.setConverterFormula(recipe.id, value.value);
            } else {
                AutomationManager.setConverterSeconds(recipe.id, value.value);
            }
        });

        mode.addEventListener("change", () => {
            AutomationManager.setConverterMode(recipe.id, mode.value);
        });

        row.append(name, config, mode, toggle);
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

        const mode = document.createElement("span");
        mode.className = "automation-mode-label";
        mode.textContent = "割合式";

        const toggle = this.createToggle(
            upgrade.name,
            AutomationManager.isUpgradeAutomationEnabled(upgrade.id),
            enabled => AutomationManager.setUpgradeAutomation(upgrade.id, enabled)
        );

        row.append(name, value, mode, toggle);
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
        container.appendChild(this.createHeading("自動化種類"));

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
