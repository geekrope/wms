export interface IPersistenceAdapter {
    save(data: Uint8Array): Promise<void>;
    load(): Promise<Uint8Array | undefined>;
}

export class DummyPersistenceAdapter implements IPersistenceAdapter {
    async save(_data: Uint8Array): Promise<void> {

    }
    async load(): Promise<Uint8Array | undefined> {
        return undefined;
    }
}

export class IndexedDbAdapter implements IPersistenceAdapter {
    constructor(
        private db_name = "sqlite_db", 
        private store_name = "sqlite_store", 
        private key = "db_binary"
    ) {}

    private async get_db(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.db_name, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.store_name)) {
                    db.createObjectStore(this.store_name);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async save(data: Uint8Array): Promise<void> {
        const db = await this.get_db();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.store_name, "readwrite");
            tx.objectStore(this.store_name).put(data, this.key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async load(): Promise<Uint8Array | undefined> {
        const db = await this.get_db();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.store_name, "readonly");
            const request = tx.objectStore(this.store_name).get(this.key);
            
            request.onsuccess = () => resolve((request.result as Uint8Array) || undefined);
            request.onerror = () => reject(request.error);
        });
    }
}

export class LocalFileAdapter implements IPersistenceAdapter {
    constructor(private filename: string = "database.sqlite") {}

    async save(data: Uint8Array): Promise<void> {
        const blob = new Blob([data as unknown as BlobPart], { type: "application/x-sqlite3" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = this.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async load(): Promise<Uint8Array | undefined> {
        return new Promise((resolve) => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".sqlite,.db,.sql";

            input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) {
                    resolve(undefined);
                    return;
                }
                const array_buffer = await file.arrayBuffer();
                resolve(new Uint8Array(array_buffer));
            };

            input.oncancel = () => {
                resolve(undefined);
            };

            input.click();
        });
    }
}