import { type TimelineEvents } from "./analytics_utils.js";
import { locate_category } from "../core/index.js";
import { get_analytics_object, analytics_category_input } from "./analytics_engine.js";
import { stat_test, mean_test, qq } from "./linear_regression.js";
import { get_element } from "../core/dom_utils.js";

declare const Plotly: any;

const INCREASING_COLOR = "rgb(78, 159, 131)";
const INCREASING_COLOR_MUTED = "rgba(78, 159, 131, 0.35)";
const DECREASING_COLOR = "rgb(194, 89, 104)";
const DECREASING_COLOR_MUTED = "rgba(194, 89, 104, 0.35)";
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MIN_PVALUE_POINTS = 5;
const RESIDUALS_BIN_COUNT = 20;
const RESIDUALS_PDF_POINTS = 100;
const RESIDUALS_PDF_SPAN = 4; // draw the bell over +/- 4 sigma

type DriftTest = ReturnType<typeof mean_test>;

let current_category: string | undefined = undefined;
let current_events: TimelineEvents = { dates: [], deltas: [] };
let current_date_min = 0;
let current_date_max = 0;

function get_trend(p_growth: number, p_decline: number, strong = 0.05, weak = 0.15): string {
    if (!Number.isFinite(p_growth) || !Number.isFinite(p_decline)) return "❔"; // degenerate fit: no evidence either way

    if (p_growth < strong) return "⬆️";
    if (p_decline < strong) return "⬇️";
    if (p_growth < weak) return "↗️";
    if (p_decline < weak) return "↘️";
    return "↔️";
}

function normalize_dates(dates: number[]) {
    return dates.map((val) => (val - dates[0]) / MS_PER_DAY);
}

// last index whose date is <= timestamp (events are sorted by date)
function find_cutoff_index(dates: number[], timestamp: number): number {
    let lo = 0;
    let hi = dates.length;

    while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (dates[mid] <= timestamp) lo = mid;
        else hi = mid;
    }

    return Math.max(Math.min(lo, dates.length - MIN_PVALUE_POINTS), 0);
}

// convex combination of min and max dates, lambda in [0, 1]
function lambda_to_cutoff_date(lambda: number, date_min: number, date_max: number): number {
    return lambda * date_max + (1 - lambda) * date_min;
}

function get_running_totals(deltas: number[]) {
    let running_total = 0;
    const counts = [];
    for (let idx = 0; idx < deltas.length; idx++) {
        running_total += deltas[idx];
        counts.push(running_total)
    }
    return counts;
}

function get_bar_colors(deltas: number[], cutoff_idx: number) {
    return deltas.map((delta, index) => {
        const is_muted = index < cutoff_idx;
        const is_increasing = delta >= 0;

        if (is_increasing) return is_muted ? INCREASING_COLOR_MUTED : INCREASING_COLOR;
        return is_muted ? DECREASING_COLOR_MUTED : DECREASING_COLOR;
    });
}

function get_regression_line(dates: number[], counts: number[], cutoff_idx: number) {
    const normalized_dates = normalize_dates(dates);
    const design_matrix = normalized_dates.slice(cutoff_idx).map(xi => [1, xi]);
    const y_vector = counts.slice(cutoff_idx).map(yi => [yi]);
    const stats = stat_test(design_matrix, y_vector);

    const x0 = new Date(dates[0]);
    const y0 = stats.beta[0][0];
    const x1 = new Date(dates[cutoff_idx]);
    const y1 = stats.beta[0][0] + stats.beta[1][0] * normalized_dates[cutoff_idx];
    const x2 = new Date(dates[dates.length - 1]);
    const y2 = stats.beta[0][0] + stats.beta[1][0] * normalized_dates[normalized_dates.length - 1];

    return { x0, y0, x1, y1, x2, y2 };
}

