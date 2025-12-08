// previewModule.js - 修复：首列（行号）在模态框内样式不一致的问题
(function () {
    const previewButton = document.querySelector('.preview-btn');

    if (previewButton) {
        previewButton.innerHTML = '👁️‍🗨️';
        previewButton.title = '预览';
    }

    let previewModalElement = null;

    function getOrCreateModal() {
        let modal = document.getElementById('preview-modal');
        if (modal) {
            previewModalElement = modal;
            const closeBtn = modal.querySelector('.modal-close') || modal.querySelector('#modal-close');
            if (closeBtn) {
                closeBtn.removeEventListener('click', closeModal);
                closeBtn.addEventListener('click', closeModal);
            }
            modal.removeEventListener('click', modalOuterClickHandler);
            modal.addEventListener('click', modalOuterClickHandler);
            return modal;
        }

        modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>数据预览</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="preview-table-container"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const closeButton = modal.querySelector('.modal-close');
        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', modalOuterClickHandler);
        previewModalElement = modal;
        return modal;
    }

    function modalOuterClickHandler(event) {
        if (event.target === event.currentTarget) closeModal();
    }

    function openModal() {
        const modal = getOrCreateModal();
        buildAndInsertPreviewTable(modal);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        if (!previewModalElement) previewModalElement = document.getElementById('preview-modal');
        if (previewModalElement) {
            previewModalElement.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    if (previewButton) {
        previewButton.addEventListener('click', function () {
            try {
                openModal();
                if (window.queryModule && typeof window.queryModule.performQuery === 'function') {
                    window.queryModule.performQuery(true);
                }
            } catch (e) {
                console.error('预览触发异常:', e);
                openModal();
            }
        });
    }

    // 复制常用样式属性白名单（kebab-case）
    function copyCommonStyles(sourceEl, targetEl) {
        try {
            const cs = window.getComputedStyle(sourceEl);
            const props = [
                'width', 'min-width', 'max-width',
                'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
                'font-size', 'font-family', 'font-weight', 'color', 'text-align',
                'background-color', 'border-top', 'border-right', 'border-bottom', 'border-left',
                'box-sizing', 'line-height', 'white-space'
            ];
            props.forEach(p => {
                const v = cs.getPropertyValue(p);
                if (v) {
                    const jsKey = p.replace(/-([a-z])/g, g => g[1].toUpperCase());
                    try { targetEl.style[jsKey] = v; } catch (e) { /* ignore */ }
                }
            });
        } catch (e) {
            // ignore
        }
    }

    function applyColumnWidths(originalTable, clonedTable) {
        try {
            let refCols = [];
            const thead = originalTable.querySelector('thead');
            if (thead && thead.rows.length > 0) {
                refCols = Array.from(thead.rows[thead.rows.length - 1].children);
            } else {
                const firstBodyRow = originalTable.tBodies && originalTable.tBodies[0] && originalTable.tBodies[0].rows[0];
                if (firstBodyRow) refCols = Array.from(firstBodyRow.children);
                else refCols = Array.from(originalTable.querySelectorAll('tr:first-child td, tr:first-child th'));
            }

            if (!refCols || refCols.length === 0) return;

            const widths = refCols.map(col => {
                const r = col.getBoundingClientRect();
                return Math.max(30, Math.round(r.width));
            });

            let colgroup = clonedTable.querySelector('colgroup');
            if (colgroup) colgroup.remove();
            colgroup = document.createElement('colgroup');
            widths.forEach(w => {
                const col = document.createElement('col');
                col.style.width = w + 'px';
                col.width = w;
                colgroup.appendChild(col);
            });
            if (clonedTable.firstChild) clonedTable.insertBefore(colgroup, clonedTable.firstChild);
            else clonedTable.appendChild(colgroup);

            clonedTable.style.borderCollapse = 'collapse';
            clonedTable.style.borderSpacing = '0';

            const tbody = clonedTable.tBodies && clonedTable.tBodies[0];
            const rows = tbody ? Array.from(tbody.rows) : Array.from(clonedTable.querySelectorAll('tr')).slice((clonedTable.querySelector('thead')||{rows:[]}).rows.length);
            rows.forEach(row => {
                for (let ci = 0; ci < widths.length; ci++) {
                    const cell = row.cells[ci];
                    if (cell) {
                        cell.style.boxSizing = 'border-box';
                        cell.style.width = widths[ci] + 'px';
                        // 设置默认 padding（如设计区不同，可覆盖）
                        cell.style.padding = cell.style.padding || '6px 8px';
                        if (!cell.style.border) cell.style.border = '1px solid #eaeaea';
                        cell.style.verticalAlign = 'middle';
                        cell.style.textAlign = cell.style.textAlign || 'center';
                    }
                }
            });

            // 也把表头 th 的宽度与 padding 对齐
            const clonedThead = clonedTable.querySelector('thead');
            if (clonedThead) {
                const ths = clonedThead.querySelectorAll('th');
                ths.forEach((th, idx) => {
                    if (widths[idx]) {
                        th.style.width = widths[idx] + 'px';
                        th.style.boxSizing = 'border-box';
                        th.style.padding = window.getComputedStyle(th).padding || '6px 8px';
                        th.style.verticalAlign = 'middle';
                        th.style.textAlign = 'center';
                    }
                });
            }
        } catch (e) {
            console.warn('applyColumnWidths failed', e);
        }
    }

    // 新增：确保首列（行号列）在 cloned 表格中有与设计区相同的视觉（灰底、加粗、居中、固定宽）
    function applyRowHeaderStyle(clonedTable) {
        try {
            // 设定首列宽度
            const firstColWidth = '35px';

            // 表头的首个 th
            const thead = clonedTable.querySelector('thead');
            if (thead) {
                const firstTh = thead.querySelector('th:first-child');
                if (firstTh) {
                    firstTh.style.width = firstColWidth;
                    firstTh.style.minWidth = firstColWidth;
                    firstTh.style.maxWidth = firstColWidth;
                    firstTh.style.backgroundColor = '#f0f0f0';
                    firstTh.style.fontWeight = '600';
                    firstTh.style.textAlign = 'center';
                    firstTh.style.verticalAlign = 'middle';
                    firstTh.style.boxSizing = 'border-box';
                    firstTh.style.padding = firstTh.style.padding || '6px 8px';
                }
            }

            // tbody 的每一行首列 td
            const tbody = clonedTable.tBodies && clonedTable.tBodies[0];
            const bodyRows = tbody ? Array.from(tbody.rows) : Array.from(clonedTable.querySelectorAll('tr')).slice((thead? thead.rows.length:0));
            bodyRows.forEach(row => {
                const firstCell = row.querySelector('td:first-child') || row.cells[0];
                if (firstCell) {
                    firstCell.style.width = firstColWidth;
                    firstCell.style.minWidth = firstColWidth;
                    firstCell.style.maxWidth = firstColWidth;
                    firstCell.style.backgroundColor = '#f0f0f0'; // 与设计区一致
                    firstCell.style.fontWeight = '600';
                    firstCell.style.textAlign = 'center';
                    firstCell.style.verticalAlign = 'middle';
                    firstCell.style.boxSizing = 'border-box';
                    firstCell.style.padding = firstCell.style.padding || '6px 8px';
                }
            });
        } catch (e) {
            // ignore
        }
    }

    function copyTableLayout(originalTable, clonedTable) {
        try {
            copyCommonStyles(originalTable, clonedTable);
            const origThead = originalTable.querySelector('thead');
            const clonedThead = clonedTable.querySelector('thead');
            if (origThead && clonedThead) {
                const origThs = origThead.querySelectorAll('th');
                const clonedThs = clonedThead.querySelectorAll('th');
                const len = Math.min(origThs.length, clonedThs.length);
                for (let i = 0; i < len; i++) {
                    copyCommonStyles(origThs[i], clonedThs[i]);
                    clonedThs[i].style.padding = window.getComputedStyle(origThs[i]).padding || '6px 8px';
                }
            }
            applyColumnWidths(originalTable, clonedTable);
            const origBodyFirst = originalTable.tBodies && originalTable.tBodies[0] && originalTable.tBodies[0].rows[0];
            const clonedBodyFirst = clonedTable.tBodies && clonedTable.tBodies[0] && clonedTable.tBodies[0].rows[0];
            if (origBodyFirst && clonedBodyFirst) {
                const origCells = Array.from(origBodyFirst.children);
                const clonedCells = Array.from(clonedBodyFirst.children);
                const ln = Math.min(origCells.length, clonedCells.length);
                for (let i = 0; i < ln; i++) {
                    copyCommonStyles(origCells[i], clonedCells[i]);
                    const pad = window.getComputedStyle(origCells[i]).padding || '6px 8px';
                    clonedCells[i].style.padding = pad;
                }
            }
        } catch (e) {
            console.warn('copyTableLayout failed', e);
        }
    }

    function buildAndInsertPreviewTable(modal) {
        if (!modal) modal = getOrCreateModal();
        const designTable = document.getElementById('design-table');
        const container = modal.querySelector('#preview-table-container') || modal.querySelector('.preview-table-container') || modal.querySelector('.modal-body');
        container.innerHTML = '';

        if (!designTable) {
            container.innerHTML = '<div style="padding:20px;text-align:center;">未找到设计表格</div>';
            return;
        }

        const cloned = designTable.cloneNode(true);
        cloned.id = 'preview-cloned-table';

        cloned.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        cloned.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'));
        cloned.querySelectorAll('.selected, .drop-target, .dragging').forEach(el => el.classList.remove('selected','drop-target','dragging'));
        cloned.querySelectorAll('input,textarea,select').forEach(el => el.setAttribute('disabled','disabled'));

        container.appendChild(cloned);

        // 复制布局并应用列宽
        copyTableLayout(designTable, cloned);

        // 强制首列样式（行号列）
        applyRowHeaderStyle(cloned);

        // 获取 previewData 并填充（若有）
        let previewData = null;
        if (window.collectTableDataForPreview && typeof window.collectTableDataForPreview === 'function') {
            try { previewData = window.collectTableDataForPreview(); } catch (e) { previewData = null; console.error(e); }
        }

        if (Array.isArray(previewData) && previewData.length > 0) {
            let clonedBodyRows = [];
            const tbody = cloned.tBodies && cloned.tBodies[0];
            if (tbody) clonedBodyRows = Array.from(tbody.rows);
            else {
                const allRows = Array.from(cloned.querySelectorAll('tr'));
                const thead = cloned.querySelector('thead');
                const skip = thead ? thead.rows.length : 0;
                clonedBodyRows = allRows.slice(skip);
            }

            previewData.forEach((rowData, rIndex) => {
                const clonedRow = clonedBodyRows[rIndex];
                if (!clonedRow) return;
                const rowHeader = clonedRow.querySelector('td:first-child') || clonedRow.cells[0];
                if (rowHeader && rowData.__row !== undefined) rowHeader.textContent = rowData.__row;

                Object.keys(rowData).forEach(k => {
                    if (k === '__row') return;
                    const colLetter = k;
                    const colIndex = colLetter.charCodeAt(0) - 64; // A->1
                    const targetCell = clonedRow.cells[colIndex];
                    if (!targetCell) return;
                    const cellInfo = rowData[k] || {};

                    if (cellInfo.content !== undefined && cellInfo.content !== null) {
                        targetCell.textContent = cellInfo.content;
                    }

                    if (cellInfo.colspan && cellInfo.colspan > 1) {
                        try { targetCell.colSpan = cellInfo.colspan; } catch (e) {}
                    }
                    if (cellInfo.rowspan && cellInfo.rowspan > 1) {
                        try { targetCell.rowSpan = cellInfo.rowspan; } catch (e) {}
                    }

                    if (cellInfo.style && typeof cellInfo.style === 'object') {
                        const allowed = ['backgroundColor','color','fontSize','fontWeight','textAlign','fontStyle','textDecoration','border','paddingTop','paddingBottom','paddingLeft','paddingRight'];
                        Object.keys(cellInfo.style).forEach(sp => {
                            if (allowed.includes(sp)) {
                                try { targetCell.style[sp] = cellInfo.style[sp]; } catch (e) {}
                            }
                        });
                    }

                    targetCell.removeAttribute('contenteditable');
                    targetCell.tabIndex = -1;
                });
            });
        }

        cloned.querySelectorAll('td, th').forEach(cell => {
            cell.addEventListener('keydown', e => e.preventDefault());
            cell.setAttribute('aria-readonly','true');
        });
    }

    window.previewModule = {
        openModal, closeModal, buildAndInsertPreviewTable
    };
})();