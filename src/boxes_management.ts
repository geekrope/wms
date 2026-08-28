import { add_log_entry, empty_container, get_element, DynamicForm } from "./dom_utils.js";
import { get_db_manager, reload_boxes, get_box_titles } from "./index.js";
import { renderPattern, repr } from "./vocab.js";
import { Item, type Box } from "./types.js";
import { refresh_boxes_graph, init_boxes_graph } from "./boxes_graph.js";
import { heapify, partial_heapsort } from "./heap.js";

//TODO: think if add/amend button should be added. same applies to categories management

export class BoxElement {
    public container: HTMLDivElement;
    private items_list_container: HTMLDivElement;

    constructor(
        public box: string,
        public box_weight: number,
        item_elements: HTMLElement[] = []
    ) {
        this.container = document.createElement("div");
        this.container.className = "box-card";

        const header = document.createElement("div");
        header.className = "box-header";

        const title = document.createElement("span");
        title.className = "box-title";
        title.textContent = `📦 ${renderPattern("box")} ${box}, ${renderPattern("weight", { "weight": box_weight })}`;

        const badge = document.createElement("span");
        badge.className = "count-badge";
        badge.textContent = renderPattern("box_item_count", { count: item_elements.length });

        header.appendChild(title);
        header.appendChild(badge);

        this.items_list_container = document.createElement("div");
        this.items_list_container.className = "box-items-list";
        this.items_list_container.style.overflowY = "auto";
        this.items_list_container.style.maxHeight = "300px";

        for (const el of item_elements) {
            this.items_list_container.appendChild(el);
        }

        this.container.appendChild(header);
        this.container.appendChild(this.items_list_container);

        this.bind_drop_events();
    }

    private bind_drop_events(): void {
        this.container.addEventListener("dragover", (e: DragEvent) => {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = "move";
            }
            this.container.classList.add("drag-over");
        });

        this.container.addEventListener("dragleave", (_e: DragEvent) => {
            this.container.classList.remove("drag-over");
        });

        this.container.addEventListener("drop", async (e: DragEvent) => {
            e.preventDefault();
            this.container.classList.remove("drag-over");

            if (!e.dataTransfer) return;

            let item: Item;

            try {
                const raw_content = JSON.parse(e.dataTransfer?.getData("text/plain"));

                item = Item.from(raw_content);
                if (item.id === undefined) return;
            }
            catch (err) {
                if (err instanceof SyntaxError || err instanceof TypeError) {
                    return;
                }
                else {
                    throw err;
                }
            }

            try {
                const manager = get_db_manager();
                await manager.update_item(item.id, { box: this.box });

                add_log_entry(
                    renderPattern("log_move", {
                        meta: repr(item),
                        box: this.box
                    }),
                    "boxesLog"
                );

                await refresh_boxes_management();
            } catch (err) {
                console.error("Failed to move item to box:", err);
                add_log_entry(
                    renderPattern("log_move_fail", {
                        meta: repr(item),
                        box: this.box
                    }),
                    "boxesLog",
                    true
                );
            }
        });
    }
}

let drag_autoscroll_active = false;
let current_cursor_x = 0;
let current_cursor_y = 0;
let animation_frame_id: number | null = null;

const BOUNDARY_THRESHOLD = 80;
const MAX_SCROLL_SPEED = 22;

function autoscroll_step(): void {
    if (!drag_autoscroll_active) {
        animation_frame_id = null;
        return;
    }

    const vWidth = window.innerWidth;
    const vHeight = window.innerHeight;

    let deltaX = 0;
    let deltaY = 0;

    if (current_cursor_y < BOUNDARY_THRESHOLD) {
        const factor = Math.min(1, Math.max(0, (BOUNDARY_THRESHOLD - current_cursor_y) / BOUNDARY_THRESHOLD));
        deltaY = -Math.max(2, Math.round(factor * MAX_SCROLL_SPEED));
    }
    else if (current_cursor_y > vHeight - BOUNDARY_THRESHOLD) {
        const factor = Math.min(1, Math.max(0, (current_cursor_y - (vHeight - BOUNDARY_THRESHOLD)) / BOUNDARY_THRESHOLD));
        deltaY = Math.max(2, Math.round(factor * MAX_SCROLL_SPEED));
    }

    if (current_cursor_x < BOUNDARY_THRESHOLD) {
        const factor = Math.min(1, Math.max(0, (BOUNDARY_THRESHOLD - current_cursor_x) / BOUNDARY_THRESHOLD));
        deltaX = -Math.max(2, Math.round(factor * MAX_SCROLL_SPEED));
    }
    else if (current_cursor_x > vWidth - BOUNDARY_THRESHOLD) {
        const factor = Math.min(1, Math.max(0, (current_cursor_x - (vWidth - BOUNDARY_THRESHOLD)) / BOUNDARY_THRESHOLD));
        deltaX = Math.max(2, Math.round(factor * MAX_SCROLL_SPEED));
    }

    if (deltaX !== 0 || deltaY !== 0) {
        const main_wrapper = document.querySelector(".main-wrapper") as HTMLElement | null;
        if (main_wrapper) {
            main_wrapper.scrollTop += deltaY;
            main_wrapper.scrollLeft += deltaX;
        }
        window.scrollBy(deltaX, deltaY);
    }

    animation_frame_id = requestAnimationFrame(autoscroll_step);
}

