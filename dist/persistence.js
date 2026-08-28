export class DummyPersistenceAdapter {
    async save(_data) {
    }
    async load() {
        return undefined;
    }
}
export class IndexedDbAdapter {
    db_name;
    store_name;
    key;
    constructor(db_name = "sqlite_db", store_name = "sqlite_store", key = "db_binary") {
        this.db_name = db_name;
        this.store_name = store_name;
        this.key = key;
    }
    async get_db() {
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
    async save(data) {
        const db = await this.get_db();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.store_name, "readwrite");
            tx.objectStore(this.store_name).put(data, this.key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    async load() {
        const db = await this.get_db();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.store_name, "readonly");
            const request = tx.objectStore(this.store_name).get(this.key);
            request.onsuccess = () => resolve(request.result || undefined);
            request.onerror = () => reject(request.error);
        });
    }
}
export class LocalFileAdapter {
    filename;
    constructor(filename = "database.sqlite") {
        this.filename = filename;
    }
    async save(data) {
        const blob = new Blob([data], { type: "application/x-sqlite3" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = this.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    async load() {
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
//# sourceMappingURL=persistence.js.map