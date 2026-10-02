WITH activity AS (
    SELECT DISTINCT date(remove_date / 1000, 'unixepoch') AS date
    FROM items
    WHERE remove_date IS NOT NULL
),
lagged AS (
    SELECT date, LAG(date(date, '+1 day'), 1) OVER (ORDER BY date) AS prev_exp
    FROM activity
)
SELECT CASE 
    WHEN EXISTS (SELECT date FROM activity WHERE date('now') = date) 
    THEN CAST(julianday('now') - julianday(MAX(date)) AS INTEGER) + 1 
    ELSE 0 
END AS streak
FROM lagged
WHERE date IS NOT prev_exp;

WITH activity AS (
    SELECT DISTINCT date(remove_date / 1000, 'unixepoch') AS date
    FROM items
    WHERE remove_date IS NOT NULL
),
lagged AS (
    SELECT date, LAG(date(date, '+1 day'), 1) OVER (ORDER BY date) AS prev_exp
    FROM activity
),
intervals AS (
    SELECT date AS start, LEAD(prev_exp, 1) OVER (ORDER BY date) AS end
    FROM lagged
    WHERE date IS NOT prev_exp
)
SELECT start, MAX(CAST(julianday(end) - julianday(start) AS INTEGER)) AS streak
FROM intervals;