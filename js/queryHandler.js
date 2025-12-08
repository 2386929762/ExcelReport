// queryHandler.js - 查询与预览数据收集模块（增强：同时保存列宽到 localStorage，便于查看页按原样渲染）
// 该文件在原实现基础上：collectTableDataForPreview 继续返回数据数组（向后兼容）
// 但同时会计算列宽数组并把 { rows, colWidths } 保存到 localStorage 的 lastViewedTableData 中
// 以便 viewPage.html 在独立页面也能按相同列宽和样式渲染表格。

// 当文档加载完成后初始化查询功能（不自动执行）
document.addEventListener('DOMContentLoaded', () => {
    // nothing to auto-run here
});

function performQuery(showInModal = false, targetCellId = null) {
    let indicatorCells;
    if (targetCellId) {
        const match = targetCellId.match(/([A-Z])(\d+)/);
        if (match) {
            const colLetter = match[1];
            const rowNum = parseInt(match[2], 10);
            const table = document.querySelector('#design-table');
            const tbody = table && table.tBodies && table.tBodies[0];
            const rows = tbody ? tbody.rows : table.querySelectorAll('tr');
            const targetRow = rows[rowNum - 1];
            if (targetRow) {
                const colIndex = colLetter.charCodeAt(0) - 65 + 1;
                const cell = targetRow.cells[colIndex];
                if (cell && cell.dataset && cell.dataset.type === 'indicator') {
                    indicatorCells = [cell];
                }
            }
        }
    } else {
        indicatorCells = document.querySelectorAll('#design-table tbody td[data-type="indicator"]');
        if (!indicatorCells || indicatorCells.length === 0) {
            indicatorCells = document.querySelectorAll('#design-table td[data-type="indicator"]');
        }
    }

    if (!showInModal && indicatorCells) {
        indicatorCells.forEach(cell => {
            const rowIndex = cell.parentElement.rowIndex;
            const colIndex = Array.from(cell.parentElement.cells).indexOf(cell);
            const cellId = `${String.fromCharCode(65 + (colIndex - 1))}${rowIndex}`;
            const filters = getQueryFilters(cellId);
            const indicatorData = getIndicatorData(cell);
            if (indicatorData && indicatorData.length > 0) {
                const filtered = filterDataByConditions(indicatorData, filters);
                const total = calculateTotalBalance(filtered);
                updateIndicatorCellDisplay(cell, total, filtered.length);
            }
        });
    }

    if (showInModal) {
        let indicatorNodes = document.querySelectorAll('#design-table tbody td[data-type="indicator"]');
        if (!indicatorNodes || indicatorNodes.length === 0) {
            indicatorNodes = document.querySelectorAll('#design-table td[data-type="indicator"]');
        }
        const tableData = collectTableDataForPreview(indicatorNodes);
        if (window.displayQueryResult && typeof window.displayQueryResult === 'function') {
            try {
                window.displayQueryResult({}, tableData);
            } catch (e) {
                // ignore
            }
        }
        return tableData;
    }

    return null;
}

