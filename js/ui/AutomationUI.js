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
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "automation-toggle-button";
        toggle.textContent = enabled ? "ON" : "OFF";
        toggle.setAttribute("aria-pressed", String(enabled));
        toggle.setAttribute("aria-label", label + "自動化");
        toggle.addEventListener("click", () => {
            onToggle(toggle.getAttribute("aria-pressed") !== "true");
        });
        return toggle;
    }

    createConverterRow(recipe) {
        const label = "EP変換:" + (
            recipe.resourceId === "plant"
                ? "植物"
                : recipe.resourceId === "metal"
                    ? "金属"
                    : "魔力"
        );

        const row = document.createElement("div");
        row.className = "automation-item automation-converter-item";

        const name = document.createElement("span");
        name.className = "automation-type";
        name.textContent = label;

        const value = document.createElement("input");
        value.type = "text";
        value.className = "automation-value";
        value.inputMode = "decimal";
        value.value = this.getValueText(recipe.id, AutomationManager.getConverterMode(recipe.id));
        value.setAttribute("aria-label", label + "設定値");

        const mode = document.createElement("select");
        mode.className = "automation-mode";
        mode.setAttribute("aria-label", label + "モード");
        Object.entries(MODE_LABELS).forEach(([key, text]) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = text;
            mode.appendChild(option);
        });
        mode.value = AutomationManager.getConverterMode(recipe.id);

        const status = document.createElement("span");
        status.className = "automation-mode-status";
        status.setAttribute("aria-live", "polite");

        const updateValue = () => {
            const currentMode = mode.value;
            const raw = value.value.trim();

            if (currentMode === "ratio") {
                AutomationManager.setConverterRate(recipe.resourceId, Number(raw) / 100);
                return;
            }

            if (currentMode === "proportional") {
                AutomationManager.setConverterThreshold(recipe.id, raw);
                return;
            }

            if (currentMode === "formula") {
                AutomationManager.setConverterFormula(recipe.id, raw);
                return;
            }

            AutomationManager.setConverterSeconds(recipe.id, raw);
        };

        value.addEventListener("change", updateValue);

        mode.addEventListener("change", () => {
            AutomationManager.setConverterMode(recipe.id, mode.value);
            this.render();
        });

        const advanced = document.createElement("div");
        advanced.className = "automation-mode-extra";

        if (mode.value === "proportional") {
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
            advanced.appendChild(multiplier);
        } else if (mode.value === "formula") {
            const threshold = document.createElement("input");
            threshold.type = "number";
            threshold.step = "any";
            threshold.value = String(AutomationManager.getConverterFormulaThreshold(recipe.id));
            threshold.className = "automation-extra-value";
            threshold.title = "指定値";
            threshold.setAttribute("aria-label", label + "計算結果の指定値");
            threshold.addEventListener("change", () => {
                AutomationManager.setConverterFormulaThreshold(recipe.id, threshold.value);
            });

            const help = document.createElement("small");
            help.className = "automation-formula-help";
            help.textContent = "例: floor(resource / 100) / plant・metal・magic・EP・resource・totalMaterials / floor・ceil・round・min・max・abs・sqrt・log・log10・pow";
            advanced.append(threshold, help);
        } else if (mode.value === "time") {
            const unit = document.createElement("span");
            unit.textContent = "秒";
            advanced.appendChild(unit);
        }

        const config = document.createElement("div");
        config.className = "automation-config";
        config.append(value, advanced);

        const toggle = this.createToggle(
            label,
            AutomationManager.isConverterAutomationEnabled(recipe.id),
            enabled => AutomationManager.setConverterAutomation(recipe.id, enabled)
        );

        row.append(name, config, mode, toggle);
        return row;
    }

    getValueText(id, mode) {
        if (mode === "ratio") return String(Math.round(AutomationManager.getConverterRate(id === "plant_to_ep" ? "plant" : id === "metal_to_ep" ? "metal" : "magic") * 100));
        if (mode === "proportional") return String(AutomationManager.getConverterThreshold(id));
        if (mode === "formula") return AutomationManager.getConverterFormula(id);
        return String(AutomationManager.getConverterSeconds(id));
    }

    createUpgradeRow(upgrade) {
        const row = document.createElement("div");
        row.className = "automation-item";

        const valueInput = document.createElement("input");
        valueInput.type = "number";
        valueInput.min = "0";
        valueInput.max = "100";
        valueInput.step = "1";
        valueInput.value = String(Math.round(AutomationManager.getUpgradeSpendRate(upgrade.id) * 100));
        valueInput.inputMode = "numeric";
        valueInput.className = "automation-value";
        valueInput.setAttribute("aria-label", upgrade.name + "使用率");
        valueInput.addEventListener("change", () => {
            let next = Number(valueInput.value);
            if (!Number.isFinite(next)) next = 0;
            next = Math.min(100, Math.max(0, Math.round(next)));
            valueInput.value = String(next);
            AutomationManager.setUpgradeSpendRate(upgrade.id, next / 100);
        });

        const name = document.createElement("span");
        name.className = "automation-type";
        name.textContent = upgrade.name;

        const mode = document.createElement("span");
        mode.className = "automation-mode-label";
        mode.textContent = "割合式";

        const toggle = this.createToggle(
            upgrade.name,
            AutomationManager.isUpgradeAutomationEnabled(upgrade.id),
            enabled => AutomationManager.setUpgradeAutomation(upgrade.id, enabled)
        );

        row.append(name, valueInput, mode, toggle);
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

        const upgrades = UpgradeManager
            .getByType("infinite")
            .filter(upgrade => upgrade.isUnlocked());

        upgrades.forEach(upgrade => {
            container.appendChild(this.createUpgradeRow(upgrade));
        });

        Converter.getRecipes().forEach(recipe => {
            container.appendChild(this.createConverterRow(recipe));
        });
    }
}

export default new AutomationUI();
