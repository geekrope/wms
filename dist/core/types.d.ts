export declare class Item {
    category: string;
    expiration_date: number;
    box: string;
    status: number;
    id: number | undefined;
    constructor(category: string, expiration_date: number, box: string, status?: number, id?: number | undefined);
    static validate(item: any): boolean;
    static from(item: any): Item;
}
export declare function item_less(a: Item, b: Item): boolean;
export type Category = {
    id: number | undefined;
    title: string;
    weight: number | null;
};
export type Box = {
    id: number | undefined;
    title: string;
    max_load: number | null;
};
//# sourceMappingURL=types.d.ts.map