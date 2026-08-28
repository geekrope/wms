import { insert, erase } from "./heap.js";

export abstract class Node<T> {
    readonly successors: Map<Node<T>, number> = new Map();
    readonly predecessors: Set<Node<T>> = new Set();

    add_successor(node: Node<T>, weight: number): void {
        this.successors.set(node, weight);
        node.predecessors.add(this);
    }

    remove_successor(node: Node<T>): void {
        this.successors.delete(node);
        node.predecessors.delete(this);
    }
}

export class ValueNode<T> extends Node<T> {
    constructor(public value: T) {
        super();
    }
}

export class EntryNode<T> extends Node<T> {
}

export type AdjacencyList<T = number> = { v: T, u: T }[];

export function dijkstra<T>(start: Node<T>): Map<Node<T>, number> {
    const distances = new Map<Node<T>, number>();
    const distance_heap: { key: Node<T>, value: number }[] = [];
    const less = (a: { key: Node<T>, value: number }, b: { key: Node<T>, value: number }) => a.value < b.value;

    insert(distance_heap, { key: start, value: 0 }, less);

    while (distance_heap.length > 0) {
        const current = distance_heap[0];
        erase(distance_heap, 0, less);

        if (distances.has(current.key)) { continue; }
        distances.set(current.key, current.value);

        for (const [neighbor, weight] of current.key.successors.entries()) {
            if (distances.has(neighbor)) { continue; }
            insert(distance_heap, { key: neighbor, value: current.value + weight }, less);
        }
    }

    return distances;
}

export function detect_cycle<T>(labels: Map<Node<T>, number>, start: Node<T>): boolean {
    labels.set(start, 1);

    for (const neighbor of start.successors.keys()) {
        const label = labels.get(neighbor);

        if (label === undefined) throw new Error("Node not found in labels");

        switch (label) {
            case 0:
                if (detect_cycle(labels, neighbor)) return true;
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

export function build_graph<T>(boxes: T[], weights: Map<T, number>, adjacency_list: AdjacencyList<T>): { entry: EntryNode<T>, nodes: Map<T, ValueNode<T>> } {
    const entry = new EntryNode<T>();
    const nodes = new Map<T, ValueNode<T>>();
    const orphans: Set<T> = new Set(boxes);

    for (const box of boxes) {
        nodes.set(box, new ValueNode<T>(box));
    }

    for (const { v, u } of adjacency_list) {
        const from = nodes.get(v);
        const to = nodes.get(u);
        if (!from || !to) continue;

        from.add_successor(to, weights.get(v) || 0);
        orphans.delete(u);
    }

    for (const box of orphans) {
        entry.add_successor(nodes.get(box)!, 0);
    }

    return { entry, nodes };
}