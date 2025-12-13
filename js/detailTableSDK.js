// detailTableSDK.js - 明细报表 SDK 集成模块

let currentNodeCode = null;

/**
 * 从 URL 参数获取节点编号
 */
function getNodeCodeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('nodeCode') || params.get('code') || params.get('id');
}

/**
 * 获取当前明细表格配置
 */
function getCurrentDetailTableConfig() {
    const tableConfig = {
        tableData: [],
        metadata: {
            version: '1.0',
            created: new Date().toISOString(),
            title: document.title || '明细报表',
            nodeCode: currentNodeCode
        }
    };

    // 判断单元格是否有配置内容
    function isCellConfigured(cell, cellContent) {
        const trimmedContent = cellContent.trim();
        // 排除行号和列标题
        if (trimmedContent === '' || /^[0-9]+$/.test(trimmedContent) || /^[A-Z]+$/.test(trimmedContent)) {
            return false;
        }

        // 检查是否有特殊类型
        if (cell.dataset.type && cell.dataset.type !== 'text' && cell.dataset.type !== '') {
            return true;
        }

        // 检查是否有数据属性
        for (let i = 0; i < cell.attributes.length; i++) {
            const attr = cell.attributes[i];
            if (attr.name.startsWith('data-') && attr.name !== 'data-type') {
                return true;
            }
        }

        // 检查是否有显式设置的样式
        if (cell.style.fontWeight && cell.style.fontWeight !== '') return true;
        if (cell.style.fontSize && cell.style.fontSize !== '') return true;
        if (cell.style.backgroundColor && cell.style.backgroundColor !== '') return true;
        if (cell.style.color && cell.style.color !== '') return true;

        return false;
    }

    // 从表格中收集数据（只保存已配置的单元格）
    const table = document.getElementById('design-table');
    if (table) {
        const rows = table.querySelectorAll('tr');

        rows.forEach((row, rowIndex) => {
            const rowData = [];
            const cells = row.querySelectorAll('td, th');
            let rowHasConfiguredCells = false;

            cells.forEach((cell, cellIndex) => {
                // 跳过行号列
                if (cellIndex === 0 && cell.tagName === 'TD' && /^[0-9]+$/.test(cell.textContent.trim())) {
                    return;
                }

                // 获取单元格内容
                const cellContent = cell.textContent || '';

                // 只处理已配置的单元格
                if (!isCellConfigured(cell, cellContent)) {
                    return;
                }

                rowHasConfiguredCells = true;

                // 只保存显式设置的样式
                const cellData = {
                    value: cellContent.trim(),
                    type: cell.dataset.type || 'text',
                    rowIndex: rowIndex,
                    cellIndex: cellIndex
                };

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

                // 只有在有样式时才添加style属性
                if (Object.keys(inlineStyles).length > 0) {
                    cellData.style = inlineStyles;
                }

                // 如果是字段单元格，保存字段信息
                if (cell.dataset.type === 'field') {
                    cellData.data = {
                        table: cell.dataset.table || '',
                        field: cell.dataset.name || '',
                        displayName: cell.dataset.displayName || ''
                    };
                }

                rowData.push(cellData);
            });

            // 只有当行有配置的单元格时才添加到tableData
            if (rowHasConfiguredCells) {
                tableConfig.tableData.push(rowData);
            }
        });
    }

    console.log(`收集到 ${tableConfig.tableData.length} 行已配置的明细表格数据`);
    return tableConfig;
}

/**
 * 应用明细表格配置到页面
 */
function applyDetailTableConfig(config) {
    try {
        if (!config || !config.tableData) {
            console.warn('无效的配置数据');
            return false;
        }

        const table = document.getElementById('design-table');
        if (!table) {
            console.error('未找到表格元素');
            return false;
        }

        const rows = table.querySelectorAll('tr');

        // 应用配置到表格
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

                        // 应用数据属性
                        if (cellData.type) {
                            cell.dataset.type = cellData.type;
                        }

                        if (cellData.data) {
                            if (cellData.data.table) cell.dataset.table = cellData.data.table;
                            if (cellData.data.field) cell.dataset.name = cellData.data.field;
                            if (cellData.data.displayName) cell.dataset.displayName = cellData.data.displayName;
                        }

                        // 应用样式
                        if (cellData.style && typeof cellData.style === 'object') {
                            Object.keys(cellData.style).forEach(styleProp => {
                                try {
                                    cell.style[styleProp] = cellData.style[styleProp];
                                } catch (e) {
                                    console.warn(`无法应用样式 ${styleProp}: `, e);
                                }
                            });
                        }
                    }
                });
            }
        });

        console.log('明细表格配置已成功应用');
        return true;
    } catch (error) {
        console.error('应用明细表格配置时出错:', error);
        return false;
    }
}

