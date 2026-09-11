export abstract class Node<T> {
    readonly successors: Set<Node<T>> = new Set();
    readonly predecessors: Set<Node<T>> = new Set();

    add_successor(node: Node<T>): void {
        this.successors.add(node);
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

function topological_sort_aux<T>(entry: Node<T>, result: Node<T>[]) {
    for (const child of entry.successors) {
        topological_sort_aux(child, result)
    }
    result.push(entry);
}

function topological_sort<T>(entry: Node<T>) {
    const result: Node<T>[] = [];
    topological_sort_aux(entry, result);
    return result.reverse();
}

function transitive_closure<T>(entry: Node<T>)
{
    const closure: Map<Node<T>, Set<Node<T>>> = new Map();
    const order = topological_sort(entry);

    for(const node of order)
    {
        closure.set(node, new Set<Node<T>>())
        closure.get(node)!.add(node);
        for(const pred of node.predecessors)
        {
            for(const acc_node of closure.get(pred)!)
            {
                closure.get(node)!.add(acc_node);
            }            
        }
    }

    return closure;
}

export function compute_costs<T>(entry: Node<T>, weights: Map<T, number>): Map<Node<T>, number>
{
    const closure = transitive_closure(entry);
    const costs: Map<Node<T>, number> = new Map();
    for(const [node, conn_list] of closure)
    {
        let cost = 0;
        for(const conn of conn_list)
        {
            if(conn === node) continue; // only what's pressing on the node counts, not the node itself
            if(conn instanceof ValueNode)
            {
                cost += weights.get(conn.value) ?? 0;
            }
        }
        costs.set(node, cost);
    }
    return costs;
}

export function detect_cycle<T>(labels: Map<Node<T>, number>, start: Node<T>): boolean {
    labels.set(start, 1);

    for (const neighbor of start.successors) {
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

export function build_graph<T>(boxes: T[], adjacency_list: AdjacencyList<T>): { entry: EntryNode<T>, nodes: Map<T, ValueNode<T>> } {
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

        from.add_successor(to);
        orphans.delete(u);
    }

    for (const box of orphans) {
        entry.add_successor(nodes.get(box)!);
    }

    return { entry, nodes };
}