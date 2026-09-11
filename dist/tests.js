import { Item } from "./types.js";
import { DatabaseManager } from "./main.js";
import { SqlJsDriver } from "./db_driver.js";
import { DummyPersistenceAdapter } from "./persistence.js";
import { compute_costs, detect_cycle, build_graph, ValueNode } from "./graph_utils.js";
import { Analytics } from "./analytics_utils.js";
export const debug = true;
export function assertFactory() {
    let passed = 0;
    let total = 0;
    const assert = (condition, name) => {
        total++;
        if (condition) {
            passed++;
            console.log(`✅ PASS: ${name}`);
        }
        else {
            console.error(`❌ FAIL: ${name}`);
        }
    };
    return {
        assert,
        getStats: () => ({ passed, total })
    };
}
// --- SHARED HELPERS ---
async function create_test_database() {
    const SQL = await window.initSqlJs({
        locateFile: (file) => `./src/modules/${file}`
    });
    const db = new SQL.Database();
    const driver = new SqlJsDriver(db, new DummyPersistenceAdapter());
    const manager = new DatabaseManager(driver);
    return { manager, driver };
}
async function get_category_id(manager, title) {
    const categories = await manager.get_categories();
    const found = categories.find(c => c.title === title);
    if (found?.id === undefined)
        throw new Error(`Category "${title}" not found in test fixture`);
    return found.id;
}
async function get_box_id(manager, title) {
    const boxes = await manager.get_boxes();
    const found = boxes.find(b => b.title === title);
    if (found?.id === undefined)
        throw new Error(`Box "${title}" not found in test fixture`);
    return found.id;
}
// ==================================================================
// GRAPH ALGORITHM TESTS (graph_utils.ts)
// ==================================================================
function init_labels(nodes) {
    return new Map(nodes.map(n => [n, 0]));
}
export const GraphTests = {
    // --- 1. TRANSITIVE CLOSURE / COST PROPAGATION ---
    testComputeCostsSumsWeightOfAncestors(assert) {
        // A -> B -> C: whatever presses on C is everything above it (A and B)
        const boxes = ["A", "B", "C"];
        const weights = new Map([["A", 2], ["B", 5], ["C", 1]]);
        const adjacency = [{ v: "A", u: "B" }, { v: "B", u: "C" }];
        const { entry, nodes } = build_graph(boxes, adjacency);
        const costs = compute_costs(entry, weights);
        assert(costs.get(nodes.get("A")) === 0, "Nothing sits above A, so its cost is 0");
        assert(costs.get(nodes.get("B")) === 2, "B is pressed only by A's weight (2)");
        assert(costs.get(nodes.get("C")) === 7, "C is pressed by both A and B (2+5=7)");
    },
    testComputeCostsExcludesOwnWeight(assert) {
        const boxes = ["A"];
        const weights = new Map([["A", 100]]);
        const adjacency = [];
        const { entry, nodes } = build_graph(boxes, adjacency);
        const costs = compute_costs(entry, weights);
        assert(costs.get(nodes.get("A")) === 0, "A's own weight never counts as pressing on itself");
    },
    testComputeCostsHandlesDiamondWithoutDoubleCounting(assert) {
        // A -> B, A -> C, B -> D, C -> D: D is reachable from A via two paths,
        // but A's weight should still be counted only once.
        const boxes = ["A", "B", "C", "D"];
        const weights = new Map([["A", 3], ["B", 4], ["C", 5], ["D", 1]]);
        const adjacency = [
            { v: "A", u: "B" }, { v: "A", u: "C" },
            { v: "B", u: "D" }, { v: "C", u: "D" }
        ];
        const { entry, nodes } = build_graph(boxes, adjacency);
        const costs = compute_costs(entry, weights);
        assert(costs.get(nodes.get("D")) === 12, "A is only counted once despite two paths into D (3+4+5=12)");
    },
    testComputeCostsIgnoresUnreachableNodes(assert) {
        const boxes = ["A", "Isolated"];
        const weights = new Map([["A", 10], ["Isolated", 999]]);
        const adjacency = [];
        const { entry, nodes } = build_graph(boxes, adjacency);
        const costs = compute_costs(entry, weights);
        assert(costs.get(nodes.get("A")) === 0, "A has no predecessors, so nothing presses on it");
    },
    // --- 2. CYCLE DETECTION ---
    testDetectCycleFindsCycle(assert) {
        const a = new ValueNode("A");
        const b = new ValueNode("B");
        const c = new ValueNode("C");
        a.add_successor(b);
        b.add_successor(c);
        c.add_successor(a);
        const labels = init_labels([a, b, c]);
        assert(detect_cycle(labels, a) === true, "Cycle A -> B -> C -> A is detected");
    },
    testDetectCycleAcceptsDAG(assert) {
        const a = new ValueNode("A");
        const b = new ValueNode("B");
        const c = new ValueNode("C");
        const d = new ValueNode("D");
        a.add_successor(b);
        a.add_successor(c);
        b.add_successor(d);
        const labels = init_labels([a, b, c, d]);
        assert(detect_cycle(labels, a) === false, "No cycle is reported for a DAG");
    },
    testDetectCycleThrowsOnUnlabeledNeighbor(assert) {
        const a = new ValueNode("A");
        const b = new ValueNode("B");
        a.add_successor(b);
        const labels = init_labels([a]); // "b" is intentionally left unlabeled
        let threw = false;
        try {
            detect_cycle(labels, a);
        }
        catch {
            threw = true;
        }
        assert(threw, "detect_cycle throws when a neighbor has no entry in the labels map");
    },
    // --- 3. GRAPH CONSTRUCTION ---
    testBuildGraphRoutesOrphansThroughEntry(assert) {
        const boxes = ["A", "B", "C"];
        const adjacency = [{ v: "A", u: "B" }];
        const { entry, nodes } = build_graph(boxes, adjacency);
        assert(nodes.size === 3, "All boxes get a node");
        assert(entry.successors.has(nodes.get("A")), "A is never a target, so it's an orphan linked from entry");
        assert(entry.successors.has(nodes.get("C")), "C has no edges at all, so it's an orphan linked from entry");
        assert(!entry.successors.has(nodes.get("B")), "B is targeted by an edge, so it's not an orphan");
    },
    testBuildGraphSkipsEdgesReferencingUnknownBoxes(assert) {
        const boxes = ["A"];
        const adjacency = [{ v: "A", u: "Ghost" }, { v: "Ghost", u: "A" }];
        let result;
        let threw = false;
        try {
            result = build_graph(boxes, adjacency);
        }
        catch {
            threw = true;
        }
        assert(!threw, "Edges referencing boxes outside the given list are skipped, not thrown");
        assert(result !== undefined && result.nodes.size === 1, "Only known boxes end up with nodes");
    },
    // --- RUNNER ---
    run() {
        console.log("🕸️  Graph Algorithm Test Suite");
        const { assert, getStats } = assertFactory();
        this.testComputeCostsSumsWeightOfAncestors(assert);
        this.testComputeCostsExcludesOwnWeight(assert);
        this.testComputeCostsHandlesDiamondWithoutDoubleCounting(assert);
        this.testComputeCostsIgnoresUnreachableNodes(assert);
        this.testDetectCycleFindsCycle(assert);
        this.testDetectCycleAcceptsDAG(assert);
        this.testDetectCycleThrowsOnUnlabeledNeighbor(assert);
        this.testBuildGraphRoutesOrphansThroughEntry(assert);
        this.testBuildGraphSkipsEdgesReferencingUnknownBoxes(assert);
        const { passed, total } = getStats();
        console.log("-----------------------------------");
        console.log(`Results: ${passed}/${total} tests passed.`);
        return passed === total;
    }
};
// ==================================================================
// DATABASE MANAGER TESTS (main.ts)
// ==================================================================
export const DatabaseTests = {
    // --- 1. TABLE INITIALIZATION ---
    async testInitTables(assert) {
        const { manager } = await create_test_database();
        try {
            await manager.init_tables();
            assert(true, "Tables initialized successfully");
        }
        catch (e) {
            assert(false, `Table initialization failed: ${e}`);
        }
    },
    // --- 2. CATEGORIES ---
    async testAddAndGetCategories(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Tuna", weight: 200 }, { id: undefined, title: "Tushonka", weight: 150 });
        const categories = await manager.get_categories();
        assert(categories.length === 2, `Expected 2 categories, got ${categories.length}`);
        assert(categories[0]?.title === "Tuna", "Categories come back ordered alphabetically by title");
    },
    async testAddCategoriesUpsertsOnConflict(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Meat", weight: 100 });
        await manager.add_categories({ id: undefined, title: "Meat", weight: 250 });
        const categories = await manager.get_categories();
        assert(categories.length === 1, "Re-adding the same title doesn't create a duplicate row");
        assert(categories[0]?.weight === 250, "Re-adding the same title updates its weight");
    },
    async testRemoveCategoryBlockedByActiveItems(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Fish", weight: 200 });
        await manager.add_boxes({ id: undefined, title: "Shelf", max_load: null });
        await manager.add_items(new Item("Fish", Date.now() + 1000000, "Shelf", 0));
        let threw = false;
        try {
            await manager.remove_category("Fish");
        }
        catch {
            threw = true;
        }
        assert(threw, "Cannot remove a category still linked to an active item");
    },
    async testRemoveCategorySucceedsAfterItemRemoved(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Fish", weight: 200 });
        await manager.add_boxes({ id: undefined, title: "Shelf", max_load: null });
        await manager.add_items(new Item("Fish", Date.now() + 1000000, "Shelf", 0));
        const [item] = await manager.get_items("Fish");
        await manager.remove_item(item.id);
        try {
            await manager.remove_category("Fish");
            assert(true, "Category is removable once its items are removed");
        }
        catch (e) {
            assert(false, `Expected remove_category to succeed, got: ${e}`);
        }
        const categories = await manager.get_categories();
        assert(!categories.some(c => c.title === "Fish"), "Removed category no longer appears in listings");
    },
    // --- 3. ITEMS ---
    async testAddItemsRejectsUnknownCategory(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_boxes({ id: undefined, title: "Shelf", max_load: null });
        let threw = false;
        try {
            await manager.add_items(new Item("Ghost", Date.now(), "Shelf", 0));
        }
        catch {
            threw = true;
        }
        assert(threw, "Adding an item with an unknown category throws");
    },
    async testAddItemsRejectsUnknownBox(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Food", weight: 200 });
        let threw = false;
        try {
            await manager.add_items(new Item("Food", Date.now(), "Ghost", 0));
        }
        catch {
            threw = true;
        }
        assert(threw, "Adding an item with an unknown box throws");
    },
    async testGetItemsFiltersRemoved(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Food", weight: 200 });
        await manager.add_boxes({ id: undefined, title: "Shelf", max_load: null });
        await manager.add_items(new Item("Food", Date.now() + 1000000, "Shelf", 0), new Item("Food", Date.now() + 2000000, "Shelf", 0));
        const [first] = await manager.get_items("Food");
        await manager.remove_item(first.id);
        const remaining = await manager.get_items("Food");
        assert(remaining.length === 1, "Removed item disappears from get_items");
        assert(remaining[0]?.id !== first.id, "The remaining item is the one that wasn't removed");
    },
    async testUpdateItemMovesBoxAndCategory(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Canned", weight: 200 }, { id: undefined, title: "Fresh", weight: 100 });
        await manager.add_boxes({ id: undefined, title: "BoxA", max_load: null }, { id: undefined, title: "BoxB", max_load: null });
        await manager.add_items(new Item("Canned", Date.now() + 1000000, "BoxA", 0));
        const [item] = await manager.get_items("Canned");
        await manager.update_item(item.id, { category: "Fresh", box: "BoxB", status: 1 });
        const box_a_content = await manager.get_box_content("BoxA");
        const box_b_content = await manager.get_box_content("BoxB");
        assert(box_a_content.length === 0, "Item no longer appears in its old box");
        assert(box_b_content.length === 1, "Item appears in its new box");
        assert(box_b_content[0]?.status === 1, "Non-relational fields are updated too");
    },
    async testGetBoxWeightsSumsActiveItems(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Heavy", weight: 10 }, { id: undefined, title: "NoWeight", weight: null });
        await manager.add_boxes({ id: undefined, title: "Crate", max_load: null });
        await manager.add_items(new Item("Heavy", Date.now() + 1000000, "Crate", 0), new Item("Heavy", Date.now() + 1000000, "Crate", 0), new Item("NoWeight", Date.now() + 1000000, "Crate", 0));
        const weights = await manager.get_box_weights();
        const crate = weights.find(w => w.box === "Crate");
        assert(crate !== undefined, "Crate appears in the weights report");
        assert(crate?.total_weight === 20, "Weight is summed across items; a NULL category weight counts as 0");
    },
    // --- 4. BOX ADJACENCY ---
    async testBoxAdjacencyLifecycle(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_boxes({ id: undefined, title: "A", max_load: null }, { id: undefined, title: "B", max_load: null });
        const a_id = await get_box_id(manager, "A");
        const b_id = await get_box_id(manager, "B");
        await manager.add_box_connections([{ v: a_id, u: b_id }]);
        let adjacency = await manager.get_box_adjacency();
        assert(adjacency.length === 1, "Connection is recorded");
        await manager.remove_box_connection(a_id, b_id);
        adjacency = await manager.get_box_adjacency();
        assert(adjacency.length === 0, "Connection is removed");
    },
    async testRemoveBoxCascadesAdjacency(assert) {
        const { manager } = await create_test_database();
        await manager.init_tables();
        await manager.add_boxes({ id: undefined, title: "A", max_load: null }, { id: undefined, title: "B", max_load: null });
        const a_id = await get_box_id(manager, "A");
        const b_id = await get_box_id(manager, "B");
        await manager.add_box_connections([{ v: a_id, u: b_id }]);
        await manager.remove_box("A");
        const adjacency = await manager.get_box_adjacency();
        const boxes = await manager.get_boxes();
        assert(adjacency.length === 0, "Removing a box cascades to its adjacency edges");
        assert(!boxes.some(b => b.title === "A"), "Removed box no longer appears in listings");
    },
    // --- 5. RAW SQL ESCAPE HATCH (mocked driver, no real database needed) ---
    async testRawQueryAndRunDelegateToDriver(assert) {
        const calls = [];
        const fake_driver = {
            async query_raw(sql, params) {
                calls.push({ method: "query_raw", sql, params });
                return [{ ok: 1 }];
            },
            async query(sql, _ctor, params) {
                calls.push({ method: "query", sql, params });
                return [];
            },
            async run(sql, params) {
                calls.push({ method: "run", sql, params });
            }
        };
        const manager = new DatabaseManager(fake_driver);
        const result = await manager.execute_raw("SELECT 1;", []);
        await manager.run_raw("DELETE FROM items;", []);
        assert(result[0]?.ok === 1, "execute_raw returns whatever the driver's query_raw returns");
        assert(calls[0]?.method === "query_raw" && calls[0]?.sql === "SELECT 1;", "execute_raw delegates the exact SQL to the driver");
        assert(calls[1]?.method === "run" && calls[1]?.sql === "DELETE FROM items;", "run_raw delegates the exact SQL to the driver");
    },
    // --- RUNNER ---
    async run() {
        console.log("🗄️  Database Manager Test Suite");
        const { assert, getStats } = assertFactory();
        await this.testInitTables(assert);
        await this.testAddAndGetCategories(assert);
        await this.testAddCategoriesUpsertsOnConflict(assert);
        await this.testRemoveCategoryBlockedByActiveItems(assert);
        await this.testRemoveCategorySucceedsAfterItemRemoved(assert);
        await this.testAddItemsRejectsUnknownCategory(assert);
        await this.testAddItemsRejectsUnknownBox(assert);
        await this.testGetItemsFiltersRemoved(assert);
        await this.testUpdateItemMovesBoxAndCategory(assert);
        await this.testGetBoxWeightsSumsActiveItems(assert);
        await this.testBoxAdjacencyLifecycle(assert);
        await this.testRemoveBoxCascadesAdjacency(assert);
        await this.testRawQueryAndRunDelegateToDriver(assert);
        const { passed, total } = getStats();
        console.log("-----------------------------------");
        console.log(`Results: ${passed}/${total} tests passed.`);
        return passed === total;
    }
};
// ==================================================================
// ANALYTICS TESTS (analytics_utils.ts)
// ==================================================================
const DAY_MS = 24 * 60 * 60 * 1000;
// Bypasses DatabaseManager.add_items/remove_item (which always stamp Date.now())
// so tests can pin add_date/remove_date to exact, deterministic UTC days.
async function seed_removed_item(manager, category_id, box_id, add_date, remove_date) {
    await manager.run_raw(`INSERT INTO items (category_id, box_id, expiration_date, status, add_date, remove_date)
        VALUES (:category_id, :box_id, 0, 0, :add_date, :remove_date);`, { ":category_id": category_id, ":box_id": box_id, ":add_date": add_date, ":remove_date": remove_date });
}
export const AnalyticsTests = {
    // --- 1. CATEGORY EVENTS ---
    async testGetCategoryEventsGroupsDeltaByDay(assert) {
        const { manager, driver } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Widgets", weight: 5 });
        await manager.add_boxes({ id: undefined, title: "Shelf", max_load: null });
        const category_id = await get_category_id(manager, "Widgets");
        const box_id = await get_box_id(manager, "Shelf");
        const analytics = new Analytics(driver, manager);
        const day1 = Date.UTC(2026, 0, 10);
        const day2 = day1 + DAY_MS;
        await seed_removed_item(manager, category_id, box_id, day1, null); // +1 on day1, still active
        await seed_removed_item(manager, category_id, box_id, day1, day2); // +1 on day1, -1 on day2
        const events = await analytics.get_category_events("Widgets");
        assert(events.length === 2, `Expected 2 distinct days of events, got ${events.length}`);
        assert(events[0]?.date === day1 && events[0]?.delta === 2, "Day 1 nets two additions (+2)");
        assert(events[1]?.date === day2 && events[1]?.delta === -1, "Day 2 nets one removal (-1)");
    },
    async testGetCategoryEventsThrowsForUnknownCategory(assert) {
        const { manager, driver } = await create_test_database();
        await manager.init_tables();
        const analytics = new Analytics(driver, manager);
        let threw = false;
        try {
            await analytics.get_category_events("DoesNotExist");
        }
        catch {
            threw = true;
        }
        assert(threw, "get_category_events throws for a category that doesn't exist");
    },
    // --- 2. ACTIVITY HEATMAP DATA ---
    async testGetActivityCountsRemovalsPerDay(assert) {
        const { manager, driver } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Widgets", weight: 5 });
        await manager.add_boxes({ id: undefined, title: "Shelf", max_load: null });
        const category_id = await get_category_id(manager, "Widgets");
        const box_id = await get_box_id(manager, "Shelf");
        const analytics = new Analytics(driver, manager);
        const day1 = Date.UTC(2026, 0, 10);
        const day2 = day1 + DAY_MS;
        await seed_removed_item(manager, category_id, box_id, day1 - DAY_MS, day1);
        await seed_removed_item(manager, category_id, box_id, day1 - DAY_MS, day1);
        await seed_removed_item(manager, category_id, box_id, day1 - DAY_MS, day2);
        const activity = await analytics.get_activity(day1 - DAY_MS, day2 + DAY_MS);
        assert(activity.length === 2, `Expected 2 active days, got ${activity.length}`);
        const day1_entry = activity.find(a => a.date.getTime() === day1);
        const day2_entry = activity.find(a => a.date.getTime() === day2);
        assert(day1_entry?.count === 2, "Day 1 has two removals");
        assert(day2_entry?.count === 1, "Day 2 has one removal");
    },
    async testGetActivityEmptyRangeReturnsEmpty(assert) {
        const { manager, driver } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Widgets", weight: 5 });
        await manager.add_boxes({ id: undefined, title: "Shelf", max_load: null });
        const analytics = new Analytics(driver, manager);
        const day1 = Date.UTC(2026, 0, 10);
        const activity = await analytics.get_activity(day1, day1 + DAY_MS);
        assert(activity.length === 0, "No removals in range yields an empty activity list");
    },
    async testGetActivityRespectsDateBoundaries(assert) {
        const { manager, driver } = await create_test_database();
        await manager.init_tables();
        await manager.add_categories({ id: undefined, title: "Widgets", weight: 5 });
        await manager.add_boxes({ id: undefined, title: "Shelf", max_load: null });
        const category_id = await get_category_id(manager, "Widgets");
        const box_id = await get_box_id(manager, "Shelf");
        const analytics = new Analytics(driver, manager);
        const day0 = Date.UTC(2026, 0, 9);
        const day1 = Date.UTC(2026, 0, 10);
        const day3 = Date.UTC(2026, 0, 12);
        await seed_removed_item(manager, category_id, box_id, day0 - DAY_MS, day0); // before range
        await seed_removed_item(manager, category_id, box_id, day1 - DAY_MS, day1); // inside range
        await seed_removed_item(manager, category_id, box_id, day3 - DAY_MS, day3); // after range
        const activity = await analytics.get_activity(day1, day1); // range covers only day1
        assert(activity.length === 1, `Expected only the in-range removal, got ${activity.length}`);
        assert(activity[0]?.date.getTime() === day1, "The surviving entry is the one inside the range");
    },
    // --- RUNNER ---
    async run() {
        console.log("📈 Analytics Test Suite");
        const { assert, getStats } = assertFactory();
        await this.testGetCategoryEventsGroupsDeltaByDay(assert);
        await this.testGetCategoryEventsThrowsForUnknownCategory(assert);
        await this.testGetActivityCountsRemovalsPerDay(assert);
        await this.testGetActivityEmptyRangeReturnsEmpty(assert);
        await this.testGetActivityRespectsDateBoundaries(assert);
        const { passed, total } = getStats();
        console.log("-----------------------------------");
        console.log(`Results: ${passed}/${total} tests passed.`);
        return passed === total;
    }
};
//# sourceMappingURL=tests.js.map