export type EnvironmentData = {
    stamps: Date[];
    tmp: number[];
    humidity: number[];
    frequency_ms: number | null;
};
export interface IEnvironmentProvider {
    get_data(begin: Date, end: Date): Promise<EnvironmentData>;
}
export declare class OpenMeteoProvider implements IEnvironmentProvider {
    private lat;
    private lon;
    constructor(lat: number, lon: number);
    get_data(begin: Date, end: Date): Promise<EnvironmentData>;
}
export declare function infer_frequency_ms(stamps: Date[], tolerance?: number): number | null;
export declare const MUNICH_LAT = 48.1372;
export declare const MUNICH_LON = 11.5755;
export declare const MOSCOW_LAT = 55.7558;
export declare const MOSCOW_LON = 37.6173;
//# sourceMappingURL=environment_provider.d.ts.map