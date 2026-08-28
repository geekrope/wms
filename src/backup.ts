import { LocalFileAdapter, IndexedDbAdapter } from "./persistence.js";
import type { IPersistenceAdapter } from "./persistence.js";
import { add_log_entry, get_element } from "./dom_utils.js";
import { renderPattern } from "./vocab.js";

async function transfer(from: IPersistenceAdapter, to: IPersistenceAdapter): Promise<boolean> {
    const data = await from.load();
    if (data === undefined) return false;
    await to.save(data);
    return true;
}

async function import_backup() {
    const adapter = new LocalFileAdapter("database_backup.sqlite");
    const indexed_db_adapter = new IndexedDbAdapter();

    if(await transfer(adapter, indexed_db_adapter))
    {
        add_log_entry(renderPattern("log_import"), "backupLog");    
        setTimeout(() => window.location.reload(), 1000);
    }    
}

async function export_backup() {
    const adapter = new LocalFileAdapter(`database_backup_${Date.now()}.sqlite`);
    const indexed_db_adapter = new IndexedDbAdapter();

    await transfer(indexed_db_adapter, adapter);
}

export function init_backup() {
    const importBtn = get_element<HTMLButtonElement>("importBtn");
    const exportBtn = get_element<HTMLButtonElement>("exportBtn");

    importBtn.onclick = import_backup;
    exportBtn.onclick = export_backup;

    add_log_entry(renderPattern("initial_log"), "backupLog");
}