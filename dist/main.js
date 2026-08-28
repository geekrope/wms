import { Item } from "./types.js";
import {} from "./types.js";
import {} from "./graph_utils.js";
//TODO: think if we want to throw an error if user is trying to abuse by adding a category that already exists to change its properties.
export class DatabaseManager {
    db_driver;
    constructor(db_driver) {
        this.db_driver = db_driver;
    }
    async init_tables() {
        await this.db_driver.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE CHECK(length(trim(title)) > 0),
            weight REAL DEFAULT NULL,
            deleted BOOLEAN NOT NULL DEFAULT 0);`);
        await this.db_driver.run(`CREATE TABLE IF NOT EXISTS boxes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE CHECK(length(trim(title)) > 0),
            max_load INTEGER DEFAULT NULL,
            deleted BOOLEAN NOT NULL DEFAULT 0);`);
        await this.db_driver.run(`CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            box_id INTEGER NOT NULL,
            expiration_date INTEGER NOT NULL,
            status INTEGER NOT NULL,
            add_date INTEGER NOT NULL,
            remove_date INTEGER DEFAULT NULL,
            FOREIGN KEY (box_id) REFERENCES boxes(id),
            FOREIGN KEY (category_id) REFERENCES categories(id));`);
        await this.db_driver.run(`CREATE TABLE IF NOT EXISTS box_adjacency (
            v INTEGER NOT NULL,
            u INTEGER NOT NULL,
            FOREIGN KEY (v) REFERENCES boxes(id),
            FOREIGN KEY (u) REFERENCES boxes(id),
            PRIMARY KEY (v, u));`);
    }
    async id_lookup(map, title) {
        const id = map.get(title);
        if (id === undefined) {
            throw new Error(`The object with title "${title}" does not exist.`);
        }
        return id;
    }
    async get_ids(table_name, ...titles) {
        titles = Array.from(new Set(titles));
        if (titles.length === 0)
            return new Map();
        const where_clause = titles.map(() => "?").join(", ");
        const category_ids = await this.db_driver.query(`SELECT title, id 
            FROM ${table_name} 
            WHERE title IN (${where_clause}) AND deleted = 0;`, (obj) => { return { key: obj.title, value: obj.id }; }, titles);
        return new Map(category_ids.map(({ key, value }) => [key, value]));
    }
    async add_objects(table_name, objects) {
        const properties = Object.keys(objects[0]);
        const id_loc = properties.indexOf("id");
        if (id_loc !== -1)
            properties.splice(id_loc, 1);
        const values_clause = objects.map(() => `(${properties.map(() => "?").join(", ")})`).join(", ");
        const values = objects.flatMap(obj => properties.map(prop => obj[prop]));
        const set_clause = properties.map(prop => `${prop} = excluded.${prop}`).join(", ");
        await this.db_driver.run(`INSERT INTO ${table_name} 
            (${properties.join(", ")}) 
            VALUES ${values_clause}
            ON CONFLICT (title) DO UPDATE
            SET deleted = 0,
                ${set_clause};`, values);
    }
    async remove_object(table_name, title, dependent_identifier) {
        const no_linking_items = await this.db_driver.query(`SELECT COUNT(*) AS count 
            FROM items AS I
            WHERE I.${dependent_identifier} = (SELECT id FROM ${table_name} WHERE title = :title)
            AND I.remove_date IS NULL;`, (obj) => obj.count, { ":title": title });
        if (no_linking_items[0] == 0) {
            await this.db_driver.run(`UPDATE ${table_name}
                SET deleted = 1
                WHERE title = :title;`, { ":title": title });
        }
        else {
            throw new Error(`Cannot delete object "${title}" because it is linked to existing items.`);
        }
    }
    async add_categories(...categories) {
        await this.add_objects("categories", categories);
    }
    async remove_category(title) {
        await this.remove_object("categories", title, "category_id");
    }
    async get_categories() {
        return await this.db_driver.query(`SELECT id, title, weight 
            FROM categories 
            WHERE deleted = 0
            ORDER BY title ASC;`, (obj) => { return { id: obj.id, title: obj.title, weight: obj.weight }; });
    }
    async add_items(...item) {
        if (item.length === 0)
            return;
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
        await this.db_driver.run(`INSERT INTO items 
            (category_id, box_id, expiration_date, status, add_date) 
            VALUES ${clause};`, flattened_values);
    }
    async remove_item(id) {
        await this.db_driver.run(`UPDATE items
            SET remove_date = :date
            WHERE id = :id;`, { ":date": Date.now(), ":id": id });
    }
    async update_item(id, args) {
        const { category, box, id: _id, ...rest } = args;
        const update_obj = { ...rest };
        if (category !== undefined) {
            const category_map = await this.get_ids("categories", category);
            update_obj["category_id"] = await this.id_lookup(category_map, category);
        }
        if (box !== undefined) {
            const box_map = await this.get_ids("boxes", box);
            update_obj["box_id"] = await this.id_lookup(box_map, box);
        }
        const entries = Object.entries(update_obj).filter(([_, val]) => val !== undefined);
        if (entries.length === 0)
            return;
        const keys = entries.map(([key, _]) => key);
        const values = entries.map(([_, value]) => value);
        const set_clause = keys.map(key => `${key} = ?`).join(", ");
        await this.db_driver.run(`UPDATE items
            SET ${set_clause}
            WHERE id = ?;`, values.concat([id]));
    }
    async get_items(category) {
        return await this.db_driver.query(`SELECT I.*, B.title as box, C.title AS category
            FROM items AS I
            LEFT JOIN categories AS C ON I.category_id = C.id 
            LEFT JOIN boxes AS B ON I.box_id = B.id
            WHERE C.title = :category
            AND remove_date IS NULL;`, Item.from, { ":category": category });
    }
    async get_boxes() {
        return await this.db_driver.query(`SELECT id, title, max_load
            FROM boxes
            WHERE deleted = 0
            ORDER BY title ASC;`, (obj) => { return { id: obj.id, title: obj.title, max_load: isNaN(Number(obj.max_load)) ? null : Number(obj.max_load) }; });
    }
    async add_boxes(...boxes) {
        await this.add_objects("boxes", boxes);
    }
    async remove_box(box) {
        await this.remove_object("boxes", box, "box_id");
        await this.db_driver.run(`DELETE FROM box_adjacency 
            WHERE v = (SELECT id FROM boxes WHERE title = :box) 
            OR u = (SELECT id FROM boxes WHERE title = :box);`, { ":box": box }); // cascade delete box connections
    }
    async get_box_weights() {
        return await this.db_driver.query(`SELECT B.title as box, SUM(COALESCE(C.weight, 0)) AS total_weight
            FROM boxes AS B
            LEFT JOIN items AS I ON B.id = I.box_id AND I.remove_date IS NULL
            LEFT JOIN categories AS C ON I.category_id = C.id
            GROUP BY B.id`, (obj) => { return { box: obj.box, total_weight: obj.total_weight }; });
    }
    async get_box_content(box) {
        return await this.db_driver.query(`SELECT I.*, B.title as box, C.title AS category
            FROM items AS I
            LEFT JOIN categories AS C ON I.category_id = C.id
            LEFT JOIN boxes AS B ON I.box_id = B.id
            WHERE B.title = :box AND I.remove_date IS NULL
            ORDER BY C.title;`, Item.from, { ":box": box });
    }
    async add_box_connections(adjacency) {
        if (adjacency.length === 0)
            return;
        const values_clause = adjacency.map(() => "(?, ?)").join(", ");
        const values = adjacency.flatMap(({ v, u }) => [v, u]);
        await this.db_driver.run(`INSERT OR IGNORE INTO box_adjacency 
            (v, u) 
            VALUES ${values_clause};`, values);
    }
    async remove_box_connection(v, u) {
        await this.db_driver.run(`DELETE FROM box_adjacency WHERE v = :v AND u = :u;`, { ":v": v, ":u": u });
    }
    async get_box_adjacency() {
        const edges = await this.db_driver.query(`SELECT v, u
            FROM box_adjacency;`, (obj) => { return { v: obj.v, u: obj.u }; });
        return edges;
    }
    async execute_raw(sql, params) {
        return await this.db_driver.query_raw(sql, params);
    }
    async run_raw(sql, params) {
        await this.db_driver.run(sql, params);
    }
}
//# sourceMappingURL=main.js.map