import { Analytics } from "./analytics_utils.js";
import { type IDatabaseDriver } from "./db_driver.js";
import { type DatabaseManager } from "./main.js";
import { CategoryInput } from "./dom_utils.js";
export declare let analytics_category_input: CategoryInput | undefined;
export declare function get_analytics_object(): Analytics;
export declare function refresh_analytics(): Promise<void>;
export declare function init_analytics(db_driver: IDatabaseDriver, manager: DatabaseManager): Promise<void>;
//# sourceMappingURL=analytics.d.ts.map