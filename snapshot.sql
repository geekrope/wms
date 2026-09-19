SELECT C.title, SUM(I.remove_date IS NULL) AS count, SUM(I.remove_date IS NULL) * C.weight AS total_weight --non-aggregate, but title has unique constraint
FROM items AS I 
JOIN categories AS C ON C.id = I.category_id
GROUP BY C.title
ORDER BY count DESC;