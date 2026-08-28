export declare function get_element<T extends HTMLElement>(id: string): T;
export declare function add_log_entry(message: string, container_id: string, is_error?: boolean): void;
export declare function empty_container(): HTMLDivElement;
export declare class CategoryInput {
    container: HTMLDivElement;
    input: HTMLInputElement;
    datalist: HTMLDataListElement;
    on_change: ((value: string) => void) | undefined;
    private _categories;
    constructor(input_name: string, categories?: string[], placeholder?: string, on_change?: (value: string) => void);
    get categories(): string[];
    set categories(new_categories: string[]);
    update_datalist(): void;
    get value(): string;
    set value(val: string);
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
export declare class DynamicForm {
    form: HTMLFormElement;
    fields: Map<string, FormFieldControl>;
    submit_button: HTMLButtonElement;
    constructor(schema: FieldConfig[], submit_label?: string, on_submit?: (values: FormValues) => void);
    private add_field;
    private build_categorical_input;
    private build_select_input;
    private build_standard_input;
    private build_numerical_input;
    private build_submit_button;
    get_values(): FormValues;
    update_categories(name: string, categories: string[]): void;
    get_field<T extends HTMLInputElement | CategoryInput | HTMLSelectElement>(name: string): T | undefined;
    reset(): void;
}
//# sourceMappingURL=dom_utils.d.ts.map