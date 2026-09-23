export class SqlJsDriver {
    db;
    persistence;
    constructor(db, persistence) {
        this.db = db;
        this.persistence = persistence;
    }
    async enable_foreign_keys() {
        await this.db.run("PRAGMA foreign_keys = ON;");
    }
    async assert_foreign_keys_enabled() {
        const result = await this.db.exec("PRAGMA foreign_keys;");
        if (result.length === 0 || result[0].values[0][0] !== 1)
            throw new Error("Foreign key constraints are not enabled in the database.");
    }
    async query_raw(sql, params) {
        await this.enable_foreign_keys();
        await this.assert_foreign_keys_enabled();
        const results = await this.db.exec(sql, params);
        return results;
    }
    async query(sql, ctor, params) {
        await this.enable_foreign_keys();
        await this.assert_foreign_keys_enabled();
        const results = await this.db.exec(sql, params);
        if (results.length === 0)
            return [];
        const { columns, values } = results[0];
        return values.map((row) => {
            const obj = {};
            columns.forEach((col, index) => {
                obj[col] = row[index];
            });
            return ctor(obj);
        });
    }
    async run(sql, params) {
        await this.enable_foreign_keys(); // enable foreign key constraints, as it automatically disables on every update.        
        await this.assert_foreign_keys_enabled();
        await this.db.run(sql, params);
        await this.save();
    }
    async save() {
        const data = await this.db.export();
        await this.persistence.save(data);
    }
}
//# sourceMappingURL=db_driver.js.map