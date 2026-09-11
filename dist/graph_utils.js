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
function topological_sort_aux(entry, result, visited) {
    if (visited.has(entry))
        return;
    visited.add(entry);
    for (const child of entry.successors) {
        topological_sort_aux(child, result, visited);
    }
    result.push([result.length, entry]);
}
function topological_sort(entry) {
    const result = [];
    topological_sort_aux(entry, result, new Set());
    return result.reverse();
}
function union(a, b) {
    let ptr1 = 0;
    let ptr2 = 0;
    let result = [];
    while (ptr1 < a.length || ptr2 < b.length) {
        if (ptr1 >= a.length) {
            result.push(b[ptr2]);
            ptr2++;
        }
        else if (ptr2 >= b.length) {
            result.push(a[ptr1]);
            ptr1++;
        }
        else {
            if (a[ptr1][0] < b[ptr2][0]) {
                result.push(a[ptr1]);
                ptr1++;
            }
            else if (a[ptr1][0] > b[ptr2][0]) {
                result.push(b[ptr2]);
                ptr2++;
            }
            else {
                result.push(a[ptr1]);
                ptr1++;
                ptr2++;
            }
        }
    }
    return result;
}
function transitive_closure(entry) {
    const closure = new Map();
    const order = topological_sort(entry);
    for (const [idx, node] of order) {
        closure.set(node, [[idx, node]]);
        for (const pred of node.predecessors) {
            closure.set(node, union(closure.get(node), closure.get(pred)));
        }
    }
    return closure;
}
export function compute_costs(entry, weights) {
    const closure = transitive_closure(entry);
    const costs = new Map();
    for (const [node, conn_list] of closure) {
        let cost = 0;
        for (const [_, conn] of conn_list) {
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