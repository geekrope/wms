export interface IPersistenceAdapter {
    save(data: Uint8Array): Promise<void>;
    load(): Promise<Uint8Array | undefined>;
}

export class DummyPersistenceAdapter implements IPersistenceAdapter {
    async save(_data: Uint8Array): Promise<void> { }
    async load(): Promise<Uint8Array | undefined> {
        return undefined;
    }
}