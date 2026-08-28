import type { IDatabaseDriver, SqlParams } from "./db_driver.js";
import { Item } from "./types.js";
import { type Category, type Box } from "./types.js";
import { type AdjacencyList } from "./graph_utils.js";

//TODO: think if we want to throw an error if user is trying to abuse by adding a category that already exists to change its properties.

export class DatabaseManager {
    constructor(private db_driver: IDatabaseDriver) { }

    public async init_tables(): Promise<void> {
        await this.db_driver.run(
            `CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE CHECK(length(trim(title)) > 0),
            weight REAL DEFAULT NULL,
            deleted BOOLEAN NOT NULL DEFAULT 0);`
        );
        await this.db_driver.run(
            `CREATE TABLE IF NOT EXISTS boxes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE CHECK(length(trim(title)) > 0),
            max_load INTEGER DEFAULT NULL,
            deleted BOOLEAN NOT NULL DEFAULT 0);`
        );
        await this.db_driver.run(
            `CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            box_id INTEGER NOT NULL,
            expiration_date INTEGER NOT NULL,
            status INTEGER NOT NULL,
            add_date INTEGER NOT NULL,
            remove_date INTEGER DEFAULT NULL,
            FOREIGN KEY (box_id) REFERENCES boxes(id),
            FOREIGN KEY (category_id) REFERENCES categories(id));`
        );
        await this.db_driver.run(
            `CREATE TABLE IF NOT EXISTS box_adjacency (
            v INTEGER NOT NULL,
            u INTEGER NOT NULL,
            FOREIGN KEY (v) REFERENCES boxes(id),
            FOREIGN KEY (u) REFERENCES boxes(id),
            PRIMARY KEY (v, u));`
        );
    }

    private async id_lookup(map: Map<string, number>, title: string): Promise<number> {
        const id = map.get(title);
        if (id === undefined) {
            throw new Error(`The object with title "${title}" does not exist.`);
        }
        return id;
    }

    public async get_ids(table_name: string, ...titles: string[]): Promise<Map<string, number>> {
        titles = Array.from(new Set(titles));

        if (titles.length === 0) return new Map<string, number>();

        const where_clause = titles.map(() => "?").join(", ");
        const category_ids = await this.db_driver.query<{ key: string, value: number }>(
            `SELECT title, id 
            FROM ${table_name} 
            WHERE title IN (${where_clause}) AND deleted = 0;`,
            (obj: any) => { return { key: obj.title, value: obj.id }; },
            titles
        );

        return new Map(category_ids.map(({ key, value }) => [key, value]));
    }

    private async add_objects(table_name: string, objects: { title: string }[]): Promise<void> {
        const properties = Object.keys(objects[0]);
        const id_loc = properties.indexOf("id");
        if (id_loc !== -1) properties.splice(id_loc, 1);
        const values_clause = objects.map(() => `(${properties.map(() => "?").join(", ")})`).join(", ");
        const values = objects.flatMap(obj => properties.map(prop => (obj as any)[prop]));
        const set_clause = properties.map(prop => `${prop} = excluded.${prop}`).join(", ");

        await this.db_driver.run(
            `INSERT INTO ${table_name} 
            (${properties.join(", ")}) 
            VALUES ${values_clause}
            ON CONFLICT (title) DO UPDATE
            SET deleted = 0,
                ${set_clause};`,
            values
        );
    }

    private async remove_object(table_name: string, title: string, dependent_identifier: string): Promise<void> {
        const no_linking_items = await this.db_driver.query<number>(
            `SELECT COUNT(*) AS count 
            FROM items AS I
            WHERE I.${dependent_identifier} = (SELECT id FROM ${table_name} WHERE title = :title)
            AND I.remove_date IS NULL;`,
            (obj: any) => obj.count as number,
            { ":title": title }
        );

        if (no_linking_items[0] == 0) {
            await this.db_driver.run(
                `UPDATE ${table_name}
                SET deleted = 1
                WHERE title = :title;`,
                { ":title": title }
            );
        }
        else {
            throw new Error(`Cannot delete object "${title}" because it is linked to existing items.`);
        }
    }

    public async add_categories(...categories: Category[]): Promise<void> {
        await this.add_objects("categories", categories);
    }

    public async remove_category(title: string): Promise<void> {
        await this.remove_object("categories", title, "category_id");
    }

    public async get_categories(): Promise<Category[]> {
        return await this.db_driver.query<Category>(
            `SELECT id, title, weight 
            FROM categories 
            WHERE deleted = 0
            ORDER BY title ASC;`,
            (obj: any) => { return { id: obj.id as number, title: obj.title as string, weight: obj.weight as number | null } }
        );
    }

    public async add_items(...item: Item[]): Promise<void> {
        if (item.length === 0) return;

        const category_map = await this.get_ids("categories", ...item.map(i => i.category));
        for (const i of item) {
            if (!category_map.has(i.category)) {
                throw new Error(`Category "${i.category}" does not exist.`);
            }
        }

        const box_map = await this.get_ids("boxes", ...item.map(i => i.box));
        for (const i of item) {
            if (!box_map.has(i.box)) {
                throw new Error(`Box "${i.box}" does not exist.`);
            }
        }

        const flattened_values = item.flatMap(i => [category_map.get(i.category), box_map.get(i.box), i.expiration_date, i.status, Date.now()]);
        const clause = item.map(() => "(?, ?, ?, ?, ?)").join(", ");
        await this.db_driver.run(
            `INSERT INTO items 
            (category_id, box_id, expiration_date, status, add_date) 
            VALUES ${clause};`,
            flattened_values
        );
    }

