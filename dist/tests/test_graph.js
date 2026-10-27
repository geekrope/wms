import { test } from "node:test";
import assert from "node:assert/strict";
import { ValueNode, build_graph, compute_costs, detect_cycle, topological_sort, transitive_closure } from "../algorithms/graph_utils.js";
function random_graph(p, size) {
    const adjacency = new Array(size);
    const adjacency_list = [];
    const boxes = Array(size).fill(0).map((_, i) => i);
    for (let v = 0; v < size; v++) {
        adjacency[v] = new Array(size);
        for (let u = v + 1; u < size; u++) {
            if (Math.random() < p) {
                adjacency_list.push({ v, u });
                adjacency[v][u] = 1;
            }
        }
    }
    return { boxes, adjacency, adjacency_list };
}
function reachable(start) {
    const visited = new Set();
    const edges = [];
    const stack = [start];
    while (stack.length > 0) {
        const v = stack.pop();
        for (const u of v.successors) {
            edges.push([v, u]);
            if (!visited.has(u)) {
                visited.add(u);
                stack.push(u);
            }
        }
    }
    return { visited, edges };
}
function label(node) {
    return node instanceof ValueNode ? `box ${node.value}` : "entry";
}
// p = 0: every box is an orphan, small p: many disconnected pieces
for (const p of [0, 0.01, 0.3]) {
    test(`build_graph makes every box reachable from entry, p = ${p}`, () => {
        const size = 100;
        const graph = random_graph(p, size);
        const box_graph = build_graph(graph.boxes, graph.adjacency_list);
        const { visited } = reachable(box_graph.entry);
        for (const box of graph.boxes) {
            assert.ok(visited.has(box_graph.nodes.get(box)), `box ${box} is not reachable from entry`);
        }
    });
    test(`build_graph keeps exactly the given edges and links orphans to entry, p = ${p}`, () => {
        const size = 100;
        const graph = random_graph(p, size);
        const box_graph = build_graph(graph.boxes, graph.adjacency_list);
        const { edges } = reachable(box_graph.entry);
        const box_edges = edges
            .filter(([v, _]) => v instanceof ValueNode)
            .map(([v, u]) => `${label(v)} -> ${label(u)}`);
        const expected_box_edges = graph.adjacency_list.map(({ v, u }) => `box ${v} -> box ${u}`);
        assert.deepEqual(box_edges.sort(), expected_box_edges.sort());
        const entry_children = edges
            .filter(([v, _]) => v === box_graph.entry)
            .map(([_, u]) => label(u));
        const has_parent = new Set(graph.adjacency_list.map(({ u }) => u));
        const orphans = graph.boxes.filter(box => !has_parent.has(box)).map(box => `box ${box}`);
        assert.deepEqual(entry_children.sort(), orphans.sort());
    });
}
for (const sort_method of ["recursive", "kahn"]) {
    test(`topological sort order ${sort_method}`, () => {
        for (let i = 0; i < 20; i++) {
            const size = 100;
            const graph = random_graph(0.3, size);
            const box_graph = build_graph(graph.boxes, graph.adjacency_list);
            const top_sort = topological_sort(box_graph.entry, sort_method);
            const position = new Map(top_sort.map(([index, node]) => [node, index]));
            for (const v of box_graph.nodes.values()) {
                const v_position = position.get(v);
                for (const u of reachable(v).visited) {
                    const u_position = position.get(u);
                    assert.ok(v_position < u_position, `${label(v)} is reachable to ${label(u)} but sorted after it`);
                }
            }
        }
    });
}
// closure of a node = the node itself and every node it is reachable from (entry included)
for (const union_method of ["two-pointer", "bitset"]) {
    for (const sort_method of ["recursive", "kahn"]) {
        test(`transitive closure ${union_method} ${sort_method}`, () => {
            for (let i = 0; i < 20; i++) {
                const size = 100;
                const graph = random_graph(0.3, size);
                const box_graph = build_graph(graph.boxes, graph.adjacency_list);
                const all_nodes = [box_graph.entry, ...box_graph.nodes.values()];
                const reach = new Map(all_nodes.map(node => [node, reachable(node).visited]));
                const closure = transitive_closure(box_graph.entry, union_method, sort_method);
                assert.equal(closure.size, all_nodes.length);
                for (const node of all_nodes) {
                    const expected = new Set(all_nodes.filter(other => other === node || reach.get(other).has(node)));
                    const actual = closure.get(node).map(([_, conn]) => conn);
                    const actual_set = new Set(actual);
                    assert.equal(actual.length, actual_set.size, `closure of ${label(node)} has duplicates`);
                    for (const conn of actual_set) {
                        assert.ok(expected.has(conn), `${label(conn)} is in the closure of ${label(node)} but does not reach it`);
                    }
                    for (const conn of expected) {
                        assert.ok(actual_set.has(conn), `${label(conn)} reaches ${label(node)} but is missing from its closure`);
                    }
                }
            }
        });
    }
}
// v -> u: v stands on u
//
//        X(5)          D(7)     E(no weight)
//       /    \                       |
//    A(10)   B(20)                  F(3)
//       \    /
//        C(40)
function costs_fixture() {
    const boxes = ["X", "A", "B", "C", "D", "E", "F"];
    const adjacency = [
        { v: "X", u: "A" },
        { v: "X", u: "B" },
        { v: "A", u: "C" },
        { v: "B", u: "C" },
        { v: "E", u: "F" },
    ];
    const weights = new Map([["X", 5], ["A", 10], ["B", 20], ["C", 40], ["D", 7], ["F", 3]]);
    const { entry, nodes } = build_graph(boxes, adjacency);
    const costs = compute_costs(entry, weights);
    return (box) => costs.get(nodes.get(box));
}
const expected_costs = [
    ["X", 0, "a box on top costs nothing"],
    ["D", 0, "a standalone box costs nothing, its own weight is not counted"],
    ["A", 5, "only the weight above counts, not the box itself"],
    ["B", 5, "only the weight above counts, not the box itself"],
    ["C", 35, "diamond: X stands on both A and B but is counted once"],
    ["F", 0, "a box without a weight above adds 0, not NaN"],
];
for (const [box, cost, reason] of expected_costs) {
    test(`compute_costs ${box} = ${cost}: ${reason}`, () => {
        assert.equal(costs_fixture()(box), cost);
    });
}
function has_cycle_from(boxes, adjacency, start) {
    const { entry, nodes } = build_graph(boxes, adjacency);
    const labels = new Map([[entry, 0], ...Array.from(nodes.values(), node => [node, 0])]);
    return detect_cycle(labels, nodes.get(start));
}
test("detect_cycle finds no cycle in random DAGs from any box", () => {
    for (let i = 0; i < 20; i++) {
        const graph = random_graph(0.3, 50);
        for (const box of graph.boxes) {
            assert.equal(has_cycle_from(graph.boxes, graph.adjacency_list, box), false, `false cycle from box ${box}`);
        }
    }
});
test("detect_cycle finds a back edge planted on a random path", () => {
    for (let i = 0; i < 20; i++) {
        const graph = random_graph(0.3, 50);
        const { nodes } = build_graph(graph.boxes, graph.adjacency_list);
        const candidates = graph.boxes.filter(box => reachable(nodes.get(box)).visited.size > 0);
        const a = candidates[Math.floor(Math.random() * candidates.length)];
        const descendants = Array.from(reachable(nodes.get(a)).visited, node => node.value);
        descendants.push(a);
        const b = descendants[Math.floor(Math.random() * descendants.length)];
        const staged = [...graph.adjacency_list, { v: b, u: a }];
        assert.equal(has_cycle_from(graph.boxes, staged, b), true, `missed cycle through ${b} -> ${a}`);
    }
});
//# sourceMappingURL=test_graph.js.map