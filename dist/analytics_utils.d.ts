import type { IDatabaseDriver } from "./db_driver.js";
import type { DatabaseManager } from "./main.js";
export type TimelinePoint = {
    date: number;
    count: number;
};
export type TimelineEvent = {
    date: number;
    delta: number;
};
export type ActivityEvent = {
    date: number;
    delta: number;
};
export type ActivityCount = {
    date: Date;
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
    get_category_events(category: string): Promise<TimelineEvent[]>;
    get_activity(begin: number, end: number): Promise<ActivityCount[]>;
    get_category_timeline(category: string): Promise<TimelinePoint[]>;
}
//# sourceMappingURL=analytics_utils.d.ts.map