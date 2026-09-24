/**
 * World Creator
 * Tab UI
 */

import eventBus from "../core/eventBus.js";

class TabUI {
    constructor() {
        this.initialized = false;
        this.activeTab = null;
        this.tabs = [];
        this.panels = [];
        this.lastActivationTarget = null;
        this.lastActivationTime = 0;
    }

    initialize() {
        if (this.initialized) return;

        this.collectElements();

        if (this.tabs.length === 0) {
            this.initialized = true;
            return;
        }

        this.initialized = true;
        this.registerButtons();
        this.registerEvents();

        const initialTab = this.getInitialTab();
        if (initialTab) this.setActive(initialTab, false);
    }

    collectElements() {
        this.tabs = Array.from(
            document.querySelectorAll("[data-tab], .tab-button")
        );

        this.panels = Array.from(
            document.querySelectorAll(
                "[data-tab-panel], .tab-panel, .tab-content"
            )
        );
    }

    registerButtons() {
        this.tabs.forEach(tab => {
            const activate = event => {
                if (event) event.preventDefault();

                const now = Date.now();

                if (
                    this.lastActivationTarget === tab &&
                    now - this.lastActivationTime < 800
                ) {
                    return;
                }

                this.lastActivationTarget = tab;
                this.lastActivationTime = now;

                const tabId = this.getTabId(tab);
                if (!tabId) return;

                this.setActive(tabId);
            };

            // pointerup works for Android touch, iOS touch and mouse.
            // click remains as a keyboard/browser compatibility path.
            tab.addEventListener("pointerup", activate);
            tab.addEventListener("click", activate);
        });
    }

    registerEvents() {
        eventBus.on("tab:change", tabId => {
            if (!tabId || tabId === this.activeTab) return;
            this.setActive(tabId, false);
        });
    }

    getTabId(tab) {
        if (!tab) return null;
        if (tab.dataset.tab) return tab.dataset.tab;
        if (tab.dataset.target) {
            return tab.dataset.target.replace(/^#/, "");
        }

        const href = tab.getAttribute("href");
        if (href && href.startsWith("#")) {
            return href.slice(1).replace(/-tab$/, "");
        }

        return null;
    }

    getPanelId(panel) {
        if (!panel) return null;
        if (panel.dataset.tabPanel) return panel.dataset.tabPanel;
        if (panel.dataset.tabContent) return panel.dataset.tabContent;
        if (panel.id) return panel.id.replace(/-tab$/, "");
        return null;
    }

    getInitialTab() {
        const activeTab = this.tabs.find(tab =>
            tab.classList.contains("active") ||
            tab.getAttribute("aria-selected") === "true"
        );

        if (activeTab) return this.getTabId(activeTab);

        return this.getTabId(this.tabs[0]);
    }

    setActive(tabId, emit = true) {
        if (!tabId) return false;

        const targetTab = this.tabs.find(
            tab => this.getTabId(tab) === tabId
        );

        const targetPanel = this.panels.find(
            panel => this.getPanelId(panel) === tabId
        );

        if (!targetTab || !targetPanel) return false;

        this.tabs.forEach(tab => {
            const active = this.getTabId(tab) === tabId;
            tab.classList.toggle("active", active);

            if (tab.hasAttribute("aria-selected")) {
                tab.setAttribute("aria-selected", String(active));
            }

            if (tab.hasAttribute("aria-expanded")) {
                tab.setAttribute("aria-expanded", String(active));
            }

            if (tab.tagName === "BUTTON") {
                tab.disabled = active;
            }
        });

        this.panels.forEach(panel => {
            const active = this.getPanelId(panel) === tabId;
            panel.hidden = !active;
            panel.classList.toggle("active", active);
            panel.setAttribute("aria-hidden", String(!active));
        });

        this.activeTab = tabId;

        if (emit) {
            eventBus.emit("tab:change", tabId);
            eventBus.emit("tab:update", tabId);
        }

        return true;
    }

    open(tabId) {
        return this.setActive(tabId);
    }

    getActiveTab() {
        return this.activeTab;
    }

    getActive() {
        return this.activeTab;
    }

    getTabs() {
        return [...this.tabs];
    }

    getPanels() {
        return [...this.panels];
    }
}

export default new TabUI();
