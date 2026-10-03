import { get_analytics_object } from "./analytics_engine.js";
import { type LiftEntry } from "./analytics_utils.js";
import { cluster, type Merge } from "../algorithms/hierarcical_clustering.js";
import { add_log_entry, get_element } from "../core/dom_utils.js";

type Bucket = { titles: string[], similarity: number | undefined };

function build_graph(lift: LiftEntry[], use_log = true) {
    let counter = 0;
    const indices: Map<string, number> = new Map();
    const plain_map: string[] = [];
    const get_index = (title: string) => {
        if (indices.has(title)) {
            return indices.get(title)!;
        }
        else {
            indices.set(title, counter);
            graph.push([]);
            plain_map.push(title);
            return counter++;
        }
    }
    const graph: { to: number, weight: number }[][] = [];

    for (const entry of lift) {
        let v = get_index(entry.title1);
        let u = get_index(entry.title2);
        const weight = use_log ? Math.log(entry.lift) : entry.lift;

        graph[v].push({ to: u, weight: weight });
        graph[u].push({ to: v, weight: weight });
    }

    return { edges: graph, plain_map: plain_map };
}

// the similarity of a bucket is the one of its last merge. since the similarities
// are non-increasing it is the weakest link the bucket was built with
function compute_clusters(depth: number, merges: Merge[], plain_map: string[]): Bucket[] {
    const clusters: Bucket[] = plain_map.map((val) => ({ titles: [val], similarity: undefined }));

    for (let iter = 0; iter < Math.min(depth, merges.length); iter++) {
        const merge = merges[iter];
        clusters[merge.v].titles.push(...clusters[merge.u].titles);
        clusters[merge.v].similarity = merge.similarity;
        clusters[merge.u].titles = [];
    }

    return clusters.filter((bucket) => bucket.titles.length > 0);
}

function make_bucket(titles: string[], header: string, muted: boolean): HTMLDivElement {
    const bucket = document.createElement("div");
    bucket.className = muted ? "cluster-bucket muted" : "cluster-bucket";

    const title = document.createElement("div");
    title.className = "cluster-bucket-header";
    title.textContent = header;
    bucket.appendChild(title);

    const chips = document.createElement("div");
    chips.className = "cluster-bucket-chips";
    for (const name of titles) {
        const chip = document.createElement("span");
        chip.className = "category-chip";
        chip.textContent = name;
        chips.appendChild(chip);
    }
    bucket.appendChild(chips);

    return bucket;
}

function render_buckets(container: HTMLElement, buckets: Bucket[]): void {
    container.innerHTML = "";

    const groups = buckets
        .filter((bucket): bucket is Bucket & { similarity: number } => bucket.similarity !== undefined)
        .sort((a, b) => b.titles.length - a.titles.length || b.similarity - a.similarity);
    const singles = buckets.filter((bucket) => bucket.similarity === undefined).map((bucket) => bucket.titles[0]);

    const grid = document.createElement("div");
    grid.className = "cluster-buckets";
    for (const group of groups) {
        grid.appendChild(make_bucket(group.titles, `merged at ${group.similarity.toFixed(2)}`, false));
    }
    if (singles.length > 0) {
        grid.appendChild(make_bucket(singles, "no pair", true));
    }
    if (groups.length == 0 && singles.length == 0) {
        grid.textContent = "Not enough data.";
    }
    container.appendChild(grid);
}

export async function refresh_coocurence_plot(container: HTMLElement): Promise<void> {
    const type = get_element<HTMLInputElement>("analyticsCoocurenceRemove").checked ? "remove" : "add";
    const depth_slider = get_element<HTMLInputElement>("analyticsCoocurenceDepthSlider");

    try {
        const analytics = get_analytics_object();
        const lift = await analytics.get_lift(5, type);
        const graph = build_graph(lift);
        const merges = cluster(graph.edges);

        depth_slider.max = String(merges.length);
        const depth = Math.min(Number(depth_slider.value), merges.length);
        get_element("analyticsCoocurenceDepthValue").textContent = `${depth} / ${merges.length}`;

        render_buckets(container, compute_clusters(depth, merges, graph.plain_map));
    }
    catch (err) {
        console.error(err);
        add_log_entry(String(err), "statsLog", true);
    }
}
