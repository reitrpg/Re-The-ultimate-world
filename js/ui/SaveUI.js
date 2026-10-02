/**
 * World Creator
 * Save UI
 */

import SaveManager from "../core/save.js";
import eventBus from "../core/eventBus.js";

class SaveUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        this.registerEvents();

    }

    registerEvents() {
        const actions = [
            ["save-button", "save:manual"],
            ["load-button", "load:manual"],
            ["export-button", "save:export"],
            ["import-button", "save:import"],
            ["delete-save-button", "save:delete"]
        ];

        actions.forEach(([id, action]) => {
            const element = document.getElementById(id);
            if (element) element.dataset.action = action;
        });

        eventBus.on("input:pressed", payload => {
            const action = payload?.action;

            if (action === "save:manual") {
                SaveManager.save();
                return;
            }

            if (action === "load:manual") {
                if (window.confirm("現在の状態を上書きして読み込みますか？")) {
                    location.reload();
                }
                return;
            }

            if (action === "save:export") {
                const data = localStorage.getItem("world_creator_save");
                if (data) navigator.clipboard?.writeText(data);
                return;
            }

            if (action === "save:import") {
                const data = window.prompt("セーブデータを入力してください");
                if (!data) return;

                try {
                    JSON.parse(data);
                    localStorage.setItem("world_creator_save", data);
                    location.reload();
                } catch {
                    window.alert("無効なデータです");
                }
                return;
            }

            if (action === "save:delete") {
                if (window.confirm("セーブデータを削除しますか？")) {
                    SaveManager.clear();
                    location.reload();
                }
            }
        });
    }

}

export default new SaveUI();