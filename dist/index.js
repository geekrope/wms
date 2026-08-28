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
import {} from "./types.js";
const navigate_action = new Map([
    ["intake", refresh_intake],
    ["item_management", refresh_item_management],
    ["boxes_management", refresh_boxes_management],
    ["category_management", refresh_category_management],
    ["backup", () => { }],
    ["dashboard", refresh_dashboard],
    ["stats", () => refresh_analytics]
]);
let db_manager = undefined;
let categories = [];
let boxes = [];
function setup_navigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const page = tab.getAttribute('data-page');
            navigate_to(page);
        });
    });
}
export async function navigate_to(page) {
    const url = new URL(window.location.href);
    url.searchParams.set('location', page);
    window.history.pushState({}, '', url);
    await handle_navigation();
}
export async function handle_navigation() {
    const page = (new URL(window.location.href)).searchParams.get('location') ?? "intake";
    const action = navigate_action.get(page);
    if (!action)
        throw new Error(`No action defined for page: ${page}`);
    await action();
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`.nav-tab[data-page="${page}"]`).forEach(tab => tab.classList.add('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    get_element(page).classList.add('active');
}
export function get_db_manager() {
    if (!db_manager) {
        throw new Error("Database manager not initialized");
    }
    return db_manager;
}
export function get_categories_list() {
    return categories;
}
export function get_category_titles() {
    return categories.map(cat => cat.title);
}
export function locate_category(category_title) {
    return categories.find(cat => cat.title === category_title);
}
export async function reload_categories() {
    db_manager = get_db_manager();
    categories = await db_manager.get_categories();
    return categories;
}
export function get_boxes_list() {
    return boxes;
}
export function get_box_titles() {
    return boxes.map(box => box.title);
}
export function locate_box(box_title) {
    return boxes.find(box => box.title === box_title);
}
export async function reload_boxes() {
    db_manager = get_db_manager();
    boxes = await db_manager.get_boxes();
    return boxes;
}
export async function main() {
    try {
        if (!window.initSqlJs)
            throw new Error("SQL.js is not available. Ensure that the SQL.js library is loaded.");
        const SQL = await window.initSqlJs({
            locateFile: (filename) => `src/modules/${filename}`
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
    }
    catch (error) {
        console.error("Failed to initialize database:", error);
    }
}
//# sourceMappingURL=index.js.map