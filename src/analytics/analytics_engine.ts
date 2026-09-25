import { Analytics } from "./analytics_utils.js";
import { type IDatabaseDriver } from "../core/db_driver.js";
import { type DatabaseManager } from "../core/main.js";
import { CategoryInput, get_element } from "../core/dom_utils.js";
import { get_category_titles } from "../core/index.js";
import { renderPattern } from "../core/vocab.js";
import { refresh_regression_plot } from "./analytics_linreg.js";
import { refresh_activity_plot } from "./analytics_activity.js";
import { refresh_climate_plot } from "./analytics_climate.js";

let analytics_object: Analytics | undefined = undefined;
export let analytics_category_input: CategoryInput | undefined;

export function get_analytics_object(): Analytics {
    if (!analytics_object) throw new Error("Analytics object is not initialized.");
    return analytics_object;
}

export async function refresh_analytics(): Promise<void> {
    if (!analytics_category_input) throw new Error("Analytics category input is not initialized.");
    analytics_category_input.categories = get_category_titles();

    await refresh_regression_plot();

    const heatmap_container = get_element("analyticsHeatmapContainer");
    await refresh_activity_plot(heatmap_container);

    const climate_container = get_element("analyticsClimateContainer");
    await refresh_climate_plot(climate_container);
}

export async function init_analytics(db_driver: IDatabaseDriver, manager: DatabaseManager): Promise<void> {
    analytics_object = new Analytics(db_driver, manager);

    const input_container = get_element<HTMLDivElement>("analyticsCategoryInputContainer");
    analytics_category_input = new CategoryInput(
        "analyticsCategoryInput",
        get_category_titles(),
        renderPattern("category_input"),
        async (_value) => {
            await refresh_regression_plot();
        }
    );
    input_container.appendChild(analytics_category_input.container);

    const cutoff_slider = get_element<HTMLInputElement>("analyticsCutoffSlider");
    cutoff_slider.addEventListener("input", async () => {
        await refresh_regression_plot();
    });

    const smoothing_slider = get_element<HTMLInputElement>("analyticsSmoothingSlider");
    smoothing_slider.addEventListener("input", async () => {
        const climate_container = get_element("analyticsClimateContainer");
        await refresh_climate_plot(climate_container);
    });

    await refresh_analytics();
    window.onresize = async () => {
        await refresh_analytics();
    }
}