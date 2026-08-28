export declare abstract class Node<T> {
    readonly successors: Map<Node<T>, number>;
    readonly predecessors: Set<Node<T>>;
    add_successor(node: Node<T>, weight: number): void;
    remove_successor(node: Node<T>): void;
}
export declare class ValueNode<T> extends Node<T> {
    value: T;
    constructor(value: T);
}
export declare class EntryNode<T> extends Node<T> {
}
export type AdjacencyList<T = number> = {
    v: T;
    u: T;
}[];
export declare function dijkstra<T>(start: Node<T>): Map<Node<T>, number>;
export declare function detect_cycle<T>(labels: Map<Node<T>, number>, start: Node<T>): boolean;
export declare function build_graph<T>(boxes: T[], weights: Map<T, number>, adjacency_list: AdjacencyList<T>): {
    entry: EntryNode<T>;
    nodes: Map<T, ValueNode<T>>;
};
//# sourceMappingURL=graph_utils.d.ts.map