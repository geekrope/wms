import type { IDatabaseDriver } from "../core/db_driver.js";
import type { DatabaseManager } from "../core/main.js";
export type TimelinePoints = {
    dates: number[];
    counts: number[];
};
export type TimelineEvents = {
    dates: number[];
    deltas: number[];
};
export type ActivityEvent = {
    date: number;
    delta: number;
};
export type ActivityCount = {
    date: Date;
    count: number;
};
export type RangeCount = {
    category: string;
    count: number;
};
export declare class Analytics {
    private db_driver;
    private manager;
    constructor(db_driver: IDatabaseDriver, manager: DatabaseManager);
    private resolve_category_id;
    get_streak(): Promise<number[]>;
    get_max_past_streak(): Promise<{
        value: number;
        start: Date;
    }[]>;
    get_category_events(category: string): Promise<TimelineEvents>;
    get_activity(begin: number, end: number): Promise<ActivityCount[]>;
    get_counts(begin?: number, end?: number): Promise<RangeCount[]>;
}
//# sourceMappingURL=analytics_utils.d.ts.map