import { SqlJsDriver } from "./db_driver.js";
import { DatabaseManager } from "./main.js";
import { IndexedDbAdapter } from "./persistence.js";
import { init_intake, refresh_intake } from "./intake.js";
import { init_item_management, refresh_item_management } from "./item_management.js";
import { init_backup } from "./backup.js";
import { get_element } from "./dom_utils.js";
import { init_boxes_management, refresh_boxes_management } from "./boxes_management.js";
import { init_category_management, refresh_category_management } from "./category_management.js";
import { init_dashboard, refresh_dashboard } from "./dashboard.js";
import { init_analytics, refresh_analytics } from "./analytics.js";
import { type Category, type Box } from "./types.js";

declare global {
    interface Window {
        initSqlJs: (config?: any) => Promise<any>;
    }
}

type Page = "intake" | "item_management" | "boxes_management" | "category_management" | "backup" | "dashboard" | "stats";

const navigate_action: Map<Page, () => void> = new Map([
    ["intake", refresh_intake],
    ["item_management", refresh_item_management],
    ["boxes_management", refresh_boxes_management],
    ["category_management", refresh_category_management],
    ["backup", () => { /* No refresh needed for backup */ }],
    ["dashboard", refresh_dashboard],
    ["stats", () => refresh_analytics]
]);

let db_manager: DatabaseManager | undefined = undefined;
let categories: Category[] = [];
let boxes: Box[] = [];

function setup_navigation(): void {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (event) => {
            event.preventDefault();
            const page = tab.getAttribute('data-page') as Page;
            navigate_to(page);
        });
    });
}

export async function navigate_to(page: Page): Promise<void> {
    const url = new URL(window.location.href);
    url.searchParams.set('location', page);
    window.history.pushState({}, '', url);

    await handle_navigation();
}

export async function handle_navigation(): Promise<void> {
    const page = (new URL(window.location.href)).searchParams.get('location') as Page ?? "intake";
    const action = navigate_action.get(page);

    if (!action) throw new Error(`No action defined for page: ${page}`);
    await action();    

    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`.nav-tab[data-page="${page}"]`).forEach(tab => tab.classList.add('active'));   
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    get_element<HTMLDivElement>(page).classList.add('active');
}

export function get_db_manager(): DatabaseManager {
    if (!db_manager) {
        throw new Error("Database manager not initialized");
    }
    return db_manager;
}

export function get_categories_list(): Category[] {
    return categories;
}

export function get_category_titles(): string[] {
    return categories.map(cat => cat.title);
}

export function locate_category(category_title: string): Category | undefined {
    return categories.find(cat => cat.title === category_title);
}

export async function reload_categories(): Promise<Category[]> {
    db_manager = get_db_manager();
    categories = await db_manager.get_categories();

    return categories;
}

export function get_boxes_list(): Box[] {
    return boxes;
}

export function get_box_titles(): string[] {
    return boxes.map(box => box.title);
}

export function locate_box(box_title: string): Box | undefined {
    return boxes.find(box => box.title === box_title);
}

export async function reload_boxes(): Promise<Box[]> {
    db_manager = get_db_manager();
    boxes = await db_manager.get_boxes();

    return boxes;
}

export async function main(): Promise<void> {
    try {
        if (!window.initSqlJs) throw new Error("SQL.js is not available. Ensure that the SQL.js library is loaded.");

        const SQL = await window.initSqlJs({
            locateFile: (filename: string) => `src/modules/${filename}`
        });

        const persistence_adapter = new IndexedDbAdapter();
        const db = new SQL.Database((await persistence_adapter.load()) || new Uint8Array());

        const driver = new SqlJsDriver(db, persistence_adapter);
        db_manager = new DatabaseManager(driver);

        await driver.enable_foreign_keys();
        await db_manager.init_tables();
        await reload_categories();
        await reload_boxes();

        init_backup();
        init_intake();
        init_item_management();
        init_boxes_management();
        init_category_management();
        init_dashboard();
        init_analytics(driver, db_manager);

        setup_navigation();
        await handle_navigation();
    } catch (error) {
        console.error("Failed to initialize database:", error);
    }
}