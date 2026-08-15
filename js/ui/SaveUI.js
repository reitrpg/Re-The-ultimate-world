/**
 * World Creator
 * Save UI
 */

import SaveManager from "../core/save.js";

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

        const saveButton =

            document.getElementById(
                "save-button"
            );

        if (saveButton) {

            saveButton.addEventListener(

                "click",

                () => {

                    SaveManager.save();

                }

            );

        }

        const loadButton =

            document.getElementById(
                "load-button"
            );

        if (loadButton) {

            loadButton.addEventListener(

                "click",

                () => {

                    const confirmed =

                        window.confirm(

                            "現在の状態を上書きして読み込みますか？"

                        );

                    if (!confirmed) {

                        return;

                    }

                    location.reload();

                }

            );

        }

        const exportButton =

            document.getElementById(
                "export-button"
            );

        if (exportButton) {

            exportButton.addEventListener(

                "click",

                () => {

                    const data =

                        localStorage.getItem(
                            "world_creator_save"
                        );

                    if (!data) {

                        return;

                    }

                    navigator.clipboard.writeText(
                        data
                    );

                }

            );

        }

        const importButton =

            document.getElementById(
                "import-button"
            );

        if (importButton) {

            importButton.addEventListener(

                "click",

                () => {

                    const data =

                        prompt(
                            "セーブデータを入力してください"
                        );

                    if (!data) {

                        return;

                    }

                    try {

                        JSON.parse(data);

                        localStorage.setItem(

                            "world_creator_save",

                            data

                        );

                        location.reload();

                    } catch {

                        alert(
                            "無効なデータです"
                        );

                    }

                }

            );

        }

        const deleteButton =

            document.getElementById(
                "delete-save-button"
            );

        if (deleteButton) {

            deleteButton.addEventListener(

                "click",

                () => {

                    const confirmed =

                        window.confirm(

                            "セーブデータを削除しますか？"

                        );

                    if (!confirmed) {

                        return;

                    }

                    SaveManager.clear();

                    location.reload();

                }

            );

        }

    }

}

export default new SaveUI();