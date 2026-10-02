import eventBus from "../core/eventBus.js";

class TabUI {
    constructor() {
        this.initialized = false;
        this.activeTab = null;
        this.tabs = [];
        this.panels = [];
    }

    initialize() {
        if (this.initialized) return;

        this.collectElements();

        if (this.tabs.length === 0) {
            this.initialized = true;
            return;
        }

        this.initialized = true;

        eventBus.on("action:tab:change", payload => {
            const tab = payload?.target?.closest?.("[data-tab], .tab-button");
            if (!tab) return;

            const id = this.getTabId(tab);
            if (!id) return;

            this.setActive(id);
        });

        const initial = this.getInitialTab();

        if (initial) {
            this.setActive(initial, false);
        }
    }

    collectElements() {
        this.tabs = Array.from(
            document.querySelectorAll("[data-tab], .tab-button")
        );

        this.panels = Array.from(
            document.querySelectorAll("[data-tab-panel], .tab-panel, .tab-content")
        );
    }

    getTabId(tab) {
        if (!tab) return null;
        if (tab.dataset.tab) return tab.dataset.tab;
        if (tab.dataset.target) return tab.dataset.target.replace(/^#/, "");

        const href = tab.getAttribute("href");

        return href && href.startsWith("#")
            ? href.slice(1).replace(/-tab$/, "")
            : null;
    }

    getPanelId(panel) {
        if (!panel) return null;
        if (panel.dataset.tabPanel) return panel.dataset.tabPanel;
        if (panel.dataset.tabContent) return panel.dataset.tabContent;

        return panel.id
            ? panel.id.replace(/-tab$/, "")
            : null;
    }

    getInitialTab() {
        const active = this.tabs.find(
            tab =>
                tab.classList.contains("active") ||
                tab.getAttribute("aria-selected") === "true"
        );

        return active
            ? this.getTabId(active)
            : this.getTabId(this.tabs[0]);
    }

    setActive(tabId, emit = true) {
        const tab = this.tabs.find(
            item => this.getTabId(item) === tabId
        );

        const panel = this.panels.find(
            item => this.getPanelId(item) === tabId
        );

        if (!tab || !panel) return false;

        this.tabs.forEach(item => {
            const active = this.getTabId(item) === tabId;

            item.classList.toggle("active", active);

            if (item.hasAttribute("aria-selected")) {
                item.setAttribute("aria-selected", String(active));
            }

            if (item.hasAttribute("aria-expanded")) {
                item.setAttribute("aria-expanded", String(active));
            }
        });

        this.panels.forEach(item => {
            const active = this.getPanelId(item) === tabId;

            item.hidden = !active;
            item.classList.toggle("active", active);
            item.setAttribute("aria-hidden", String(!active));
        });

        this.activeTab = tabId;

        if (emit) {
            eventBus.emit("tab:change", tabId);
            eventBus.emit("tab:update", tabId);
        }

        return true;
    }

    open(id) {
        return this.setActive(id);
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
