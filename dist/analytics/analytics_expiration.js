import {} from "./analytics_utils.js";
import { get_analytics_object } from "./analytics_engine.js";
const EXPIRED_COLOR = "#c81400";
const BIN_COLORS = ["#f06a00", "#d9b000", "#5aa82a", "#0b6b4b"];
const PLOT_HEIGHT = 600;
function compress_string(input, max_char, placeholder = "...") {
    const len = max_char - placeholder.length;
    if (input.length > max_char) {
        const left = len >> 1;
        const right = len - left;
        const result = input.substring(0, left) +
            placeholder +
            input.substring(input.length - right);
        return result;
    }
    else {
        return input;
    }
}
function add_months(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result.getTime();
}
function build_bins(now) {
    const now_ms = now.getTime();
    const m6 = add_months(now, 6);
    const m18 = add_months(now, 18);
    const m36 = add_months(now, 36);
    return [
        { label: "expired", color: EXPIRED_COLOR, end: now_ms },
        { label: "< 6 months", color: BIN_COLORS[0], begin: now_ms, end: m6 },
        { label: "6 months – 1.5 years", color: BIN_COLORS[1], begin: m6, end: m18 },
        { label: "1.5 – 3 years", color: BIN_COLORS[2], begin: m18, end: m36 },
        { label: "> 3 years", color: BIN_COLORS[3], begin: m36 }
    ];
}
function build_bin_trace(bin, categories, counts) {
    const by_category = new Map(counts.map((row) => [row.category, row.count]));
    return {
        type: "bar",
        name: bin.label,
        x: categories,
        y: categories.map((category) => by_category.get(category) ?? 0),
        marker: { color: bin.color, line: { color: "#fff", width: 2 } },
        hovertemplate: `%{x}<br>${bin.label}: %{y}<extra></extra>`
    };
}
export async function refresh_expiration_plot(container) {
    if (typeof Plotly === "undefined")
        throw new Error("Plotly library is not loaded.");
    const analytics = get_analytics_object();
    const bins = build_bins(new Date());
    const bin_counts = await Promise.all(bins.map((bin) => analytics.get_counts(bin.begin, bin.end)));
    const totals = new Map((await analytics.get_counts()).map((val) => [val.category, val.count]));
    const categories = [...totals.entries()]
        .sort((a, b) => b[1] - a[1])
        .map((val) => val[0]);
    const traces = bins.map((bin, i) => build_bin_trace(bin, categories, bin_counts[i]));
    Plotly.purge(container);
    Plotly.newPlot(container, traces, {
        barmode: "stack",
        height: PLOT_HEIGHT,
        xaxis: {
            automargin: true,
            tickangle: -45,
            tickmode: "array",
            tickvals: categories,
            ticktext: categories.map((category) => compress_string(category, 20))
        },
        yaxis: { title: { text: "Items" } },
        legend: { orientation: "h", traceorder: "normal", x: 0, y: 1, yanchor: "bottom" },
        title: { text: "Stock by time to expiration" }
    });
}
//# sourceMappingURL=analytics_expiration.js.map