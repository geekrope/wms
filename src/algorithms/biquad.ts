export type BiquadCoeffs = { a2: number, a1: number, b2: number, b1: number, b0: number };

export function apply_biquad(x: number[], coeffs: BiquadCoeffs) {
    const { a2, a1, b2, b1, b0 } = coeffs;
    const y: number[] = [];

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

export function filtfilt(x: number[], coeffs: BiquadCoeffs) {
    let result = apply_biquad(x, coeffs);
    result = apply_biquad(result.reverse(), coeffs);
    return result.reverse();
}

// H(z) = alpha / (1 - (1 - alpha) z^{-1})
// the closer alpha is to zero the more smoothing is applied
export function EMA(alpha: number): BiquadCoeffs {
    return { a2: 0, a1: alpha - 1, b2: 0, b1: 0, b0: alpha };
}