function build_bar_trace(dates: number[], deltas: number[], counts: number[], cutoff_idx: number) {
    const colors = get_bar_colors(deltas, cutoff_idx);
    const base = [0, ...counts.slice(0, -1)];
    const x = dates.map((date) => new Date(date));
    return [
        {
            type: "bar",
            x,
            base,
            y: deltas,
            marker: { color: colors },
            showlegend: false
        }
    ];
}

function build_shelves_trace(dates: number[], counts: number[]) {
    const shelf_x: (Date | null)[] = [];
    const shelf_y: (number | null)[] = [];

    for (let i = 0; i < dates.length - 1; i++) {
        shelf_x.push(new Date(dates[i]), new Date(dates[i + 1]), null);
        shelf_y.push(counts[i], counts[i], null);
    }

    return {
        type: "scatter",
        mode: "lines",
        line: { color: "rgb(63, 63, 63)", width: 1, dash: "dot" },
        x: shelf_x,
        y: shelf_y,
        connectgaps: false,
        showlegend: false,
        hoverinfo: "skip"
    }
}

function build_regression_trace(dates: number[], counts: number[], cutoff_idx: number) {
    if (dates.length - cutoff_idx < MIN_PVALUE_POINTS) return []; // X^T X is singular for a single point, sigma is NaN for two

    const regression = get_regression_line(dates, counts, cutoff_idx);
    return [{
        type: "scatter",
        mode: "lines",
        name: "OLS trend",
        x: [regression.x1, regression.x2],
        y: [regression.y1, regression.y2],
        line: { color: "rgb(0, 191, 255)", width: 2, dash: "solid" },
        showlegend: true
    },
    {
        type: "scatter",
        mode: "lines",
        name: "Past trend projection",
        x: [regression.x0, regression.x1],
        y: [regression.y0, regression.y1],
        line: { color: "rgb(0, 191, 255)", width: 2, dash: "dash" },
        showlegend: true
    }];
}

async function refresh_current_category(cutoff_slider: HTMLInputElement): Promise<void> {
    if (!analytics_category_input) throw new Error("Analytics category input is not initialized.");

    const category = locate_category(analytics_category_input.value)?.title;
    if (category === current_category) return;

    current_category = category;
    current_events = category === undefined ? { dates: [], deltas: [] } : await get_analytics_object().get_category_events(category);
    current_date_min = current_events.dates[0] ?? 0;
    current_date_max = current_events.dates[current_events.dates.length - 1] ?? 0;
    cutoff_slider.value = "0";
}

function render_timeline_chart(container: HTMLElement, dates: number[], deltas: number[], counts: number[], cutoff_idx: number): void {
    if (typeof Plotly === "undefined") throw new Error("Plotly library is not loaded.");

    Plotly.purge(container);    
    const traces = [
        ...build_bar_trace(dates, deltas, counts, cutoff_idx),
        build_shelves_trace(dates, counts),
        ...build_regression_trace(dates, counts, cutoff_idx)];

    Plotly.newPlot(container, traces, {
        xaxis: { title: { text: "Date" } },
        yaxis: { title: { text: "Count" } },
        showlegend: true,
        title: { text: `Category Timeline` }
    });
}

function get_drift_test(deltas: number[], cutoff_idx: number): DriftTest | undefined {
    const truncated = deltas.slice(cutoff_idx);
    return truncated.length < MIN_PVALUE_POINTS ? undefined : mean_test(truncated);
}

function format_drift_label(drift_test: DriftTest | undefined): string {
    if (!drift_test) return "";

    const trend = get_trend(drift_test.p_right, drift_test.p_left);
    return `Drift trend: ${trend} (p-growth: ${drift_test.p_right.toFixed(3)}, p-decline: ${drift_test.p_left.toFixed(3)})`;
}

