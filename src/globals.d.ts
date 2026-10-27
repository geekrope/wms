// Libraries loaded by <script> tags in index.html, typed from vendored declarations in types/.
// Type-only: never import these modules as values, there is no module resolver in the browser.
/// <reference path="../types/highlight.js/types/index.d.ts" />
/// <reference path="../types/statistics.js/index.d.ts" />

declare const Plotly: typeof import("plotly.js");
declare const vis: typeof import("vis-network/standalone");
declare const hljs: typeof import("highlight.js").default;
declare const math: typeof import("mathjs");

interface Window {
    initSqlJs?: typeof import("sql.js");
}
