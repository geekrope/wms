import {} from "./analytics_utils.js";
import { get_analytics_object } from "./analytics.js";
const HEATMAP_CELL_SIZE = 11;
const HEATMAP_CELL_GAP = 2;
const HEATMAP_MONTH_GAP = 5;
const HEATMAP_TEXT_HEIGHT = 15;
const HEATMAP_DAY_LABEL_WIDTH = 24;
const HEATMAP_SCALE = ["#e1e0d9", "#9ec5f4", "#5598e7", "#256abf", "#104281"];
const HEATMAP_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HEATMAP_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function div(numerator, denominator) {
    return (numerator - (numerator % denominator)) / denominator;
}
function make_svg_element(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs))
        el.setAttribute(key, String(value));
    return el;
}
function get_heatmap_color(count) {
    return HEATMAP_SCALE[Math.min(count, HEATMAP_SCALE.length - 1)];
}
function make_heatmap_cell(x, y, count, date) {
    const rect = make_svg_element("rect", { x, y, width: HEATMAP_CELL_SIZE, height: HEATMAP_CELL_SIZE, rx: 2, ry: 2, fill: get_heatmap_color(count) });
    const title = make_svg_element("title", {});
    title.textContent = `${date.toISOString().slice(0, 10)}: ${count}`;
    rect.appendChild(title);
    return rect;
}
function get_first_day(year, month) {
    return new Date(year, month, 1).getDay();
}
// fix the space in front
function build_heatmap_svg(activity, start_day, start_month, start_year) {
    const elements = [];
    const full_size = HEATMAP_CELL_SIZE + HEATMAP_CELL_GAP;
    const compensation = div(start_day + get_first_day(start_year, start_month), 7);
    const height = 7 * full_size;
    let ptr = 0;
    let x_offset = HEATMAP_DAY_LABEL_WIDTH - compensation * full_size;
    let day = start_day;
    let year = start_year;
    for (let row = 0; row < 7; row++) {
        const label = make_svg_element("text", { x: HEATMAP_DAY_LABEL_WIDTH - 2 * HEATMAP_CELL_GAP, y: row * full_size + HEATMAP_CELL_SIZE / 2, "text-anchor": "end", "dominant-baseline": "middle", "font-size": 9, fill: "#000" });
        label.textContent = HEATMAP_DAY_NAMES[row];
        elements.push(label);
    }
    for (let month_off = 0; month_off < 12;) {
        const month = (start_month + month_off) % 12;
        const days_in_month = new Date(year, month + 1, 0).getDate();
        const first_day_of_month = get_first_day(year, month);
        const width = div(days_in_month + first_day_of_month + 6, 7) * full_size;
        for (; day < days_in_month; day++) {
            const date = new Date(Date.UTC(year, month, day + 1));
            let count = 0;
            if (ptr < activity.length && activity[ptr].date.getTime() === date.getTime()) {
                count = activity[ptr].count;
                ptr++;
            }
            const y = ((day + first_day_of_month) % 7) * full_size;
            const x = div(day + first_day_of_month, 7) * full_size + x_offset;
            const element = make_heatmap_cell(x, y, count, date);
            elements.push(element);
        }
        day = 0;
        month_off++;
        if ((start_month + month_off) % 12 == 0) {
            year++;
        }
        const text_x = x_offset + width / 2;
        const text_y = height;
        const text_element = make_svg_element("text", { x: text_x, y: text_y, "text-anchor": "middle", "dominant-baseline": "hanging", "font-size": 10, fill: "#000" });
        text_element.textContent = HEATMAP_MONTH_NAMES[month];
        x_offset += width;
        x_offset += HEATMAP_MONTH_GAP;
        elements.push(text_element);
    }
    return { width: x_offset + full_size, height: height + HEATMAP_TEXT_HEIGHT, elements };
}
export async function refresh_activity_plot(container) {
    const analytics = get_analytics_object();
    const end_date = new Date();
    const begin_date = new Date(Date.UTC(end_date.getUTCFullYear() - 1, end_date.getUTCMonth(), end_date.getUTCDate()));
    const activity = await analytics.get_activity(begin_date.getTime(), end_date.getTime());
    const { width, height, elements } = build_heatmap_svg(activity, begin_date.getUTCDate() - 1, begin_date.getUTCMonth(), begin_date.getUTCFullYear());
    const svg = make_svg_element("svg", {
        viewBox: `0 0 ${width} ${height}`,
        preserveAspectRatio: "xMidYMid meet",
        style: `display: block; margin: 0 auto; width: 100%; height: auto; max-width: ${width}px;`
    });
    for (const element of elements)
        svg.appendChild(element);
    container.innerHTML = "";
    container.appendChild(svg);
}
//# sourceMappingURL=analytics_activity.js.map