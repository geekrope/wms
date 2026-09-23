import { type TimelineEvent } from "./analytics_utils.js";
import { locate_category } from "./index.js";
import { stat_test, qq, mean_test } from "./linear_regression.js";
import { get_analytics_object, analytics_category_input } from "./analytics.js";
import { get_element } from "./dom_utils.js";

declare const Plotly: any;

const INCREASING_COLOR = "rgb(78, 159, 131)";
const INCREASING_COLOR_MUTED = "rgba(78, 159, 131, 0.35)";
const DECREASING_COLOR = "rgb(194, 89, 104)";
const DECREASING_COLOR_MUTED = "rgba(194, 89, 104, 0.35)";
const CUTOFF_LINE_COLOR = "red";
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MIN_PVALUE_POINTS = 5;
const SIGNIFICANCE_STRONG = 0.05;
const SIGNIFICANCE_WEAK = 0.15;
const RESIDUALS_BIN_COUNT = 20;
const RESIDUALS_PDF_POINTS = 100;
const RESIDUALS_PDF_SPAN = 4; // draw the bell over +/- 4 sigma

let current_category: string | undefined = undefined;
let current_events: TimelineEvent[] = [];
let current_date_min = 0;
let current_date_max = 0;

type BarGeometry = { x: Date[], base: number[], height: number[], running_totals: number[] };

type Regression = { x0: Date, y0: number, x1: Date, y1: number, x2: Date, y2: number, p_growth: number, p_decline: number, residuals: number[], sigma: number };

// p_growth and p_decline are the two one-sided p-values of the same t-statistic, so they sum to 1:
// at most one of them can sit below 0.5 and the cascade below is unambiguous for any threshold under it.
function get_trend(p_growth: number, p_decline: number, strong = SIGNIFICANCE_STRONG, weak = SIGNIFICANCE_WEAK): string {
    if (!Number.isFinite(p_growth) || !Number.isFinite(p_decline)) return "❔"; // degenerate fit: no evidence either way

    if (p_growth < strong) return "⬆️";
    if (p_decline < strong) return "⬇️";
    if (p_growth < weak) return "↗️";
    if (p_decline < weak) return "↘️";
    return "↔️";
}

// fits the OLS trend only on the window from cutoff onward (the non-muted, "current" part)
function compute_current_regression(x: Date[], running_totals: number[], cutoff: number): Regression | undefined {
    const window_x = x.slice(cutoff);
    const window_y = running_totals.slice(cutoff);

    if (window_x.length < MIN_PVALUE_POINTS) return undefined; // not enough points for a stable fit

    return compute_regression_line(window_x, window_y, x[0]);
}

function compute_bar_geometry(events: TimelineEvent[]): BarGeometry {
    const x = events.map(e => new Date(e.date));
    const base: number[] = [];
    const height: number[] = [];
    const running_totals: number[] = [];

    let running_total = 0;
    for (const e of events) {
        const start = running_total;
        running_total += e.delta;

        base.push(Math.min(start, running_total));
        height.push(Math.abs(e.delta));
        running_totals.push(running_total);
    }

    return { x, base, height, running_totals };
}

function compute_shelf_line(x: Date[], running_totals: number[]): { shelf_x: (Date | null)[], shelf_y: (number | null)[] } {
    const shelf_x: (Date | null)[] = [];
    const shelf_y: (number | null)[] = [];

    for (let i = 0; i < x.length - 1; i++) {
        shelf_x.push(x[i], x[i + 1], null);
        shelf_y.push(running_totals[i], running_totals[i], null);
    }

    return { shelf_x, shelf_y };
}

