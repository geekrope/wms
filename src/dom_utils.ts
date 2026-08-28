export function get_element<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found.`);
    return el as T;
}

export function add_log_entry(message: string, container_id: string, is_error: boolean = false) {
    const log_element = document.getElementById(container_id) as HTMLDivElement | null;
    if (!log_element) return;
    const entry = document.createElement("div");

    entry.className = "log-entry";
    entry.textContent = message;
    if (is_error) entry.style.color = "red";

    log_element.appendChild(entry);
    log_element.scrollTop = log_element.scrollHeight;
}

export function empty_container(): HTMLDivElement {
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
    public container: HTMLDivElement;
    public input: HTMLInputElement;
    public datalist: HTMLDataListElement;
    public on_change: ((value: string) => void) | undefined;
    private _categories: string[] = [];

    constructor(
        input_name: string,
        categories: string[] = [],
        placeholder: string = "",
        on_change?: (value: string) => void
    ) {
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

        this.input.addEventListener("change", (() => { if (this.on_change !== undefined) this.on_change(this.input.value.trim()); }).bind(this));
        this.categories = categories;
    }

    public get categories(): string[] {
        return this._categories;
    }

    public set categories(new_categories: string[]) {
        this._categories = new_categories;
        this.update_datalist();
    }

    public update_datalist(): void {
        this.datalist.textContent = "";

        for (const cat of this.categories) {
            const option = document.createElement("option");
            option.value = cat;
            this.datalist.appendChild(option);
        }
    }

    public get value(): string {
        return this.input.value.trim();
    }

    public set value(val: string) {
        this.input.value = val;
    }
}

export type BaseFieldConfig = {
    name: string;
    label: string;
    required?: boolean;
};

export type StandardFieldConfig = BaseFieldConfig & {
    type: "text" | "date";
    placeholder?: string;
};

export type NumericalFieldConfig = BaseFieldConfig & {
    type: "number";
    step?: number;
    min?: number;
    max?: number;
};

export type CategoricalFieldConfig = BaseFieldConfig & {
    type: "categorical";
    placeholder?: string;
    categories?: string[];
    on_change?: (value: string) => void;
};

export type SelectOption = {
    value: string | number;
    label: string;
};

export type SelectFieldConfig = BaseFieldConfig & {
    type: "select";
    options: SelectOption[];
};

export type FieldConfig = StandardFieldConfig | NumericalFieldConfig | CategoricalFieldConfig | SelectFieldConfig;

export type FormFieldControl = HTMLInputElement | CategoryInput | HTMLSelectElement;

export type FormValues = Record<string, string | number | Date | undefined>;

export class DynamicForm {
    public form: HTMLFormElement;
    public fields: Map<string, FormFieldControl> = new Map();
    public submit_button: HTMLButtonElement;

    constructor(
        schema: FieldConfig[],
        submit_label: string = "Submit",
        on_submit?: (values: FormValues) => void
    ) {
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

    private add_field(field: FieldConfig): void {
        const form_group = document.createElement("div");
        form_group.className = "form-group";

        const label = document.createElement("label");
        label.textContent = field.label;
        label.htmlFor = field.name;
        form_group.appendChild(label);

        let control: FormFieldControl;

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

    private build_categorical_input(field: CategoricalFieldConfig): CategoryInput {
        const cat_input = new CategoryInput(
            field.name,
            field.categories ?? [],
            field.placeholder ?? "",
            field.on_change
        );
        cat_input.input.required = field.required ?? true;
        return cat_input;
    }

    private build_select_input(field: SelectFieldConfig): HTMLSelectElement {
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

    private build_standard_input(field: StandardFieldConfig): HTMLInputElement {
        const input = document.createElement("input");
        input.id = field.name;
        input.name = field.name;
        input.placeholder = field.placeholder ?? "";
        input.required = field.required ?? true;

        if (field.type === "date") {
            input.type = "date";
        } else {
            input.type = "text";
        }

        return input;
    }

    private build_numerical_input(field: NumericalFieldConfig): HTMLInputElement {
        const input = document.createElement("input");
        input.id = field.name;
        input.name = field.name;
        input.required = field.required ?? true;
        input.type = "number";

        if (field.step !== undefined) input.step = String(field.step);
        if (field.min !== undefined) input.min = String(field.min);
        if (field.max !== undefined) input.max = String(field.max);

        return input;
    }

    private build_submit_button(submit_label: string): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "submit";
        button.className = "btn-primary";
        button.textContent = submit_label;
        return button;
    }

    public get_values(): FormValues {
        const result: FormValues = {};
        for (const [name, control] of this.fields) {
            if (control instanceof CategoryInput) {
                result[name] = control.value;
            } else if (control instanceof HTMLSelectElement) {
                const num = Number(control.value);
                result[name] = isNaN(num) ? control.value : num;
            } else if (control.type === "number") {
                result[name] = isNaN(control.valueAsNumber) ? undefined : control.valueAsNumber;
            } else if (control.type === "date") {
                result[name] = control.valueAsDate ?? undefined;
            } else {
                result[name] = control.value || undefined;
            }
        }
        return result;
    }

    public update_categories(name: string, categories: string[]): void {
        const control = this.fields.get(name);
        if (control instanceof CategoryInput) {
            control.categories = categories;
        }
    }

    public get_field<T extends HTMLInputElement | CategoryInput | HTMLSelectElement>(name: string): T | undefined {
        return this.fields.get(name) as T | undefined;
    }

    public reset(): void {
        this.form.reset();
        for (const control of this.fields.values()) {
            if (control instanceof CategoryInput) {
                control.value = "";
            }
        }
    }
}