import { OpenMeteoProvider, MUNICH_LAT, MUNICH_LON, type EnvironmentData } from "./environment_provider.js";
import { filtfilt, EMA } from "../algorithms/biquad.js";
import { find_peaks, type Peak } from "../algorithms/peaks.js";
import { get_element } from "../core/dom_utils.js";

declare const Plotly: any;

const CLIMATE_WINDOW_DAYS = 14;
const TEMPERATURE_COLOR = "rgb(194, 89, 104)";
const TEMPERATURE_RAW_COLOR = "rgba(194, 89, 104, 0.35)";
const PEAK_COLOR = "#e67e22";

const provider = new OpenMeteoProvider(MUNICH_LAT, MUNICH_LON);

function filter_temperature(data: EnvironmentData, alpha: number): EnvironmentData {
    const tmp_filtered = filtfilt(data.tmp, EMA(alpha))
    return { stamps: data.stamps, humidity: data.humidity, frequency_ms: data.frequency_ms, tmp: tmp_filtered };
}

function build_temperature_trace(data: EnvironmentData, color: string, name: string): any {
    return {
        type: "scatter",
        mode: "lines",
        name,
        x: data.stamps,
        y: data.tmp,
        line: { color, width: 2 },
        showlegend: false
    };
}

function build_temperature_peaks_trace(data: EnvironmentData, peaks: Peak[]) {
    return [...peaks.map((peak) => {
        return {
            x: [data.stamps[peak.index], data.stamps[peak.index], data.stamps[peak.highest_base]],
            y: [data.tmp[peak.index], data.tmp[peak.highest_base], data.tmp[peak.highest_base]],
            type: 'scatter',
            mode: 'lines',
            line: { color: '#95a5a6', dash: 'dot', width: 1 },
            showlegend: false,
            hoverinfo: 'skip'
        };
    }),
    {
        x: peaks.map((peak) => {
            return data.stamps[peak.index];
        }),
        y: peaks.map((peak) => {
            return data.tmp[peak.index];
        }),
        type: 'scatter',
        mode: 'markers',
        name: 'peaks',
        marker: { color: PEAK_COLOR, size: 9, symbol: 'circle', line: { color: '#fff', width: 1.5 } }
    },
    {
        x: peaks.map((peak) => {
            return data.stamps[peak.highest_base];
        }),
        y: peaks.map((peak) => {
            return data.tmp[peak.highest_base];
        }),
        type: 'scatter',
        mode: 'markers',
        name: 'peaks',
        marker: { color: '#95a5a6', size: 6, symbol: 'circle', line: { color: '#fff', width: 1 } }
    }];
}

function format_stamp(stamp: Date): string {
    return stamp.toLocaleDateString();
}

function build_peaks_row(data: EnvironmentData, peak: Peak): HTMLTableRowElement {
    const row = document.createElement("tr");
    const date_cell = document.createElement("td");
    const temperature_cell = document.createElement("td");
    const prominence_cell = document.createElement("td");

    date_cell.textContent = format_stamp(data.stamps[peak.index]);
    temperature_cell.textContent = `${data.tmp[peak.index].toFixed(1)} °C`;
    prominence_cell.textContent = `${peak.prominence.toFixed(1)} °C`;

    row.append(date_cell, temperature_cell, prominence_cell);
    return row;
}

function render_peaks_table(container: HTMLElement, data: EnvironmentData, peaks: Peak[]): void {
    const sorted_peaks = [...peaks].sort((a, b) => b.prominence - a.prominence);

    const table = document.createElement("table");
    table.className = "peaks-table";

    const head = document.createElement("thead");
    const head_row = document.createElement("tr");
    for (const title of ["Date", "Temperature", "Prominence"]) {
        const th = document.createElement("th");
        th.textContent = title;
        head_row.appendChild(th);
    }
    head.appendChild(head_row);

    const body = document.createElement("tbody");
    for (const peak of sorted_peaks) body.appendChild(build_peaks_row(data, peak));

    table.append(head, body);

    container.innerHTML = "";
    container.appendChild(table);
}

function render_temperature_chart(container: HTMLElement, data: EnvironmentData, data_filtered: EnvironmentData, temperature_peaks: Peak[]): void {
    if (typeof Plotly === "undefined") throw new Error("Plotly library is not loaded.");

    const traces = [
        build_temperature_trace(data, TEMPERATURE_RAW_COLOR, "Raw"),
        build_temperature_trace(data_filtered, TEMPERATURE_COLOR, "Smoothed"),
        ...build_temperature_peaks_trace(data_filtered, temperature_peaks)
    ];

    Plotly.newPlot(container, traces, {
        xaxis: { title: { text: "Date" } },
        yaxis: { title: { text: "°C" } },
        showlegend: false,
        title: { text: `Temperature (last ${CLIMATE_WINDOW_DAYS} days)` }
    });
}

export async function refresh_climate_plot(container: HTMLElement): Promise<void> {
    const end = new Date();
    const begin = new Date(end.getTime() - CLIMATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const smoothing_slider = get_element<HTMLInputElement>("analyticsSmoothingSlider");
    const alpha = 1 - Number(smoothing_slider.value);

    const data = await provider.get_data(begin, end);
    const data_filtered = filter_temperature(data, alpha);
    const temperature_peaks = find_peaks(data_filtered.tmp);
    render_temperature_chart(container, data, data_filtered, temperature_peaks);

    const peaks_table_container = get_element("analyticsPeaksTableContainer");
    render_peaks_table(peaks_table_container, data_filtered, temperature_peaks);
}