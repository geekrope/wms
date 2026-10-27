export declare function stat_test(X: number[][], y: number[][]): {
    beta: number[][];
    t_stats: number[];
    p_left: number[];
    p_right: number[];
    p_double: number[];
    rss: number;
    residuals: number[][];
    sigma: number;
};
export declare function mean_test(x: number[]): {
    mean: number;
    t_stat: number;
    p_left: number;
    p_right: number;
    residuals: number[];
    sigma: number;
};
export declare function qq(residuals: number[], sigma: number): {
    x: number[];
    y: number[];
};
//# sourceMappingURL=linear_regression.d.ts.map