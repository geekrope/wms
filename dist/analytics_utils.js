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
    async get_category_events(category) {
        const category_id = await this.resolve_category_id(category);
        return await this.db_driver.query(`
            WITH raw AS (SELECT add_date AS date, 1 AS delta FROM items
            WHERE category_id = :category_id
            UNION ALL
            SELECT remove_date AS date, -1 AS delta FROM items
            WHERE category_id = :category_id AND remove_date IS NOT NULL)
            SELECT MAX(date) as date, SUM(delta) AS delta
            FROM raw as R
            GROUP BY date(R.date / 1000, 'unixepoch')
            ORDER BY date;`, (obj) => ({ date: obj.date, delta: obj.delta }), { ":category_id": category_id });
    }
    async get_activity(year) {
        const begin = Date.UTC(year, 0, 1);
        const end = Date.UTC(year + 1, 0, 1);
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
    // TODO: implement same groupping as above
    async get_category_timeline(category) {
        const category_id = await this.resolve_category_id(category);
        return await this.db_driver.query(`
        WITH diff AS (
            SELECT add_date AS date, 1 AS delta FROM items
            WHERE category_id = :category_id
            UNION ALL
            SELECT remove_date, -1 FROM items
            WHERE category_id = :category_id AND remove_date IS NOT NULL
        )
        SELECT DISTINCT date, SUM(delta) OVER (
            ORDER BY date ASC, delta DESC
            RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS count
        FROM diff
        ORDER BY date;`, (obj) => ({ date: obj.date, count: obj.count }), { ":category_id": category_id });
    }
}
//# sourceMappingURL=analytics_utils.js.map