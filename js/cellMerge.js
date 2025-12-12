// 单元格合并功能模块

// 存储合并信息
let cellMergeInfo = {};
window.cellMergeInfo = cellMergeInfo;

/**
 * 获取单元格的行列索引
 */
function getCellPosition(cell) {
    const row = cell.parentElement;
    const table = row.parentElement.parentElement;
    const rowIndex = Array.from(table.rows).indexOf(row);
    const cellIndex = Array.from(row.cells).indexOf(cell);
    return { rowIndex, cellIndex };
}

/**
 * 获取单元格引用ID
 */
function getCellReference(rowIndex, cellIndex) {
    return `R${rowIndex}C${cellIndex}`;
}

/**
 * 合并选中的单元格
 */
function mergeCells() {
    const selectedCells = document.querySelectorAll('#design-table td.selected');
    
    if (selectedCells.length < 2) {
        alert('请至少选择两个单元格进行合并');
        return;
    }
    
    // 获取所有选中单元格的位置
    const positions = Array.from(selectedCells).map(cell => getCellPosition(cell));
    
    // 验证选中的单元格是否形成矩形区域
    const minRow = Math.min(...positions.map(p => p.rowIndex));
    const maxRow = Math.max(...positions.map(p => p.rowIndex));
    const minCol = Math.min(...positions.map(p => p.cellIndex));
    const maxCol = Math.max(...positions.map(p => p.cellIndex));
    
    const expectedCells = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    if (selectedCells.length !== expectedCells) {
        alert('请选择连续的矩形区域进行合并');
        return;
    }
    
    // 检查是否有已合并的单元格
    for (let cell of selectedCells) {
        const pos = getCellPosition(cell);
        const ref = getCellReference(pos.rowIndex, pos.cellIndex);
        if (cellMergeInfo[ref]) {
            alert('选中的区域包含已合并的单元格，请先取消合并');
            return;
        }
    }
    
    // 找到左上角的单元格作为主单元格
    let mainCell = null;
    for (let cell of selectedCells) {
        const pos = getCellPosition(cell);
        if (pos.rowIndex === minRow && pos.cellIndex === minCol) {
            mainCell = cell;
            break;
        }
    }
    
    if (!mainCell) {
        alert('找不到主单元格');
        return;
    }
    
    // 合并单元格内容（可选）
    let mergedContent = '';
    selectedCells.forEach(cell => {
        const content = cell.textContent.trim();
        if (content && content !== mergedContent) {
            mergedContent += (mergedContent ? ' ' : '') + content;
        }
    });
    
    // 设置主单元格的rowspan和colspan
    const rowSpan = maxRow - minRow + 1;
    const colSpan = maxCol - minCol + 1;
    mainCell.rowSpan = rowSpan;
    mainCell.colSpan = colSpan;
    mainCell.textContent = mergedContent;
    
    // 保存合并信息
    const mainPos = getCellPosition(mainCell);
    const mainRef = getCellReference(mainPos.rowIndex, mainPos.cellIndex);
    cellMergeInfo[mainRef] = {
        rowSpan: rowSpan,
        colSpan: colSpan,
        rowIndex: mainPos.rowIndex,
        cellIndex: mainPos.cellIndex
    };
    
    // 隐藏其他单元格（不是删除，而是隐藏）
    selectedCells.forEach(cell => {
        if (cell !== mainCell) {
            cell.style.display = 'none';
            const pos = getCellPosition(cell);
            const ref = getCellReference(pos.rowIndex, pos.cellIndex);
            // 标记为被合并的单元格
            cellMergeInfo[ref] = {
                mergedInto: mainRef,
                hidden: true
            };
        }
    });
    
    // 清除选中状态
    selectedCells.forEach(cell => cell.classList.remove('selected'));
    
    console.log('单元格合并完成', cellMergeInfo);
    alert('单元格合并成功');
}

/**
 * 取消合并单元格
 */
function unmergeCells() {
    const selectedCells = document.querySelectorAll('#design-table td.selected');
    
    if (selectedCells.length === 0) {
        alert('请选择要取消合并的单元格');
        return;
    }
    
    let hasUnmerged = false;
    
    selectedCells.forEach(cell => {
        const pos = getCellPosition(cell);
        const ref = getCellReference(pos.rowIndex, pos.cellIndex);
        const mergeInfo = cellMergeInfo[ref];
        
        if (mergeInfo && mergeInfo.rowSpan) {
            // 这是主合并单元格
            cell.removeAttribute('rowspan');
            cell.removeAttribute('colspan');
            
            // 显示被隐藏的单元格
            const table = cell.closest('table');
            Object.keys(cellMergeInfo).forEach(key => {
                const info = cellMergeInfo[key];
                if (info.mergedInto === ref) {
                    // 找到被隐藏的单元格并显示
                    const hiddenCell = findCellByReference(table, key);
                    if (hiddenCell) {
                        hiddenCell.style.display = '';
                    }
                    delete cellMergeInfo[key];
                }
            });
            
            delete cellMergeInfo[ref];
            hasUnmerged = true;
        } else if (mergeInfo && mergeInfo.mergedInto) {
            // 这是被合并的单元格，需要找到主单元格
            const mainRef = mergeInfo.mergedInto;
            const mainCell = findCellByReference(cell.closest('table'), mainRef);
            if (mainCell) {
                mainCell.removeAttribute('rowspan');
                mainCell.removeAttribute('colspan');
                
                // 显示所有被隐藏的单元格
                Object.keys(cellMergeInfo).forEach(key => {
                    const info = cellMergeInfo[key];
                    if (info.mergedInto === mainRef) {
                        const hiddenCell = findCellByReference(cell.closest('table'), key);
                        if (hiddenCell) {
                            hiddenCell.style.display = '';
                        }
                        delete cellMergeInfo[key];
                    }
                });
                
                delete cellMergeInfo[mainRef];
                hasUnmerged = true;
            }
        }
    });
    
    if (hasUnmerged) {
        console.log('取消合并完成', cellMergeInfo);
        alert('取消合并成功');
    } else {
        alert('选中的单元格没有合并信息');
    }
}

