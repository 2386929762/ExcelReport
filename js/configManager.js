// 配置管理模块 - 负责表格配置的保存和导入功能

/**
 * 导出表格配置为JSON文件
 * @param {Object} config 表格配置对象
 * @param {string} fileName 文件名（可选）
 * @returns {boolean} 是否导出成功
 */
function exportTableConfig(config, fileName = '表格配置') {
    try {
        // 确保配置存在
        if (!config) {
            console.error('没有提供配置数据');
            return false;
        }

        // 将配置转换为JSON字符串
        const jsonString = JSON.stringify(config, null, 2);

        // 创建Blob对象
        const blob = new Blob([jsonString], { type: 'application/json' });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // 设置文件名，添加时间戳避免覆盖
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `${fileName}_${timestamp}.json`;

        // 模拟点击下载
        document.body.appendChild(link);
        link.click();

        // 清理
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // console.log('表格配置已导出为JSON文件');
        return true;
    } catch (error) {
        console.error('导出表格配置时出错:', error);
        alert('导出配置失败：' + error.message);
        return false;
    }
}

/**
 * 导入JSON文件中的表格配置
 * @param {Function} onSuccess 导入成功后的回调函数，接收配置对象作为参数
 */
function importTableConfig(onSuccess) {
    // 创建文件选择对话框
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    // 监听文件选择事件
    input.onchange = function (event) {
        const file = event.target.files[0];
        if (!file) {
            console.warn('未选择文件');
            return;
        }

        // 读取文件内容
        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                // 解析JSON
                const config = JSON.parse(e.target.result);

                // 验证配置格式
                if (!config || typeof config !== 'object') {
                    throw new Error('无效的配置文件格式');
                }

                // console.log('成功导入表格配置文件');

                // 调用成功回调
                if (typeof onSuccess === 'function') {
                    onSuccess(config);
                }
            } catch (error) {
                console.error('解析配置文件时出错:', error);
                alert('导入失败：无法解析配置文件。请确保文件是有效的JSON格式。');
            }
        };

        reader.onerror = function () {
            console.error('读取文件时出错');
            alert('导入失败：无法读取文件。');
        };

        // 开始读取文件
        reader.readAsText(file);
    };

    // 触发文件选择对话框
    input.click();
}

/**
 * 获取当前表格配置
 * @returns {Object} 表格配置对象
 */
