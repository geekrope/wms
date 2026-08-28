export function stat_test(X, y) {
    const n = X.length;
    const d = X[0].length;
    const beta = math.multiply(math.pinv(X), y);
    const y_hat = math.multiply(X, beta);
    const residuals = math.subtract(y, y_hat);
    const rss = math.multiply(math.transpose(residuals), residuals)[0][0];
    const sigma_sqr = rss / (n - d);
    const std_err = math.multiply(sigma_sqr, math.inv(math.multiply(math.transpose(X), X)));
    const t_stats = beta.map((coef, index) => coef[0] / math.sqrt(std_err[index][index]));
    const stats = new Statistics([], [], {});
    const p_left = t_stats.map((t) => stats.studentsTCumulativeValue(t, n - d));
    const p_right = t_stats.map((t) => 1 - stats.studentsTCumulativeValue(t, n - d));
    const p_double = t_stats.map((t) => 2 - 2 * stats.studentsTCumulativeValue(math.abs(t), n - d));
    return {
        beta: beta,
        t_stats: t_stats,
        p_left: p_left,
        p_right: p_right,
        p_double: p_double,
        rss: rss,
        residuals: residuals,
        sigma: math.sqrt(sigma_sqr)
    };
}
export function mean_test(x) {
    const n = x.length;
    const mean = math.mean(x);
    const centered = x.map((value) => value - mean);
    const sigma_sqr = math.multiply(math.transpose(centered), centered) / (n - 1);
    const std_err = math.sqrt(sigma_sqr / n); // design matrix column 1 vector, thus X^TX = n, (X^TX)^-1 = 1/n
    const t_stat = mean / std_err;
    const stats = new Statistics([], [], {});
    const p_left = stats.studentsTCumulativeValue(t_stat, n - 1);
    const p_right = 1 - p_left;
    return {
        mean: mean,
        t_stat: t_stat,
        p_left: p_left,
        p_right: p_right,
        residuals: centered,
        sigma: math.sqrt(sigma_sqr)
    };
}
function find_quantile_index(quantiles, value) {
    let lo = 0;
    let hi = quantiles.length;
    while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (quantiles[mid][1] <= value)
            lo = mid;
        else
            hi = mid;
    }
    return lo;
}
// think if we want to calculate the true variance of the residuals.
export function qq(residuals, sigma) {
    const sorted_residuals = [...residuals].sort((a, b) => a - b);
    const scaled_residuals = sorted_residuals.map(r => r / sigma);
    const stats = new Statistics([], [], {});
    const distribution = stats.normalCumulativeDistribution();
    const distribution_flat = Object.entries(distribution).map(([key, value]) => [Number(key), Number(value)]).sort((a, b) => a[0] - b[0]);
    const quantiles = scaled_residuals.map((_residual, index) => {
        const p = (index + 0.5) / scaled_residuals.length; // midpoint positions: i / n would put the first point at -infinity
        if (p < 0.5) {
            const quantile_index = find_quantile_index(distribution_flat, 1 - p);
            return -distribution_flat[quantile_index][0];
        }
        else {
            const quantile_index = find_quantile_index(distribution_flat, p);
            return distribution_flat[quantile_index][0];
        }
    });
    return { x: scaled_residuals, y: quantiles };
}
//# sourceMappingURL=linear_regression.js.map