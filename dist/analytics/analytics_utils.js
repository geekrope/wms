export class Analytics {
    db_driver;
    manager;
    constructor(db_driver, manager) {
        this.db_driver = db_driver;
        this.manager = manager;
    }
    async resolve_category_id(category) {
        const id = (await this.manager.get_ids("categories", category)).get(category);
        if (id === undefined)
            throw new Error(`Category "${category}" not found`);
        return id;
    }
    async get_streak() {
        return await this.db_driver.query(`
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
            WHERE date IS NOT prev_exp;`, (obj) => Number(obj.streak));
    }
    async get_max_past_streak() {
        return await this.db_driver.query(`WITH activity AS (
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
            FROM intervals;`, (obj) => {
            return { value: Number(obj.streak), start: new Date(obj.start) };
        });
    }
    async get_category_events(category) {
        const category_id = await this.resolve_category_id(category);
        const zipped = await this.db_driver.query(`
            WITH raw AS (
                SELECT add_date AS date, 1 AS delta FROM items
                WHERE category_id = :category_id
                UNION ALL
                SELECT remove_date AS date, -1 AS delta FROM items
                WHERE category_id = :category_id AND remove_date IS NOT NULL
            )
            SELECT MAX(date) as date, SUM(delta) AS delta
            FROM raw as R
            GROUP BY date(R.date / 1000, 'unixepoch')
            ORDER BY date;`, (obj) => ({ date: obj.date, delta: obj.delta }), { ":category_id": category_id });
        return { dates: zipped.map((val) => val.date), deltas: zipped.map((val) => val.delta) };
    }
    async get_activity(begin, end) {
        return await this.db_driver.query(`
            WITH RECURSIVE timeline AS (
                SELECT date(:begin / 1000, 'unixepoch') AS date
                UNION ALL
                SELECT date(date, '+1 day')
                FROM timeline
                WHERE date < date(:end / 1000, 'unixepoch')
            )
            SELECT T.date AS date, COUNT(*) AS count
            FROM timeline AS T
            JOIN items AS I ON date(I.remove_date / 1000, 'unixepoch') = T.date
            GROUP BY T.date
            ORDER BY T.date;`, (obj) => ({ date: new Date(`${obj.date}T00:00:00Z`), count: obj.count }), { ":begin": begin, ":end": end });
    }
    async get_counts(begin, end) {
        let params;
        let where_clause;
        if (begin !== undefined && end !== undefined) {
            params = [begin, end];
            where_clause = `I.expiration_date >= ? AND I.expiration_date < ?`;
        }
        else if (begin !== undefined) {
            params = [begin];
            where_clause = `I.expiration_date >= ?`;
        }
        else if (end !== undefined) {
            params = [end];
            where_clause = `I.expiration_date < ?`;
        }
        else {
            params = [];
            where_clause = `1`;
        }
        return await this.db_driver.query(`SELECT C.title, SUM(I.remove_date IS NULL) AS count
                FROM items AS I 
                JOIN categories AS C ON C.id = I.category_id
                WHERE ${where_clause}
                GROUP BY C.title
                HAVING count > 0
                ORDER BY count DESC;`, (obj) => { return { category: obj.title, count: obj.count }; }, params);
    }
    // compute P(A cap B) / (P(A) * P(B)). if the events are
    // completely random P(A cap B) = P(A) * P(B) hence lift is close to 1
    // the event A subset {1, ..., N} is the days when category A had an event (add or remove, depending on type)
    // N is the number of days with activity. the proability measure is uniform
    async get_lift(threshold = 5, type = "add") {
        const date_source = type == "add" ? "add_date" : "remove_date";
        const filter = type == "add" ? "1" : "remove_date IS NOT NULL";
        return await this.db_driver.query(`WITH events AS (SELECT category_id AS cat_id, date(${date_source} / 1000, 'unixepoch') AS date
                FROM items
                WHERE ${filter}
            ),
            event_prob AS (SELECT cat_id, 1.0 * COUNT(DISTINCT date) / (SELECT COUNT(DISTINCT date) FROM events) AS prob
                FROM events 
                GROUP BY cat_id
            ),
            pairs AS (SELECT DISTINCT MIN(c1.cat_id, c2.cat_id) AS cat1, MAX(c1.cat_id, c2.cat_id) AS cat2, c1.date
                FROM events AS c1
                JOIN events AS c2 ON (c1.date = c2.date AND c1.cat_id <> c2.cat_id)
            ),
            pairs_prob AS (SELECT cat1, cat2, 1.0 * COUNT(DISTINCT date) / (SELECT COUNT(DISTINCT date) FROM events) AS prob
                FROM pairs
                GROUP BY cat1, cat2
                HAVING COUNT(DISTINCT date) > ?
            ),
            lift AS (SELECT pp.cat1, pp.cat2, pp.prob / (ep1.prob * ep2.prob) AS lift
                FROM pairs_prob AS pp
                JOIN event_prob AS ep1 ON ep1.cat_id = pp.cat1
                JOIN event_prob AS ep2 ON ep2.cat_id = pp.cat2
            )
            SELECT l.lift, c1.title as title1, c2.title as title2
            FROM lift AS l
            JOIN categories AS c1 ON l.cat1 = c1.id
            JOIN categories AS c2 ON l.cat2 = c2.id`, (obj) => { return { title1: obj.title1, title2: obj.title2, lift: obj.lift }; }, [threshold]);
    }
}
//# sourceMappingURL=analytics_utils.js.map