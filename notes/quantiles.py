import numpy as np
from scipy.stats import norm
import matplotlib.pyplot as plt

plt.rcParams.update({'text.usetex': True})

p = 0.3
m = 10000
k = 100000
x = np.random.binomial(k, p, size=m)
mu = k * p
sigma_sqr = k * p * (1 - p)
mean = (x - mu) / np.sqrt(sigma_sqr)
mean_sorted = np.sort(mean)
cdf = np.linspace(1 / m, 1, m)

plt.hist(mean, bins=30, density=True)
plt.plot(mean_sorted, norm.pdf(mean_sorted), 'r--', label='Theoretical PDF')
plt.show()

theoretical_cdf = norm.cdf(mean_sorted)
fig, ax = plt.subplots(1, 2, figsize=(12, 5))
ax[0].plot(mean_sorted, cdf, label='Empirical CDF')
ax[0].plot(mean_sorted, theoretical_cdf, 'r--', label='Theoretical CDF')
ax[0].set_title('Normal CDF')
ax[0].legend()

x_range = [np.min(mean_sorted), np.max(mean_sorted)]
ax[1].scatter(mean_sorted, norm.ppf(cdf), label='Empirical Quantiles')
ax[1].set_xlabel('Empirical Quantiles')
ax[1].set_ylabel('Theoretical Quantiles')
ax[1].plot(x_range, x_range, 'r--', label='Reference')
ax[1].set_title('Q-Q')
ax[1].legend()

plt.savefig('cdf_qq.pdf', bbox_inches='tight')
plt.show()

epsilon = np.linspace(0.001, 0.1, 200)
plt.ylim(0, 1.5)
plt.xlabel('$\\delta$')
plt.ylabel('Probability bound')
plt.title(f'Hoeffding\'s bound')
for m in [100, 1000, 10000]:
    plt.plot(epsilon, 2 * np.exp(-2 * m * epsilon ** 2), label=f'n = {m}')

plt.legend()
plt.savefig('hoeffding.pdf', bbox_inches='tight')
plt.show()

plt.title(f'Comparison of bounds for m = {m}')
plt.ylim(0, 1.5)
plt.plot(epsilon, 2 * np.exp(-2 * m * epsilon ** 2), color='red', label='Dvoretzky-Kiefer-Wolfowitz bound')
plt.plot(epsilon, np.sqrt(1 / (m * epsilon**2)), color='orange', label='VC bound')
plt.plot(epsilon, 4 * (1 + 1 / epsilon) *
         np.exp(-m * epsilon ** 2 / 2), color='green', label='Hoeffding\'s bound')
plt.xlabel('$\\delta$')
plt.ylabel('Probability bound')
plt.axhline(y=1, color='gray', linestyle='--', label='Trivial bound')
plt.legend()
plt.savefig('bounds_comparison.pdf', bbox_inches='tight')
plt.show()
