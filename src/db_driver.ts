import type { IPersistenceAdapter } from "./persistence.js";

export type SqlParams = any[] | Record<string, any>;
export type Constructor<T> = (...args: any[]) => T;

export interface IDatabaseDriver {
    query_raw(sql: string, params?: SqlParams): Promise<any[]>;
    query<T>(sql: string, ctor: Constructor<T>, params?: SqlParams): Promise<T[]>;
    run(sql: string, params?: SqlParams): Promise<void>;
}

export class SqlJsDriver implements IDatabaseDriver {
    constructor(private db: any, private persistence: IPersistenceAdapter) { }

    async enable_foreign_keys(): Promise<void> {
        await this.db.run("PRAGMA foreign_keys = ON;");
    }

    async assert_foreign_keys_enabled(): Promise<void> {
        const result = await this.db.exec("PRAGMA foreign_keys;");
        if (result.length === 0 || result[0].values[0][0] !== 1) throw new Error("Foreign key constraints are not enabled in the database.");
    }

    async query_raw(sql: string, params: SqlParams): Promise<any[]> {
        await this.enable_foreign_keys();
        await this.assert_foreign_keys_enabled();
        const results = await this.db.exec(sql, params);
        return results;
    }

    async query<T>(sql: string, ctor: Constructor<T>, params: SqlParams): Promise<T[]> {
        await this.enable_foreign_keys();
        await this.assert_foreign_keys_enabled();
        const results = await this.db.exec(sql, params);
        if (results.length === 0) return [];

        const { columns, values } = results[0];   

        return values.map((row: Array<any>) => {
            const obj: Record<string, any> = {};

            columns.forEach((col: string, index: number) => {
                obj[col] = row[index];
            });

            return ctor(obj);
        });
    }

    async run(sql: string, params: SqlParams): Promise<void> {
        await this.enable_foreign_keys()  // enable foreign key constraints, as it automatically disables on every update.        
        await this.assert_foreign_keys_enabled();
        await this.db.run(sql, params);
        await this.save();        
    }

    public async save(): Promise<void> {
        const data: Uint8Array = await this.db.export();
        await this.persistence.save(data);
    }
}