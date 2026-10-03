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

        wrapper.appendChild(text);
        wrapper.appendChild(input);
        return wrapper;
    }

    render() {
        const container = document.getElementById("automation-content");
        if (!container) return;

        container.innerHTML = "";

        const upgradeHeading = document.createElement("h3");
        upgradeHeading.textContent = "無限アップグレード";
        container.appendChild(upgradeHeading);

        UpgradeManager.getByType("infinite").forEach(upgrade => {
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