// the residuals are centered at the sample mean by construction: only sigma is inferred
function normal_pdf(x: number, sigma: number): number {
    return Math.exp(-0.5 * (x / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

function build_normal_pdf_trace(sigma: number) {
    const limit = RESIDUALS_PDF_SPAN * sigma;
    const step = 2 * limit / (RESIDUALS_PDF_POINTS - 1);
    const x = Array.from({ length: RESIDUALS_PDF_POINTS }, (_, index) => -limit + index * step);

    return {
        type: "scatter",
        mode: "lines",
        name: `N(0, ${sigma.toFixed(2)}²)`,
        x,
        y: x.map(xi => normal_pdf(xi, sigma)),
        line: { color: "rgb(10, 10, 10)", width: 2 },
        showlegend: true
    };
}

function build_residuals_trace(residuals: number[]) {
    return {
        type: "histogram",
        name: "Delta residuals",
        x: residuals,
        histnorm: "probability density",
        nbinsx: RESIDUALS_BIN_COUNT,
        marker: { color: "rgba(78, 159, 131, 0.55)" },
        showlegend: true
    };
}

function build_qq_trace(residuals: number[], sigma: number) {
    const qq_data = qq(residuals, sigma);
    return {
        type: "scatter",
        mode: "markers",
        name: "QQ plot",
        x: qq_data.x,
        y: qq_data.y,
        marker: { color: "rgba(194, 89, 104, 1)" },
        showlegend: true
    };
}

function render_residuals_chart(container: HTMLElement, drift_test: DriftTest | undefined): void {
    if (typeof Plotly === "undefined") throw new Error("Plotly library is not loaded.");

    Plotly.purge(container);
    if (!drift_test || !(drift_test.sigma > 0)) return; // all deltas equal => sigma 0 => nothing to compare against

    Plotly.newPlot(container, [build_residuals_trace(drift_test.residuals), build_normal_pdf_trace(drift_test.sigma)], {
        xaxis: { title: { text: "Delta residual" } },
        yaxis: { title: { text: "Density" } },
        showlegend: true,
        title: { text: "Delta Residual Distribution vs Normal PDF" }
    });
}

function render_qq_chart(container: HTMLElement, drift_test: DriftTest | undefined): void {
    if (typeof Plotly === "undefined") throw new Error("Plotly library is not loaded.");

    Plotly.purge(container);
    if (!drift_test || !(drift_test.sigma > 0)) return; // qq() divides by sigma

    const trace = build_qq_trace(drift_test.residuals, drift_test.sigma);
    const min_val = Math.min(...trace.x, ...trace.y) - 0.5;
    const max_val = Math.max(...trace.x, ...trace.y) + 0.5;

    Plotly.newPlot(container, [trace], {
        xaxis: { title: { text: "Delta Residual Quantiles" }, range: [min_val, max_val] },
        yaxis: { title: { text: "Normal Quantiles" }, range: [min_val, max_val] },
        shapes: [{
            type: "line",
            x0: min_val, x1: max_val,
            y0: min_val, y1: max_val,
            line: { color: "rgb(10, 10, 10)", width: 2, dash: "dot" }
        }],
        showlegend: true,
        title: { text: "QQ Plot of Delta Residuals vs Normal Distribution" }
    });
}

export async function refresh_regression_plot(): Promise<void> {
    const chart_container = get_element("analyticsChartContainer");
    const drift_trend_label = get_element("analyticsDriftTrend");
    const residuals_container = get_element("analyticsResidualsContainer");
    const qq_container = get_element("analyticsQQContainer");
    const cutoff_slider = get_element<HTMLInputElement>("analyticsCutoffSlider");

    await refresh_current_category(cutoff_slider);
    if (current_events.dates.length === 0) return;

    const lambda = Number(cutoff_slider.value);
    const cutoff_date = lambda_to_cutoff_date(isNaN(lambda) ? 0 : lambda, current_date_min, current_date_max);
    const cutoff_index = find_cutoff_index(current_events.dates, cutoff_date);
    const running_totals = get_running_totals(current_events.deltas);

    const drift_test = get_drift_test(current_events.deltas, cutoff_index);
    drift_trend_label.textContent = format_drift_label(drift_test);

    render_timeline_chart(chart_container, current_events.dates, current_events.deltas, running_totals, cutoff_index);
    render_residuals_chart(residuals_container, drift_test);
    render_qq_chart(qq_container, drift_test);
}