import { insert, erase } from "./heap.js";
export class Node {
    successors = new Map();
    predecessors = new Set();
    add_successor(node, weight) {
        this.successors.set(node, weight);
        node.predecessors.add(this);
    }
    remove_successor(node) {
        this.successors.delete(node);
        node.predecessors.delete(this);
    }
}
export class ValueNode extends Node {
    value;
    constructor(value) {
        super();
        this.value = value;
    }
}
export class EntryNode extends Node {
}
export function dijkstra(start) {
    const distances = new Map();
    const distance_heap = [];
    const less = (a, b) => a.value < b.value;
    insert(distance_heap, { key: start, value: 0 }, less);
    while (distance_heap.length > 0) {
        const current = distance_heap[0];
        erase(distance_heap, 0, less);
        if (distances.has(current.key)) {
            continue;
        }
        distances.set(current.key, current.value);
        for (const [neighbor, weight] of current.key.successors.entries()) {
            if (distances.has(neighbor)) {
                continue;
            }
            insert(distance_heap, { key: neighbor, value: current.value + weight }, less);
        }
    }
    return distances;
}
export function detect_cycle(labels, start) {
    labels.set(start, 1);
    for (const neighbor of start.successors.keys()) {
        const label = labels.get(neighbor);
        if (label === undefined)
            throw new Error("Node not found in labels");
        switch (label) {
            case 0:
                if (detect_cycle(labels, neighbor))
                    return true;
                break;
            case 1:
                return true;
            case 2:
                continue;
        }
    }
    labels.set(start, 2);
    return false;
}
export function build_graph(boxes, weights, adjacency_list) {
    const entry = new EntryNode();
    const nodes = new Map();
    const orphans = new Set(boxes);
    for (const box of boxes) {
        nodes.set(box, new ValueNode(box));
    }
    for (const { v, u } of adjacency_list) {
        const from = nodes.get(v);
        const to = nodes.get(u);
        if (!from || !to)
            continue;
        from.add_successor(to, weights.get(v) || 0);
        orphans.delete(u);
    }
    for (const box of orphans) {
        entry.add_successor(nodes.get(box), 0);
    }
    return { entry, nodes };
}
//# sourceMappingURL=graph_utils.js.map