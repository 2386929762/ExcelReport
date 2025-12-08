// 拖拽功能处理模块

// 定义表格数据映射关系 - 每个表格最多4个字段，适应4*4的固定表格
// 直接使用全局对象，避免变量重复声明问题
if (!window.tableDataMap) {
    window.tableDataMap = {
        '客户信息表': {
            fields: ['客户ID', '客户姓名', '身份证号', '手机号'],
            data: [
                { '客户ID': 'C001', '客户姓名': '张三', '身份证号': '110101199001011234', '手机号': '13800138001' },
                { '客户ID': 'C002', '客户姓名': '李四', '身份证号': '110101199102022345', '手机号': '13900139002' },
                { '客户ID': 'C003', '客户姓名': '王五', '身份证号': '110101199203033456', '手机号': '13700137003' },
                { '客户ID': 'C004', '客户姓名': '赵六', '身份证号': '110101199203033456', '手机号': '13700137003' }
            ]
        },
        '账户信息表': {
            fields: ['账户ID', '客户ID', '账户类型', '开户日期'],
            data: [
                { '账户ID': 'A001', '客户ID': 'C001', '账户类型': '活期', '开户日期': '2020-01-15' },
                { '账户ID': 'A002', '客户ID': 'C001', '账户类型': '定期', '开户日期': '2021-03-20' },
                { '账户ID': 'A003', '客户ID': 'C002', '账户类型': '活期', '开户日期': '2019-11-10' }
            ]
        },
        '交易记录表': {
            fields: ['交易ID', '交易类型', '交易金额', '交易日期'],
            data: [
                { '交易ID': 'T001', '交易类型': '转账', '交易金额': '2000.00', '交易日期': '2024-01-10' },
                { '交易ID': 'T002', '交易类型': '存款', '交易金额': '5000.00', '交易日期': '2024-01-12' },
                { '交易ID': 'T003', '交易类型': '消费', '交易金额': '800.00', '交易日期': '2024-01-15' }
            ]
        }
    };
}

// 确保表格行存在，如果不存在则创建
function ensureRowExists(table, rowIndex) {
    // 如果行已存在，直接返回
    if (rowIndex < table.rows.length) {
        return table.rows[rowIndex];
    }

    // 创建新行
    const newRow = table.insertRow(rowIndex);

    // 创建单元格，与第一行保持相同的列数
    const columnCount = table.rows[0].cells.length;
    for (let i = 0; i < columnCount; i++) {
        const cell = newRow.insertCell(i);
        // 第一列是行号列，不可编辑
        if (i === 0) {
            cell.textContent = rowIndex + 1; // 设置行号
            cell.contentEditable = false;
            // 移除样式设置
        } else {
            cell.contentEditable = true;
        }
    }

    return newRow;
}
// 添加字段到表格区域
function addFieldToTable(cell, fieldName, tableName) {
    console.log('添加字段到表格:', { fieldName, tableName, cell });
    
    // 对于动态加载的表,tableDataMap可能不存在,这是正常的
    const tableData = window.tableDataMap ? window.tableDataMap[tableName] : null;
    if (!tableData) {
        console.log('tableDataMap中没有表格数据(动态表使用):', tableName);
        // 不再阻止添加,继续执行
    }

    // 检查是否是行号列，如果是则不允许修改
    if (Array.from(cell.parentElement.cells).indexOf(cell) === 0) {
        console.warn('不能在行号列添加字段');
        return;
    }
    
    const table = cell.closest('table');
    const colIndex = Array.from(cell.parentElement.cells).indexOf(cell);
    
    // 检查该列是否已经存在字段
    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        if (row.cells.length > colIndex) {
            const existingCell = row.cells[colIndex];
            if (existingCell.dataset.type === 'field' && existingCell !== cell) {
                console.warn(`该列已存在字段: ${existingCell.dataset.name}，不能添加新字段`);
                // 显示列冲突警告
                if (typeof showColumnConflictWarning === 'function') {
                    showColumnConflictWarning(existingCell.dataset.name, fieldName);
                } else {
                    alert(`该列已存在字段: ${existingCell.dataset.name}，不能添加新字段`);
                }
                return;
            }
        }
    }
    
    // 检查表格中是否已有来自不同表的字段
    let existingTableName = null;
    let hasFields = false;
    
    // 遍历表格查找已存在的字段
    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        for (let j = 1; j < row.cells.length; j++) {
            const existingCell = row.cells[j];
            if (existingCell.dataset.type === 'field') {
                hasFields = true;
                if (existingTableName === null) {
                    existingTableName = existingCell.dataset.table;
                }
                // 如果找到不同表的字段，则不允许添加
                if (existingCell.dataset.table !== tableName && existingCell !== cell) {
                    console.warn(`表格中已有来自"${existingCell.dataset.table}"的数据，不能添加来自"${tableName}"的字段`);
                    // 触发UI反馈
                    if (typeof showTableConflictWarning === 'function') {
                        showTableConflictWarning(existingCell.dataset.table, tableName);
                    } else {
                        // 如果没有专门的警告函数，使用alert
                        alert(`表格中已有来自"${existingCell.dataset.table}"的数据，不能添加来自"${tableName}"的字段`);
                    }
                    return;
                }
            }
        }
    }

    // 设置字段名称,使用{fieldName}格式显示
    cell.textContent = '{' + fieldName + '}';
    // 移除样式设置
    cell.style.fontWeight = 'bold';
    cell.style.backgroundColor = '#e0e0e0';
    // 设置单元格元数据
    cell.dataset.type = 'field';
    cell.dataset.name = fieldName;
    cell.dataset.table = tableName;
    
    // 添加内容变化监听器
    addContentChangeListener(cell);

    // 更新表格数据中的fields数组，确保与设计表格中的字段保持一致
    updateTableFields(tableName, table);

    // 更新单元格信息
    if (typeof updateCellInfo === 'function') {
        updateCellInfo(cell);
    }
}

