function min_index(collection, ...indices) {
    if (indices.length == 0)
        return -1;
    let min = -1;
    for (let i = 0; i < indices.length; i++) {
        if (indices[i] == -1)
            continue;
        if (min == -1 || collection[indices[i]] < collection[min]) {
            min = indices[i];
        }
    }
    return min;
}
function max_index(collection, ...indices) {
    if (indices.length == 0)
        return -1;
    let max = -1;
    for (let i = 0; i < indices.length; i++) {
        if (indices[i] == -1)
            continue;
        if (max == -1 || collection[indices[i]] > collection[max]) {
            max = indices[i];
        }
    }
    return max;
}
function find_bases(arr) {
    const stack = [];
    const result = Array(arr.length).fill(-1);
    for (let i = 0; i < arr.length; i++) {
        let min_at = -1;
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (arr[top.index] > arr[i])
                break;
            min_at = min_index(arr, min_at, top.min_at, top.index);
            stack.pop();
        }
        stack.push({ index: i, min_at: min_at });
        result[i] = min_at;
    }
    return result;
}
export function find_peaks(arr) {
    const left_bases = find_bases(arr);
    const right_bases = find_bases([...arr].reverse()).reverse().map((el) => { return el == -1 ? -1 : arr.length - 1 - el; });
    const peaks = [];
    for (let i = 0; i < arr.length; i++) {
        if ((i == 0 || arr[i] > arr[i - 1]) && (i == arr.length - 1 || arr[i] > arr[i + 1])) {
            const left_base = left_bases[i];
            const right_base = right_bases[i];
            const highest_base = max_index(arr, left_base, right_base);
            const prominence = highest_base == -1 ? NaN : arr[i] - arr[highest_base];
            peaks.push({ peak: arr[i], left_base, right_base, prominence });
        }
    }
    return peaks;
}
//# sourceMappingURL=peaks.js.map