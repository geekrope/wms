export declare function sift_up<T>(container: Array<T>, index: number, less: (a: T, b: T) => boolean): void;
export declare function sift_down<T>(container: Array<T>, index: number, less: (a: T, b: T) => boolean, length?: number): void;
export declare function insert<T>(container: Array<T>, element: T, less: (a: T, b: T) => boolean): void;
export declare function erase<T>(container: Array<T>, index: number, less: (a: T, b: T) => boolean): void;
export declare function partial_heapsort<T>(container: Array<T>, ptr: number, count: number, less: (a: T, b: T) => boolean): {
    sorted: Array<T>;
    ptr: number;
};
export declare function heapify<T>(container: Array<T>, less: (a: T, b: T) => boolean): void;
//# sourceMappingURL=heap.d.ts.map