function getCurrentTableConfig() {
    const tableConfig = {
        cellConfigurations: {},
        tableData: [],
        cellMergeInfo: {}, // 添加单元格合并信息
        metadata: {
            version: '1.0',
            created: new Date().toISOString(),
            title: document.title || '未命名表格',
            nodeType: window.currentNodeInfo?.nodeType || '指标报表'
        }
    };

    // 保存数据源和数据表选择(明细报表专用)
    const datasourceSelect = document.getElementById('datasource-select');
    const tableSelect = document.getElementById('table-select');
    const schemaSelect = document.getElementById('schema-select');
    if (datasourceSelect && tableSelect) {
        console.log('=== 保存明细报表配置 ===');

        // 从表格中重新收集selectedCols，确保顺序和重复字段都正确
        const table = document.getElementById('design-table');
        const collectedFields = [];

        if (table && table.rows.length > 0) {
            // 遍历所有行，找到包含字段的单元格
            for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
                const row = table.rows[rowIndex];
                const cells = row.querySelectorAll('td, th');

                // 遍历该行的所有单元格
                for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
                    const cell = cells[cellIndex];

                    // 跳过行号列（第一列）
                    if (cellIndex === 0) continue;

                    // 如果是字段类型的单元格
                    if (cell.dataset.type === 'field' && cell.dataset.name) {
                        const fieldName = cell.dataset.name;
                        const colIndex = cellIndex;

                        // 检查该列是否已经记录过字段
                        const existingField = collectedFields.find(f => f.colIndex === colIndex);
                        if (!existingField) {
                            // 记录字段名和列索引
                            collectedFields.push({
                                fieldName: fieldName,
                                colIndex: colIndex,
                                rowIndex: rowIndex
                            });
                        }
                    }
                }
            }

            // 按列索引排序
            collectedFields.sort((a, b) => a.colIndex - b.colIndex);
        }

        // 提取字段名数组（保持顺序，允许重复）
        const selectedColsArray = collectedFields.map(f => f.fieldName);

        console.log('从表格收集到的字段（按列顺序）:', collectedFields);
        console.log('selectedColsArray:', selectedColsArray);
        console.log('window.selectedCols（旧值，仅供参考）:', window.selectedCols);

        // 单独保存字段的中文label映射（用于显示）
        const fieldLabels = {};
        // 添加selectedCols中的字段
        selectedColsArray.forEach(fieldName => {
            const fieldInfo = (window.allFields || []).find(f => f.name === fieldName);
            if (fieldInfo && fieldInfo.label) {
                fieldLabels[fieldName] = fieldInfo.label;
            }
        });
        console.log('字段标签映射 fieldLabels:', fieldLabels);

        // 添加filterFields中的字段
        if (tableConfig.filterFields && Array.isArray(tableConfig.filterFields)) {
            tableConfig.filterFields.forEach(filterField => {
                const fieldName = filterField.field;
                // 如果还没有添加过这个字段的label
                if (fieldName && !fieldLabels[fieldName]) {
                    const fieldInfo = (window.allFields || []).find(f => f.name === fieldName);
                    if (fieldInfo && fieldInfo.label) {
                        fieldLabels[fieldName] = fieldInfo.label;
                    }
                }
            });
        }

        tableConfig.detailReportConfig = {
            selectedDataSource: datasourceSelect.value || '',
            selectedTable: tableSelect.value || '',
            selectedSchema: schemaSelect ? (schemaSelect.value || '') : '',
            selectedCols: selectedColsArray,  // 使用从表格收集的字段数组
            fieldLabels: fieldLabels  // 单独保存label映射
        };
        console.log('最终保存的 detailReportConfig:', tableConfig.detailReportConfig);
        console.log('=== 保存明细报表配置结束 ===');
    }

    // 保存所有单元格配置（通过引用保存）
    if (window.cellConfigurations && typeof window.cellConfigurations === 'object') {
        Object.keys(window.cellConfigurations).forEach(cellRef => {
            const config = window.cellConfigurations[cellRef];
            // 只保存有实际配置内容的单元格
            if (config && Object.keys(config).length > 0) {
                tableConfig.cellConfigurations[cellRef] = JSON.parse(JSON.stringify(config));
            }
        });
    }

    // 保存单元格合并信息
    if (window.cellMergeInfo && typeof window.cellMergeInfo === 'object') {
        tableConfig.cellMergeInfo = JSON.parse(JSON.stringify(window.cellMergeInfo));
        // console.log('保存单元格合并信息:', tableConfig.cellMergeInfo);
    }

    // 保存过滤字段配置
    if (window.filterManager && typeof window.filterManager.getFilterFields === 'function') {
        tableConfig.filterFields = window.filterManager.getFilterFields();
        // console.log('保存过滤字段配置:', tableConfig.filterFields);
    }

    // 判断单元格是否有配置内容（非空且非默认值）
    function isCellConfigured(cell, cellContent) {
        // 检查是否有实际内容（排除纯数字的行号和列号）
        const trimmedContent = cellContent.trim();
        if (trimmedContent !== '' && !/^[0-9]+$/.test(trimmedContent) && !/^[A-Z]+$/.test(trimmedContent)) {
            return true;
        }

        // 检查是否有特殊类型（非text和非默认）
        if (cell.dataset.type && cell.dataset.type !== 'text' && cell.dataset.type !== '') {
            return true;
        }

        // 检查是否有数据属性（排除默认的data-type）
        let hasDataAttr = false;
        for (let i = 0; i < cell.attributes.length; i++) {
            const attr = cell.attributes[i];
            if (attr.name.startsWith('data-') && attr.name !== 'data-type') {
                hasDataAttr = true;
                break;
            }
        }
        if (hasDataAttr) return true;

        // 检查是否有合并单元格
        const colspan = parseInt(cell.getAttribute('colspan') || '1');
        const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
        if (colspan > 1 || rowspan > 1) return true;

        // 检查是否有通过inline style设置的非默认样式
        if (cell.style.fontWeight && cell.style.fontWeight !== '' && cell.style.fontWeight !== 'normal') return true;
        if (cell.style.fontStyle && cell.style.fontStyle === 'italic') return true;
        if (cell.style.textDecoration && cell.style.textDecoration.includes('underline')) return true;
        if (cell.style.backgroundColor && cell.style.backgroundColor !== '' &&
            cell.style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
            cell.style.backgroundColor !== 'transparent') return true;
        if (cell.style.color && cell.style.color !== '' && cell.style.color !== 'rgb(0, 0, 0)') return true;
        if (cell.style.fontSize && cell.style.fontSize !== '' && cell.style.fontSize !== '10px') return true;

        return false;
    }

    // 从表格中收集数据（只保存已配置的单元格）
    const table = document.getElementById('design-table');
    if (table) {
        const rows = table.querySelectorAll('tr');
        let hasConfiguredCells = false;

        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td, th');
            const rowData = new Array(cells.length).fill(null); // 初始化为null数组
            let rowHasConfiguredCells = false;

            cells.forEach((cell, cellIndex) => {
                // 跳过行号列（第一列的td，通常是行号）
                // 注意：表头行(th)不跳过，因为列标题(A,B,C...)需要保存
                if (cellIndex === 0 && cell.tagName === 'TD' && row.querySelector('td:first-child') === cell) {
                    // 检查是否是行号列（内容为纯数字）
                    if (/^[0-9]+$/.test(cell.textContent.trim())) {
                        return; // 跳过行号列，保持为null
                    }
                }

                // 获取单元格内容
                const cellContent = cell.textContent || '';

                // 只处理已配置的单元格
                if (!isCellConfigured(cell, cellContent)) {
                    return; // 跳过未配置的单元格，保持为null
                }

                rowHasConfiguredCells = true;
                hasConfiguredCells = true;

                // 检查单元格是否是合并的以及合并属性
                const colspan = parseInt(cell.getAttribute('colspan') || '1');
                const rowspan = parseInt(cell.getAttribute('rowspan') || '1');

                // 只保存显式设置的样式，而不是计算后的样式
                const cellData = {
                    value: cellContent.trim(),
                    type: cell.dataset.type || 'text',
                    rowIndex: rowIndex,
                    cellIndex: cellIndex,  // 保存实际的列索引
                    data: {}
                };

                // 只保存有值的属性
                if (colspan > 1) cellData.colspan = colspan;
                if (rowspan > 1) cellData.rowspan = rowspan;

                // 只保存显式设置的样式
                const inlineStyles = {};
                if (cell.style.fontWeight && cell.style.fontWeight !== '') {
                    inlineStyles.fontWeight = cell.style.fontWeight;
                }
                if (cell.style.fontSize && cell.style.fontSize !== '') {
                    inlineStyles.fontSize = cell.style.fontSize;
                }
                if (cell.style.textAlign && cell.style.textAlign !== '') {
                    inlineStyles.textAlign = cell.style.textAlign;
                }
                if (cell.style.backgroundColor && cell.style.backgroundColor !== '') {
                    inlineStyles.backgroundColor = cell.style.backgroundColor;
                }
                if (cell.style.color && cell.style.color !== '') {
                    inlineStyles.color = cell.style.color;
                }
                if (cell.style.fontStyle && cell.style.fontStyle !== '') {
                    inlineStyles.fontStyle = cell.style.fontStyle;
                }
                if (cell.style.textDecoration && cell.style.textDecoration !== '') {
                    inlineStyles.textDecoration = cell.style.textDecoration;
                }

                // 添加border样式
                const computedStyle = window.getComputedStyle(cell);
                const borderStyle = computedStyle.border;
                if (borderStyle && borderStyle !== 'none') {
                    inlineStyles.border = borderStyle;
                }

                // 只有在有样式时才添加style属性
                if (Object.keys(inlineStyles).length > 0) {
                    cellData.style = inlineStyles;
                }

                // 获取单元格的数据属性
                for (let i = 0; i < cell.attributes.length; i++) {
                    const attr = cell.attributes[i];
                    if (attr.name.startsWith('data-') && attr.name !== 'data-type') {
                        const dataKey = attr.name.substring(5); // 移除 'data-' 前缀
                        cellData.data[dataKey] = attr.value;
                    }
                }

                // 对于明细报表的字段单元格，保存字段信息
                if (cellData.type === 'field' && cell.dataset.table && cell.dataset.name) {
                    cellData.data = {
                        table: cell.dataset.table,
                        field: cell.dataset.name,
                        displayName: cell.dataset.displayName || cell.dataset.name
                    };
                }

                // 如果data对象为空，删除它
                if (Object.keys(cellData.data).length === 0) {
                    delete cellData.data;
                }

                // 将单元格数据放入正确的位置
                rowData[cellIndex] = cellData;
            });

            // 只有当行有配置的单元格时才添加到tableData
            if (rowHasConfiguredCells) {
                tableConfig.tableData.push(rowData);
            }
        });

        // console.log(`收集到 ${tableConfig.tableData.length} 行已配置的单元格数据`);
    }

    return tableConfig;
}

