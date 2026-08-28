import { Node, dijkstra } from "../graph_utils";
import { insert, erase } from "../heap";

export type Edge<T> = { u: Node<T>, v: Node<T>, weight: number };

export function metric_closure<T>(nodes: Node<T>[]): void {
    const pairwise_distances = new Map<Node<T>, Map<Node<T>, number>>();

    for (const v of nodes) {
        const distances = dijkstra(v);
        pairwise_distances.set(v, distances);
    }

    for (const v of nodes) {
        for (const u of nodes) {
            if (v === u) continue;
            const distance = pairwise_distances.get(v)?.get(u);
            if (distance !== undefined) {
                v.add_successor(u, distance);
            }
        }
    }
}

export function subgraph<T>(nodes: Node<T>[], subset: Set<Node<T>>): void {
    for (const node of nodes) {
        for (const neighbor of node.successors.keys()) {
            if (!subset.has(neighbor)) {
                node.remove_successor(neighbor); // claude says safe.
            }
        }
    }
}

export function graph_from_edges<T>(edges: Edge<T>[]): void {
    const reset: Set<Node<T>> = new Set();

    for (const edge of edges) {
        if (!reset.has(edge.v)) {
            for (const succ of edge.v.successors.keys()) {
                edge.v.remove_successor(succ);
            }
            reset.add(edge.v);
        }

        edge.v.add_successor(edge.u, edge.weight);
    }
}

export function minimum_spanning_tree<T>(start: Node<T>, n: number): Edge<T>[] {
    const used: Set<Node<T>> = new Set();
    const edges_queue: Edge<T>[] = []
    const tree: Edge<T>[] = []
    const comp = (a: Edge<T>, b: Edge<T>) => a.weight < b.weight;

    used.add(start);

    for (const [neighbor, weight] of start.successors.entries()) {
        const edge_data = { weight, v: start, u: neighbor };
        insert(edges_queue, edge_data, comp);
    }

    while (tree.length < n - 1 && edges_queue.length > 0) {
        const edge = edges_queue[0];
        erase(edges_queue, 0, comp);

        if (used.has(edge.u)) continue;

        used.add(edge.u);
        tree.push(edge);

        for (const [neighbor, weight] of edge.u.successors.entries()) {
            if (!used.has(neighbor)) {
                const edge_data = { weight, v: edge.u, u: neighbor };
                insert(edges_queue, edge_data, comp);
            }
        }
    }

    return tree;
}

export function preorder_traversal<T>(start: Node<T>): Node<T>[] {
    const result: Node<T>[] = [];
    const stack: Node<T>[] = [start];

    while (stack.length > 0) {
        const node = stack.pop()!;
        result.push(node);

        for (const succ of node.successors.keys()) {
            if (succ !== node) {
                stack.push(succ);
            }
        }
    }

    return result;
}

export function tsp<T>(entry: Node<T>, nodes: Node<T>[]): Node<T>[] {
    const nodes_merged: Node<T>[] = [entry, ...nodes];
    metric_closure<T>(nodes_merged);

    const mst_edges = minimum_spanning_tree(entry, nodes_merged.length);
    graph_from_edges(mst_edges);
    const traversal = preorder_traversal(entry);

    return traversal;
}