// 为单元格添加内容变化监听器
function addContentChangeListener(cell) {
    // 防止重复添加监听器
    if (cell.hasOwnProperty('_contentChangeListener')) {
        return;
    }
    
    // 使用input事件监听内容变化
    const listener = function() {
        // 如果单元格内容被清空，移除相关元数据
        if (!this.textContent.trim()) {
            delete this.dataset.type;
            delete this.dataset.name;
            delete this.dataset.table;
            this.style.fontWeight = '';
            this.style.backgroundColor = '';
        }
        
        // 检查是否是字段单元格，如果是，则更新表格字段
        if (this.dataset.table && this.dataset.type === 'field') {
            updateTableFields(this.dataset.table, this.closest('table'));
        }
    };
    
    cell.addEventListener('input', listener);
    cell._contentChangeListener = listener; // 标记已添加监听器
}

// 更新表格数据中的fields数组，使其与设计表格中的字段保持一致
function updateTableFields(tableName, designTable) {
    if (!window.tableDataMap[tableName]) return;
    
    // 查找字段行
    let fieldRow = null;
    for (let i = 0; i < designTable.rows.length; i++) {
        const row = designTable.rows[i];
        for (let j = 1; j < row.cells.length; j++) {
            const cell = row.cells[j];
            if (cell.dataset.type === 'field' && cell.dataset.table === tableName) {
                fieldRow = row;
                break;
            }
        }
        if (fieldRow) break;
    }
    
    if (!fieldRow) return;
    
    // 收集所有有效的字段名
    const newFields = [];
    for (let j = 1; j < fieldRow.cells.length; j++) {
        const cell = fieldRow.cells[j];
        if (cell.dataset.type === 'field' && cell.dataset.table === tableName) {
            newFields.push(cell.dataset.name);
        }
    }
    
    // 更新window.tableDataMap中的fields数组
    window.tableDataMap[tableName].fields = newFields;
    console.log('已更新表格', tableName, '的字段列表:', newFields);
}

