import { Node } from "../graph_utils";
export type Edge<T> = {
    u: Node<T>;
    v: Node<T>;
    weight: number;
};
export declare function metric_closure<T>(nodes: Node<T>[]): void;
export declare function subgraph<T>(nodes: Node<T>[], subset: Set<Node<T>>): void;
export declare function graph_from_edges<T>(edges: Edge<T>[]): void;
export declare function minimum_spanning_tree<T>(start: Node<T>, n: number): Edge<T>[];
export declare function preorder_traversal<T>(start: Node<T>): Node<T>[];
export declare function tsp<T>(entry: Node<T>, nodes: Node<T>[]): Node<T>[];
//# sourceMappingURL=tsp.d.ts.map