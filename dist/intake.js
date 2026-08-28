import { add_log_entry, get_element, DynamicForm, CategoryInput } from "./dom_utils.js";
import { get_db_manager, get_category_titles, get_box_titles } from "./index.js";
import { renderPattern } from "./vocab.js";
import { Item } from "./types.js";
let intake_form = undefined;
function log_item_addition(success, item) {
    if (success && item) {
        const date_str = new Date(item.expiration_date).toLocaleDateString();
        add_log_entry(renderPattern("log_add_item", {
            cat: item.category,
            date: date_str,
            box: item.box
        }), "intakeLog");
    }
    else {
        add_log_entry(renderPattern("log_add_fail"), "intakeLog", true);
    }
}
async function add_item() {
    if (!intake_form)
        throw new Error("Intake form is not initialized");
    const manager = get_db_manager();
    const values = intake_form.get_values();
    const category = String(values["categoryInput"] ?? "").trim();
    const expiry_date = values["expiryDate"] instanceof Date ? values["expiryDate"] : undefined;
    const box = String(values["boxInput"] ?? "").trim();
    const status = typeof values["status"] === "number" ? values["status"] : 0;
    try {
        if (!category || !box || !expiry_date || isNaN(expiry_date.getTime())) {
            throw new Error("Invalid input values");
        }
        const item = new Item(category, expiry_date.getTime(), box, status);
        await manager.add_items(item);
        log_item_addition(true, item);
        await refresh_intake();
    }
    catch (error) {
        console.error("Failed to add item:", error);
        log_item_addition(false);
    }
}
export function init_intake() {
    const intakeCard = get_element("intakeCard");
    const categories = get_category_titles();
    const boxes = get_box_titles();
    intake_form = new DynamicForm([
        {
            name: "categoryInput",
            label: renderPattern("category_input"),
            placeholder: renderPattern("item_placeholder"),
            type: "categorical",
            categories: categories
        },
        {
            name: "expiryDate",
            label: renderPattern("label_expiry"),
            type: "date"
        },
        {
            name: "boxInput",
            label: renderPattern("label_box"),
            placeholder: renderPattern("box_placeholder"),
            type: "categorical",
            categories: boxes
        },
        {
            name: "status",
            label: renderPattern("label_status"),
            type: "select",
            options: [
                { value: 0, label: renderPattern("status_0") },
                { value: 1, label: renderPattern("status_1") }
            ]
        }
    ], renderPattern("register_item_btn"), async () => {
        await add_item();
    });
    intake_form.form.id = "intakeForm";
    intakeCard.appendChild(intake_form.form);
    add_log_entry(renderPattern("initial_log"), "intakeLog");
}
export function refresh_intake() {
    const category_field = intake_form?.get_field("categoryInput");
    const box_field = intake_form?.get_field("boxInput");
    if (!category_field || !box_field)
        throw new Error("Form fields are not initialized");
    category_field.categories = get_category_titles();
    box_field.categories = get_box_titles();
}
//# sourceMappingURL=intake.js.map