// 初始化拖拽功能
function initDragAndDrop() {
    // 获取所有可拖拽元素，只允许字段拖拽，不允许整个表格拖拽
    const draggableItems = document.querySelectorAll('.table-field.draggable');
    const tableCells = document.querySelectorAll('#design-table td[contenteditable="true"]');

    // 设置拖拽源
    draggableItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            console.log('开始拖拽字段:', item, '类名:', item.className, '数据集:', item.dataset);
            // 添加dragging类标识当前拖拽的元素
            item.classList.add('dragging');
            let dragData = {};

            // 只处理字段类型的拖拽
            dragData = {
                type: 'field',
                name: item.dataset.field || item.textContent.trim(),
                tableName: item.dataset.table || '未知表格',
                fieldName: item.dataset.field || item.textContent.trim()
            };
            console.log('字段拖拽数据:', dragData);

            // 确保dataTransfer支持setData方法
            if (e.dataTransfer && typeof e.dataTransfer.setData === 'function') {
                const jsonData = JSON.stringify(dragData);
                e.dataTransfer.setData('text/plain', jsonData);
                console.log('拖拽数据已设置:', jsonData);
                // 同时设置一个简单的文本作为备份
                e.dataTransfer.setData('text/uri-list', 'drag:' + dragData.type);
            } else {
                console.error('dataTransfer不支持setData方法');
            }
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            console.log('拖拽结束');
            // 移除dragging类
            item.classList.remove('dragging');
        });
    });

    // 设置表格单元格为放置目标
    tableCells.forEach(cell => {
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.classList.add('drop-target');
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drop-target');
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drop-target');
            console.log('发生拖拽放置事件:', e);

            try {
                // 尝试获取各种格式的数据
                const dataText = e.dataTransfer.getData('text/plain');
                const uriData = e.dataTransfer.getData('text/uri-list');

                console.log('获取到的拖拽数据(text/plain):', dataText);
                console.log('获取到的拖拽数据(text/uri-list):', uriData);

                if (!dataText || dataText.trim() === '') {
                    console.warn('没有有效的JSON拖拽数据，尝试获取拖拽元素信息');

                    // 尝试获取拖拽的元素
                    const dragElement = document.querySelector('.dragging');
                    if (dragElement) {
                        console.log('找到拖拽中的元素:', dragElement);
                        console.log('元素类名:', dragElement.className);
                        console.log('元素数据集:', dragElement.dataset);

                        // 只处理字段类型的拖拽
                        if (dragElement.dataset.table && dragElement.dataset.field) {
                            console.log('检测到字段类型拖拽:', dragElement.dataset.field, 'from', dragElement.dataset.table);
                            const tableName = dragElement.dataset.table;
                            const fieldName = dragElement.dataset.field;
                            if (tableName && fieldName) {
                                // 直接使用检测到的字段信息创建数据对象
                                const fallbackData = {
                                    type: 'field',
                                    name: fieldName,
                                    tableName: tableName,
                                    fieldName: fieldName
                                };
                                console.log('使用回退数据:', fallbackData);

                                // 处理字段类型的拖拽
                                if (fallbackData.type === 'field' && fallbackData.fieldName && fallbackData.tableName) {
                                    console.log('回退处理字段:', fallbackData.fieldName, 'from', fallbackData.tableName);
                                    addFieldToTable(cell, fallbackData.fieldName, fallbackData.tableName);
                                }
                                return;
                            }
                        }
                    }

                    // 如果没有JSON数据，尝试从URI数据中获取基本类型
                    if (uriData && uriData.startsWith('drag:')) {
                        const dragType = uriData.substring(5);
                        console.log('从URI数据推断拖拽类型:', dragType);
                    }

                    console.warn('无法获取有效的拖拽数据');
                    return;
                }

                const data = JSON.parse(dataText);
                console.log('解析后的拖拽数据:', data);

                // 只处理字段类型的拖拽，不允许整个表格拖拽
                if (data.type === 'field' && data.fieldName && data.tableName) {
                    console.log('执行添加字段:', data.fieldName, '表格:', data.tableName);
                    addFieldToTable(cell, data.fieldName, data.tableName);
                }
                else {
                    console.warn('只支持字段类型的拖拽');
                }
            } catch (error) {
                console.error('处理拖拽数据时出错:', error);
                console.error('错误详情:', error.stack);
            }
        });
    });
}

// 暴露必要的函数到全局
window.ensureRowExists = ensureRowExists;
window.addFieldToTable = addFieldToTable;
window.initDragAndDrop = initDragAndDrop;

// 当DOM加载完成后初始化拖拽功能
document.addEventListener('DOMContentLoaded', initDragAndDrop);

