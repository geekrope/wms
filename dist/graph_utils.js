export class Node {
    successors = new Set();
    predecessors = new Set();
    add_successor(node) {
        this.successors.add(node);
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
function topological_sort_aux(entry, result) {
    for (const child of entry.successors) {
        topological_sort_aux(child, result);
    }
    result.push(entry);
}
function topological_sort(entry) {
    const result = [];
    topological_sort_aux(entry, result);
    return result.reverse();
}
function transitive_closure(entry) {
    const closure = new Map();
    const order = topological_sort(entry);
    for (const node of order) {
        closure.set(node, new Set());
        closure.get(node).add(node);
        for (const pred of node.predecessors) {
            for (const acc_node of closure.get(pred)) {
                closure.get(node).add(acc_node);
            }
        }
    }
    return closure;
}
export function compute_costs(entry, weights) {
    const closure = transitive_closure(entry);
    const costs = new Map();
    for (const [node, conn_list] of closure) {
        let cost = 0;
        for (const conn of conn_list) {
            if (conn === node)
                continue; // only what's pressing on the node counts, not the node itself
            if (conn instanceof ValueNode) {
                cost += weights.get(conn.value) ?? 0;
            }
        }
        costs.set(node, cost);
    }
    return costs;
}
export function detect_cycle(labels, start) {
    labels.set(start, 1);
    for (const neighbor of start.successors) {
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
export function build_graph(boxes, adjacency_list) {
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
        from.add_successor(to);
        orphans.delete(u);
    }
    for (const box of orphans) {
        entry.add_successor(nodes.get(box));
    }
    return { entry, nodes };
}
//# sourceMappingURL=graph_utils.js.map