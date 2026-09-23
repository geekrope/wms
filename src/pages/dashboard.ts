import { get_element, add_log_entry } from "./dom_utils.js";
import { get_db_manager, reload_categories } from "./index.js";

declare const hljs: any;

function updateHighlight(code_block: HTMLElement, input: HTMLElement): void {
    let content = input.innerText;

    code_block.textContent = content;
    code_block.removeAttribute('data-highlighted');
    hljs.highlightElement(code_block);
}

function render_status(container: HTMLElement, message: string, is_error: boolean): void {
    const status = document.createElement("div");
    status.className = is_error ? "query-status error" : "query-status success";
    status.textContent = message;

    container.textContent = "";
    container.appendChild(status);
}

export function init_dashboard(): void {
    const query_editor = get_element<HTMLElement>("queryEditor");
    const query_editor_input = get_element<HTMLElement>("queryEditorInput");
    const mutation_editor = get_element<HTMLElement>("mutationEditor");
    const mutation_editor_input = get_element<HTMLElement>("mutationEditorInput");

    query_editor_input.oninput = () => {
        updateHighlight(query_editor, query_editor_input);
    }

    mutation_editor_input.oninput = () => {
        updateHighlight(mutation_editor, mutation_editor_input);
    }

    const executeQueryBtn = get_element<HTMLButtonElement>("executeSelectBtn");
    executeQueryBtn.addEventListener("click", async () => {
        await execute_read_query();
    });

    const executeMutationBtn = get_element<HTMLButtonElement>("executeMutationBtn");
    executeMutationBtn.addEventListener("click", async () => {
        await execute_mutation_query();
    });

    const clearQueryBtn = get_element<HTMLButtonElement>("clearSelectBtn");
    clearQueryBtn.addEventListener("click", () => {
        query_editor.textContent = "";
        const resultsContainer = get_element<HTMLDivElement>("queryResultsContainer");
        resultsContainer.textContent = "";
    });

    const clearMutationBtn = get_element<HTMLButtonElement>("clearMutationBtn");
    clearMutationBtn.addEventListener("click", () => {
        mutation_editor.textContent = "";
        const statusContainer = get_element<HTMLDivElement>("mutationStatusContainer");
        statusContainer.textContent = "";
    });

    document.querySelectorAll(".dashboard-preset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const sql = btn.getAttribute("data-sql");
            const target = btn.getAttribute("data-target");
            if (sql && target === "query" && query_editor) {
                query_editor_input.textContent = sql;
                updateHighlight(query_editor, query_editor_input);
            } else if (sql && target === "mutation" && mutation_editor) {
                mutation_editor_input.textContent = sql;
                updateHighlight(mutation_editor, mutation_editor_input);
            }
        });
    });
}

export async function refresh_dashboard(): Promise<void> {
    // Not implemented
}

async function execute_read_query(): Promise<void> {
    const query_editor_input = get_element<HTMLElement>("queryEditorInput");
    const sql = query_editor_input.innerText;
    const resultsContainer = get_element<HTMLDivElement>("queryResultsContainer");

    if (!sql) {
        add_log_entry("Query cannot be empty", "dashboardLog", true);
        return;
    }

    try {
        const start_time = performance.now();
        const manager = get_db_manager();
        const results = await manager.execute_raw(sql, []);
        const elapsed = (performance.now() - start_time).toFixed(2);

        resultsContainer.textContent = "";

        if (results.length === 0) {
            add_log_entry(`Query executed successfully (${elapsed} ms, 0 rows)`, "dashboardLog");
            return;
        }

        for (const res of results) {
            const metaInfo = document.createElement("div");
            metaInfo.className = "query-status success";
            metaInfo.textContent = `Executed in ${elapsed} ms. ${res.values.length} row(s) returned.`;
            resultsContainer.appendChild(metaInfo);

            const tableWrapper = document.createElement("div");
            tableWrapper.className = "dashboard-table-wrapper";

            const table = document.createElement("table");
            table.className = "data-table dashboard-table";

            const thead = document.createElement("thead");
            const headerRow = document.createElement("tr");
            for (const col of res.columns) {
                const th = document.createElement("th");
                th.textContent = col;
                headerRow.appendChild(th);
            }
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement("tbody");
            for (const row of res.values) {
                const tr = document.createElement("tr");
                for (const cell of row) {
                    const td = document.createElement("td");
                    if (cell === null || cell === undefined) {
                        const null_span = document.createElement("span");
                        null_span.className = "cell-null";
                        null_span.textContent = "NULL";
                        td.appendChild(null_span);
                    }
                    else if ((res.columns[tr.children.length] as string).toLowerCase().includes("date") && typeof cell === "number") {
                        const date = new Date(cell);
                        td.textContent = date.toLocaleDateString();
                    }
                    else {
                        td.textContent = String(cell);
                    }
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            resultsContainer.appendChild(tableWrapper);
        }

        add_log_entry(`Read query success (${elapsed} ms)`, "dashboardLog");
    } catch (err: any) {
        render_status(resultsContainer, `Error: ${err.message || String(err)}`, true);
        add_log_entry(`Query error: ${err.message || String(err)}`, "dashboardLog", true);
    }
}

// TODO: Commit the state and add rollback functionality for mutation queries.
async function execute_mutation_query(): Promise<void> {
    const mutation_editor = get_element<HTMLElement>("mutationEditorInput");
    const sql = mutation_editor.textContent ?? "";
    const statusContainer = get_element<HTMLDivElement>("mutationStatusContainer");

    if (!sql) {
        add_log_entry("Mutation statement cannot be empty", "dashboardLog", true);
        return;
    }

    try {
        const start_time = performance.now();
        const manager = get_db_manager();
        await manager.run_raw(sql, []);
        const elapsed = (performance.now() - start_time).toFixed(2);

        await reload_categories();

        render_status(statusContainer, `Mutation executed and saved in ${elapsed} ms. Foreign keys enforced.`, false);
        add_log_entry(`Mutation success (${elapsed} ms): ${sql.substring(0, 60)}...`, "dashboardLog");
    } catch (err: any) {
        render_status(statusContainer, `Execution failed: ${err.message || String(err)}`, true);
        add_log_entry(`Mutation error: ${err.message || String(err)}`, "dashboardLog", true);
    }
}
