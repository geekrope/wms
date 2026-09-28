export function apply_biquad(x, coeffs) {
    const { a2, a1, b2, b1, b0 } = coeffs;
    const y = [];
    let y1 = 0;
    let y2 = 0;
    let x1 = 0;
    let x2 = 0;
    for (let i = 0; i < x.length; i++) {
        const x0 = x[i];
        const y0 = -a2 * y2 - a1 * y1 + b2 * x2 + b1 * x1 + b0 * x0;
        y2 = y1;
        y1 = y0;
        x2 = x1;
        x1 = x0;
        y.push(y0);
    }
    return y;
}
// even padding is symmetric around the vertical line, 
// odd padding is symmetric around the edge point.
export function filtfilt(x, coeffs, padding = 0, padding_type = "odd") {
    padding = Math.min(padding, x.length >> 1);
    let left_slice;
    let right_slice;
    switch (padding_type) {
        case "odd":
            left_slice = x.slice(1, padding + 1).
                reverse().
                map((val) => 2 * x[0] - val);
            right_slice = x.slice(x.length - padding - 1, x.length - 1).
                reverse().
                map((val) => 2 * x[x.length - 1] - val);
            break;
        case "even":
            left_slice = x.slice(0, padding).reverse();
            right_slice = x.slice(x.length - padding, x.length).reverse();
    }
    let signal = [...left_slice, ...x, ...right_slice];
    let result = apply_biquad(signal, coeffs);
    result = apply_biquad(result.reverse(), coeffs).reverse();
    return result.slice(padding, result.length - padding);
}
// H(z) = alpha / (1 - (1 - alpha) z^{-1})
// the closer alpha is to zero the more smoothing is applied
export function EMA(alpha) {
    return { a2: 0, a1: alpha - 1, b2: 0, b1: 0, b0: alpha };
}
//# sourceMappingURL=biquad.js.map