// 收集表格数据并为预览准备过滤后的数据（增强：也收集列宽并保存到 localStorage）
function collectTableDataForPreview(indicatorCells) {
    const table = document.querySelector('#design-table');
    const data = [];

    // build cell map if indicatorCells provided
    const cellMap = new Map();
    if (indicatorCells && indicatorCells.length > 0) {
        indicatorCells.forEach(cell => {
            const rowIndex = cell.parentElement.rowIndex;
            const colIndex = Array.from(cell.parentElement.cells).indexOf(cell);
            const cellId = `${String.fromCharCode(65 + (colIndex - 1))}${rowIndex}`;
            cellMap.set(cellId, cell);
        });
    }

    if (!table) return data;

    // 计算列宽：优先使用 thead 的最后一行，如果没有则使用 tbody 第一行
    let colWidths = [];
    try {
        let refCols = [];
        const thead = table.querySelector('thead');
        if (thead && thead.rows.length > 0) {
            refCols = Array.from(thead.rows[thead.rows.length - 1].children);
        } else {
            const firstBodyRow = table.tBodies && table.tBodies[0] && table.tBodies[0].rows[0];
            if (firstBodyRow) refCols = Array.from(firstBodyRow.children);
            else refCols = Array.from(table.querySelectorAll('tr:first-child td, tr:first-child th'));
        }
        if (refCols && refCols.length > 0) {
            colWidths = refCols.map(col => {
                const r = col.getBoundingClientRect();
                // 保证最小宽度，避免被压扁出现非常小值
                return Math.max(30, Math.round(r.width));
            });
        }
    } catch (e) {
        console.warn('计算列宽时出错:', e);
        colWidths = [];
    }

    // prefer tbody rows
    const tbody = table.tBodies && table.tBodies[0];
    const rows = tbody ? Array.from(tbody.rows) : Array.from(table.querySelectorAll('tr'));

    rows.forEach((row, tbodyIndex) => {
        const rowData = {};
        const cells = Array.from(row.querySelectorAll('td, th'));

        // 使用 tbodyIndex + 1 作为行号（确保和设计区 tbody 行一致）
        const rowIdentifier = (tbody ? (tbodyIndex + 1).toString() : (cells[0] ? (cells[0].textContent || '').trim() : (row.rowIndex ? row.rowIndex.toString() : '')));
        rowData['__row'] = rowIdentifier;

        // iterate cells starting from index 1 (A)
        for (let i = 1; i < cells.length; i++) {
            const cell = cells[i];
            const colLetter = String.fromCharCode(64 + i); // 1 -> A
            let cellContent = (cell.textContent || '').trim();

            // if it's an indicator with dataset.data, compute filtered sum
            if (cell.dataset && cell.dataset.type === 'indicator' && cell.dataset.data) {
                try {
                    const cellId = `${colLetter}${rowIdentifier}`;
                    const filters = getQueryFilters(cellId);
                    const indicatorData = JSON.parse(cell.dataset.data);
                    if (Array.isArray(indicatorData) && indicatorData.length > 0) {
                        const filtered = filterDataByConditions(indicatorData, filters);
                        const total = calculateTotalBalance(filtered);
                        cellContent = formatCurrency(total);
                    }
                } catch (e) {
                    console.error('处理 indicator dataset 时出错:', e);
                }
            }

            // collect style info (only necessary properties)
            let styleInfo = {};
            try {
                const computed = window.getComputedStyle(cell);
                styleInfo = {
                    fontWeight: computed.fontWeight,
                    fontSize: computed.fontSize,
                    textAlign: computed.textAlign,
                    backgroundColor: computed.backgroundColor,
                    color: computed.color,
                    border: computed.border,
                    fontStyle: computed.fontStyle,
                    textDecoration: computed.textDecoration,
                    paddingTop: computed.paddingTop,
                    paddingBottom: computed.paddingBottom,
                    paddingLeft: computed.paddingLeft,
                    paddingRight: computed.paddingRight
                };
            } catch (e) {
                styleInfo = {};
            }

            // check for inline formatting spans
            const hasBold = cell.querySelector('.text-bold') !== null;
            const hasItalic = cell.querySelector('.text-italic') !== null;
            const hasUnderline = cell.querySelector('.text-underline') !== null;
            if (hasBold) styleInfo.fontWeight = 'bold';
            if (hasItalic) styleInfo.fontStyle = 'italic';
            if (hasUnderline) styleInfo.textDecoration = 'underline';

            rowData[colLetter] = {
                content: cellContent,
                type: cell.dataset.type || 'text',
                colspan: cell.colSpan || 1,
                rowspan: cell.rowSpan || 1,
                style: styleInfo
            };
        }

        data.push(rowData);
    });

    // 保存最后查看的数据到 localStorage（保存为对象 {rows, colWidths}）
    try {
        const payload = { rows: data, colWidths: colWidths };
        localStorage.setItem('lastViewedTableData', JSON.stringify(payload));
    } catch (e) {
        // ignore
    }

    return data;
}

