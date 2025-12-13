// 过滤管理器 - 处理过滤字段的添加、删除和保存

(function () {
    'use strict';

    // 初始化过滤管理器
    function initFilterManager() {
        // console.log('初始化过滤管理器');

        const filterContainer = document.getElementById('filter-fields-container');
        if (!filterContainer) {
            console.warn('未找到过滤字段容器');
            return;
        }

        // 设置过滤容器为拖放目标
        setupFilterDropZone(filterContainer);

        // 加载已保存的过滤字段配置
        loadFilterFields();
    }

    // 设置过滤区域的拖放功能
    function setupFilterDropZone(container) {
        container.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.stopPropagation();
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.target === container) {
                container.classList.remove('drag-over');
            }
        });

        container.addEventListener('drop', function (e) {
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('drag-over');

            // 获取拖放的数据
            const fieldData = e.dataTransfer.getData('text/plain');
            if (!fieldData) return;

            try {
                const field = JSON.parse(fieldData);
                // console.log('过滤区域接收到字段:', field);

                // 添加过滤字段
                addFilterField(field);

                // 保存配置
                saveFilterFields();
            } catch (error) {
                console.error('解析字段数据失败:', error);
            }
        });
    }

    // 添加过滤字段到容器
    function addFilterField(field) {
        const container = document.getElementById('filter-fields-container');
        if (!container) return;

        // 兼容不同的字段名称格式
        const tableName = field.tableName || field.table;
        const fieldName = field.fieldName || field.field || field.name;
        // 优先使用 fieldLabel（已包含字段中文名），然后是 displayName，最后才是 fieldName
        const displayName = field.fieldLabel || field.displayName || fieldName;

        if (!tableName || !fieldName) {
            console.error('字段数据不完整:', field);
            return;
        }

        // 检查是否已存在该字段
        const existingFields = container.querySelectorAll('.filter-field-item');
        for (let item of existingFields) {
            const existingTable = item.dataset.table;
            const existingField = item.dataset.field;
            if (existingTable === tableName && existingField === fieldName) {
                // console.log('过滤字段已存在，不重复添加');
                return;
            }
        }

        // 创建过滤字段项
        const filterItem = document.createElement('div');
        filterItem.className = 'filter-field-item';
        filterItem.dataset.table = tableName;
        filterItem.dataset.field = fieldName;
        filterItem.dataset.displayName = displayName;
        filterItem.draggable = true;

        const label = document.createElement('span');
        label.className = 'field-label';
        label.textContent = displayName;

        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-filter';
        removeBtn.textContent = '×';
        removeBtn.title = '移除过滤字段';
        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            filterItem.remove();
            saveFilterFields();
        });

        filterItem.appendChild(label);
        filterItem.appendChild(removeBtn);
        container.appendChild(filterItem);

        // console.log('已添加过滤字段:', field);
    }

    // 保存过滤字段配置
    function saveFilterFields() {
        const container = document.getElementById('filter-fields-container');
        if (!container) return;

        const filterFields = [];
        const items = container.querySelectorAll('.filter-field-item');

        items.forEach(item => {
            filterFields.push({
                table: item.dataset.table,
                field: item.dataset.field,
                displayName: item.dataset.displayName
            });
        });

        // 保存到当前配置中
        if (typeof window.currentNodeInfo !== 'undefined' && window.currentNodeInfo) {
            if (!window.currentNodeInfo.config) {
                window.currentNodeInfo.config = {};
            }
            window.currentNodeInfo.config.filterFields = filterFields;
            // console.log('过滤字段已保存到配置:', filterFields);
        }

        return filterFields;
    }

    // 加载已保存的过滤字段
    function loadFilterFields() {
        if (typeof window.currentNodeInfo !== 'undefined' &&
            window.currentNodeInfo &&
            window.currentNodeInfo.config &&
            window.currentNodeInfo.config.filterFields) {

            const filterFields = window.currentNodeInfo.config.filterFields;
            // console.log('加载已保存的过滤字段:', filterFields);

            filterFields.forEach(field => {
                addFilterField(field);
            });
        }
    }

    // 获取当前的过滤字段配置
    function getFilterFields() {
        const container = document.getElementById('filter-fields-container');
        if (!container) return [];

        const filterFields = [];
        const items = container.querySelectorAll('.filter-field-item');

        items.forEach(item => {
            filterFields.push({
                table: item.dataset.table,
                field: item.dataset.field,
                displayName: item.dataset.displayName
            });
        });

        return filterFields;
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFilterManager);
    } else {
        initFilterManager();
    }

    // 导出到全局
    window.filterManager = {
        saveFilterFields: saveFilterFields,
        loadFilterFields: loadFilterFields,
        getFilterFields: getFilterFields,
        addFilterField: addFilterField
    };

})();
