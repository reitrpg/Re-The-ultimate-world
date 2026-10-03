import eventBus from "../core/eventBus.js";
import AutomationManager from "../automation/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import Converter from "../converter/Converter.js";

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

    createAutomationRow({
        value,
        label,
        enabled,
        onValueChange,
        onToggle
    }) {
        const row = document.createElement("div");
        row.className = "automation-item";

        const valueInput = document.createElement("input");
        valueInput.type = "number";
        valueInput.min = "0";
        valueInput.max = "100";
        valueInput.step = "1";
        valueInput.value = String(Math.round(value * 100));
        valueInput.inputMode = "numeric";
        valueInput.setAttribute("aria-label", label + "使用率");
        valueInput.addEventListener("change", () => {
            let next = Number(valueInput.value);
            if (!Number.isFinite(next)) next = 0;
            next = Math.min(100, Math.max(0, Math.round(next)));
            valueInput.value = String(next);
            onValueChange(next / 100);
        });

        const type = document.createElement("span");
        type.className = "automation-type";
        type.textContent = label;

        const toggleLabel = document.createElement("label");
        toggleLabel.className = "automation-toggle";

        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = enabled;
        toggle.setAttribute("aria-label", label + "自動化");
        toggle.addEventListener("change", () => {
            onToggle(toggle.checked);
        });

        const toggleText = document.createElement("span");
        toggleText.textContent = toggle.checked ? "ON" : "OFF";

        toggle.addEventListener("change", () => {
            toggleText.textContent = toggle.checked ? "ON" : "OFF";
        });

        toggleLabel.appendChild(toggle);
        toggleLabel.appendChild(toggleText);

        row.appendChild(valueInput);
        row.appendChild(type);
        row.appendChild(toggleLabel);

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
            container.appendChild(
                this.createAutomationRow({
                    value: AutomationManager.getUpgradeSpendRate(upgrade.id),
                    label: upgrade.name,
                    enabled: AutomationManager.isUpgradeAutomationEnabled(upgrade.id),
                    onValueChange: value => {
                        AutomationManager.setUpgradeSpendRate(upgrade.id, value);
                    },
                    onToggle: enabled => {
                        AutomationManager.setUpgradeAutomation(id = upgrade.id, enabled);
                    }
                })
            );
        });

        Converter.getRecipes().forEach(recipe => {
            const label =
                recipe.resourceId === "plant"
                    ? "植物→EP"
                    : recipe.resourceId === "metal"
                        ? "金属→EP"
                        : "魔力→EP";

            container.appendChild(
                this.createAutomationRow({
                    value: AutomationManager.getConverterRate(recipe.resourceId),
                    label,
                    enabled: AutomationManager.isConverterAutomationEnabled(recipe.id),
                    onValueChange: value => {
                        AutomationManager.setConverterRate(
                            recipe.resourceId,
                            value
                        );
                    },
                    onToggle: enabled => {
                        AutomationManager.setConverterAutomation(
                            recipe.id,
                            enabled
                        );
                    }
                })
            );
        });
    }
}

export default new AutomationUI();
