export type EnvironmentData = {
    stamps: Date[];
    tmp: number[];
    humidity: number[];
    frequency_ms: number | null; // null when spacing is irregular
};

export interface IEnvironmentProvider {
    get_data(begin: Date, end: Date): Promise<EnvironmentData>;
}

type OpenMeteoResponse = {
    hourly: {
        time: string[];
        temperature_2m: number[];
        relative_humidity_2m: number[];
    };
};

export class OpenMeteoProvider implements IEnvironmentProvider {
    constructor(private lat: number, private lon: number) { }

    public async get_data(begin: Date, end: Date): Promise<EnvironmentData> {
        const url = new URL("https://archive-api.open-meteo.com/v1/archive");
        url.searchParams.set("latitude", String(this.lat));
        url.searchParams.set("longitude", String(this.lon));
        url.searchParams.set("hourly", "temperature_2m,relative_humidity_2m");
        url.searchParams.set("timezone", "UTC");
        url.searchParams.set("start_date", to_date_string(begin));
        url.searchParams.set("end_date", to_date_string(end));

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Open-Meteo request failed: ${response.status} ${response.statusText}`);

        const data = await response.json() as OpenMeteoResponse;
        const stamps = data.hourly.time.map((t) => new Date(`${t}Z`));
        return {
            stamps,
            tmp: data.hourly.temperature_2m,
            humidity: data.hourly.relative_humidity_2m,
            frequency_ms: infer_frequency_ms(stamps),
        };
    }
}

function to_date_string(stamp: Date): string {
    return stamp.toISOString().slice(0, 10);
}

export function infer_frequency_ms(stamps: Date[], tolerance = 0.05): number | null {
    if (stamps.length < 2) return null;

    const gaps = new Array<number>(stamps.length - 1);
    for (let i = 1; i < stamps.length; i++) {
        gaps[i - 1] = stamps[i].getTime() - stamps[i - 1].getTime();
    }

    const sorted = [...gaps].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    if (median <= 0) return null;

    const max_deviation = median * tolerance;
    const is_regular = gaps.every((gap) => Math.abs(gap - median) <= max_deviation);
    return is_regular ? median : null;
}

export const MUNICH_LAT = 48.1372;
export const MUNICH_LON = 11.5755;

export const MOSCOW_LAT = 55.7558;
export const MOSCOW_LON = 37.6173;
