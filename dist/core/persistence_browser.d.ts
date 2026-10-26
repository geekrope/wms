import type { IPersistenceAdapter } from "./persistence.js";
export declare class IndexedDbAdapter implements IPersistenceAdapter {
    private db_name;
    private store_name;
    private key;
    constructor(db_name?: string, store_name?: string, key?: string);
    private get_db;
    save(data: Uint8Array): Promise<void>;
    load(): Promise<Uint8Array | undefined>;
}
export declare class LocalFileAdapter implements IPersistenceAdapter {
    private filename;
    constructor(filename?: string);
    save(data: Uint8Array): Promise<void>;
    load(): Promise<Uint8Array | undefined>;
}
//# sourceMappingURL=persistence_browser.d.ts.map