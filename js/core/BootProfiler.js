class BootProfiler {
    constructor() {
        this.enabled = true;
        this.startTime = performance.now();
        this.steps = [];
        this.outputId = "boot-profiler";
    }

    setDebugMode(enabled) {
        this.enabled = Boolean(enabled);
    }

    mark(label) {
        if (!this.enabled) return;
        this.steps.push({
            label,
            elapsed: performance.now() - this.startTime
        });
    }

    finish() {
        if (!this.enabled) return;

        const total = performance.now() - this.startTime;
        const lines = [
            "World Creator 起動計測",
            "総ロード時間: " + total.toFixed(2) + " ms",
            ...this.steps.map(step =>
                step.label + ": " + step.elapsed.toFixed(2) + " ms"
            )
        ];

        let output = document.getElementById(this.outputId);

        if (!output) {
            output = document.createElement("pre");
            output.id = this.outputId;
            output.style.margin = "8px";
            output.style.padding = "8px";
            output.style.whiteSpace = "pre-wrap";
            output.style.fontSize = "12px";
            output.style.background = "rgba(0, 0, 0, 0.06)";
            output.style.borderRadius = "4px";

            document.body.appendChild(output);
        }

        output.textContent = lines.join("\n");
    }
}

export default new BootProfiler();
