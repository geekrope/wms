import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { DatabaseManager } from "../core/main.js";
import { SqlJsDriver } from "../core/db_driver.js";
import { DummyPersistenceAdapter } from "../core/persistence.js";
import { Item } from "../core/types.js";
const require = createRequire(import.meta.url);
const initSqlJs = require("../../src/modules/sql-wasm.js");
const SQL = await initSqlJs({
    locateFile: (file) => fileURLToPath(new URL(`../../src/modules/${file}`, import.meta.url))
});
async function create_manager(now = Date.now) {
    const driver = new SqlJsDriver(new SQL.Database(), new DummyPersistenceAdapter());
    const manager = new DatabaseManager(driver, now);
    await manager.init_tables();
    return manager;
}
async function scalar(manager, sql, params = []) {
    return (await manager.execute_raw(sql, params))[0]?.values[0]?.[0];
}
async function live_id(manager, table, title) {
    return (await manager.get_ids(table, title)).get(title);
}
// categories: Tuna 200, Milk 1000, Salt (no weight), Corned beef 340 (no items)
// boxes: Top -> Middle -> Bottom
// items: Tuna x2 in Top, Milk in Middle, Salt in Bottom
async function create_fixture(now = Date.now) {
    const manager = await create_manager(now);
    await manager.add_categories({ id: undefined, title: "Tuna", weight: 200 }, { id: undefined, title: "Milk", weight: 1000 }, { id: undefined, title: "Salt", weight: null }, { id: undefined, title: "Corned beef", weight: 340 });
    await manager.add_boxes({ id: undefined, title: "Top", max_load: null }, { id: undefined, title: "Middle", max_load: null }, { id: undefined, title: "Bottom", max_load: null });
    const boxes = await manager.get_ids("boxes", "Top", "Middle", "Bottom");
    await manager.add_box_connections([
        { v: boxes.get("Top"), u: boxes.get("Middle") },
        { v: boxes.get("Middle"), u: boxes.get("Bottom") }
    ]);
    const expires = Date.UTC(2030, 0, 1);
    await manager.add_items(new Item("Tuna", expires, "Top"), new Item("Tuna", expires, "Top"), new Item("Milk", expires, "Middle"), new Item("Salt", expires, "Bottom"));
    return manager;
}
test("sql.js loads in node and the schema initializes", async () => {
    const manager = await create_manager();
    await manager.add_categories({ id: undefined, title: "Tuna", weight: 200 });
    const categories = await manager.get_categories();
    assert.equal(categories.length, 1);
    assert.equal(categories[0]?.title, "Tuna");
    assert.equal(categories[0]?.weight, 200);
});
test("fixture matches its description", async () => {
    const manager = await create_fixture();
    assert.deepEqual((await manager.get_categories()).map(c => c.title), ["Corned beef", "Milk", "Salt", "Tuna"]);
    assert.deepEqual((await manager.get_boxes()).map(b => b.title), ["Bottom", "Middle", "Top"]);
    assert.deepEqual((await manager.get_box_content("Top")).map(i => i.category), ["Tuna", "Tuna"]);
    assert.deepEqual((await manager.get_box_content("Middle")).map(i => i.category), ["Milk"]);
    assert.deepEqual((await manager.get_box_content("Bottom")).map(i => i.category), ["Salt"]);
    assert.equal((await manager.get_box_adjacency()).length, 2);
});
test("add object name collision", async () => {
    const manager = await create_fixture();
    await assert.rejects(() => manager.add_categories({ id: undefined, title: "Tuna", weight: null }), /The following categories already exist/);
});
test("revive category does not affect old entries", async () => {
    const manager = await create_fixture();
    await manager.remove_category("Corned beef");
    await manager.add_categories({ id: undefined, title: "Corned beef", weight: 400 });
    const old_count = scalar(manager, `
        SELECT COUNT(*) 
        FROM categories 
        WHERE title = 'Corned beef' AND weight = 340 AND DELETED = 1`, []);
    const new_count = scalar(manager, `
        SELECT COUNT(*) 
        FROM categories 
        WHERE title = 'Corned beef' AND weight = 400 AND DELETED = 0`, []);
    assert.equal(old_count, 1);
    assert.equal(new_count, 1);
});
test("live id points to the existing object", async () => {
    const manager = await create_fixture();
    await manager.remove_category("Corned beef");
    await manager.add_categories({ id: undefined, title: "Corned beef", weight: 400 });
    const id = await live_id(manager, "categories", "Corned beef");
    const deleted_status = await scalar(manager, `
        SELECT deleted
        FROM categories 
        WHERE id = ?`, [id]);
    assert.equal(deleted_status, 0);
});
test("re-adding a removed category creates a new row", async () => {
    const manager = await create_fixture();
    const old_id = await live_id(manager, "categories", "Corned beef");
    await manager.remove_category("Corned beef");
    await manager.add_categories({ id: undefined, title: "Corned beef", weight: 400 });
    assert.notEqual(await live_id(manager, "categories", "Corned beef"), old_id);
    assert.deepEqual((await manager.get_categories()).filter(c => c.title === "Corned beef").map(c => c.weight), [400]);
});
test("add_items and update_item link to the live row of a re-added category", async () => {
    const manager = await create_fixture();
    await manager.remove_category("Corned beef");
    await manager.add_categories({ id: undefined, title: "Corned beef", weight: 400 });
    const new_id = await live_id(manager, "categories", "Corned beef");
    await manager.add_items(new Item("Corned beef", Date.UTC(2030, 0, 1), "Top"));
    const [salt] = await manager.get_items("Salt");
    await manager.update_item(salt.id, { category: "Corned beef" });
    const linked = await manager.execute_raw(`
        SELECT DISTINCT category_id FROM items 
        WHERE category_id IN (SELECT id FROM categories WHERE title = ?);`, ["Corned beef"]);
    assert.deepEqual(linked[0].values, [[new_id]]);
    assert.equal((await manager.get_items("Corned beef")).length, 2);
});
test("a re-added category with active items cannot be removed", async () => {
    const manager = await create_fixture();
    await manager.remove_category("Corned beef");
    await manager.add_categories({ id: undefined, title: "Corned beef", weight: 400 });
    await manager.add_items(new Item("Corned beef", Date.UTC(2030, 0, 1), "Top"));
    await assert.rejects(() => manager.remove_category("Corned beef"), /linked to existing items/);
    assert.ok((await manager.get_categories()).some(c => c.title === "Corned beef"));
});
test("removing a re-added box deletes only its own edges", async () => {
    const manager = await create_fixture();
    await manager.add_boxes({ id: undefined, title: "Spare", max_load: null });
    await manager.remove_box("Spare");
    await manager.add_boxes({ id: undefined, title: "Spare", max_load: null });
    const spare = await live_id(manager, "boxes", "Spare");
    const top = await live_id(manager, "boxes", "Top");
    await manager.add_box_connections([{ v: top, u: spare }]);
    await manager.remove_box("Spare");
    const edges = await manager.get_box_adjacency();
    assert.equal(edges.length, 2);
    assert.ok(!edges.some(e => e.v === spare || e.u === spare));
});
test("removing a title that doesn't exist throws", async () => {
    const manager = await create_fixture();
    await assert.rejects(() => manager.remove_category("Ghost"));
    await assert.rejects(() => manager.remove_box("Ghost"));
});
test("removing an already removed title throws", async () => {
    const manager = await create_fixture();
    await manager.remove_category("Corned beef");
    await assert.rejects(() => manager.remove_category("Corned beef"));
});
test("duplicate titles in one call are rejected and nothing is inserted", async () => {
    const manager = await create_fixture();
    await assert.rejects(() => manager.add_categories({ id: undefined, title: "Rice", weight: 1000 }, { id: undefined, title: "Rice", weight: 500 }));
    await assert.rejects(() => manager.add_boxes({ id: undefined, title: "Shelf", max_load: null }, { id: undefined, title: "Shelf", max_load: 10 }));
    assert.equal(await scalar(manager, "SELECT COUNT(*) FROM categories WHERE title = 'Rice';"), 0);
    assert.equal(await scalar(manager, "SELECT COUNT(*) FROM boxes WHERE title = 'Shelf';"), 0);
});
//# sourceMappingURL=test_db_manager.js.map