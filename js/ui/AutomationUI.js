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

    createToggle(label, enabled, action, id) {
        const wrapper = document.createElement("label");
        wrapper.className = "automation-item";

        const text = document.createElement("span");
        text.textContent = label;

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = enabled;
        input.dataset.automationAction = action;
        input.dataset.automationId = id;
        input.addEventListener("change", () => {
            if (action === "upgrade") {
                AutomationManager.setUpgradeAutomation(id, input.checked);
            } else if (action === "converter") {
                AutomationManager.setConverterAutomation(id, input.checked);
            }
        });

        wrapper.appendChild(text);
        wrapper.appendChild(input);
        return wrapper;
    }

    render() {
        const container = document.getElementById("automation-content");
        if (!container) return;

        container.innerHTML = "";

        const spendHeading = document.createElement("h3");
        spendHeading.textContent = "無限アップグレード EP使用上限";
        container.appendChild(spendHeading);

        const spendLabel = document.createElement("label");
        spendLabel.textContent = "現在EPの " + Math.round(AutomationManager.getUpgradeSpendRate() * 100) + "%以下";
        const spendInput = document.createElement("input");
        spendInput.type = "range";
        spendInput.min = "0";
        spendInput.max = "100";
        spendInput.step = "1";
        spendInput.value = String(Math.round(AutomationManager.getUpgradeSpendRate() * 100));
        spendInput.addEventListener("input", () => {
            AutomationManager.setUpgradeSpendRate(Number(spendInput.value) / 100);
            spendLabel.firstChild.textContent = "現在EPの " + spendInput.value + "%以下";
        });
        spendLabel.appendChild(spendInput);
        container.appendChild(spendLabel);

        const upgradeHeading = document.createElement("h3");
        upgradeHeading.textContent = "無限アップグレード";
        container.appendChild(upgradeHeading);

        UpgradeManager.getByType("infinite").filter(upgrade => upgrade.isUnlocked()).forEach(upgrade => {
            container.appendChild(
                this.createToggle(
                    upgrade.name,
                    AutomationManager.isUpgradeAutomationEnabled(upgrade.id),
                    "upgrade",
                    upgrade.id
                )
            );
        });

        const converterHeading = document.createElement("h3");
        converterHeading.textContent = "EP変換";
        container.appendChild(converterHeading);

        Converter.getRecipes().forEach(recipe => {
            const rateLabel = document.createElement("label");
            rateLabel.textContent = recipe.resourceId === "plant"
                ? "植物使用率 "
                : recipe.resourceId === "metal"
                    ? "金属使用率 "
                    : "魔力使用率 ";
            const rateInput = document.createElement("input");
            rateInput.type = "range";
            rateInput.min = "0";
            rateInput.max = "100";
            rateInput.step = "1";
            rateInput.value = String(Math.round(AutomationManager.getConverterRate(recipe.resourceId) * 100));
            rateInput.addEventListener("input", () => {
                AutomationManager.setConverterRate(
                    recipe.resourceId,
                    Number(rateInput.value) / 100
                );
            });
            container.appendChild(rateLabel);
            container.appendChild(rateInput);

            container.appendChild(
                this.createToggle(
                    recipe.name,
                    AutomationManager.isConverterAutomationEnabled(recipe.id),
                    "converter",
                    recipe.id
                )
            );
        });
    }
}

export default new AutomationUI();