    public async remove_item(id: number): Promise<void> {
        await this.db_driver.run(
            `UPDATE items
            SET remove_date = :date
            WHERE id = :id;`,
            { ":date": Date.now(), ":id": id }
        );
    }

    public async update_item(id: number, args: Partial<Item>): Promise<void> {
        const { category, box, id: _id, ...rest } = args;
        const update_obj: Record<string, any> = { ...rest };

        if (category !== undefined) {
            const category_map = await this.get_ids("categories", category);
            update_obj["category_id"] = await this.id_lookup(category_map, category);
        }

        if (box !== undefined) {
            const box_map = await this.get_ids("boxes", box);
            update_obj["box_id"] = await this.id_lookup(box_map, box);
        }

        const entries = Object.entries(update_obj).filter(
            ([_, val]) => val !== undefined
        );

        if (entries.length === 0) return;

        const keys = entries.map(([key, _]) => key);
        const values = entries.map(([_, value]) => value);
        const set_clause = keys.map(key => `${key} = ?`).join(", ");

        await this.db_driver.run(
            `UPDATE items
            SET ${set_clause}
            WHERE id = ?;`,
            values.concat([id])
        );
    }

    public async get_items(category: string): Promise<Item[]> {
        return await this.db_driver.query<Item>(
            `SELECT I.*, B.title as box, C.title AS category
            FROM items AS I
            LEFT JOIN categories AS C ON I.category_id = C.id 
            LEFT JOIN boxes AS B ON I.box_id = B.id
            WHERE C.title = :category
            AND remove_date IS NULL;`,
            Item.from,
            { ":category": category });
    }

    public async get_boxes(): Promise<Box[]> {
        return await this.db_driver.query<Box>(
            `SELECT id, title, max_load
            FROM boxes
            WHERE deleted = 0
            ORDER BY title ASC;`,
            (obj: any) => { return { id: obj.id as number, title: obj.title as string, max_load: isNaN(Number(obj.max_load)) ? null : Number(obj.max_load) }; }
        );
    }

    public async add_boxes(...boxes: Box[]): Promise<void> {
        await this.add_objects("boxes", boxes);
    }

    public async remove_box(box: string): Promise<void> {
        await this.remove_object("boxes", box, "box_id");
        await this.db_driver.run(
            `DELETE FROM box_adjacency 
            WHERE v = (SELECT id FROM boxes WHERE title = :box) 
            OR u = (SELECT id FROM boxes WHERE title = :box);`,
            { ":box": box }
        ); // cascade delete box connections
    }

    public async get_box_weights(): Promise<{ box: string, total_weight: number }[]> {
        return await this.db_driver.query<{ box: string, total_weight: number }>(
            `SELECT B.title as box, SUM(COALESCE(C.weight, 0)) AS total_weight
            FROM boxes AS B
            LEFT JOIN items AS I ON B.id = I.box_id AND I.remove_date IS NULL
            LEFT JOIN categories AS C ON I.category_id = C.id
            GROUP BY B.id`,
            (obj: any) => { return { box: obj.box as string, total_weight: obj.total_weight as number }; }
        );
    }

    public async get_box_content(box: string): Promise<Item[]> {
        return await this.db_driver.query<Item>(
            `SELECT I.*, B.title as box, C.title AS category
            FROM items AS I
            LEFT JOIN categories AS C ON I.category_id = C.id
            LEFT JOIN boxes AS B ON I.box_id = B.id
            WHERE B.title = :box AND I.remove_date IS NULL
            ORDER BY C.title;`,
            Item.from,
            { ":box": box }
        );
    }

    public async add_box_connections(adjacency: AdjacencyList): Promise<void> {
        if (adjacency.length === 0) return;

        const values_clause = adjacency.map(() => "(?, ?)").join(", ");
        const values = adjacency.flatMap(({ v, u }) => [v, u]);

        await this.db_driver.run(
            `INSERT OR IGNORE INTO box_adjacency 
            (v, u) 
            VALUES ${values_clause};`,
            values
        );
    }

    public async remove_box_connection(v: number, u: number): Promise<void> {
        await this.db_driver.run(
            `DELETE FROM box_adjacency WHERE v = :v AND u = :u;`,
            { ":v": v, ":u": u }
        );
    }

    public async get_box_adjacency(): Promise<AdjacencyList> {
        const edges = await this.db_driver.query<{ v: number, u: number }>(
            `SELECT v, u
            FROM box_adjacency;`,
            (obj: any) => { return { v: obj.v as number, u: obj.u as number }; }
        );

        return edges;
    }

    public async execute_raw(sql: string, params: SqlParams): Promise<any[]> {
        return await this.db_driver.query_raw(sql, params);
    }

    public async run_raw(sql: string, params: SqlParams): Promise<void> {
        await this.db_driver.run(sql, params);
    }
}