function compute_regression_line(x: Date[], y: number[], x0: Date): Regression {
    const x_normalized = x.map(date => (date.getTime() - x[0].getTime()) / MS_PER_DAY);
    const design_matrix = x_normalized.map(xi => [1, xi]);
    const y_vector = y.map(yi => [yi]);
    const stats = stat_test(design_matrix, y_vector);

    const y0 = stats.beta[0][0] + stats.beta[1][0] * (x0.getTime() - x[0].getTime()) / MS_PER_DAY;
    const x1 = x[0];
    const y1 = stats.beta[0][0];
    const x2 = x[x.length - 1];
    const y2 = stats.beta[0][0] + stats.beta[1][0] * (x_normalized[x_normalized.length - 1]);

    const residuals: number[] = stats.residuals.map((row: number[]) => row[0]);

    return { x0, y0, x1, y1, x2, y2, p_growth: stats.p_right[1], p_decline: stats.p_left[1], residuals, sigma: stats.sigma };
}

function compute_bar_colors(events: TimelineEvent[], cutoff: number): string[] {
    return events.map((e, index) => {
        const is_muted = index < cutoff;
        const is_increasing = e.delta >= 0;

        if (is_increasing) return is_muted ? INCREASING_COLOR_MUTED : INCREASING_COLOR;
        return is_muted ? DECREASING_COLOR_MUTED : DECREASING_COLOR;
    });
}

// last index whose date is <= timestamp (events are sorted by date)
function find_cutoff_index(events: TimelineEvent[], timestamp: number): number {
    let lo = 0;
    let hi = events.length;

    while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (events[mid].date <= timestamp) lo = mid;
        else hi = mid;
    }

    return Math.max(Math.min(lo, events.length - MIN_PVALUE_POINTS), 0);
}

// convex combination of min and max dates, lambda in [0, 1]
function lambda_to_cutoff_date(lambda: number, date_min: number, date_max: number): number {
    return lambda * date_max + (1 - lambda) * date_min;
}

function build_cutoff_shape(x0: Date): object {
    return {
        type: "line",
        name: "Cutoff",
        x0, x1: x0,
        y0: 0, y1: 1,
        yref: "paper",
        line: { color: CUTOFF_LINE_COLOR, width: 2, dash: "dash" },
        showlegend: true
    };
}

