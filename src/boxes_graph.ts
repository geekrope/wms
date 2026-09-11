import { empty_container, get_element } from "./dom_utils.js";
import { get_db_manager, get_boxes_list } from "./index.js";
import { renderPattern } from "./vocab.js";
import type { Box } from "./types.js";
import { compute_costs, build_graph, detect_cycle, type AdjacencyList, type Node } from "./graph_utils.js";

declare const vis: any;

let network_instance: any = null;

async function add_edge(this: { adjacency: AdjacencyList, boxes: Box[], weights: Map<number, number> }, edgeData: any, callback: any): Promise<void> {
    const v = Number(edgeData.from);
    const u = Number(edgeData.to);

    const box_ids = this.boxes.map(box => box.id);
    const staged = [...this.adjacency, { v, u }];
    const { nodes } = build_graph(box_ids, staged);
    const labels = new Map<Node<number>, number>(Array.from(nodes.values(), node => [node, 0]));
    const start_node = nodes.get(v);
    const has_cycle = start_node !== undefined && detect_cycle(labels, start_node);

    if (has_cycle) {
        callback(null);
        window.alert("Adding this edge would create a cycle. Operation canceled.");
        return;
    }

    try {
        await get_db_manager().add_box_connections([{ v, u }]);
        await refresh_boxes_graph();

        callback(edgeData);
    } catch (err) {
        console.error("An error occurred while adding the edge:", err);
        callback(null);
    }
}

async function delete_edge(edgeData: any, callback: any) {
    try {
        for (const edgeId of edgeData.edges) {
            const edge = network_instance.body.data.edges.get(edgeId);
            if (edge) {
                await get_db_manager().remove_box_connection(Number(edge.from), Number(edge.to));
            }
        }
        await refresh_boxes_graph();
        callback(edgeData);
    } catch (err) {
        console.error("An error occurred while deleting the edge:", err);
        callback(null);
    }
}

export function render_box_graph(
    container: HTMLElement,
    boxes: Box[],
    weights: Map<number, number>,
    adjacency: AdjacencyList
) {
    if (typeof vis === "undefined") throw Error("vis-network library is not loaded.");

    container.textContent = "";

    if (boxes.length === 0) {
        container.appendChild(empty_container());
        return;
    }

    const box_ids = boxes.map(box => box.id!);
    const title_by_id = new Map<number, string>(boxes.map(box => [box.id!, box.title]));

    const { entry, nodes: graph_nodes } = build_graph(box_ids, adjacency);
    const access_scores = compute_costs(entry, weights);

    const all_nodes_set = new Set<number>(box_ids);
    for (const { v, u } of adjacency) {
        if (box_ids.includes(v)) all_nodes_set.add(v);
        if (box_ids.includes(u)) all_nodes_set.add(u);
    }

    const nodes = Array.from(all_nodes_set).map(id => {
        const weight = weights.get(id) ?? 0;
        const box_node = graph_nodes.get(id);
        const access_cost = (box_node && access_scores.get(box_node)) ?? 0;
        const is_root = box_node?.predecessors.has(entry) ?? false;

        return {
            id,
            label: renderPattern("graph_box_label", {
                box: title_by_id.get(id) ?? id,
                weight,
                cost: access_cost
            }),
            shape: "box",
            margin: 10,
            color: {
                background: is_root ? "#27ae60" : "#3498db",
                border: is_root ? "#1e8449" : "#2980b9",
                highlight: {
                    background: "#e67e22",
                    border: "#d35400"
                }
            },
            font: {
                color: "#ffffff",
                face: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                size: 13,
                bold: { mod: "bold" }
            }
        };
    });

    const edges: { from: number, to: number, label?: string, arrows: string, color?: any }[] = [];
    for (const { v, u } of adjacency) {
        if (all_nodes_set.has(v) && all_nodes_set.has(u)) {
            edges.push({
                from: v,
                to: u,
                arrows: "to",
                color: { color: "#95a5a6", highlight: "#e67e22" }
            });
        }
    }

    const data = { nodes, edges };
    const empty_handler = (_param: any, callback: any) => {
        callback(null);
        console.log(false, "This handler is disabled");
    }
    const options = {
        layout: {
            hierarchical: {
                direction: "UD",
                sortMethod: "directed"
            }
        },
        physics: {
            enabled: false
        },
        interaction: {
            hover: true,
            dragNodes: true,
            zoomView: true
        },
        manipulation: {
            enabled: true,
            addNode: false,
            editEdge: empty_handler,
            deleteNode: false,
            addEdge: add_edge.bind({ adjacency, boxes, weights }),
            deleteEdge: delete_edge
        }
    };

    network_instance = new vis.Network(container, data, options);
}

