export class Item {
    category: string;
    expiration_date: number;
    box: string;
    status: number;
    id: number | undefined;

    constructor(category: string, expiration_date: number, box: string, status: number = 0, id: number | undefined = undefined) {
        this.category = category;
        this.expiration_date = expiration_date;
        this.box = box;
        this.status = status;
        this.id = id;
    }

    static validate(item: any): boolean {
        return typeof item.category === 'string' &&
            item.category.trim().length > 0 &&
            typeof item.expiration_date === 'number' &&
            typeof item.box === 'string' &&
            !isNaN(item.expiration_date);
    }

    static from(item: any) {
        if (!Item.validate(item)) { throw TypeError("Missing required properties: category, expiration_date, box") }
        return new Item(item.category, item.expiration_date, item.box, item.status ?? 0, item.id ?? undefined);
    }
}

export function item_less(a: Item, b: Item): boolean {
    if (a.status != b.status) return a.status > b.status;
    if (a.expiration_date != b.expiration_date) return a.expiration_date < b.expiration_date;

    return true;
}

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