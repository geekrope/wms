// Hand-written: statistics.js (src/modules/statistics.min.js) ships no declarations.
// Covers only the members used in src/analytics/linear_regression.ts.
// Loaded by a <script> tag, exposes the global `Statistics`.

declare class Statistics {
    constructor(data: object[], columns: object, options?: object);

    /**
     * Student's t CDF at t with df degrees of freedom.
     * On invalid input (df missing or <= 0) it logs to console.error and returns undefined,
     * it does not throw.
     */
    studentsTCumulativeValue(t: number, df: number): number;

    /** Standard normal CDF table for z in [0, 4.09], step 0.01, keyed by z.toFixed(2). */
    normalCumulativeDistribution(): Record<string, number>;
}
