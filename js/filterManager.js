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
        
        // 优先从 window.allFields 获取最新的中文名
        let displayName = fieldName;
        if (window.allFields && Array.isArray(window.allFields)) {
            const fieldInfo = window.allFields.find(f => f.name === fieldName);
            if (fieldInfo && fieldInfo.label) {
                displayName = fieldInfo.label;
            }
        }
        // 如果 window.allFields 中没有，使用传入的 fieldLabel 或 displayName
        if (displayName === fieldName) {
            displayName = field.fieldLabel || field.displayName || fieldName;
        }

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
                // 如果已存在，更新其显示名称
                const labelSpan = item.querySelector('.field-label');
                if (labelSpan && labelSpan.textContent !== displayName) {
                    labelSpan.textContent = displayName;
                    item.dataset.displayName = displayName;
                    console.log(`更新过滤字段显示名: ${fieldName} -> ${displayName}`);
                }
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
    async function loadFilterFields() {
        if (typeof window.currentNodeInfo !== 'undefined' &&
            window.currentNodeInfo &&
            window.currentNodeInfo.config &&
            window.currentNodeInfo.config.filterFields) {

            const filterFields = window.currentNodeInfo.config.filterFields;
            // console.log('加载已保存的过滤字段:', filterFields);

            // 如果有表编号，先查询表结构获取字段中文名
            let fieldNameToLabel = {};
            if (window.currentNodeInfo.config.selectedTableCode && window.sdk) {
                try {
                    const params = {
                        panelCode: 'IML_00003',
                        condition: {
                            code: window.currentNodeInfo.config.selectedTableCode
                        }
                    };
                    const result = await window.sdk.api.queryFormData(params);
                    if (result && result.state === '200' && result.data && result.data.list && result.data.list.length > 0) {
                        const tableInfo = result.data.list[0];
                        const fieldsStructure = tableInfo['表结构'];
                        if (fieldsStructure && Array.isArray(fieldsStructure)) {
                            fieldsStructure.forEach(fieldInfo => {
                                if (fieldInfo['字段名'] && fieldInfo['字段中文名']) {
                                    fieldNameToLabel[fieldInfo['字段名']] = fieldInfo['字段中文名'];
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('查询表结构失败:', error);
                }
            }

            // 为每个字段添加displayName（从查询结果或使用字段名）
            filterFields.forEach(field => {
                const fieldWithLabel = {
                    ...field,
                    fieldLabel: fieldNameToLabel[field.field] || field.field,
                    displayName: fieldNameToLabel[field.field] || field.displayName || field.field
                };
                addFilterField(fieldWithLabel);
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
                field: item.dataset.field
                // 不保存displayName，中文名通过查询表结构动态获取
            });
        });

        return filterFields;
    }

    // 更新已有过滤字段的显示名称（使用 window.allFields 中的最新中文名）
    function updateFilterFieldLabels() {
        if (!window.allFields || !Array.isArray(window.allFields) || window.allFields.length === 0) {
            console.log('window.allFields 为空，跳过更新过滤字段显示名');
            return;
        }

        const container = document.getElementById('filter-fields-container');
        if (!container) return;

        const filterItems = container.querySelectorAll('.filter-field-item');
        let updatedCount = 0;

        filterItems.forEach(item => {
            const fieldName = item.dataset.field;
            if (fieldName) {
                const fieldInfo = window.allFields.find(f => f.name === fieldName);
                if (fieldInfo && fieldInfo.label) {
                    const labelSpan = item.querySelector('.field-label');
                    if (labelSpan && labelSpan.textContent !== fieldInfo.label) {
                        labelSpan.textContent = fieldInfo.label;
                        item.dataset.displayName = fieldInfo.label;
                        updatedCount++;
                        console.log(`更新过滤字段显示名: ${fieldName} -> ${fieldInfo.label}`);
                    }
                }
            }
        });

        if (updatedCount > 0) {
            console.log(`已更新 ${updatedCount} 个过滤字段的显示名`);
        }
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
        addFilterField: addFilterField,
        updateFilterFieldLabels: updateFilterFieldLabels
    };

})();
