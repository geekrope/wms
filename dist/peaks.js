function find_valleys(arr) {
    const stack = [];
    const result = Array(arr.length).fill(Infinity);
    for (let i = 0; i < arr.length; i++) {
        let valley = Infinity;
        while (stack.length > 0) {
            const top = stack[stack.length - 1];
            if (arr[top.index] > arr[i])
                break;
            valley = Math.min(valley, top.value, arr[top.index]);
            stack.pop();
        }
        stack.push({ index: i, value: valley });
        result[i] = valley;
    }
    return result;
}
export function find_peaks(arr) {
    const left_valleys = find_valleys(arr);
    const right_valleys = find_valleys([...arr].reverse()).reverse();
    const peaks = [];
    for (let i = 1; i < arr.length - 1; i++) {
        if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1]) {
            const left_base = left_valleys[i];
            const right_base = right_valleys[i];
            const prominence = arr[i] - Math.max(left_base, right_base);
            peaks.push({ peak: arr[i], left_base, right_base, prominence });
        }
    }
    return peaks;
}
//# sourceMappingURL=peaks.js.map