export declare function stat_test(X: number[][], y: number[][]): {
    beta: any;
    t_stats: any;
    p_left: any;
    p_right: any;
    p_double: any;
    rss: any;
    residuals: any;
    sigma: any;
};
export declare function mean_test(x: number[]): {
    mean: any;
    t_stat: number;
    p_left: any;
    p_right: number;
    residuals: number[];
    sigma: any;
};
export declare function qq(residuals: number[], sigma: number): {
    x: number[];
    y: number[];
};
//# sourceMappingURL=linear_regression.d.ts.map