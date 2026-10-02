import Converter from "../converter/Converter.js";
import Formatter from "../utils/Formatter.js";
import eventBus from "../core/eventBus.js";

class ConverterUI {
    constructor() {
        this.initialized = false;
        this.renderQueued = false;
        this.lastRenderTime = 0;
        this.renderInterval = 200;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;
        this.registerEvents();

        eventBus.on("action:converter:convert", payload => {
            const convert = payload?.target?.closest?.("[data-action='converter:convert']");
            if (convert) {
                Converter.convert(convert.dataset.recipeId);
            }
        });

        eventBus.on("action:converter:convert-all", payload => {
            const convertAll = payload?.target?.closest?.("[data-action='converter:convert-all']");
            if (convertAll) {
                Converter.convertAll(convertAll.dataset.recipeId);
            }
        });

        this.render();
    }

    registerEvents() {
        eventBus.on("converter:update", () => this.scheduleRender());
        eventBus.on("resource:update", () => this.scheduleRender());
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

    createConverterElement(recipe) {
        const item = document.createElement("div");
        item.className = "converter-item";

        const convertButton = document.createElement("button");
        convertButton.type = "button";
        convertButton.textContent = "変換";
        convertButton.dataset.action = "converter:convert";
        convertButton.dataset.recipeId = recipe.id;

        const convertAllButton = document.createElement("button");
        convertAllButton.type = "button";
        convertAllButton.textContent = "全変換";
        convertAllButton.dataset.action = "converter:convert-all";
        convertAllButton.dataset.recipeId = recipe.id;

        item.innerHTML =
            "<h3>" + recipe.name + "</h3>" +
            "<p>" +
            Formatter.format(recipe.resourceCost) +
            " → " +
            Formatter.format(recipe.epReward) +
            " EP</p>";

        item.appendChild(convertButton);
        item.appendChild(convertAllButton);

        return item;
    }

    render() {
        const container = document.getElementById("converter-list");

        if (!container) return;

        container.innerHTML = "";

        Converter.getRecipes().forEach(recipe => {
            container.appendChild(
                this.createConverterElement(recipe)
            );
        });
    }
}

export default new ConverterUI();
