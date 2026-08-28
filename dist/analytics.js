import { Analytics } from "./analytics_utils.js";
import {} from "./db_driver.js";
import {} from "./main.js";
import { CategoryInput, get_element } from "./dom_utils.js";
import { get_category_titles } from "./index.js";
import { renderPattern } from "./vocab.js";
import { refresh_regression_plot } from "./analytics_linreg.js";
import { refresh_activity_plot } from "./analytics_activity.js";
let analytics_object = undefined;
export let analytics_category_input;
export function get_analytics_object() {
    if (!analytics_object)
        throw new Error("Analytics object is not initialized.");
    return analytics_object;
}
export async function refresh_analytics() {
    if (!analytics_category_input)
        throw new Error("Analytics category input is not initialized.");
    analytics_category_input.categories = get_category_titles();
    await refresh_regression_plot();
    const heatmap_container = get_element("analyticsHeatmapContainer");
    await refresh_activity_plot(heatmap_container, new Date().getFullYear());
}
export async function init_analytics(db_driver, manager) {
    analytics_object = new Analytics(db_driver, manager);
    const input_container = get_element("analyticsCategoryInputContainer");
    analytics_category_input = new CategoryInput("analyticsCategoryInput", get_category_titles(), renderPattern("category_input"), async (_value) => {
        await refresh_regression_plot();
    });
    input_container.appendChild(analytics_category_input.container);
    const cutoff_slider = get_element("analyticsCutoffSlider");
    cutoff_slider.addEventListener("input", async () => {
        await refresh_regression_plot();
    });
    await refresh_analytics();
    window.onresize = async () => {
        await refresh_analytics();
    };
}
//# sourceMappingURL=analytics.js.map