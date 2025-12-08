// detailTableSDK.js - 明细报表 SDK 集成模块

const SDK_CONFIG = {
    devDefaultBaseUrl: 'https://demo.kwaidoo.com/zbyth/process',
    busDomainCode: 'OctoCM_BDYTH',
    panelCode: 'IML_00001'
};

let sdkInstance = null;
let currentNodeCode = null;

/**
 * 初始化 SDK 并登录
 */
async function initDetailTableSDK() {
    try {
        if (typeof PanelXSdk === 'undefined') {
            console.warn('PanelXSdk 未加载');
            return false;
        }

        sdkInstance = new PanelXSdk({
            devDefaultBaseUrl: SDK_CONFIG.devDefaultBaseUrl,
            busDomainCode: SDK_CONFIG.busDomainCode
        });

        try {
            await sdkInstance.user.login({ userName: 'admin', password: '123456' });
            console.log('SDK 登录成功');
        } catch (e) {
            console.warn('SDK 登录失败:', e);
        }

        return true;
    } catch (err) {
        console.error('初始化 SDK 失败:', err);
        return false;
    }
}

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
                
                // 获取单元格样式
                const computedStyle = window.getComputedStyle(cell);
                const cellData = {
                    value: cellContent.trim(),
                    type: cell.dataset.type || 'text',
                    style: {
                        fontWeight: computedStyle.fontWeight,
                        fontSize: computedStyle.fontSize,
                        textAlign: computedStyle.textAlign,
                        backgroundColor: computedStyle.backgroundColor,
                        color: computedStyle.color,
                        fontStyle: computedStyle.fontStyle,
                        textDecoration: computedStyle.textDecoration
                    }
                };

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
            
            tableConfig.tableData.push(rowData);
        });
    }

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
                                    console.warn(`无法应用样式 ${styleProp}:`, e);
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
            panelCode: SDK_CONFIG.panelCode,
            condition: { code: nodeCode }
        };

        console.log('从 SDK 查询配置，参数:', params);
        const result = await sdkInstance.api.queryFormData(params);
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
            panelCode: SDK_CONFIG.panelCode,
            condition: { code: nodeCode },
            data: {
                code: nodeCode,
                json: jsonString
            }
        };

        console.log('保存配置到 SDK，参数:', params);
        const result = await sdkInstance.api.saveFormData(params);
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
document.addEventListener('DOMContentLoaded', async function() {
    console.log('明细报表 SDK 模块初始化');
    
    // 初始化 SDK
    await initDetailTableSDK();
    
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
        btn.addEventListener('click', function(e) {
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
