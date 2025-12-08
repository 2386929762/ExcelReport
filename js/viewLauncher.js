
(function () {
    const STYLE_PROPS = [
        'background-color', 'background-image', 'background-size', 'background-position',
        'color', 'font-size', 'font-weight', 'font-style', 'font-family', 'line-height',
        'text-align', 'vertical-align', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
        'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
        'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
        'box-sizing', 'white-space', 'word-break', 'word-wrap', 'letter-spacing'
    ];

    function copyComputedStylesToInline(sourceEl, targetEl, props = STYLE_PROPS) {
        if (!sourceEl || !targetEl) return;
        const cs = window.getComputedStyle(sourceEl);
        props.forEach(prop => {
            try {
                const v = cs.getPropertyValue(prop);
                if (v) {
                    const jsProp = prop.replace(/-([a-z])/g, (m, p1) => p1.toUpperCase());
                    targetEl.style[jsProp] = v;
                }
            } catch (e) { /* ignore */ }
        });
    }

    function collectFieldMapAndMaxRow(designTable) {
        const fieldMap = new Map();
        let maxFieldRow = -1;
        for (let r = 0; r < designTable.rows.length; r++) {
            const row = designTable.rows[r];
            for (let c = 1; c < row.cells.length; c++) {
                const cell = row.cells[c];
                if (cell && cell.dataset && cell.dataset.type === 'field' && cell.dataset.table && cell.dataset.name) {
                    fieldMap.set(c, {
                        tableName: cell.dataset.table,
                        fieldName: cell.dataset.name,
                        rowIndex: r
                    });
                    if (r > maxFieldRow) maxFieldRow = r;
                }
            }
        }
        return { fieldMap, maxFieldRow };
    }

    function copyTableLevelStyles(designTable, cloneTable) {
        try {
            const tableProps = ['width', 'max-width', 'font-family', 'font-size', 'border-collapse', 'box-sizing'];
            const tableCs = window.getComputedStyle(designTable);
            tableProps.forEach(p => {
                try {
                    const v = tableCs.getPropertyValue(p);
                    if (v) {
                        const jsProp = p.replace(/-([a-z])/g, (m, p1) => p1.toUpperCase());
                        cloneTable.style[jsProp] = v;
                    }
                } catch (e) { }
            });
        } catch (e) { }
    }

    function buildExportableClone() {
        const designTable = document.getElementById('design-table');
        if (!designTable) return null;

        const clone = designTable.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('preview-cloned-table');

        // remove interactive attributes
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        clone.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'));
        clone.querySelectorAll('.selected, .focused').forEach(el => el.classList.remove('selected', 'focused'));

        // copy some table-level styles
        copyTableLevelStyles(designTable, clone);

        // copy computed styles for existing rows
        const srcRows = Array.from(designTable.rows || []);
        const tgtRows = Array.from(clone.rows || []);
        const rowCount = Math.min(srcRows.length, tgtRows.length);
        for (let r = 0; r < rowCount; r++) {
            const srcCells = Array.from(srcRows[r].cells || []);
            const tgtCells = Array.from(tgtRows[r].cells || []);
            const cellCount = Math.min(srcCells.length, tgtCells.length);
            for (let c = 0; c < cellCount; c++) {
                copyComputedStylesToInline(srcCells[c], tgtCells[c]);
            }
        }

        // collect fields
        const { fieldMap, maxFieldRow } = collectFieldMapAndMaxRow(designTable);
        const usedTables = new Set(Array.from(fieldMap.values()).map(v => v.tableName));
        if (usedTables.size === 0) {
            // no fields: return clone as-is
            return clone;
        }
        // pick first table if multiple present (consistent with preview behavior)
        const tableName = Array.from(usedTables)[0];
        const tableData = (window.tableDataMap && window.tableDataMap[tableName]) ? (window.tableDataMap[tableName].data || []) : [];

        // determine insertion index (same logic as preview)
        const headerCount = (designTable.tHead && designTable.tHead.rows.length) ? designTable.tHead.rows.length : 0;
        let effectiveMaxFieldRow = maxFieldRow < 0 ? designTable.rows.length - 1 : maxFieldRow;
        let insertIndexInTbody = 0;
        if (effectiveMaxFieldRow >= headerCount) {
            insertIndexInTbody = effectiveMaxFieldRow - headerCount + 1;
            if (insertIndexInTbody < 0) insertIndexInTbody = 0;
        } else {
            insertIndexInTbody = 0;
        }

        const cloneTbody = (clone.tBodies && clone.tBodies[0]) || clone.createTBody();

        // template row
        let templateRow = null;
        if (cloneTbody.rows.length > 0) {
            templateRow = cloneTbody.rows[cloneTbody.rows.length - 1];
        } else if (clone.rows && clone.rows.length > headerCount) {
            templateRow = clone.rows[headerCount];
        } else if (clone.rows && clone.rows.length > 0) {
            templateRow = clone.rows[clone.rows.length - 1];
        }

        const firstRow = (clone.tHead && clone.tHead.rows.length > 0) ? clone.tHead.rows[0] :
            ((clone.rows && clone.rows.length > 0) ? clone.rows[0] : null);
        const colCount = firstRow ? firstRow.cells.length : 5;

        // fill data into existing rows first, then extend by cloning templateRow
        for (let i = 0; i < tableData.length; i++) {
            const dataItem = tableData[i];
            const targetIndex = insertIndexInTbody + i;
            let targetRow = null;
            if (targetIndex < cloneTbody.rows.length) {
                targetRow = cloneTbody.rows[targetIndex];
            } else {
                if (templateRow) {
                    targetRow = templateRow.cloneNode(true);
                    Array.from(targetRow.cells || []).forEach(td => td.textContent = '');
                } else {
                    targetRow = document.createElement('tr');
                    for (let c = 0; c < colCount; c++) {
                        const td = document.createElement('td');
                        td.textContent = '';
                        targetRow.appendChild(td);
                    }
                }
                if (targetIndex >= cloneTbody.rows.length) {
                    cloneTbody.appendChild(targetRow);
                } else {
                    cloneTbody.insertBefore(targetRow, cloneTbody.rows[targetIndex]);
                }
            }

            for (let c = 1; c < colCount; c++) {
                if (!targetRow.cells[c]) {
                    while (targetRow.cells.length <= c) {
                        const newTd = document.createElement('td');
                        targetRow.appendChild(newTd);
                    }
                }
                const td = targetRow.cells[c];
                const mapping = fieldMap.get(c);
                if (mapping) {
                    td.textContent = dataItem[mapping.fieldName] !== undefined ? dataItem[mapping.fieldName] : '';
                } else {
                    td.textContent = '';
                }
                // copy fallback styles if needed
                if (!templateRow) {
                    let srcTemplateCell = null;
                    if (mapping && typeof mapping.rowIndex === 'number' && designTable.rows[mapping.rowIndex] && designTable.rows[mapping.rowIndex].cells[c]) {
                        srcTemplateCell = designTable.rows[mapping.rowIndex].cells[c];
                    } else if (designTable.rows && designTable.rows[0] && designTable.rows[0].cells[c]) {
                        srcTemplateCell = designTable.rows[0].cells[c];
                    }
                    if (srcTemplateCell) {
                        copyComputedStylesToInline(srcTemplateCell, td);
                        try {
                            const w = srcTemplateCell.getBoundingClientRect().width;
                            if (w && w > 0) {
                                td.style.width = w + 'px';
                                td.style.minWidth = Math.max(40, w) + 'px';
                            }
                        } catch (e) { }
                    }
                }
            }
        }

        // renumber rows
        let counter = 1;
        const tbodies = clone.tBodies && clone.tBodies.length ? Array.from(clone.tBodies) : [];
        if (tbodies.length === 0) {
            const allRows = Array.from(clone.rows || []);
            allRows.forEach(row => {
                if (row.cells && row.cells.length > 0) {
                    row.cells[0].textContent = (counter++).toString();
                }
            });
        } else {
            tbodies.forEach(tb => {
                const rows = Array.from(tb.rows || []);
                rows.forEach(row => {
                    if (row.cells && row.cells.length > 0) {
                        row.cells[0].textContent = (counter++).toString();
                    }
                });
            });
        }

        return clone;
    }

    // variable to keep last opened window (so we can respond to refresh requests)
    let lastViewWindow = null;

    function openViewPage() {
        const clone = buildExportableClone();
        if (!clone) {
            alert('无法找到设计表格（#design-table）');
            return;
        }

        const url = 'detailViewPage.html';
        const newWin = window.open(url, '_blank');
        if (!newWin) {
            return alert('弹窗被拦截，请允许弹窗后重试');
        }
        lastViewWindow = newWin;

        // try posting clone after short delay (new window will likely request as well)
        setTimeout(() => {
            try {
                newWin.postMessage({
                    type: 'viewTable',
                    html: clone.outerHTML
                }, '*');
            } catch (e) {
                // ignore, view page will request if needed
            }
        }, 250);
    }

    // handle messages from view page (e.g. requestViewTable)
    window.addEventListener('message', function (event) {
        try {
            const payload = event.data;
            if (!payload || typeof payload !== 'object') return;

            // support view page requesting the current table
            if (payload.type === 'requestViewTable') {
                const clone = buildExportableClone();
                const html = clone ? clone.outerHTML : '';
                // reply to the requester (event.source)
                try {
                    event.source.postMessage({ type: 'viewTable', html: html }, '*');
                } catch (e) {
                    console.error('向 view 页面回传表格失败', e);
                }
            }
        } catch (e) {
            // swallow
        }
    });

    // bind button
    function bindButton() {
        const btn = document.querySelector('.toolbar-btn.view-page-btn');
        if (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                openViewPage();
            });
        }
    }

    document.addEventListener('DOMContentLoaded', bindButton);
})();