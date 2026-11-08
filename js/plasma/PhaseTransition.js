import BigNumber from "../number/BigNumber.js";
import eventBus from "../core/eventBus.js";
import EPManager from "../ep/Manager.js";
import PlasmaManager from "./Manager.js";
import WorldManager from "../world/Manager.js";
import UnlockManager from "../world/UnlockManager.js";
import ResourceManager from "../resource/Manager.js";
import ResearchManager from "../research/Manager.js";
import UpgradeManager from "../upgrades/Manager.js";
import RebirthManager from "../rebirth/Manager.js";
import AutomationManager from "../automation/Manager.js";
import AchievementManager from "../achievements/Manager.js";

const PHASE_ONE_LIMIT = BigNumber.from({ mantissa: 180, exponent: 102, layer: 0 });
const TRANSITION_KEY = "world_creator_phase_transition";
const LINES = [
    "増幅エネルギー異常発生",
    "世界崩壊及び、世界研究システム破損",
    "エネルギー凝縮発生",
    "エネルギープラズマ化を確認",
    "世界研究システム再構築",
    "",
    "完了",
    "",
    "neme:y"
];

class PhaseTransition {
    constructor() {
        this.initialized = false;
        this.running = false;
        this.overlay = null;
        this.output = "";
    }

    initialize() {
        if (this.initialized) return;
        this.initialized = true;
        eventBus.on("ep:update", () => this.checkThreshold());
    }

    checkThreshold() {
        if (this.running || PlasmaManager.isUnlocked()) return false;
        if (!EPManager.get().greaterOrEqual(PHASE_ONE_LIMIT)) return false;

        AchievementManager.update({
            worldManager: WorldManager,
            upgradeManager: UpgradeManager,
            researchManager: ResearchManager
        });
        this.startSequence();
        return true;
    }

    resumeIfNeeded() {
        if (PlasmaManager.isUnlocked()) {
            localStorage.removeItem(TRANSITION_KEY);
            return false;
        }
        if (localStorage.getItem(TRANSITION_KEY) === "true" ||
            EPManager.get().greaterOrEqual(PHASE_ONE_LIMIT)) {
            this.startSequence();
            return true;
        }
        return false;
    }

    createOverlay() {
        document.body.classList.add("phase-transition-active");
        const style = document.createElement("style");
        style.id = "phase-transition-style";
        style.textContent = `
            body.phase-transition-active { padding:0!important; margin:0!important; overflow:hidden!important; background:#000!important; }
            body.phase-transition-active > :not(#phase-transition-overlay) { display:none!important; }
            #phase-transition-overlay {
                position:fixed; inset:0; z-index:2147483647; box-sizing:border-box;
                overflow:auto; padding:28px 22px; background:#000; color:#d8d8d8;
                font:16px/1.8 ui-monospace,SFMono-Regular,Consolas,monospace;
                white-space:pre-wrap; overflow-wrap:anywhere;
            }
            #phase-transition-overlay::after {
                content:"█"; display:inline-block; margin-left:3px;
                animation:phase-cursor 1s steps(2,start) infinite;
            }
            @keyframes phase-cursor { to { visibility:hidden; } }
            @media(max-width:480px) { #phase-transition-overlay { padding:22px 16px; font-size:14px; } }
        `;
        document.head.appendChild(style);
        const overlay = document.createElement("div");
        overlay.id = "phase-transition-overlay";
        overlay.setAttribute("role", "status");
        overlay.setAttribute("aria-live", "polite");
        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.output = "";
    }

    wait(ms) {
        return new Promise(resolve => window.setTimeout(resolve, ms));
    }

    async typeText(text, delay = 24) {
        for (const character of text) {
            if (!this.running) return;
            this.output += character;
            this.overlay.textContent = this.output;
            this.overlay.scrollTop = this.overlay.scrollHeight;
            await this.wait(delay);
        }
    }

    async startSequence() {
        if (this.running || PlasmaManager.isUnlocked()) return;
        this.running = true;
        localStorage.setItem(TRANSITION_KEY, "true");
        eventBus.emit("phase:transition:start");
        this.createOverlay();

        try {
            for (let index = 0; index < LINES.length; index++) {
                const line = LINES[index];
                await this.typeText(line, line === "neme:y" ? 150 : 22);
                if (index < LINES.length - 1) await this.wait(line === "" ? 260 : 420);
            }
            await this.wait(1500);
            this.completeTransition();
        } catch (error) {
            console.error("Phase transition failed:", error);
            this.running = false;
        }
    }

    completeTransition() {
        if (!this.running || PlasmaManager.isUnlocked()) return;

        // Lifetime statistics and achievements remain permanent records.
        // Phase 1 resources, worlds, research, upgrades and automation reset.
        EPManager.reset();
        WorldManager.clear();
        UnlockManager.reset();
        ResourceManager.resetAmounts(["plant", "metal", "magic"]);
        ResearchManager.reset();
        UpgradeManager.reset();
        RebirthManager.reset();
        AutomationManager.reset();
        PlasmaManager.unlockFirst();

        this.running = false;
        localStorage.removeItem(TRANSITION_KEY);
        document.body.classList.remove("phase-transition-active");
        this.overlay?.remove();
        this.overlay = null;
        document.getElementById("phase-transition-style")?.remove();

        eventBus.emit("phase:transition:complete");
        eventBus.emit("world:update");
        eventBus.emit("resource:update");
        eventBus.emit("upgrade:update");
        eventBus.emit("research:update");
        eventBus.emit("automation:update");
        eventBus.emit("plasma:update");
    }
}

export default new PhaseTransition();
