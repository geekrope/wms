import { add_log_entry, get_element, DynamicForm } from "./dom_utils.js";
import { get_db_manager, reload_categories, get_categories_list } from "./index.js";
import type { Category } from "./types.js";
import { renderPattern, repr } from "./vocab.js";

let category_form: DynamicForm | undefined = undefined;

async function add_category() {
    if (!category_form) return;
    const manager = get_db_manager();
    const values = category_form.get_values();
    const category_name = String(values["newCategory"] ?? "").trim();
    const category_weight = values["weight"];
    const category: Category = {
        id: undefined,
        title: category_name,
        weight: (typeof category_weight == "number" && !isNaN(category_weight)) ? Number(category_weight) : null
    };

    try {
        if (get_categories_list().some(c => c.title === category.title)) throw new Error("Category already exists");

        await manager.add_categories(category);
        category_form.reset();
        await refresh_category_management();
        add_log_entry(renderPattern("log_add_cat", { val: repr(category) }), "categoriesLog");
    } catch (error) {
        console.error("Failed to add category:", error);
        add_log_entry(renderPattern("log_add_cat_fail"), "categoriesLog", true);
    }
}

export async function init_category_management() {
    const categoryCard = get_element<HTMLDivElement>("categoryCard");

    category_form = new DynamicForm(
        [
            {
                name: "newCategory",
                label: renderPattern("category_title_label"),
                placeholder: renderPattern("category_input"),
                type: "text"
            },
            {
                name: "weight",
                label: renderPattern("category_weight_label"),
                type: "number",
                step: 0.01,
                min: 0,
                required: false
            }
        ],
        renderPattern("add_category_btn"),
        async () => {
            await add_category();
        }
    );
    category_form.form.id = "categoryForm";
    categoryCard.appendChild(category_form.form);

    await refresh_category_management();
    add_log_entry(renderPattern("initial_log"), "categoriesLog");
}

export async function refresh_category_management() {
    const categoriesList = document.getElementById("categoriesList") as HTMLDivElement | null;
    if (!categoriesList) return;
    categoriesList.textContent = "";

    const categories = await reload_categories();

    for (const cat of categories) {
        const card = document.createElement("div");
        card.className = "item-card";

        const info = document.createElement("div");
        info.className = "item-info";

        const name = document.createElement("div");
        name.className = "item-caption";
        name.textContent = cat.title;

        const weight = document.createElement("div");
        weight.className = "item-meta";
        weight.textContent = renderPattern("weight", { weight: cat.weight !== null ? cat.weight.toString() : "N/A" });

        const btnGroup = document.createElement("div");
        btnGroup.className = "button-group";
        btnGroup.style.marginTop = "0";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-danger";
        deleteBtn.textContent = renderPattern("btn_delete");
        deleteBtn.addEventListener("click", async () => {
            try {
                const manager = get_db_manager();
                await manager.remove_category(cat.title);
                await refresh_category_management();
                add_log_entry(renderPattern("log_delete_cat", { val: repr(cat) }), "categoriesLog");
            } catch (error) {
                console.error("Failed to delete category:", error);
                add_log_entry(renderPattern("log_delete_cat_fail"), "categoriesLog", true);
            }
        });

        btnGroup.appendChild(deleteBtn);
        info.appendChild(name);
        info.appendChild(weight);
        card.appendChild(info);
        card.appendChild(btnGroup);
        categoriesList.appendChild(card);
    }
}
