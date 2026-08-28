import type { Box } from "./types.js";
import { type AdjacencyList } from "./graph_utils.js";
export declare function render_box_graph(container: HTMLElement, boxes: Box[], weights: Map<number, number>, adjacency: AdjacencyList): void;
export declare function render_weights_table(container: HTMLElement, boxes: Box[], weights: Map<number, number>, adjacency: AdjacencyList): void;
export declare function refresh_boxes_graph(): Promise<void>;
export declare function init_boxes_graph(): void;
//# sourceMappingURL=boxes_graph.d.ts.map