// 以下函数保持不变（getQueryFilters / getIndicatorData / filterDataByConditions / calculateTotalBalance / updateIndicatorCellDisplay / formatCurrency）
function getQueryFilters(targetCellId = null) {
    const filters = { currency: 'CNY' };
    if (targetCellId) {
        let hasConfig = false;
        if (window.cellConfigurations && window.cellConfigurations[targetCellId]) {
            const cellConfig = window.cellConfigurations[targetCellId];
            if (cellConfig.dataDate && cellConfig.dataDate.trim() !== '') { filters.date = cellConfig.dataDate; hasConfig = true; }
            if (cellConfig.currency && cellConfig.currency.trim() !== '') { filters.currency = cellConfig.currency; hasConfig = true; }
            if (cellConfig.organization && cellConfig.organization.trim() !== '') { filters.organization = cellConfig.organization; hasConfig = true; }
        } else {
            try {
                const stored = localStorage.getItem('cellConfig_' + targetCellId);
                if (stored) {
                    const cfg = JSON.parse(stored);
                    if (!window.cellConfigurations) window.cellConfigurations = {};
                    window.cellConfigurations[targetCellId] = cfg;
                    if (cfg.dataDate && cfg.dataDate.trim() !== '') { filters.date = cfg.dataDate; hasConfig = true; }
                    if (cfg.currency && cfg.currency.trim() !== '') { filters.currency = cfg.currency; hasConfig = true; }
                    if (cfg.organization && cfg.organization.trim() !== '') { filters.organization = cfg.organization; hasConfig = true; }
                }
            } catch (e) {
                console.error('从localStorage加载配置失败:', e);
            }
        }
        if (!hasConfig) {
            if (targetCellId === 'B1') filters.organization = 'branch-shanghai';
            else if (targetCellId === 'B2') filters.organization = 'branch-shenzhen';
            else if (targetCellId === 'B3') filters.organization = 'branch-guangzhou';
            else if (targetCellId === 'B4') filters.organization = 'branch-beijing';
            else filters.organization = 'head';
        }
    }
    return filters;
}

function getIndicatorData(cell) {
    try {
        if (!cell) return null;
        if (cell.dataset && cell.dataset.type === 'indicator' && cell.dataset.data) {
            return JSON.parse(cell.dataset.data);
        }
        const dataCell = cell.nextElementSibling;
        if (dataCell && dataCell.dataset && dataCell.dataset.type === 'indicator_data' && dataCell.dataset.data) {
            return JSON.parse(dataCell.dataset.data);
        }
        return null;
    } catch (e) {
        console.error('getIndicatorData 解析失败:', e);
        return null;
    }
}

function filterDataByConditions(data, conditions) {
    if (!conditions || Object.keys(conditions).length === 0) return data;
    return data.filter(item => {
        return Object.entries(conditions).every(([field, value]) => {
            if (!item.hasOwnProperty(field)) return false;
            if (field === 'date') {
                if (typeof value === 'string' && value.includes('年')) {
                    const year = value.replace('年', '');
                    return item[field] && item[field].toString().startsWith(year);
                }
                return item[field] === value;
            } else if (field === 'currency') {
                return item[field] === value;
            } else if (field === 'organization') {
                return item[field] === value;
            }
            return item[field] === value;
        });
    });
}

function calculateTotalBalance(filteredData) {
    return filteredData.reduce((total, item) => {
        const val = (item.balance || '').toString().replace(/[^\d.-]/g, '');
        const num = parseFloat(val);
        return total + (isNaN(num) ? 0 : num);
    }, 0);
}

function updateIndicatorCellDisplay(cell, totalBalance, recordCount) {
    if (!cell) return;
    if (cell.dataset && cell.dataset.type === 'indicator' && cell.dataset.data) {
        const indicatorName = cell.dataset.name || cell.textContent.trim();
        cell.textContent = `{${indicatorName}}`;
        cell.title = '请设置查询条件';
    } else {
        const dataCell = cell.nextElementSibling;
        if (dataCell && dataCell.dataset && dataCell.dataset.type === 'indicator_data') {
            const indicatorName = cell.dataset.name || cell.textContent.trim();
            dataCell.textContent = `{${indicatorName}}`;
            dataCell.title = '请设置查询条件';
        }
    }
}

function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return '';
    try {
        const num = Number(value);
        if (isNaN(num)) return value.toString();
        return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
        return value.toString();
    }
}

window.queryModule = {
    performQuery,
    getQueryFilters,
    filterDataByConditions,
    calculateTotalBalance,
    collectTableDataForPreview,
    getIndicatorData,
    formatCurrency
};

window.collectTableDataForPreview = collectTableDataForPreview;