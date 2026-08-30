import type { IDatabaseDriver } from "./db_driver.js";
import type { DatabaseManager } from "./main.js";

export type TimelinePoint = { date: number, count: number };
export type TimelineEvent = { date: number, delta: number };
export type ActivityEvent = { date: number, delta: number };
export type ActivityCount = { date: Date, count: number };

export class Analytics {
    constructor(private db_driver: IDatabaseDriver, private manager: DatabaseManager) { }

    private async resolve_category_id(category: string): Promise<number> {
        const id = (await this.manager.get_ids("categories", category)).get(category);
        if (id === undefined) throw new Error(`Category "${category}" not found`);
        return id;
    }

    public async get_category_events(category: string): Promise<TimelineEvent[]> {
        const category_id = await this.resolve_category_id(category);

        return await this.db_driver.query<TimelineEvent>(`
            WITH raw AS (SELECT add_date AS date, 1 AS delta FROM items
            WHERE category_id = :category_id
            UNION ALL
            SELECT remove_date AS date, -1 AS delta FROM items
            WHERE category_id = :category_id AND remove_date IS NOT NULL)
            SELECT MAX(date) as date, SUM(delta) AS delta
            FROM raw as R
            GROUP BY date(R.date / 1000, 'unixepoch')
            ORDER BY date;`,
            (obj: any) => ({ date: obj.date as number, delta: obj.delta as number }),
            { ":category_id": category_id });
    }

    public async get_activity(begin: number, end: number): Promise<ActivityCount[]> {
        return await this.db_driver.query<ActivityCount>(`
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
            ORDER BY T.date;`,
            (obj: any) => ({ date: new Date(`${obj.date}T00:00:00Z`), count: obj.count as number }),
            { ":begin": begin, ":end": end });
    }

    // TODO: implement same groupping as above
    public async get_category_timeline(category: string): Promise<TimelinePoint[]> {
        const category_id = await this.resolve_category_id(category);

        return await this.db_driver.query<TimelinePoint>(`
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
        ORDER BY date;`,
            (obj: any) => ({ date: obj.date as number, count: obj.count as number }),
            { ":category_id": category_id });
    }
}