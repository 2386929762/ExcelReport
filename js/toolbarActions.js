// 工具栏动作绑定模块 - 负责将配置管理功能绑定到工具栏按钮

/**
 * 初始化工具栏按钮动作
 * 将保存和导入功能绑定到对应的按钮
 */
function initToolbarActions() {
    console.log('开始初始化工具栏动作');

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            bindToolbarButtons();
        });
    } else {
        bindToolbarButtons();
    }
}

/**
 * 绑定工具栏按钮事件
 */
function bindToolbarButtons() {
    console.log('绑定工具栏按钮事件');

    // 获取工具栏按钮
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');

    if (toolbarButtons.length >= 2) {
        // 第一个按钮：保存配置为JSON文件
        const saveConfigButton = toolbarButtons[0];
        if (saveConfigButton) {
            // 保存原始点击事件（如果有）
            const originalOnClick = saveConfigButton.onclick;

            // 重新绑定点击事件
            saveConfigButton.onclick = function (event) {
                // 执行原始点击事件（如果有）
                if (typeof originalOnClick === 'function') {
                    originalOnClick.call(this, event);
                }

                // 执行保存配置功能
                handleSaveConfig();
            };

            // 确保按钮有适当的提示信息
            if (!saveConfigButton.title) {
                saveConfigButton.title = '保存配置';
            }

            console.log('已绑定保存配置按钮');
        }

        // 第二个按钮：导入配置从JSON文件
        const importConfigButton = toolbarButtons[1];
        if (importConfigButton) {
            // 绑定点击事件
            importConfigButton.onclick = handleImportConfig;

            // 设置提示信息
            importConfigButton.title = '导入配置';

            console.log('已绑定导入配置按钮');
        }

        // 第三个按钮：清空配置
        if (toolbarButtons.length >= 3) {
            const clearConfigButton = toolbarButtons[2];
            if (clearConfigButton) {
                // 绑定点击事件
                clearConfigButton.onclick = handleClearConfig;

                // 设置提示信息
                clearConfigButton.title = '清空配置';

                console.log('已绑定清空配置按钮');
            }
        }
    } else {
        console.warn('工具栏按钮不足，无法绑定所有功能');

        // 尝试使用特定的类或ID查找按钮
        const saveBtn = document.querySelector('.save-btn');
        const downloadBtn = document.querySelector('.toolbar-btn:nth-child(2)');

        if (saveBtn) {
            saveBtn.addEventListener('click', function (event) {
                // 确保不阻止原始的保存单元格配置功能
                if (typeof saveCellConfiguration === 'function') {
                    try {
                        saveCellConfiguration();
                    } catch (e) {
                        console.warn('保存单元格配置失败，但继续执行配置导出:', e);
                    }
                }

                // 执行保存配置功能
                handleSaveConfig();
            });
            console.log('已使用save-btn类绑定保存配置功能');
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', handleImportConfig);
            downloadBtn.title = '导入配置';
            console.log('已绑定第二个按钮作为导入配置功能');
        }

        // 尝试查找第三个按钮作为清空配置功能
        const clearBtn = document.querySelector('.clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', handleClearConfig);
            clearBtn.title = '清空配置';
            console.log('已绑定清空配置按钮');
        }
    }
}

/**
 * 处理保存配置按钮点击事件
 */
