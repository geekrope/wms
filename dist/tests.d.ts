export declare const debug = true;
export type AssertFunc = (condition: boolean, name: string) => void;
export declare function assertFactory(): {
    assert: AssertFunc;
    getStats: () => {
        passed: number;
        total: number;
    };
};
export declare const GraphTests: {
    testDijkstraFindsShortestPaths(assert: AssertFunc): void;
    testDijkstraExcludesUnreachableNodes(assert: AssertFunc): void;
    testDetectCycleFindsCycle(assert: AssertFunc): void;
    testDetectCycleAcceptsDAG(assert: AssertFunc): void;
    testDetectCycleThrowsOnUnlabeledNeighbor(assert: AssertFunc): void;
    testBuildGraphRoutesOrphansThroughEntry(assert: AssertFunc): void;
    testBuildGraphAssignsSourceWeightToEdge(assert: AssertFunc): void;
    testBuildGraphDefaultsMissingWeightToZero(assert: AssertFunc): void;
    testBuildGraphSkipsEdgesReferencingUnknownBoxes(assert: AssertFunc): void;
    run(): boolean;
};
export declare const DatabaseTests: {
    testInitTables(assert: AssertFunc): Promise<void>;
    testAddAndGetCategories(assert: AssertFunc): Promise<void>;
    testAddCategoriesUpsertsOnConflict(assert: AssertFunc): Promise<void>;
    testRemoveCategoryBlockedByActiveItems(assert: AssertFunc): Promise<void>;
    testRemoveCategorySucceedsAfterItemRemoved(assert: AssertFunc): Promise<void>;
    testAddItemsRejectsUnknownCategory(assert: AssertFunc): Promise<void>;
    testAddItemsRejectsUnknownBox(assert: AssertFunc): Promise<void>;
    testGetItemsFiltersRemoved(assert: AssertFunc): Promise<void>;
    testUpdateItemMovesBoxAndCategory(assert: AssertFunc): Promise<void>;
    testGetBoxWeightsSumsActiveItems(assert: AssertFunc): Promise<void>;
    testBoxAdjacencyLifecycle(assert: AssertFunc): Promise<void>;
    testRemoveBoxCascadesAdjacency(assert: AssertFunc): Promise<void>;
    testRawQueryAndRunDelegateToDriver(assert: AssertFunc): Promise<void>;
    run(): Promise<boolean>;
};
export declare const AnalyticsTests: {
    testGetCategoryEventsGroupsDeltaByDay(assert: AssertFunc): Promise<void>;
    testGetCategoryEventsThrowsForUnknownCategory(assert: AssertFunc): Promise<void>;
    testGetActivityCountsRemovalsPerDay(assert: AssertFunc): Promise<void>;
    testGetActivityEmptyRangeReturnsEmpty(assert: AssertFunc): Promise<void>;
    testGetActivityRespectsDateBoundaries(assert: AssertFunc): Promise<void>;
    run(): Promise<boolean>;
};
//# sourceMappingURL=tests.d.ts.map