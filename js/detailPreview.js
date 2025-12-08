// 预览功能模块（按“先填充已有行，超出则扩展行，扩展行样式与已有行一致”要求实现）
// 要点：
// - 克隆设计表并复制 computed style（保留样式）
// - 计算数据开始的 tbody 相对索引（字段最后出现行的下一行）
// - 对于每条数据：
//     - 如果目标 tbody 中已有行，则直接填入该行对应列（保留行样式）
//     - 如果目标超出已有行，则使用已有某一行作为模板（clone last existing row 或指定模板行）生成新行，保持样式一致，然后填充
// - 最后统一为所有 tbody 行重新编号，保证行号连续且正确

function PreviewModule() {
    let modalElement = null;

    this.init = function() {
        ensureModalExists();
        bindPreviewButton();
        bindCloseButton();
        bindModalOutsideClick();
    };

    function ensureModalExists() {
        modalElement = document.getElementById('preview-modal') || document.querySelector('.preview-modal');

        if (!modalElement) {
            modalElement = document.createElement('div');
            modalElement.id = 'preview-modal';
            modalElement.className = 'preview-modal';
            modalElement.innerHTML = `
                <div class="preview-modal-content">
                    <div class="preview-modal-header">
                        <h3 class="preview-modal-title">表格预览</h3>
                        <button class="preview-modal-close" id="preview-close-btn">×</button>
                    </div>
                    <div class="preview-modal-body">
                        <!-- 克隆表格会插入到这里 -->
                    </div>
                </div>
            `;
            document.body.appendChild(modalElement);
        }
    }

    function bindPreviewButton() {
        const previewBtn = document.querySelector('.toolbar-btn.preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', showPreview);
        }
    }

    function bindCloseButton() {
        const selectors = ['#preview-close-btn', '#modal-close', '.preview-modal-close', '.modal-close'];
        for (const sel of selectors) {
            const btn = modalElement ? modalElement.querySelector(sel) : document.querySelector(sel);
            if (btn) {
                btn.addEventListener('click', hidePreview);
                return;
            }
        }
    }

    function bindModalOutsideClick() {
        if (modalElement) {
            modalElement.addEventListener('click', function(e) {
                if (e.target === modalElement) {
                    hidePreview();
                }
            });
        }
    }

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
            } catch (e) {
                // ignore single property error
            }
        });
    }

    function copyTableComputedStyles(designTable, cloneTable) {
        if (!designTable || !cloneTable) return;

        // table-level basic styles
        const tableProps = ['width', 'max-width', 'font-family', 'font-size', 'border-collapse', 'box-sizing'];
        const tableCs = window.getComputedStyle(designTable);
        tableProps.forEach(p => {
            try {
                const v = tableCs.getPropertyValue(p);
                if (v) {
                    const jsProp = p.replace(/-([a-z])/g, (m, p1) => p1.toUpperCase());
                    cloneTable.style[jsProp] = v;
                }
            } catch (e) {}
        });

        // copy computed styles for matching rows/cells (only where both exist)
        const srcRows = Array.from(designTable.rows || []);
        const tgtRows = Array.from(cloneTable.rows || []);
        const rowCount = Math.min(srcRows.length, tgtRows.length);
        for (let r = 0; r < rowCount; r++) {
            const srcCells = Array.from(srcRows[r].cells || []);
            const tgtCells = Array.from(tgtRows[r].cells || []);
            const cellCount = Math.min(srcCells.length, tgtCells.length);
            for (let c = 0; c < cellCount; c++) {
                copyComputedStylesToInline(srcCells[c], tgtCells[c]);
            }
        }

        // copy column widths from a measure row (thead preferred)
        let measureRow = null;
        if (designTable.tHead && designTable.tHead.rows.length > 0) {
            measureRow = designTable.tHead.rows[0];
        } else if (designTable.rows && designTable.rows.length > 0) {
            measureRow = designTable.rows[0];
        }
        let cloneMeasureRow = null;
        if (cloneTable.tHead && cloneTable.tHead.rows.length > 0) {
            cloneMeasureRow = cloneTable.tHead.rows[0];
        } else if (cloneTable.rows && cloneTable.rows.length > 0) {
            cloneMeasureRow = cloneTable.rows[0];
        }
        if (measureRow && cloneMeasureRow) {
            const measureCells = Array.from(measureRow.cells || []);
            const cloneCells = Array.from(cloneMeasureRow.cells || []);
            measureCells.forEach((srcCell, idx) => {
                try {
                    const w = srcCell.getBoundingClientRect().width;
                    if (cloneCells[idx]) {
                        cloneCells[idx].style.width = w + 'px';
                        cloneCells[idx].style.minWidth = Math.max(40, w) + 'px';
                    }
                } catch (e) {}
            });
        }
    }

    // returns { fieldMap: Map<colIndex, {tableName, fieldName, rowIndex}>, maxFieldRow: number }
    function collectFieldMapAndMaxRow(designTable) {
        const fieldMap = new Map();
        let maxFieldRow = -1;
        for (let r = 0; r < designTable.rows.length; r++) {
            const row = designTable.rows[r];
            for (let c = 1; c < row.cells.length; c++) {
                const cell = row.cells[c];
                if (cell && cell.dataset && cell.dataset.type === 'field' && cell.dataset.table && cell.dataset.name) {
                    // store the first encountered rowIndex for template purposes (prefer last but keep rowIndex)
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

    // renumber all tbody rows sequence starting from 1
    function renumberCloneTableRows(cloneTable) {
        if (!cloneTable) return;
        let counter = 1;
        const tbodies = cloneTable.tBodies && cloneTable.tBodies.length ? Array.from(cloneTable.tBodies) : [];
        if (tbodies.length === 0) {
            const allRows = Array.from(cloneTable.rows || []);
            allRows.forEach(row => {
                if (row.cells && row.cells.length > 0) {
                    row.cells[0].textContent = (counter++).toString();
                }
            });
            return;
        }
        tbodies.forEach(tb => {
            const rows = Array.from(tb.rows || []);
            rows.forEach(row => {
                if (row.cells && row.cells.length > 0) {
                    row.cells[0].textContent = (counter++).toString();
                }
            });
        });
    }

    function showPreview() {
        if (!modalElement) {
            ensureModalExists();
            bindCloseButton();
            bindModalOutsideClick();
        }

        const modalBody = modalElement.querySelector('.preview-modal-body') || modalElement;
        if (!modalBody) {
            console.error('预览模态体未找到');
            return;
        }

        modalBody.innerHTML = '';

        const designTable = document.getElementById('design-table');
        if (!designTable) {
            console.error('设计表格未找到');
            const p = document.createElement('div');
            p.textContent = '设计表格未找到';
            p.style.padding = '40px';
            p.style.textAlign = 'center';
            modalBody.appendChild(p);
            modalElement.classList.add('active');
            return;
        }

        // clone and prepare
        const clone = designTable.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('preview-cloned-table');

        // remove interactive attributes
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        clone.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'));
        clone.querySelectorAll('.selected, .focused').forEach(el => el.classList.remove('selected', 'focused'));

        // insert hidden for measurement and style copy
        clone.style.visibility = 'hidden';
        modalBody.appendChild(clone);

        try {
            copyTableComputedStyles(designTable, clone);
        } catch (e) {
            console.warn('复制表格样式失败：', e);
        }

        const { fieldMap, maxFieldRow } = collectFieldMapAndMaxRow(designTable);
        const usedTables = new Set(Array.from(fieldMap.values()).map(v => v.tableName));
        if (usedTables.size > 1) {
            const warn = document.createElement('div');
            warn.style.padding = '20px';
            warn.style.color = '#ff6b6b';
            warn.style.textAlign = 'center';
            warn.textContent = '预览只支持单表数据，请确保所有字段来自同一表';
            modalBody.innerHTML = '';
            modalBody.appendChild(warn);
            modalElement.classList.add('active');
            return;
        }

        // determine where to start inserting data (relative to tbody)
        let effectiveMaxFieldRow = maxFieldRow;
        if (effectiveMaxFieldRow < 0) {
            effectiveMaxFieldRow = designTable.rows.length - 1;
        }
        const headerCount = (designTable.tHead && designTable.tHead.rows.length) ? designTable.tHead.rows.length : 0;
        const cloneTbody = (clone.tBodies && clone.tBodies[0]) || clone.createTBody();

        // insertion index in cloneTbody (0-based): if field row in tbody, calculate relative; else insert at tbody start
        let insertIndexInTbody = 0;
        if (effectiveMaxFieldRow >= headerCount) {
            insertIndexInTbody = effectiveMaxFieldRow - headerCount + 1;
            if (insertIndexInTbody < 0) insertIndexInTbody = 0;
        } else {
            insertIndexInTbody = 0;
        }

        // prepare template row for creating new rows (use last existing tbody row if any, otherwise try to build from design)
        let templateRow = null;
        if (cloneTbody.rows.length > 0) {
            templateRow = cloneTbody.rows[cloneTbody.rows.length - 1];
        } else {
            // try to use a row from clone.rows (maybe header present) as template
            if (clone.rows && clone.rows.length > headerCount) {
                templateRow = clone.rows[headerCount]; // first body row if exists
            } else if (clone.rows && clone.rows.length > 0) {
                templateRow = clone.rows[clone.rows.length - 1];
            }
        }

        // get table data
        let tableData = [];
        if (usedTables.size === 1) {
            const tableName = Array.from(usedTables)[0];
            if (window.tableDataMap && window.tableDataMap[tableName]) {
                tableData = window.tableDataMap[tableName].data || [];
            }
        }

        // decide column count based on clone header or first row
        const firstRow = (clone.tHead && clone.tHead.rows.length > 0) ? clone.tHead.rows[0] :
                         ((clone.rows && clone.rows.length > 0) ? clone.rows[0] : null);
        const colCount = firstRow ? firstRow.cells.length : 5;

        // Fill data: prioritize existing rows, extend with cloned template rows if needed
        for (let i = 0; i < tableData.length; i++) {
            const dataItem = tableData[i];
            const targetIndex = insertIndexInTbody + i; // relative index in cloneTbody
            let targetRow = null;
            if (targetIndex < cloneTbody.rows.length) {
                // fill into existing row
                targetRow = cloneTbody.rows[targetIndex];
            } else {
                // need to create new row by cloning templateRow if available, otherwise create fresh row
                if (templateRow) {
                    targetRow = templateRow.cloneNode(true);
                    // clear text content in cloned cells
                    Array.from(targetRow.cells || []).forEach(td => td.textContent = '');
                } else {
                    // create row with required number of cells
                    targetRow = document.createElement('tr');
                    for (let c = 0; c < colCount; c++) {
                        const td = document.createElement('td');
                        td.textContent = '';
                        targetRow.appendChild(td);
                    }
                }
                // insert at end (or at targetIndex position)
                if (targetIndex >= cloneTbody.rows.length) {
                    cloneTbody.appendChild(targetRow);
                } else {
                    cloneTbody.insertBefore(targetRow, cloneTbody.rows[targetIndex]);
                }
            }

            // fill cells for this row: start from c=1 (skip row-number column)
            for (let c = 1; c < colCount; c++) {
                // ensure cell exists
                if (!targetRow.cells[c]) {
                    // create missing cells up to c
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
                    // leave empty
                }

                // if this is a newly created row (we cloned templateRow), its cells already have inline styles from template;
                // for safety, if templateRow not available, try to copy style from designTable corresponding cell (if exists)
                if (!templateRow) {
                    // try to get source template cell from designTable using mapping.rowIndex or first row
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
                        } catch (e) {}
                    }
                }
            }
        }

        // finally renumber all tbody rows (continuous sequence starting 1)
        renumberCloneTableRows(clone);

        // reveal and show modal
        clone.style.visibility = '';
        modalElement.classList.add('active');
    }

    function hidePreview() {
        if (modalElement) {
            modalElement.classList.remove('active');
            const body = modalElement.querySelector('.preview-modal-body');
            if (body) body.innerHTML = '';
        }
    }

    window.hidePreview = hidePreview;
}

document.addEventListener('DOMContentLoaded', function() {
    const previewModule = new PreviewModule();
    previewModule.init();
});