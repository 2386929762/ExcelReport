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
        
        console.log('表格配置已导出为JSON文件');
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
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) {
            console.warn('未选择文件');
            return;
        }
        
        // 读取文件内容
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // 解析JSON
                const config = JSON.parse(e.target.result);
                
                // 验证配置格式
                if (!config || typeof config !== 'object') {
                    throw new Error('无效的配置文件格式');
                }
                
                console.log('成功导入表格配置文件');
                
                // 调用成功回调
                if (typeof onSuccess === 'function') {
                    onSuccess(config);
                }
            } catch (error) {
                console.error('解析配置文件时出错:', error);
                alert('导入失败：无法解析配置文件。请确保文件是有效的JSON格式。');
            }
        };
        
        reader.onerror = function() {
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
    if (datasourceSelect && tableSelect) {
        tableConfig.detailReportConfig = {
            selectedDataSource: datasourceSelect.value || '',
            selectedTable: tableSelect.value || ''
        };
        console.log('保存明细报表配置:', tableConfig.detailReportConfig);
    }
    
    // 从全局window.cellConfigurations复制单元格配置
    if (window.cellConfigurations && typeof window.cellConfigurations === 'object') {
        tableConfig.cellConfigurations = JSON.parse(JSON.stringify(window.cellConfigurations));
    }
    
    // 从表格中收集数据
    const table = document.getElementById('design-table');
    if (table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, rowIndex) => {
            const rowData = [];
            const cells = row.querySelectorAll('td, th');
            
            cells.forEach((cell, cellIndex) => {
                // 获取单元格内容
                const cellContent = cell.textContent || '';
                
                // 检查单元格是否是合并的以及合并属性
                const colspan = parseInt(cell.getAttribute('colspan') || '1');
                const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
                
                // 获取单元格样式和其他属性
                const style = { ...window.getComputedStyle(cell) };
                const cellData = {
                    value: cellContent.trim(),
                    type: cell.dataset.type || 'text',
                    colspan,
                    rowspan,
                    style: {
                        fontWeight: style.fontWeight,
                        fontSize: style.fontSize,
                        textAlign: style.textAlign,
                        backgroundColor: style.backgroundColor,
                        color: style.color,
                        border: style.border,
                        fontStyle: style.fontStyle,
                        textDecoration: style.textDecoration
                    },
                    data: {}
                };
                
                // 获取单元格的数据属性
                for (let i = 0; i < cell.attributes.length; i++) {
                    const attr = cell.attributes[i];
                    if (attr.name.startsWith('data-')) {
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
                
                rowData.push(cellData);
            });
            
            tableConfig.tableData.push(rowData);
        });
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
            console.log('检测到明细报表配置,保存到window.currentNodeInfo:', config.detailReportConfig);
            if (!window.currentNodeInfo) {
                window.currentNodeInfo = {};
            }
            if (!window.currentNodeInfo.config) {
                window.currentNodeInfo.config = {};
            }
            // 将detailReportConfig的内容合并到config中
            window.currentNodeInfo.config.selectedDataSource = config.detailReportConfig.selectedDataSource;
            window.currentNodeInfo.config.selectedTable = config.detailReportConfig.selectedTable;
            console.log('已保存到window.currentNodeInfo.config:', window.currentNodeInfo.config);
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
                    console.log(`更新单元格配置: ${cellRef}`, cellConfig);
                    importCount++;
                    
                    // 直接保存到localStorage，确保用户点击时能获取最新配置
                    try {
                        localStorage.setItem(`cellConfig_${cellRef}`, JSON.stringify(cellConfig));
                        console.log(`已将单元格 ${cellRef} 的配置保存到localStorage`);
                    } catch (e) {
                        console.error(`保存单元格 ${cellRef} 配置到localStorage失败:`, e);
                    }
                }
            });
            
            // 将配置保存到localStorage整体对象
            try {
                localStorage.setItem('cellConfigurations', JSON.stringify(window.cellConfigurations));
                console.log('单元格配置已成功保存到localStorage');
            } catch (e) {
                console.warn('无法保存到localStorage:', e);
            }
            
            // 关键修复：优先从导入的配置对象的tableData字段中应用样式到表格
            const table = document.getElementById('design-table');
            if (table && config.tableData && Array.isArray(config.tableData)) {
                const rows = table.querySelectorAll('tr');
                let appliedCount = 0;
                
                // 遍历导入的表格数据，将样式应用到对应的单元格
                config.tableData.forEach((rowData, rowIndex) => {
                    if (rowIndex < rows.length) {
                        const row = rows[rowIndex];
                        const cells = row.querySelectorAll('td, th');
                        
                        rowData.forEach((cellData, cellIndex) => {
                            if (cellIndex < cells.length && cellData) {
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
                        });
                    }
                });
                
                console.log(`成功将样式和数据应用到 ${appliedCount} 个单元格`);
            } else {
                console.warn('未找到表格元素或导入的配置中没有表格数据');
            }
            
            // 强制更新当前选中单元格的信息显示，无论配置是否变更
            if (window.currentSelectedCell && typeof updateCellInfo === 'function') {
                try {
                    updateCellInfo(window.currentSelectedCell);
                    console.log('已强制更新当前选中单元格的信息显示');
                } catch (e) {
                    console.warn('更新选中单元格信息失败:', e);
                }
            }
            
            console.log(`成功导入 ${importCount} 个单元格配置`);
        } else {
            console.warn('导入的配置中没有有效的单元格配置');
        }
        
        // 注意：不再重建表格DOM结构，但会应用配置到现有单元格
        console.log('表格配置已成功应用到DOM元素');
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