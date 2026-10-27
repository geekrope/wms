import type { IDatabaseDriver } from "./db_driver.js";
import { Item } from "./types.js";
import { type Category, type Box } from "./types.js";
import { type AdjacencyList } from "../algorithms/graph_utils.js";
import type { BindParams } from "sql.js";
export declare class DatabaseManager {
    private db_driver;
    private now;
    constructor(db_driver: IDatabaseDriver, now?: () => number);
    init_tables(): Promise<void>;
    private static id_lookup;
    get_active_ids(table_name: string, ...titles: string[]): Promise<Map<string, number>>;
    private add_generic_objects;
    private remove_generic_object;
    add_categories(...categories: Category[]): Promise<void>;
    remove_category(title: string): Promise<void>;
    get_categories(): Promise<Category[]>;
    add_items(...item: Item[]): Promise<void>;
    remove_item(id: number): Promise<void>;
    update_item(id: number, args: Partial<Item>): Promise<void>;
    get_items(category: string): Promise<Item[]>;
    get_boxes(): Promise<Box[]>;
    add_boxes(...boxes: Box[]): Promise<void>;
    remove_box(box: string): Promise<void>;
    get_box_weights(): Promise<{
        box: string;
        total_weight: number;
    }[]>;
    get_box_content(box: string): Promise<Item[]>;
    add_box_connections(adjacency: AdjacencyList): Promise<void>;
    remove_box_connection(v: number, u: number): Promise<void>;
    get_box_adjacency(): Promise<AdjacencyList>;
    execute_raw(sql: string, params: BindParams): Promise<import("sql.js").QueryExecResult[]>;
    run_raw(sql: string, params: BindParams): Promise<void>;
}
//# sourceMappingURL=main.d.ts.map