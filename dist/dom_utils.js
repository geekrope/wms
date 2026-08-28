export function get_element(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Element #${id} not found.`);
    return el;
}
export function add_log_entry(message, container_id, is_error = false) {
    const log_element = document.getElementById(container_id);
    if (!log_element)
        return;
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.textContent = message;
    if (is_error)
        entry.style.color = "red";
    log_element.appendChild(entry);
    log_element.scrollTop = log_element.scrollHeight;
}
export function empty_container() {
    const emptyContainer = document.createElement("div");
    emptyContainer.className = "empty-state";
    emptyContainer.innerHTML =
        `<model-viewer 
        src="tin_model.glb"
        environment-image="neutral"
        exposure="1.2"
        light-intensity="3"
        shadow-intensity="0.2" 
        camera-controls 
        rotation-per-second="60deg" 
        orientation="0deg -60deg 0deg" 
        auto-rotate 
        style="width:300px; height:300px;">
    </model-viewer>`;
    /*const img = document.createElement("img");
    img.classList = "empty-state-img";
    img.src = "empty_list.svg";
    img.style.width = "300px";
    img.style.height = "300px";

    emptyContainer.appendChild(img);*/
    return emptyContainer;
}
export class CategoryInput {
    container;
    input;
    datalist;
    on_change;
    _categories = [];
    constructor(input_name, categories = [], placeholder = "", on_change) {
        const datalist_id = `${input_name}-datalist`;
        this.container = document.createElement("div");
        this.input = document.createElement("input");
        this.input.type = "text";
        this.input.id = input_name;
        this.input.name = input_name;
        this.input.placeholder = placeholder;
        this.input.setAttribute("list", datalist_id);
        this.datalist = document.createElement("datalist");
        this.datalist.id = datalist_id;
        this.container.appendChild(this.input);
        this.container.appendChild(this.datalist);
        this.on_change = on_change;
        this.input.addEventListener("change", (() => { if (this.on_change !== undefined)
            this.on_change(this.input.value.trim()); }).bind(this));
        this.categories = categories;
    }
    get categories() {
        return this._categories;
    }
    set categories(new_categories) {
        this._categories = new_categories;
        this.update_datalist();
    }
    update_datalist() {
        this.datalist.textContent = "";
        for (const cat of this.categories) {
            const option = document.createElement("option");
            option.value = cat;
            this.datalist.appendChild(option);
        }
    }
    get value() {
        return this.input.value.trim();
    }
    set value(val) {
        this.input.value = val;
    }
}
export class DynamicForm {
    form;
    fields = new Map();
    submit_button;
    constructor(schema, submit_label = "Submit", on_submit) {
        this.form = document.createElement("form");
        for (const field of schema) {
            this.add_field(field);
        }
        this.submit_button = this.build_submit_button(submit_label);
        this.form.appendChild(this.submit_button);
        if (on_submit) {
            this.form.addEventListener("submit", (e) => {
                e.preventDefault();
                on_submit(this.get_values());
            });
        }
    }
    add_field(field) {
        const form_group = document.createElement("div");
        form_group.className = "form-group";
        const label = document.createElement("label");
        label.textContent = field.label;
        label.htmlFor = field.name;
        form_group.appendChild(label);
        let control;
        switch (field.type) {
            case "categorical": {
                const cat_input = this.build_categorical_input(field);
                control = cat_input;
                form_group.appendChild(cat_input.container);
                break;
            }
            case "select": {
                const select = this.build_select_input(field);
                control = select;
                form_group.appendChild(select);
                break;
            }
            case "text":
            case "date": {
                const input = this.build_standard_input(field);
                control = input;
                form_group.appendChild(input);
                break;
            }
            case "number": {
                const input = this.build_numerical_input(field);
                control = input;
                form_group.appendChild(input);
                break;
            }
        }
        this.fields.set(field.name, control);
        this.form.appendChild(form_group);
    }
    build_categorical_input(field) {
        const cat_input = new CategoryInput(field.name, field.categories ?? [], field.placeholder ?? "", field.on_change);
        cat_input.input.required = field.required ?? true;
        return cat_input;
    }
    build_select_input(field) {
        const select = document.createElement("select");
        select.id = field.name;
        select.name = field.name;
        select.required = field.required ?? true;
        for (const opt of field.options) {
            const option_el = document.createElement("option");
            option_el.value = String(opt.value);
            option_el.textContent = opt.label;
            select.appendChild(option_el);
        }
        return select;
    }
    build_standard_input(field) {
        const input = document.createElement("input");
        input.id = field.name;
        input.name = field.name;
        input.placeholder = field.placeholder ?? "";
        input.required = field.required ?? true;
        if (field.type === "date") {
            input.type = "date";
        }
        else {
            input.type = "text";
        }
        return input;
    }
    build_numerical_input(field) {
        const input = document.createElement("input");
        input.id = field.name;
        input.name = field.name;
        input.required = field.required ?? true;
        input.type = "number";
        if (field.step !== undefined)
            input.step = String(field.step);
        if (field.min !== undefined)
            input.min = String(field.min);
        if (field.max !== undefined)
            input.max = String(field.max);
        return input;
    }
    build_submit_button(submit_label) {
        const button = document.createElement("button");
        button.type = "submit";
        button.className = "btn-primary";
        button.textContent = submit_label;
        return button;
    }
    get_values() {
        const result = {};
        for (const [name, control] of this.fields) {
            if (control instanceof CategoryInput) {
                result[name] = control.value;
            }
            else if (control instanceof HTMLSelectElement) {
                const num = Number(control.value);
                result[name] = isNaN(num) ? control.value : num;
            }
            else if (control.type === "number") {
                result[name] = isNaN(control.valueAsNumber) ? undefined : control.valueAsNumber;
            }
            else if (control.type === "date") {
                result[name] = control.valueAsDate ?? undefined;
            }
            else {
                result[name] = control.value || undefined;
            }
        }
        return result;
    }
    update_categories(name, categories) {
        const control = this.fields.get(name);
        if (control instanceof CategoryInput) {
            control.categories = categories;
        }
    }
    get_field(name) {
        return this.fields.get(name);
    }
    reset() {
        this.form.reset();
        for (const control of this.fields.values()) {
            if (control instanceof CategoryInput) {
                control.value = "";
            }
        }
    }
}
//# sourceMappingURL=dom_utils.js.map