/**
 * 根据引用ID查找单元格
 */
function findCellByReference(table, ref) {
    // 解析引用 R0C1 -> row=0, col=1
    const match = ref.match(/R(\d+)C(\d+)/);
    if (!match) return null;
    
    const rowIndex = parseInt(match[1]);
    const cellIndex = parseInt(match[2]);
    
    if (table.rows[rowIndex] && table.rows[rowIndex].cells[cellIndex]) {
        return table.rows[rowIndex].cells[cellIndex];
    }
    
    return null;
}

/**
 * 支持拖拉选中单元格
 */
function initMultiCellSelection() {
    const table = document.getElementById('design-table');
    if (!table) return;
    
    let isDragging = false;
    let startCell = null;
    let currentCell = null;
    
    // 鼠标按下开始拖拉选择
    table.addEventListener('mousedown', function(e) {
        const cell = e.target.closest('td');
        if (!cell) return;
        
        // 阻止默认的文本选择行为
        e.preventDefault();
        
        isDragging = true;
        startCell = cell;
        currentCell = cell;
        
        // 添加拖拉状态class
        table.classList.add('dragging-select', 'no-select');
        
        // 清除之前的选中
        document.querySelectorAll('#design-table td.selected').forEach(c => {
            c.classList.remove('selected');
        });
        
        // 选中起始单元格
        cell.classList.add('selected');
        window.lastSelectedCell = cell;
    });
    
    // 鼠标移动时更新选中范围
    table.addEventListener('mouseover', function(e) {
        if (!isDragging) return;
        
        const cell = e.target.closest('td');
        if (!cell || cell === currentCell) return;
        
        currentCell = cell;
        
        // 更新选中范围
        if (startCell && currentCell) {
            selectCellRange(startCell, currentCell);
        }
    });
    
    // 鼠标松开结束拖拉选择
    document.addEventListener('mouseup', function(e) {
        if (isDragging) {
            isDragging = false;
            
            // 移除拖拉状态class
            table.classList.remove('dragging-select', 'no-select');
            
            // 如果拖拉选择完成，记录最后选中的单元格
            if (currentCell) {
                window.lastSelectedCell = currentCell;
            }
        }
    });
    
    // 单击单元格（支持Ctrl多选）
    table.addEventListener('click', function(e) {
        const cell = e.target.closest('td');
        if (!cell) return;
        
        // 如果按住Ctrl键，允许多选/取消选择
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            cell.classList.toggle('selected');
            window.lastSelectedCell = cell;
        }
    });
    
    // 防止在表格上拖拉时选中文本
    table.addEventListener('selectstart', function(e) {
        if (isDragging) {
            e.preventDefault();
        }
    });
    
    console.log('拖拉选中功能已初始化');
}

/**
 * 选择单元格范围
 */
function selectCellRange(startCell, endCell) {
    const startPos = getCellPosition(startCell);
    const endPos = getCellPosition(endCell);
    
    const minRow = Math.min(startPos.rowIndex, endPos.rowIndex);
    const maxRow = Math.max(startPos.rowIndex, endPos.rowIndex);
    const minCol = Math.min(startPos.cellIndex, endPos.cellIndex);
    const maxCol = Math.max(startPos.cellIndex, endPos.cellIndex);
    
    const table = startCell.closest('table');
    
    // 清除之前的选中
    document.querySelectorAll('#design-table td.selected').forEach(c => {
        c.classList.remove('selected');
    });
    
    // 选中范围内的所有单元格
    for (let r = minRow; r <= maxRow; r++) {
        const row = table.rows[r];
        if (!row) continue;
        
        for (let c = minCol; c <= maxCol; c++) {
            const cell = row.cells[c];
            if (cell && cell.tagName === 'TD') {
                cell.classList.add('selected');
            }
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定合并按钮事件
    const mergeBtn = document.getElementById('merge-cells-btn');
    if (mergeBtn) {
        mergeBtn.addEventListener('click', mergeCells);
    }
    
    // 绑定取消合并按钮事件
    const unmergeBtn = document.getElementById('unmerge-cells-btn');
    if (unmergeBtn) {
        unmergeBtn.addEventListener('click', unmergeCells);
    }
    
    // 初始化多选功能
    initMultiCellSelection();
    
    console.log('单元格合并功能已初始化');
});
