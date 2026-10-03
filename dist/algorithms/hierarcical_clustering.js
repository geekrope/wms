import { insert, erase, heapify } from "./heap.js";
// using average linkage, treat the graph as it 
// was complete initializing the missing edges with zeros
export function cluster(edges) {
    const n = edges.length;
    const generation = new Array(n).fill(0);
    const queue = [];
    const weights = [];
    const sizes = new Array(n).fill(0);
    const merges = [];
    const comparator = (a, b) => {
        return a.similarity > b.similarity;
    };
    for (let v = 0; v < n; v++) {
        weights[v] = new Array(n).fill(0);
        sizes[v] = 1;
        for (let { to, weight } of edges[v]) {
            if (v < to) {
                queue.push({ v: v, u: to, gen_v: 0, gen_u: 0, similarity: weight });
            }
            weights[v][to] = weight;
        }
    }
    heapify(queue, comparator);
    while (true) {
        let largest_edge = undefined;
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
        // the similarity is non-increasing since at each step 
        // we take the edges greedily hence the freshly
        // added edge cannot be greater than the previous ones
        merges.push({ v: cluster_1, u: cluster_2, similarity: largest_edge.similarity });
        // when we merge two clusters all the edges belonging to the second one are
        // connected to the first one. hence the the total weight
        // grows by weights[cluster_2][i]
        for (let i = 0; i < n; i++) {
            weights[cluster_1][i] += weights[cluster_2][i];
            weights[cluster_2][i] = 0;
        }
        sizes[cluster_1] += sizes[cluster_2];
        sizes[cluster_2] = 0;
        // maintain the symmetry
        for (let i = 0; i < n; i++) {
            weights[i][cluster_1] = weights[cluster_1][i];
            weights[i][cluster_2] = 0;
        }
        generation[cluster_1]++;
        generation[cluster_2] = -1;
        for (let u = 0; u < n; u++) {
            // count the edges between non-empty clusters
            if (u != cluster_1 && generation[u] != -1 && sizes[cluster_1] > 0 && sizes[u] > 0) {
                const v_min = Math.min(cluster_1, u);
                const u_max = Math.max(cluster_1, u);
                insert(queue, {
                    v: v_min,
                    u: u_max,
                    gen_v: generation[v_min],
                    gen_u: generation[u_max],
                    similarity: weights[cluster_1][u] / (sizes[cluster_1] * sizes[u])
                }, comparator);
            }
        }
    }
    return merges;
}
//# sourceMappingURL=hierarcical_clustering.js.map