/**
 * 从 SDK 加载配置
 */
async function loadDetailConfigFromSDK(nodeCode) {
    if (!nodeCode) {
        console.warn('未提供节点编号');
        return null;
    }

    if (!sdkInstance) {
        await initDetailTableSDK();
    }

    if (!sdkInstance || !sdkInstance.api) {
        console.warn('SDK 不可用');
        return null;
    }

    try {
        const params = {
            panelCode: window.SDK_CONFIG_SETTINGS.saveButton.panelCode,
            condition: { code: nodeCode }
        };

        console.log('从 SDK 查询配置，参数:', params);
        const result = await window.sdkInstance.api.queryFormData(params);
        console.log('SDK 查询结果:', result);

        if (result && result.state === '200' && result.data && result.data.list && result.data.list.length > 0) {
            const nodeData = result.data.list[0];
            if (nodeData.json) {
                try {
                    const config = typeof nodeData.json === 'string' ? JSON.parse(nodeData.json) : nodeData.json;
                    return config;
                } catch (e) {
                    console.error('解析配置 JSON 失败:', e);
                    return null;
                }
            }
        }

        return null;
    } catch (error) {
        console.error('从 SDK 加载配置失败:', error);
        return null;
    }
}

/**
 * 保存配置到 SDK
 */
async function saveDetailConfigToSDK(nodeCode, config) {
    if (!nodeCode) {
        console.warn('未提供节点编号');
        alert('保存失败：未指定节点编号');
        return false;
    }

    if (!sdkInstance) {
        await initDetailTableSDK();
    }

    if (!sdkInstance || !sdkInstance.api) {
        console.warn('SDK 不可用');
        alert('保存失败：SDK 不可用');
        return false;
    }

    try {
        const jsonString = JSON.stringify(config);

        const params = {
            panelCode: window.SDK_CONFIG_SETTINGS.saveButton.panelCode,
            condition: { code: nodeCode },
            data: {
                code: nodeCode,
                json: jsonString
            }
        };

        console.log('保存配置到 SDK，参数:', params);
        const result = await window.sdkInstance.api.saveFormData(params);
        console.log('SDK 保存结果:', result);

        if (result && result.state === '200') {
            console.log('配置已成功保存到 SDK');
            alert('配置保存成功');
            return true;
        } else {
            console.error('SDK 保存失败:', result);
            alert('保存失败：' + (result?.message || '未知错误'));
            return false;
        }
    } catch (error) {
        console.error('保存配置到 SDK 失败:', error);
        alert('保存失败：' + error.message);
        return false;
    }
}

/**
 * 处理保存按钮点击事件
 */
async function handleDetailTableSave() {
    console.log('保存明细表格配置');

    // 获取当前配置
    const config = getCurrentDetailTableConfig();
    console.log('当前配置:', config);

    // 获取节点编号
    const nodeCode = currentNodeCode || getNodeCodeFromURL();

    if (!nodeCode) {
        // 如果没有节点编号，导出为 JSON 文件
        console.log('未找到节点编号，导出为 JSON 文件');
        if (typeof exportTableConfig === 'function') {
            exportTableConfig(config, '明细报表配置');
        } else {
            alert('导出功能不可用');
        }
        return;
    }

    // 保存到 SDK
    await saveDetailConfigToSDK(nodeCode, config);
}

/**
 * 页面加载时初始化
 */
document.addEventListener('DOMContentLoaded', async function () {
    console.log('明细报表 SDK 模块初始化');

    // 初始化 SDK
    await window.initializeSDK();

    // 尝试从 URL 获取节点编号
    currentNodeCode = getNodeCodeFromURL();
    console.log('当前节点编号:', currentNodeCode);

    // 如果有节点编号，加载配置
    if (currentNodeCode) {
        const config = await loadDetailConfigFromSDK(currentNodeCode);
        if (config) {
            applyDetailTableConfig(config);
        }
    }

    // 绑定保存按钮
    const saveButtons = document.querySelectorAll('.save-button, .save-btn');
    saveButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            handleDetailTableSave();
        });
    });
});

// 暴露函数到全局
window.detailTableSDK = {
    init: initDetailTableSDK,
    getCurrentConfig: getCurrentDetailTableConfig,
    applyConfig: applyDetailTableConfig,
    loadFromSDK: loadDetailConfigFromSDK,
    saveToSDK: saveDetailConfigToSDK,
    handleSave: handleDetailTableSave
};
