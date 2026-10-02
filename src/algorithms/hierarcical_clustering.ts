import { insert, erase, heapify } from "./heap.js";

type EdgeHierarical = { v: number, u: number, gen_v: number, gen_u: number, total_weight: number, connections: number };
type Merge = { v: number, u: number, similarity: number };

// change to sizes
export function cluster(edges: { to: number, weight: number }[][]): Merge[] {
    const n = edges.length;
    const generation = new Array(n).fill(0);
    const queue: EdgeHierarical[] = [];
    const weights: number[][] = [];
    const connections: number[][] = [];
    const merges: Merge[] = [];
    const comparator = (a: EdgeHierarical, b: EdgeHierarical) => {
        return a.total_weight / a.connections > b.total_weight / b.connections;
    };

    for (let v = 0; v < edges.length; v++) {
        weights[v] = new Array(n).fill(0);
        connections[v] = new Array(n).fill(0);
        for (let { to, weight } of edges[v]) {
            if (v < to) {
                queue.push({ v: v, u: to, gen_v: 0, gen_u: 0, total_weight: weight, connections: 1 });
            }
            weights[v][to] = weight;
            connections[v][to] = 1;
        }
    }
    heapify(queue, comparator);

    while (true) {
        let largest_edge: EdgeHierarical | undefined = undefined;
        while (queue.length > 0) {
            const top = queue[0];
            erase(queue, 0, comparator);
            if (top.gen_v == generation[top.v] && top.gen_u == generation[top.u]) {
                largest_edge = top;
                break;
            }
        }

        if (!largest_edge) {
            break;
        }

        const cluster_1 = Math.min(largest_edge.v, largest_edge.u);
        const cluster_2 = Math.max(largest_edge.v, largest_edge.u);

        // the similarity is non-increasing since at each step we take the edges greedily so the newly
        // added edge cannot be greater than the previous ones
        merges.push({ v: cluster_1, u: cluster_2, similarity: largest_edge.total_weight / largest_edge.connections })

        // when we merge two clusters all the edges belonging to the second one are
        // given to the first one. hence the total number of connection and the total weight
        // grows by connections[cluster_2][i] and weights[cluster_2][i] respectively
        for (let i = 0; i < n; i++) {
            weights[cluster_1][i] += weights[cluster_2][i];
            weights[cluster_2][i] = 0;

            connections[cluster_1][i] += connections[cluster_2][i];
            connections[cluster_2][i] = 0;
        }

        // maintain the symmetry
        for (let i = 0; i < n; i++) {
            weights[i][cluster_1] = weights[cluster_1][i];
            weights[i][cluster_2] = 0;

            connections[i][cluster_1] = connections[cluster_1][i];
            connections[i][cluster_2] = 0;
        }

        generation[cluster_1]++;
        generation[cluster_2] = -1;

        for (let u = 0; u < n; u++) {
            if (u != cluster_1 && generation[u] != -1 && connections[cluster_1][u] > 0) {
                insert(queue, {
                    v: Math.min(cluster_1, u),
                    u: Math.max(cluster_1, u),
                    gen_v: generation[cluster_1],
                    gen_u: generation[u],
                    total_weight: weights[cluster_1][u],
                    connections: connections[cluster_1][u],
                }, comparator);
            }
        }
    }

    return merges;
}