async function handleSaveConfig() {
    console.log('保存配置按钮被点击');

    try {
        // 首先确保当前选中单元格的配置已保存
        if (typeof saveCellConfiguration === 'function' && window.currentSelectedCell) {
            saveCellConfiguration();
        }

        // 从全局节点信息中获取数据
        if (!window.currentNodeInfo) {
            alert('错误：无法获取节点信息，请重新打开配置页面');
            return;
        }

        const nodeInfo = window.currentNodeInfo;
        console.log('准备保存，节点信息:', nodeInfo);

        // 验证必要字段
        if (!nodeInfo.nodeName) {
            alert('错误：节点名称不能为空');
            return;
        }

        // 获取表格当前最新的配置
        const currentTableConfig = typeof getCurrentTableConfig === 'function' ? getCurrentTableConfig() : null;
        if (!currentTableConfig) {
            console.warn('无法获取当前表格配置，使用空对象');
        }

        // 创建保存用的节点数据，包含最新的表格配置
        const nodeInfoToSave = {
            ...nodeInfo,
            config: currentTableConfig  // 使用当前表格最新配置
        };

        // 直接调用后台服务器接口保存
        const result = await callBackendSaveAPI(nodeInfoToSave);

        // 处理接口返回结果
        if (!result) {
            console.error('接口返回空结果');
            showNotification('错误', '配置保存失败：未收到接口响应', 'error');
            return;
        }

        if (result.state === '200') {
            // 成功情况
            console.log('接口调用成功，返回数据:', result);

            // 构建成功消息
            let successMessage = '配置保存成功！';
            if (result.data?.uuid) {
                successMessage += ' UUID: ' + result.data.uuid;
            }

            // 如果有额外的数据信息，也显示出来
            // if (result.data?.data) {
            //     successMessage += '\n配置编号: ' + (result.data.data.code || '未提供');
            // }

            showNotification('成功', successMessage, 'success');
        } else {
            // 失败情况
            console.error('接口调用失败:', result);
            const errorMessage = result.msg || '未知错误';
            showNotification('错误', '配置保存失败：' + errorMessage, 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);

        // 分类错误类型，显示不同的错误信息
        let errorMessage = '配置保存失败，请稍后重试。';

        if (error.name === 'TypeError' && error.message.includes('callButton')) {
            errorMessage = 'SDK方法调用错误，请检查SDK版本和方法名称。';
        } else if (error.message) {
            errorMessage += '\n错误信息: ' + error.message;
        }

        showNotification('错误', errorMessage, 'error');
    }
}

// 全局SDK实例
let sdkInstance = null;

/**
 * 初始化SDK并登录
 */
async function initSDK() {
    try {
        if (!sdkInstance) {
            console.log('初始化SDK...');
            
            // 从配置管理器获取配置
            const config = window.SDK_CONFIG_SETTINGS || {};
            const apiBaseUrl = config.getApiBaseUrl?.() || 'http://10.238.171.159:8090';
            const busDomainCode = config.busDomainCode || 'OctoCM_BDYTH';
            const credentials = config.credentials || { username: 'admin', password: '123456' };
            
            console.log('使用SDK配置:', { apiBaseUrl, busDomainCode });
            
            // 创建SDK实例，使用配置文件中的devDefaultBaseUrl
            sdkInstance = new PanelXSdk({
                devDefaultBaseUrl: apiBaseUrl,
                busDomainCode: busDomainCode
            });

            // 执行登录
            console.log('SDK登录中...');
            await sdkInstance.user.login({
                userName: credentials.username,
                password: credentials.password,
            });
            console.log('SDK登录成功');
        }
        return sdkInstance;
    } catch (error) {
        console.error('SDK初始化或登录失败:', error);
        throw error;
    }
}

// 调用后台保存接口
async function callBackendSaveAPI(nodeInfo) {
    try {
        // 初始化SDK并登录
        const sdk = await initSDK();

        // 从配置中获取保存按钮配置
        const config = window.SDK_CONFIG_SETTINGS || {};
        const saveButtonConfig = config.saveButton || { panelCode: 'IML_00001', buttonName: '保存' };

        // 构建表单数据
        const formData = {
            "节点名": nodeInfo.nodeName,
            "节点类型": nodeInfo.nodeType || "指标报表",
            "parentCode": nodeInfo.parentCode || "000"
        };

        // 如果有编号，添加编号字段（新建时编号为空）
        if (nodeInfo.nodeId) {
            formData["编号"] = nodeInfo.nodeId;
        }

        // 添加当前表格的config JSON
        if (nodeInfo.config) {
            // 如果config是对象，转换为JSON字符串；如果已是字符串则直接使用
            formData["json"] = typeof nodeInfo.config === 'string' ? nodeInfo.config : JSON.stringify(nodeInfo.config);
            console.log('添加配置JSON:', formData["json"]);
        }

        console.log('调用SDK保存接口，参数:', {
            panelCode: saveButtonConfig.panelCode,
            buttonName: saveButtonConfig.buttonName,
            formData: formData
        });

        // 调用SDK接口 - 使用正确的方法名callButton，参数从配置文件读取
        const result = await sdk.api.callButton({
            "panelCode": saveButtonConfig.panelCode,
            "buttonName": saveButtonConfig.buttonName,
            "formData": formData
        });

        return result;
    } catch (error) {
        console.error('调用后台接口失败:', error);
        throw error;
    }
}

/**
 * 显示通知消息
 */
function showNotification(title, message, type = 'info') {
    // 创建通知DOM元素（在页面上显示）
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 20px 30px;
        border-radius: 8px;
        font-size: 16px;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        text-align: center;
        max-width: 400px;
        word-wrap: break-word;
        white-space: pre-wrap;
    `;
    notification.textContent = title + ': ' + message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动删除
    setTimeout(() => {
        notification.style.transition = 'opacity 0.3s ease-out';
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);

    // 如果浏览器支持Notification API，也可以使用系统通知
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: type === 'success' ? 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="green"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>' : undefined
        });
    } else {
        // 否则使用原生alert
        alert(title + ': ' + message);
    }

    // 在控制台也显示消息，便于调试
    if (type === 'error') {
        console.error(`${title}: ${message}`);
    } else if (type === 'success') {
        console.log(`${title}: ${message}`);
    } else {
        console.info(`${title}: ${message}`);
    }
}

/**
 * 处理导入配置按钮点击事件
 */
function handleImportConfig() {
    console.log('导入配置按钮被点击');

    try {
        // 导入配置，并在成功后应用
        importTableConfig(function (config) {
            // 应用导入的配置
            applyTableConfig(config);
        });
    } catch (error) {
        console.error('导入配置时发生错误:', error);
        alert('导入配置失败：' + error.message);
    }
}

/**
 * 处理清空配置按钮点击事件
 */
function handleClearConfig() {
    console.log('清空配置按钮被点击');

    // 确认对话框，防止误操作
    if (!confirm('确定要清空所有表格配置并刷新页面吗？此操作不可恢复！')) {
        return;
    }

    try {
        // 清空全局单元格配置对象
        if (window.cellConfigurations) {
            window.cellConfigurations = {};
            console.log('全局单元格配置已清空');
        }

        // 设置全局标志，表示已执行清空操作
        window.configsCleared = true;
        console.log('已设置配置清空标志');

        // 更彻底地清除所有可能的配置项
        // 1. 清除localStorage中的所有配置
        const allLocalStorageKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                // 清除所有可能的配置相关键
                if (key.includes('cell') || key.includes('config') || key.includes('table') || key.includes('grid') || key.includes('sheet')) {
                    allLocalStorageKeys.push(key);
                }
            }
        }

        allLocalStorageKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log(`已删除localStorage配置: ${key}`);
        });

        // 2. 清除sessionStorage中的所有配置
        try {
            const allSessionStorageKeys = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key) {
                    // 清除所有可能的配置相关键
                    if (key.includes('cell') || key.includes('config') || key.includes('table') || key.includes('grid') || key.includes('sheet')) {
                        allSessionStorageKeys.push(key);
                    }
                }
            }

            allSessionStorageKeys.forEach(key => {
                sessionStorage.removeItem(key);
                console.log(`已删除sessionStorage配置: ${key}`);
            });
        } catch (e) {
            console.warn('清除会话存储时出错:', e);
        }

        // 3. 清除所有可能的全局配置变量
        window.cellConfigurations = {};
        window.currentSelectedCell = null;
        window.selectedCellInfo = null;

        // 4. 清空当前选中单元格的信息显示
        const cellInfoElements = document.querySelectorAll('#cell-info input, #cell-info select');
        cellInfoElements.forEach(element => {
            if (element.tagName === 'INPUT') {
                element.value = '';
            } else if (element.tagName === 'SELECT') {
                element.selectedIndex = 0;
            }
        });

        // 5. 最后，强制刷新页面以确保所有配置都被清除
        console.log('准备刷新页面以彻底清除所有配置');
        alert('所有配置已成功清空，页面将刷新以确保彻底清除！');
        location.reload(true); // 使用true参数强制从服务器重新加载页面，不使用缓存

    } catch (error) {
        console.error('清空配置时发生错误:', error);
        alert('清空配置失败：' + error.message);
    }
}

// 自动初始化
initToolbarActions();

// 全局导出，使其他脚本可以访问
window.initToolbarActions = initToolbarActions;
window.handleSaveConfig = handleSaveConfig;
window.handleClearConfig = handleClearConfig;