export type BiquadCoeffs = {
    a2: number;
    a1: number;
    b2: number;
    b1: number;
    b0: number;
};
export declare function apply_biquad(x: number[], coeffs: BiquadCoeffs): number[];
export declare function filtfilt(x: number[], coeffs: BiquadCoeffs): number[];
export declare function EMA(alpha: number): BiquadCoeffs;
//# sourceMappingURL=biquad.d.ts.map