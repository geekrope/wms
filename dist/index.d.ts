import { DatabaseManager } from "./main.js";
import { type Category, type Box } from "./types.js";
declare global {
    interface Window {
        initSqlJs: (config?: any) => Promise<any>;
    }
}
type Page = "intake" | "item_management" | "boxes_management" | "category_management" | "backup" | "dashboard" | "stats";
export declare function navigate_to(page: Page): Promise<void>;
export declare function handle_navigation(): Promise<void>;
export declare function get_db_manager(): DatabaseManager;
export declare function get_categories_list(): Category[];
export declare function get_category_titles(): string[];
export declare function locate_category(category_title: string): Category | undefined;
export declare function reload_categories(): Promise<Category[]>;
export declare function get_boxes_list(): Box[];
export declare function get_box_titles(): string[];
export declare function locate_box(box_title: string): Box | undefined;
export declare function reload_boxes(): Promise<Box[]>;
export declare function main(): Promise<void>;
export {};
//# sourceMappingURL=index.d.ts.map