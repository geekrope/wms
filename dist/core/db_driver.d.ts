import type { IPersistenceAdapter } from "./persistence.js";
import type { BindParams, Database, QueryExecResult } from "sql.js";
export type Constructor<T> = (...args: any[]) => T;
export interface IDatabaseDriver {
    query_raw(sql: string, params?: BindParams): Promise<QueryExecResult[]>;
    query<T>(sql: string, ctor: Constructor<T>, params?: BindParams): Promise<T[]>;
    run(sql: string, params?: BindParams): Promise<void>;
}
export declare class SqlJsDriver implements IDatabaseDriver {
    private db;
    private persistence;
    constructor(db: Database, persistence: IPersistenceAdapter);
    enable_foreign_keys(): Promise<void>;
    assert_foreign_keys_enabled(): Promise<void>;
    query_raw(sql: string, params: BindParams): Promise<QueryExecResult[]>;
    query<T>(sql: string, ctor: Constructor<T>, params: BindParams): Promise<T[]>;
    run(sql: string, params: BindParams): Promise<void>;
    save(): Promise<void>;
}
//# sourceMappingURL=db_driver.d.ts.map