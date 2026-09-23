import type { IPersistenceAdapter } from "./persistence.js";
export type SqlParams = any[] | Record<string, any>;
export type Constructor<T> = (...args: any[]) => T;
export interface IDatabaseDriver {
    query_raw(sql: string, params?: SqlParams): Promise<any[]>;
    query<T>(sql: string, ctor: Constructor<T>, params?: SqlParams): Promise<T[]>;
    run(sql: string, params?: SqlParams): Promise<void>;
}
export declare class SqlJsDriver implements IDatabaseDriver {
    private db;
    private persistence;
    constructor(db: any, persistence: IPersistenceAdapter);
    enable_foreign_keys(): Promise<void>;
    assert_foreign_keys_enabled(): Promise<void>;
    query_raw(sql: string, params: SqlParams): Promise<any[]>;
    query<T>(sql: string, ctor: Constructor<T>, params: SqlParams): Promise<T[]>;
    run(sql: string, params: SqlParams): Promise<void>;
    save(): Promise<void>;
}
//# sourceMappingURL=db_driver.d.ts.map