// 显示列冲突警告
function showColumnConflictWarning(existingFieldName, newFieldName) {
    // 创建警告容器
    let warningElement = document.getElementById('column-conflict-warning');
    
    // 如果警告元素不存在，则创建它
    if (!warningElement) {
        warningElement = document.createElement('div');
        warningElement.id = 'column-conflict-warning';
        warningElement.style.position = 'fixed';
        warningElement.style.top = '20px';
        warningElement.style.left = '50%';
        warningElement.style.transform = 'translateX(-50%)';
        warningElement.style.backgroundColor = '#f44336';
        warningElement.style.color = 'white';
        warningElement.style.padding = '16px';
        warningElement.style.borderRadius = '4px';
        warningElement.style.boxShadow = '0 3px 5px rgba(0,0,0,0.2)';
        warningElement.style.zIndex = '1000';
        warningElement.style.maxWidth = '80%';
        warningElement.style.textAlign = 'center';
        warningElement.style.fontSize = '14px';
        
        // 添加关闭按钮
        const closeButton = document.createElement('span');
        closeButton.innerHTML = '&times;';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '10px';
        closeButton.style.fontSize = '18px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontWeight = 'bold';
        
        closeButton.addEventListener('click', function() {
            warningElement.style.opacity = '0';
            setTimeout(() => {
                warningElement.remove();
            }, 300);
        });
        
        warningElement.appendChild(closeButton);
        document.body.appendChild(warningElement);
    }
    
    // 设置警告消息
    warningElement.innerHTML = `<span style="position: absolute; top: 5px; right: 10px; font-size: 18px; cursor: pointer; font-weight: bold;" onclick="document.getElementById('column-conflict-warning').remove()">&times;</span>
    该列已存在字段: "${existingFieldName}"，不能添加新字段 "${newFieldName}"<br>
    请先删除该列的现有字段，然后再添加新字段`;
    
    // 显示警告
    warningElement.style.opacity = '1';
    warningElement.style.transition = 'opacity 0.3s ease';
    
    // 3秒后自动消失
    setTimeout(() => {
        warningElement.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(warningElement)) {
                warningElement.remove();
            }
        }, 300);
    }, 5000);
}

// 显示表格冲突警告
function showTableConflictWarning(existingTableName, newTableName) {
    // 创建警告容器
    let warningElement = document.getElementById('table-conflict-warning');
    
    // 如果警告元素不存在，则创建它
    if (!warningElement) {
        warningElement = document.createElement('div');
        warningElement.id = 'table-conflict-warning';
        warningElement.style.position = 'fixed';
        warningElement.style.top = '20px';
        warningElement.style.left = '50%';
        warningElement.style.transform = 'translateX(-50%)';
        warningElement.style.backgroundColor = '#f44336';
        warningElement.style.color = 'white';
        warningElement.style.padding = '16px';
        warningElement.style.borderRadius = '4px';
        warningElement.style.boxShadow = '0 3px 5px rgba(0,0,0,0.2)';
        warningElement.style.zIndex = '1000';
        warningElement.style.maxWidth = '80%';
        warningElement.style.textAlign = 'center';
        warningElement.style.fontSize = '14px';
        
        // 添加关闭按钮
        const closeButton = document.createElement('span');
        closeButton.innerHTML = '&times;';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '10px';
        closeButton.style.fontSize = '18px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontWeight = 'bold';
        
        closeButton.addEventListener('click', function() {
            warningElement.style.opacity = '0';
            setTimeout(() => {
                warningElement.remove();
            }, 300);
        });
        
        warningElement.appendChild(closeButton);
        document.body.appendChild(warningElement);
    }
    
    // 设置警告消息
    warningElement.innerHTML = `<span style="position: absolute; top: 5px; right: 10px; font-size: 18px; cursor: pointer; font-weight: bold;" onclick="document.getElementById('table-conflict-warning').remove()">&times;</span>
    表格中已有来自"${existingTableName}"的数据，不能添加来自"${newTableName}"的字段<br>
    请先删除所有"${existingTableName}"的字段，然后再添加其他表的字段`;
    
    // 显示警告
    warningElement.style.opacity = '1';
    warningElement.style.transition = 'opacity 0.3s ease';
    
    // 3秒后自动消失
    setTimeout(() => {
        warningElement.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(warningElement)) {
                warningElement.remove();
            }
        }, 300);
    }, 5000);
}

// 暴露函数到全局，以便其他模块调用
window.showTableConflictWarning = showTableConflictWarning;