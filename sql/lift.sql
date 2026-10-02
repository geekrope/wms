WITH consumed AS (SELECT category_id AS cat_id, date(remove_date / 1000, 'unixepoch') AS date
FROM items
WHERE remove_date IS NOT NULL),

consumed_prob AS (SELECT cat_id, 1.0 * COUNT(DISTINCT date) / (SELECT COUNT(DISTINCT date) FROM consumed) AS prob
FROM consumed 
GROUP BY cat_id),

pairs AS (SELECT DISTINCT MIN(c1.cat_id, c2.cat_id) AS cat1, MAX(c1.cat_id, c2.cat_id) AS cat2, c1.date
FROM consumed AS c1
JOIN consumed AS c2 ON (c1.date = c2.date AND c1.cat_id <> c2.cat_id)),

pairs_prob AS (SELECT cat1, cat2, 1.0 * COUNT(DISTINCT date) / (SELECT COUNT(DISTINCT date) FROM consumed) AS prob
FROM pairs
GROUP BY cat1, cat2)

SELECT pp.cat1, pp.cat2, pp.prob / (cp1.prob * cp2.prob) AS lift
FROM pairs_prob AS pp
JOIN consumed_prob AS cp1 ON cp1.cat_id = pp.cat1
JOIN consumed_prob AS cp2 ON cp2.cat_id = pp.cat2