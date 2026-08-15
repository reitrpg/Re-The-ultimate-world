/**
 * World Creator
 * Error UI
 */

import ErrorHandler from "../core/errorHandler.js";

class ErrorUI {

    constructor() {

        this.initialized = false;

    }

    initialize() {

        if (this.initialized) {

            return;

        }

        this.initialized = true;

        this.render();

        this.registerEvents();

    }

    registerEvents() {

        const clearButton =

            document.getElementById(

                "clear-error-log"

            );

        if (!clearButton) {

            return;

        }

        clearButton.addEventListener(

            "click",

            () => {

                ErrorHandler.clear();

                this.render();

            }

        );

    }

    render() {

        const container =

            document.getElementById(

                "error-log"

            );

        if (!container) {

            return;

        }

        container.innerHTML = "";

        const logs =

            ErrorHandler.getLogs();

        if (logs.length === 0) {

            const empty =

                document.createElement(

                    "p"

                );

            empty.textContent =

                "エラーはありません";

            container.appendChild(

                empty

            );

            return;

        }

        logs.forEach(

            log => {

                const item =

                    document.createElement(

                        "div"

                    );

                const time =

                    new Date(

                        log.time

                    ).toLocaleString();

                item.textContent =

                    `[${time}] ${log.message}`;

                container.appendChild(

                    item

                );

            }

        );

    }

}

export default new ErrorUI();