function build_regression_trace(regression: Regression): any[] {
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

// the OLS fit has an intercept, so the residuals are centered at 0 by construction: only sigma is inferred
function normal_pdf(x: number, sigma: number): number {
    return Math.exp(-0.5 * (x / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

function build_normal_pdf_trace(sigma: number): any {
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

function build_residuals_trace(residuals: number[]): any {
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

function build_qq_trace(residuals: number[], sigma: number): any {
    const qq_data = qq(residuals, sigma);
    return {
        type: "scatter",
        mode: "markers",
        name: "QQ plot",
        x: qq_data.x,
        y: qq_data.y,
        marker: { color: "rgba(194, 89, 104, 1)" },
        showlegend: true
    }
}

function render_timeline_chart(container: HTMLElement, events: TimelineEvent[], geometry: BarGeometry, cutoff: number, regression: Regression | undefined): void {
    if (typeof Plotly === "undefined") throw new Error("Plotly library is not loaded.");

    const { x, base, height, running_totals } = geometry;
    const { shelf_x, shelf_y } = compute_shelf_line(x, running_totals);
    const colors = compute_bar_colors(events, cutoff);
    const cutoff_x = x[cutoff] ?? x[x.length - 1] ?? new Date();
    const regression_trace = regression ? build_regression_trace(regression) : undefined;

    const traces = [
        {
            type: "bar",
            x,
            base,
            y: height,
            marker: { color: colors },
            showlegend: false
        },
        {
            type: "scatter",
            mode: "lines",
            line: { color: "rgb(63, 63, 63)", width: 1, dash: "dot" },
            x: shelf_x,
            y: shelf_y,
            connectgaps: false,
            showlegend: false,
            hoverinfo: "skip"
        }
    ];
    if (regression_trace) traces.push(...regression_trace as any[]);

    Plotly.newPlot(container, traces, {
        xaxis: { title: { text: "Date" } },
        yaxis: { title: { text: "Count" } },
        shapes: [build_cutoff_shape(cutoff_x)],
        showlegend: true,
        title: { text: `Category Timeline. ${regression ? `OLS Trend: ${get_trend(regression.p_growth, regression.p_decline)}` : ""}` },
    });
}

function render_residuals_chart(container: HTMLElement, data: { residuals: number[], sigma: number } | undefined): void {
    if (typeof Plotly === "undefined") throw new Error("Plotly library is not loaded.");

    container.innerHTML = "";
    if (!data || !(data.sigma > 0)) return; // all deltas equal => sigma 0 => nothing to compare against

    Plotly.newPlot(container, [build_residuals_trace(data.residuals), build_normal_pdf_trace(data.sigma)], {
        xaxis: { title: { text: "Delta residual" } },
        yaxis: { title: { text: "Density" } },
        showlegend: true,
        title: { text: "Delta Residual Distribution vs Normal PDF" }
    });
}

function render_qq_chart(container: HTMLElement, data: { residuals: number[], sigma: number } | undefined): any {
    container.innerHTML = "";

    if (typeof Plotly === "undefined") throw new Error("Plotly library is not loaded.");
    if (!data || !(data.sigma > 0)) return; // qq() divides by sigma

    const trace = build_qq_trace(data.residuals, data.sigma);
    const min_val = Math.min(...trace.x, ...trace.y) - 0.5;
    const max_val = Math.max(...trace.x, ...trace.y) + 0.5;

    Plotly.newPlot(container, [trace], {
        xaxis: { title: { text: "Delta Residual Quantiles" }, range: [min_val, max_val] },
        yaxis: { title: { text: "Normal Quantiles" }, range: [min_val, max_val] },
        shapes: [{
            type: "line",
            x0: min_val, x1: max_val,
            y0: min_val, y1: max_val,
            line: { color: "rgb(10, 10, 10)", width: 2, dash: "dot" },
            showlegend: false
        }],
        showlegend: true,
        title: { text: "QQ Plot of Delta Residuals vs Normal Distribution" }
    });
}

async function refresh_current_category(cutoff_slider: HTMLInputElement): Promise<void> {
    if (!analytics_category_input) throw new Error("Analytics category input is not initialized.");

    const category = locate_category(analytics_category_input.value)?.title;
    if (category === current_category) return;

    current_category = category;
    current_events = category === undefined ? [] : await get_analytics_object().get_category_events(category);
    current_date_min = current_events[0]?.date ?? 0;
    current_date_max = current_events[current_events.length - 1]?.date ?? 0;
    cutoff_slider.value = "0";
}

export async function refresh_regression_plot(): Promise<void> {
    const chart_container = get_element("analyticsChartContainer");
    const drift_trend_label = get_element("analyticsDriftTrend");
    const residuals_container = get_element("analyticsResidualsContainer");
    const qq_container = get_element("analyticsQQContainer");
    const cutoff_slider = get_element<HTMLInputElement>("analyticsCutoffSlider");

    await refresh_current_category(cutoff_slider);
    if (current_events.length === 0) return;

    const lambda = Number(cutoff_slider.value);
    const cutoff_date = lambda_to_cutoff_date(isNaN(lambda) ? 0 : lambda, current_date_min, current_date_max);
    const cutoff_index = find_cutoff_index(current_events, cutoff_date);

    const geometry = compute_bar_geometry(current_events);
    const regression = compute_current_regression(geometry.x, geometry.running_totals, cutoff_index);
    const drift_test = cutoff_index > current_events.length - MIN_PVALUE_POINTS? undefined: mean_test(current_events.slice(cutoff_index).map(e => e.delta));

    drift_trend_label.textContent = drift_test ? `Drift trend: ${get_trend(drift_test.p_right, drift_test.p_left)} (p-growth: ${drift_test.p_right.toFixed(3)}, p-decline: ${drift_test.p_left.toFixed(3)})` : "";

    render_timeline_chart(chart_container, current_events, geometry, cutoff_index, regression);
    render_residuals_chart(residuals_container, drift_test);
    render_qq_chart(qq_container, drift_test);
}
