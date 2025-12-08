/**
 * SDK 配置管理模块
 * 集中管理所有SDK相关的配置参数，包括SDK脚本URL和API基础地址
 */

const SDK_CONFIG_SETTINGS = {
    // SDK脚本加载URL（可根据不同环境配置）
    sdkScriptUrls: [
        'http://183.6.70.7:24689/wp-core/api/getPanelXSdk',
        'https://demo.kwaidoo.com/zbyth/process/wp-core/api/getPanelXSdk'
    ],

    // SDK API基础地址配置
    apiBaseUrl: 'https://demo.kwaidoo.com/zbyth/process',

    // SDK业务域代码
    busDomainCode: 'OctoCM_BDYTH',

    // SDK登录凭证
    credentials: {
        username: 'admin',
        password: '123456',
    },

    // SDK面板代码
    panelCode: 'BDYTH_IML_00001',

    // SDK保存按钮配置
    saveButton: {
        panelCode: 'IML_00001',
        buttonName: '保存'
    },

    /**
     * 获取SDK脚本URL（可用于动态加载SDK）
     * @param {number} index 脚本URL的索引，默认为0
     * @returns {string} SDK脚本URL
     */
    getSdkScriptUrl(index = 0) {
        if (index >= 0 && index < this.sdkScriptUrls.length) {
            return this.sdkScriptUrls[index];
        }
        console.warn(`索引 ${index} 超出范围，返回第一个SDK脚本URL`);
        return this.sdkScriptUrls[0];
    },

    /**
     * 获取API基础地址
     * @returns {string} API基础地址
     */
    getApiBaseUrl() {
        return this.apiBaseUrl;
    },

    /**
     * 更新SDK脚本URL列表
     * @param {Array<string>} urls 新的SDK脚本URL列表
     */
    updateSdkScriptUrls(urls) {
        if (Array.isArray(urls) && urls.length > 0) {
            this.sdkScriptUrls = urls;
            console.log('SDK脚本URL已更新:', urls);
        } else {
            console.error('无效的SDK脚本URL列表');
        }
    },

    /**
     * 更新API基础地址
     * @param {string} url 新的API基础地址
     */
    updateApiBaseUrl(url) {
        if (typeof url === 'string' && url.trim()) {
            this.apiBaseUrl = url;
            console.log('API基础地址已更新:', url);
        } else {
            console.error('无效的API基础地址');
        }
    },

    /**
     * 从外部配置文件加载SDK配置
     * @param {string} configFilePath 配置文件路径
     * @returns {Promise<Object>} 返回加载的配置对象
     */
    async loadFromFile(configFilePath) {
        try {
            // 获取当前页面URL的目录路径
            const baseUrl = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const fullConfigPath = baseUrl + '/' + configFilePath.replace(/^\/+/, '');
            
            console.log('正在加载SDK配置文件:', fullConfigPath);
            
            const response = await fetch(fullConfigPath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const externalConfig = await response.json();
            
            // 合并外部配置
            if (externalConfig.sdkScriptUrls && Array.isArray(externalConfig.sdkScriptUrls)) {
                this.sdkScriptUrls = externalConfig.sdkScriptUrls;
            }
            if (externalConfig.apiBaseUrl && typeof externalConfig.apiBaseUrl === 'string') {
                this.apiBaseUrl = externalConfig.apiBaseUrl;
            }
            if (externalConfig.busDomainCode && typeof externalConfig.busDomainCode === 'string') {
                this.busDomainCode = externalConfig.busDomainCode;
            }
            if (externalConfig.credentials && typeof externalConfig.credentials === 'object') {
                this.credentials = externalConfig.credentials;
            }
            if (externalConfig.panelCode && typeof externalConfig.panelCode === 'string') {
                this.panelCode = externalConfig.panelCode;
            }
            if (externalConfig.saveButton && typeof externalConfig.saveButton === 'object') {
                this.saveButton = externalConfig.saveButton;
            }

            console.log('SDK配置已从文件加载:', this);
            return this;
        } catch (error) {
            console.error('加载SDK配置文件失败:', error);
            console.log('将使用默认配置');
            return this;
        }
    },

    /**
     * 打印当前配置（用于调试）
     */
    printConfig() {
        console.log('=== 当前SDK配置 ===');
        console.log('SDK脚本URLs:', this.sdkScriptUrls);
        console.log('API基础地址:', this.apiBaseUrl);
        console.log('业务域代码:', this.busDomainCode);
        console.log('面板代码:', this.panelCode);
        console.log('保存按钮配置:', this.saveButton);
        console.log('===================');
    }
};

// 导出配置对象供其他模块使用
window.SDK_CONFIG_SETTINGS = SDK_CONFIG_SETTINGS;

console.log('SDK配置管理模块已加载');
