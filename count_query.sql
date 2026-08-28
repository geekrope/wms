WITH diff AS (SELECT add_date as date, 1 as delta FROM items
WHERE category_id = 28
UNION ALL
SELECT remove_date, -1 FROM items
WHERE category_id = 28 AND remove_date IS NOT NULL)

SELECT DISTINCT date, SUM(delta) OVER (ORDER BY date ASC, delta DESC RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as count
FROM diff
ORDER BY date