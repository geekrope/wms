import { Item } from "./types.js";
export declare class BoxElement {
    box: string;
    box_weight: number;
    container: HTMLDivElement;
    private items_list_container;
    constructor(box: string, box_weight: number, item_elements?: HTMLElement[]);
    private bind_drop_events;
}
export declare function create_draggable_item_element(item: Item): HTMLElement;
export declare function refresh_boxes_management(): Promise<void>;
export declare function init_boxes_management(): void;
//# sourceMappingURL=boxes_management.d.ts.map