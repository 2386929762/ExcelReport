/**
 * SDK 配置管理模块
 * 集中管理所有SDK相关的配置参数，包括SDK脚本URL和API基础地址
 */

// SDK配置对象（全局暴露）
window.SDK_CONFIG_SETTINGS = {
    // SDK API基础地址配置
    apiBaseUrl: 'https://demo.kwaidoo.com/zbyth/process',

    // SDK业务域代码
    busDomainCode: 'OctoCM_BDYTH',

    // SDK登录凭证
    credentials: {
        username: 'admin',
        password: '123456',
    },

    // SDK保存按钮配置
    saveButton: {
        panelCode: 'IML_00001',
        buttonName: '保存'
    }
};

// 全局SDK实例（单例模式）
window.sdkInstance = null;

/**
 * 初始化并登录SDK
 * 使用单例模式，确保只创建一个SDK实例
 * @returns {Promise<Object|null>} SDK实例，失败返回null
 */
window.initializeSDK = async function () {
    // 如果已经初始化，直接返回现有实例
    if (window.sdkInstance) {
        return window.sdkInstance;
    }

    try {
        // 检查PanelXSdk是否已加载
        if (typeof PanelXSdk === 'undefined') {
            throw new Error('PanelXSdk未加载，请确保SDK脚本已正确加载');
        }

        // console.log('正在初始化SDK...');

        // 创建SDK实例
        window.sdkInstance = new PanelXSdk({
            devDefaultBaseUrl: window.SDK_CONFIG_SETTINGS.apiBaseUrl,
            busDomainCode: window.SDK_CONFIG_SETTINGS.busDomainCode
        });

        if (!window.sdkInstance.user.isAuthenticated()) {
            // 执行登录
            await window.sdkInstance.user.login({
                userName: window.SDK_CONFIG_SETTINGS.credentials.username,
                password: window.SDK_CONFIG_SETTINGS.credentials.password
            });
        }

        // console.log('SDK初始化并登录成功');
        return window.sdkInstance;
    } catch (error) {
        console.error('SDK初始化失败:', error);
        window.sdkInstance = null;
        return null;
    }
};

// console.log('SDK配置管理模块已加载');