function start_drag_autoscroll(e: DragEvent): void {
    drag_autoscroll_active = true;
    if (e.clientX !== 0 || e.clientY !== 0) {
        current_cursor_x = e.clientX;
        current_cursor_y = e.clientY;
    }
    if (!animation_frame_id) {
        animation_frame_id = requestAnimationFrame(autoscroll_step);
    }
}

function update_drag_autoscroll_cursor(e: DragEvent): void {
    if (e.clientX !== 0 || e.clientY !== 0) {
        current_cursor_x = e.clientX;
        current_cursor_y = e.clientY;
    }
}

function stop_drag_autoscroll(): void {
    drag_autoscroll_active = false;
    if (animation_frame_id !== null) {
        cancelAnimationFrame(animation_frame_id);
        animation_frame_id = null;
    }
}

export function create_draggable_item_element(item: Item): HTMLElement {
    const card = document.createElement("div");
    card.className = "item-card draggable-item-card";
    card.draggable = true;

    const info = document.createElement("div");
    info.className = "item-info";

    const caption = document.createElement("div");
    caption.className = "item-caption";
    const date_str = new Date(item.expiration_date).toLocaleDateString();
    const status_str = renderPattern(item.status === 0 ? "status_0" : "status_1");
    caption.textContent = renderPattern("list_item_label", {
        date: date_str,
        status: status_str
    });

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = item.category;

    info.appendChild(caption);
    info.appendChild(meta);
    card.appendChild(info);

    card.addEventListener("dragstart", (e: DragEvent) => {
        if (e.dataTransfer) {
            e.dataTransfer.setData("text/plain", JSON.stringify(item));
            e.dataTransfer.effectAllowed = "move";
        }
        start_drag_autoscroll(e);
    });

    card.addEventListener("drag", (e: DragEvent) => {
        update_drag_autoscroll_cursor(e);
    });

    card.addEventListener("dragend", () => {
        stop_drag_autoscroll();
    });

    return card;
}

export async function refresh_boxes_management(): Promise<void> {
    const boxes_container = get_element<HTMLDivElement>("boxesContainer");
    boxes_container.textContent = "";

    const manager = get_db_manager();
    const boxes = await reload_boxes();
    const box_weights = await manager.get_box_weights();
    const weight_map = new Map<string, number>(box_weights.map(entry => [entry.box, entry.total_weight]));

    if (boxes.length === 0) {
        boxes_container.appendChild(empty_container());
        await refresh_boxes_graph();
        return;
    }

    const comparator = (a: Item, b: Item): boolean => {
        if(a.category != b.category) return a.category < b.category;
        if(a.status != b.status) return a.status > b.status;
        
        return a.expiration_date < b.expiration_date;
    }
    let current_category = "";
    // Use heap for sorting items by date, status and lexicographicaly by category
    for (const box of boxes) {
        const total_weight = weight_map.get(box.title) ?? 0;
        const items = await manager.get_box_content(box.title);
        const item_elements = []

        heapify(items, comparator);
        const sorted_items = partial_heapsort(items, items.length - 1, items.length, comparator).sorted;

        for (const item of sorted_items) {
            if (item.category !== current_category) {
                current_category = item.category;
                const category_header = document.createElement("span");
                category_header.textContent = current_category;
                category_header.style.fontWeight = "bold";
                category_header.style.marginBottom = "10px";
                item_elements.push(category_header);
            }
            item_elements.push(create_draggable_item_element(item));
        }

        const box_el = new BoxElement(box.title, total_weight, item_elements);
        boxes_container.appendChild(box_el.container);
    }

    await refresh_boxes_graph();
}

export function init_boxes_management(): void {
    const form = new DynamicForm([
        {
            name: "boxTitle",
            type: "text",
            label: renderPattern("box_title_label"),
            placeholder: renderPattern("box_placeholder")
        },
        {
            name: "maxLoad",
            type: "number",
            label: renderPattern("label_max_load"),
            required: false
        }], renderPattern("add_box_btn"), async (values) => {
            try
            {
                const title = String(values["boxTitle"] ?? "").trim();
                const max_load = typeof values["maxLoad"] === "number" && !isNaN(values["maxLoad"]) ? values["maxLoad"] : null;

                if (get_box_titles().includes(title)) throw new Error("Box already exists");

                const box: Box = { id: undefined, title, max_load };
                const manager = get_db_manager();

                await manager.add_boxes(box);
                await refresh_boxes_management();

                add_log_entry(renderPattern("log_add_box", { title }), "boxesLog");
            }
            catch (err) {
                console.error("Failed to add box:", err);
                add_log_entry(renderPattern("log_add_box_fail", { error: String(err) }), "boxesLog", true);
            }
        });
        
    const form_container = get_element<HTMLDivElement>("boxAddCard");
    form_container.appendChild(form.form);

    add_log_entry(renderPattern("initial_log"), "boxesLog");

    document.addEventListener("dragover", (e: DragEvent) => {
        if (drag_autoscroll_active) {
            update_drag_autoscroll_cursor(e);
        }
    });

    document.addEventListener("dragend", () => {
        stop_drag_autoscroll();
    });

    document.addEventListener("drop", () => {
        stop_drag_autoscroll();
    });

    init_boxes_graph();
}