export interface IPersistenceAdapter {
    save(data: Uint8Array): Promise<void>;
    load(): Promise<Uint8Array | undefined>;
}
export declare class DummyPersistenceAdapter implements IPersistenceAdapter {
    save(_data: Uint8Array): Promise<void>;
    load(): Promise<Uint8Array | undefined>;
}
//# sourceMappingURL=persistence.d.ts.map