export function render_weights_table(
    container: HTMLElement,
    boxes: Box[],
    weights: Map<number, number>,
    adjacency: AdjacencyList
) {
    container.textContent = "";

    if (boxes.length === 0) return;

    const box_ids = boxes.map(box => box.id!);
    const { entry, nodes: graph_nodes } = build_graph(box_ids, adjacency);
    const access_scores = compute_costs(entry, weights);

    const sorted_boxes = [...boxes].sort((a, b) => a.title.localeCompare(b.title));

    const table = document.createElement("table");
    table.className = "data-table";

    const thead = document.createElement("thead");
    const header_tr = document.createElement("tr");

    const th_box = document.createElement("th");
    th_box.textContent = renderPattern("th_box");
    const th_weight = document.createElement("th");
    th_weight.textContent = renderPattern("th_weight");
    const th_max_load = document.createElement("th");
    th_max_load.textContent = renderPattern("th_max_load");
    const th_cost = document.createElement("th");
    th_cost.textContent = renderPattern("th_access_cost");

    header_tr.appendChild(th_box);
    header_tr.appendChild(th_weight);
    header_tr.appendChild(th_max_load);
    header_tr.appendChild(th_cost);
    thead.appendChild(header_tr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (const box of sorted_boxes) {
        const tr = document.createElement("tr");
        const total_weight = weights.get(box.id!) ?? 0;

        const td_box = document.createElement("td");
        td_box.textContent = `📦 ${renderPattern("box")} ${box.title}`;
        td_box.style.fontWeight = "600";

        const td_weight = document.createElement("td");
        td_weight.textContent = `${total_weight} г`;

        const td_max_load = document.createElement("td");
        if (box.max_load === null) {
            td_max_load.textContent = renderPattern("no_limit");
        } else {
            const left_space = box.max_load - total_weight;
            const sign = left_space >= 0 ? "+" : "";
            td_max_load.textContent = `${box.max_load} г (${sign}${left_space} г)`;
            td_max_load.className = left_space >= 0 ? "left-space-positive" : "left-space-negative";
        }

        const td_cost = document.createElement("td");
        const box_node = graph_nodes.get(box.id!);
        const cost = (box_node && access_scores.get(box_node)) ?? 0;
        const badge = document.createElement("span");
        badge.className = `badge-cost ${cost === 0 ? "direct" : "blocked"}`;
        badge.textContent = cost === 0 ? renderPattern("direct_access") : `${cost} г`;
        td_cost.appendChild(badge);

        tr.appendChild(td_box);
        tr.appendChild(td_weight);
        tr.appendChild(td_max_load);
        tr.appendChild(td_cost);
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    container.appendChild(table);
}

export async function refresh_boxes_graph(): Promise<void> {
    const graph_container = get_element<HTMLDivElement>("boxesGraphContainer");
    const table_container = get_element<HTMLDivElement>("boxesWeightsTableContainer");

    const manager = get_db_manager();
    const boxes = get_boxes_list();

    if (boxes.length === 0) {
        graph_container.textContent = "";
        graph_container.appendChild(empty_container());
        table_container.textContent = "";
        return;
    }

    const box_weights = await manager.get_box_weights();
    const weight_by_title = new Map<string, number>(box_weights.map(entry => [entry.box, entry.total_weight]));
    const weights = new Map<number, number>(boxes.map(box => [box.id!, weight_by_title.get(box.title) ?? 0]));

    const adjacency = await manager.get_box_adjacency();

    render_box_graph(graph_container, boxes, weights, adjacency);
    render_weights_table(table_container, boxes, weights, adjacency);
}

export function init_boxes_graph(): void {
    const boxesTab = document.querySelector('[data-page="boxes_management"]');
    if (boxesTab) {
        boxesTab.addEventListener("click", () => {
            setTimeout(() => {
                network_instance?.fit();
            }, 50);
        });
    }
}