/**
 * 应用表格配置
 * @param {Object} config 表格配置对象
 * @returns {boolean} 是否应用成功
 */
function applyTableConfig(config) {
    try {
        // 验证配置格式
        if (!config || typeof config !== 'object') {
            console.error('无效的表格配置格式');
            alert('导入失败：无效的配置文件格式');
            return false;
        }

        // 保存明细报表配置到window.currentNodeInfo,由expenseStatement.html的DOMContentLoaded统一处理
        if (config.detailReportConfig) {
            // console.log('检测到明细报表配置,保存到window.currentNodeInfo:', config.detailReportConfig);
            if (!window.currentNodeInfo) {
                window.currentNodeInfo = {};
            }
            if (!window.currentNodeInfo.config) {
                window.currentNodeInfo.config = {};
            }
            // 将detailReportConfig的内容合并到config中
            window.currentNodeInfo.config.selectedDataSource = config.detailReportConfig.selectedDataSource;
            window.currentNodeInfo.config.selectedTable = config.detailReportConfig.selectedTable;
            window.currentNodeInfo.config.selectedSchema = config.detailReportConfig.selectedSchema || '';
            window.currentNodeInfo.config.selectedCols = config.detailReportConfig.selectedCols || [];
            // 恢复选中的字段到全局变量
            window.selectedCols = config.detailReportConfig.selectedCols || [];
            // console.log('已保存到window.currentNodeInfo.config:', window.currentNodeInfo.config);
        }

        // 恢复过滤字段配置
        if (config.filterFields) {
            // console.log('检测到过滤字段配置,保存到window.currentNodeInfo:', config.filterFields);
            if (!window.currentNodeInfo) {
                window.currentNodeInfo = {};
            }
            if (!window.currentNodeInfo.config) {
                window.currentNodeInfo.config = {};
            }
            window.currentNodeInfo.config.filterFields = config.filterFields;

            // 触发filterManager重新加载过滤字段
            if (window.filterManager && typeof window.filterManager.loadFilterFields === 'function') {
                setTimeout(() => {
                    window.filterManager.loadFilterFields();
                }, 100);
            }
        }

        // 更新全局单元格配置对象 - 这是我们真正需要导入的内容
        if (config.cellConfigurations && typeof config.cellConfigurations === 'object') {
            // 保存旧的配置对象引用
            const oldConfig = window.cellConfigurations || {};

            // 初始化全局配置对象
            if (!window.cellConfigurations) {
                window.cellConfigurations = {};
            }

            let importCount = 0;

            // 遍历导入的配置并更新
            Object.keys(config.cellConfigurations).forEach(cellRef => {
                const cellConfig = config.cellConfigurations[cellRef];
                // 验证单个单元格配置
                if (cellConfig && typeof cellConfig === 'object') {
                    // 更新内存中的配置
                    window.cellConfigurations[cellRef] = cellConfig;
                    // console.log(`更新单元格配置: ${cellRef}`, cellConfig);
                    importCount++;

                    // 直接保存到localStorage，确保用户点击时能获取最新配置
                    try {
                        localStorage.setItem(`cellConfig_${cellRef}`, JSON.stringify(cellConfig));
                        // console.log(`已将单元格 ${cellRef} 的配置保存到localStorage`);
                    } catch (e) {
                        console.error(`保存单元格 ${cellRef} 配置到localStorage失败:`, e);
                    }
                }
            });

            // 将配置保存到localStorage整体对象
            try {
                localStorage.setItem('cellConfigurations', JSON.stringify(window.cellConfigurations));
                // console.log('单元格配置已成功保存到localStorage');
            } catch (e) {
                console.warn('无法保存到localStorage:', e);
            }

            // 关键修复：优先从导入的配置对象的tableData字段中应用样式到表格
            const table = document.getElementById('design-table');
            if (table && config.tableData && Array.isArray(config.tableData)) {
                const rows = table.querySelectorAll('tr');
                let appliedCount = 0;

                // 遍历导入的表格数据，将样式应用到对应的单元格
                config.tableData.forEach((rowDataArray) => {
                    // rowDataArray 是一个数组，包含该行的所有配置单元格
                    rowDataArray.forEach((cellData) => {
                        if (cellData && cellData.rowIndex !== undefined && cellData.cellIndex !== undefined) {
                            const rowIndex = cellData.rowIndex;
                            const cellIndex = cellData.cellIndex;

                            if (rowIndex < rows.length) {
                                const row = rows[rowIndex];
                                const cells = row.querySelectorAll('td, th');

                                if (cellIndex < cells.length) {
                                    const cell = cells[cellIndex];

                                    // 应用单元格内容
                                    if (cellData.value !== undefined) {
                                        cell.textContent = cellData.value;
                                    }

                                    // 应用样式
                                    if (cellData.style && typeof cellData.style === 'object') {
                                        Object.keys(cellData.style).forEach(styleProp => {
                                            try {
                                                cell.style[styleProp] = cellData.style[styleProp];
                                            } catch (e) {
                                                console.warn(`无法应用样式 ${styleProp} 到单元格 (${rowIndex},${cellIndex}):`, e);
                                            }
                                        });
                                    }

                                    // 应用数据属性和类型
                                    if (cellData.type) {
                                        cell.dataset.type = cellData.type;
                                    }

                                    if (cellData.data && typeof cellData.data === 'object') {
                                        // 对于明细报表的字段单元格
                                        if (cellData.type === 'field') {
                                            if (cellData.data.table) cell.dataset.table = cellData.data.table;
                                            if (cellData.data.field) cell.dataset.name = cellData.data.field;
                                            if (cellData.data.displayName) cell.dataset.displayName = cellData.data.displayName;
                                        } else {
                                            // 其他类型的数据属性
                                            Object.keys(cellData.data).forEach(dataKey => {
                                                cell.setAttribute('data-' + dataKey, cellData.data[dataKey]);
                                            });
                                        }
                                    }

                                    // 应用合并单元格属性
                                    if (cellData.colspan) {
                                        cell.setAttribute('colspan', cellData.colspan);
                                    }
                                    if (cellData.rowspan) {
                                        cell.setAttribute('rowspan', cellData.rowspan);
                                    }

                                    appliedCount++;
                                }
                            }
                        }
                    });
                });

                // console.log(`成功将样式和数据应用到 ${appliedCount} 个单元格`);
            } else {
                console.warn('未找到表格元素或导入的配置中没有表格数据');
            }

            // 强制更新当前选中单元格的信息显示，无论配置是否变更
            if (window.currentSelectedCell && typeof updateCellInfo === 'function') {
                try {
                    updateCellInfo(window.currentSelectedCell);
                    // console.log('已强制更新当前选中单元格的信息显示');
                } catch (e) {
                    console.warn('更新选中单元格信息失败:', e);
                }
            }

            // console.log(`成功导入 ${importCount} 个单元格配置`);
        } else {
            console.warn('导入的配置中没有有效的单元格配置');
        }

        // 恢复单元格合并信息
        if (config.cellMergeInfo && typeof config.cellMergeInfo === 'object') {
            window.cellMergeInfo = JSON.parse(JSON.stringify(config.cellMergeInfo));
            // console.log('已恢复单元格合并信息:', window.cellMergeInfo);

            // 应用合并信息到表格
            const table = document.getElementById('design-table');
            if (table) {
                Object.keys(window.cellMergeInfo).forEach(ref => {
                    const mergeInfo = window.cellMergeInfo[ref];

                    // 处理主合并单元格
                    if (mergeInfo.rowSpan && mergeInfo.colSpan) {
                        const match = ref.match(/R(\d+)C(\d+)/);
                        if (match) {
                            const rowIndex = parseInt(match[1]);
                            const cellIndex = parseInt(match[2]);

                            if (table.rows[rowIndex] && table.rows[rowIndex].cells[cellIndex]) {
                                const cell = table.rows[rowIndex].cells[cellIndex];
                                cell.rowSpan = mergeInfo.rowSpan;
                                cell.colSpan = mergeInfo.colSpan;
                            }
                        }
                    }

                    // 处理被隐藏的单元格
                    if (mergeInfo.hidden && mergeInfo.mergedInto) {
                        const match = ref.match(/R(\d+)C(\d+)/);
                        if (match) {
                            const rowIndex = parseInt(match[1]);
                            const cellIndex = parseInt(match[2]);

                            if (table.rows[rowIndex] && table.rows[rowIndex].cells[cellIndex]) {
                                const cell = table.rows[rowIndex].cells[cellIndex];
                                cell.style.display = 'none';
                            }
                        }
                    }
                });
                // console.log('已应用单元格合并信息到表格');
            }
        }

        // 注意：不再重建表格DOM结构，但会应用配置到现有单元格
        // console.log('表格配置已成功应用到DOM元素');
        alert('表格配置已成功导入并应用到表格');
        return true;
    } catch (error) {
        console.error('应用表格配置时出错:', error);
        alert('导入配置失败：' + error.message);
        return false;
    }
}

// 暴露函数到全局作用域，供其他模块使用
window.exportTableConfig = exportTableConfig;
window.importTableConfig = importTableConfig;
window.getCurrentTableConfig = getCurrentTableConfig;
window.applyTableConfig = applyTableConfig;