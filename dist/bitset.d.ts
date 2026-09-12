export declare class Bitset {
    data: number[];
    constructor(data?: number[]);
    read_bit(index: number): number;
    set_bit(index: number): void;
    or(another: Bitset): Bitset;
    mask(): boolean[];
    apply<T>(array: T[]): T[];
}
//# sourceMappingURL=bitset.d.ts.map