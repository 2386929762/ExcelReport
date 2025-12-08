// 折叠/展开区域功能 - 仅保留左右面板的水平折叠

function toggleSection(sectionId) {
    // 只处理左右面板的折叠（水平方向）
    if (sectionId === 'left-panel' || sectionId === 'right-panel') {
        const panel = document.querySelector('.' + sectionId);
        const icon = document.getElementById(sectionId + '-icon');

        if (!panel || !icon) return;

        if (panel.classList.contains('collapsed')) {
            // 展开面板
            panel.classList.remove('collapsed');
            icon.textContent = sectionId === 'left-panel' ? '◀' : '▶';
        } else {
            // 折叠面板
            panel.classList.add('collapsed');
            icon.textContent = sectionId === 'left-panel' ? '▶' : '◀';
        }
    }
}


// 跟踪当前选中的单元格
let currentSelectedCell = null;

// 存储所有单元格的配置信息
let cellConfigurations = {};
// 暴露到window对象，供queryHandler.js使用
window.cellConfigurations = cellConfigurations;

// 加载所有单元格配置的函数
function loadAllCellConfigurations() {
    console.log('开始加载所有单元格配置...');
    try {
        // 遍历localStorage中的所有项目
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // 检查是否为单元格配置键
            if (key && key.startsWith('cellConfig_')) {
                const cellReference = key.substring('cellConfig_'.length);
                const storedConfig = localStorage.getItem(key);
                if (storedConfig) {
                    const config = JSON.parse(storedConfig);
                    cellConfigurations[cellReference] = config;
                    console.log(`加载单元格配置: ${cellReference}`, config);
                }
            }
        }
        console.log('所有单元格配置加载完成，共加载', Object.keys(cellConfigurations).length, '个配置');
    } catch (error) {
        console.error('加载单元格配置时出错:', error);
    }
}


// 单元格选中功能
const cells = document.querySelectorAll('#design-table td[contenteditable="true"]');
cells.forEach(cell => {
    cell.addEventListener('click', () => {
        // 自动保存当前选中单元格的配置（如果有）
        if (currentSelectedCell && currentSelectedCell !== cell) {
            console.log('自动保存前一个单元格配置');
            saveCellConfiguration();
        }

        // 移除所有单元格的选中状态
        cells.forEach(c => c.classList.remove('selected'));
        // 选中当前单元格
        cell.classList.add('selected');
        currentSelectedCell = cell;

        // 更新右侧单元格信息
        updateCellInfo(cell);

        // 更新选中单元格信息显示
        updateCellSelectionInfo(cell);


    });

    // 监听单元格内容变化，更新上方输入框
    cell.addEventListener('input', function () {
        // 只有当当前单元格被选中时才更新输入框
        if (this.classList.contains('selected')) {
            const inputElement = document.querySelector('.cell-content-input');
            inputElement.value = this.textContent || '';
        }
    });
});

// 更新单元格内容的函数
function updateCellContent() {
    if (currentSelectedCell) {
        currentSelectedCell.textContent = this.value;
    }
}

// 文本格式化函数 - 支持选中文本格式化
function formatText(formatType) {
    if (!currentSelectedCell) return;

    try {
        // 获取当前选中文本
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);

            // 检查选中的文本是否在当前单元格内
            if (currentSelectedCell.contains(range.commonAncestorContainer)) {
                // 创建一个span元素来包裹选中文本
                const span = document.createElement('span');

                // 根据格式化类型设置CSS类
                switch (formatType) {
                    case 'bold':
                        span.className = 'text-bold';
                        break;
                    case 'italic':
                        span.className = 'text-italic';
                        break;
                    case 'underline':
                        span.className = 'text-underline';
                        break;
                }

                // 如果选中的是一个文本节点，直接包裹
                if (range.startContainer.nodeType === Node.TEXT_NODE &&
                    range.endContainer.nodeType === Node.TEXT_NODE &&
                    range.startContainer === range.endContainer &&
                    range.toString().length > 0) {

                    // 提取选中文本
                    const selectedText = range.toString();

                    // 检查是否已经有相同格式的span包裹
                    let parentElement = range.startContainer.parentElement;
                    if (parentElement && parentElement.tagName === 'SPAN' &&
                        parentElement.classList.contains(span.className)) {
                        // 如果已经有相同格式，移除格式
                        const textNode = document.createTextNode(selectedText);
                        parentElement.parentNode.insertBefore(textNode, parentElement);
                        parentElement.parentNode.removeChild(parentElement);
                    } else {
                        // 应用格式
                        range.deleteContents();
                        span.textContent = selectedText;
                        range.insertNode(span);

                        // 移动光标到插入节点之后
                        range.setStartAfter(span);
                        range.setEndAfter(span);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                } else if (range.toString().length > 0) {
                    // 对于复杂选择，简单应用样式
                    range.surroundContents(span);

                    // 移动光标到插入节点之后
                    range.setStartAfter(span);
                    range.setEndAfter(span);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }
    } catch (e) {
        console.error('格式化文本时出错:', e);
    }
}

// 为格式化按钮添加事件监听器
document.addEventListener('DOMContentLoaded', function () {
    // 加粗按钮
    const boldBtn = document.getElementById('bold-btn');
    if (boldBtn) {
        boldBtn.addEventListener('click', function () {
            formatText('bold');
        });
    }

    // 斜体按钮
    const italicBtn = document.getElementById('italic-btn');
    if (italicBtn) {
        italicBtn.addEventListener('click', function () {
            formatText('italic');
        });
    }

    // 下划线按钮
    const underlineBtn = document.getElementById('underline-btn');
    if (underlineBtn) {
        underlineBtn.addEventListener('click', function () {
            formatText('underline');
        });
    }

    // 下拉菜单交互
    setupDropdownMenu('font-color-btn', 'font-color-menu');
    setupDropdownMenu('fill-color-btn', 'fill-color-menu');
    setupDropdownMenu('font-size-btn', 'font-size-menu');

    // 字体颜色选择 - 支持选中文本和整个单元格
    document.querySelectorAll('#font-color-menu .color-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            const color = this.getAttribute('data-color');

            if (currentSelectedCell) {
                // 获取当前选中文本
                const selection = window.getSelection();
                const hasSelection = selection.rangeCount > 0 &&
                    selection.toString().length > 0 &&
                    currentSelectedCell.contains(selection.anchorNode);

                if (hasSelection) {
                    // 有选中文本，应用到选中部分
                    const success = applyStyleToSelection('color', color);
                    // 如果应用失败，不回退到整个单元格
                } else {
                    // 没有选中文本，应用到整个单元格
                    currentSelectedCell.style.color = color;
                }
            }

            toggleDropdown('font-color-menu');
        });
    });

    // 填充色选择 - 应用到整个单元格背景
    document.querySelectorAll('#fill-color-menu .color-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            const color = this.getAttribute('data-color');

            if (currentSelectedCell) {
                // 填充色应该应用到整个单元格
                currentSelectedCell.style.backgroundColor = color;
            }
            toggleDropdown('fill-color-menu');
        });
    });

    // 字号选择 - 支持选中文本和整个单元格
    document.querySelectorAll('#font-size-menu .size-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            const size = this.getAttribute('data-size');

            // 更新所有size-item的active状态
            document.querySelectorAll('#font-size-menu .size-item').forEach(s => {
                s.classList.remove('active');
            });
            this.classList.add('active');

            // 更新按钮上显示的字号
            document.querySelector('.font-size-value').textContent = size;

            // 应用字号样式
            if (currentSelectedCell) {
                // 获取当前选中文本
                const selection = window.getSelection();
                const hasSelection = selection.rangeCount > 0 &&
                    selection.toString().length > 0 &&
                    currentSelectedCell.contains(selection.anchorNode);

                if (hasSelection) {
                    // 有选中文本，应用到选中部分
                    const success = applyStyleToSelection('fontSize', size + 'px');
                    // 如果应用失败，不回退到整个单元格
                } else {
                    // 没有选中文本，应用到整个单元格
                    currentSelectedCell.style.fontSize = size + 'px';
                }
            }

            toggleDropdown('font-size-menu');
        });
    });

    // 点击其他地方关闭所有下拉菜单
    document.addEventListener('click', function () {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    });
});

// 设置下拉菜单功能
function setupDropdownMenu(buttonId, menuId) {
    const button = document.getElementById(buttonId);
    const menu = document.getElementById(menuId);

    if (!button || !menu) return;

    // 点击按钮切换下拉菜单
    button.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDropdown(menuId);
    });

    // 阻止下拉菜单内部点击事件冒泡
    menu.addEventListener('click', function (e) {
        e.stopPropagation();
    });
}

// 切换下拉菜单显示状态
function toggleDropdown(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;

    const dropdown = menu.closest('.dropdown');

    // 关闭其他所有下拉菜单
    document.querySelectorAll('.dropdown').forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('active');
        }
    });

    // 切换当前下拉菜单
    dropdown.classList.toggle('active');
}

// 应用样式到选中文本
function applyStyleToSelection(styleProperty, styleValue) {
    if (!currentSelectedCell) return false;

    try {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return false;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        // 严格检查选中的文本是否在当前单元格内
        if (!currentSelectedCell.contains(range.commonAncestorContainer) || selectedText.length === 0) {
            return false;
        }

        // 创建span元素
        const span = document.createElement('span');

        // 设置样式
        span.style[styleProperty] = styleValue;

        // 保存选中位置
        const startOffset = range.startOffset;
        const endOffset = range.endOffset;
        const startContainer = range.startContainer;

        // 检查是否已经有相同样式的span包裹
        if (startContainer.parentNode &&
            startContainer.parentNode.tagName === 'SPAN' &&
            startContainer.parentNode.style[styleProperty] === styleValue) {
            // 已经有相同样式，更新样式值
            startContainer.parentNode.style[styleProperty] = styleValue;
            return true;
        }

        // 尝试使用更可靠的方式应用样式
        try {
            // 首先克隆当前范围，以防止修改过程中丢失选择
            const cloneRange = range.cloneRange();

            // 使用extractContents方法提取内容
            const extracted = range.extractContents();

            // 将提取的内容放入span中
            span.appendChild(extracted);

            // 将span插入到范围中
            range.insertNode(span);

            // 移动光标到span后面
            range.setStartAfter(span);
            range.setEndAfter(span);
            selection.removeAllRanges();
            selection.addRange(range);

            return true;
        } catch (e) {
            // 如果上面的方法失败，尝试简单的文本节点处理方式
            if (startContainer.nodeType === Node.TEXT_NODE) {
                // 获取父元素
                const parentElement = startContainer.parentNode;

                // 创建文档片段来处理文本节点
                const fragment = document.createDocumentFragment();

                // 创建选中前的文本节点
                if (startOffset > 0) {
                    fragment.appendChild(document.createTextNode(startContainer.textContent.substring(0, startOffset)));
                }

                // 添加带样式的span
                span.textContent = selectedText;
                fragment.appendChild(span);

                // 创建选中后的文本节点
                if (endOffset < startContainer.textContent.length) {
                    fragment.appendChild(document.createTextNode(startContainer.textContent.substring(endOffset)));
                }

                // 替换原节点
                parentElement.replaceChild(fragment, startContainer);

                // 尝试设置选择
                try {
                    range.setStartAfter(span);
                    range.setEndAfter(span);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (e) {
                    // 恢复选择失败不影响主要功能
                }

                return true;
            }

            console.error('应用样式失败:', e);
            return false;
        }
    } catch (e) {
        console.error('应用样式时出错:', e);
        return false;
    }
}

// 更新选中单元格信息显示
function updateCellSelectionInfo(cell) {
    const selectionInfo = document.getElementById('cell-selection-info');
    const positionElement = selectionInfo.querySelector('.cell-position');
    const inputElement = selectionInfo.querySelector('.cell-content-input');

    const rowIndex = cell.parentElement.rowIndex;
    const colIndex = Array.from(cell.parentElement.cells).indexOf(cell);
    const colLetter = String.fromCharCode(64 + colIndex); // A, B, C...
    const content = cell.textContent || '';

    // 更新位置信息
    positionElement.textContent = `${colLetter}${rowIndex}`;

    // 更新输入框内容
    inputElement.value = content;
    inputElement.disabled = false;

    // 移除之前可能存在的事件监听器
    inputElement.removeEventListener('input', updateCellContent);
    // 添加新的事件监听器
    inputElement.addEventListener('input', updateCellContent);
}

// 清除选中单元格信息
function clearCellSelectionInfo() {
    const selectionInfo = document.getElementById('cell-selection-info');
    const positionElement = selectionInfo.querySelector('.cell-position');
    const inputElement = selectionInfo.querySelector('.cell-content-input');

    positionElement.textContent = '未选中任何单元格';
    inputElement.value = '';
    inputElement.disabled = true;
}

// 树节点折叠/展开功能
function toggleTreeNode(node) {
    const icon = node.querySelector('.tree-icon');
    const folderIcon = node.querySelector('.tree-folder-icon');
    const children = node.nextElementSibling;

    if (children.style.display === 'none') {
        children.style.display = 'block';
        icon.textContent = '▾';
        icon.classList.add('tree-folder-open');
        icon.classList.remove('tree-folder-closed');
        folderIcon.textContent = '📂';
    } else {
        children.style.display = 'none';
        icon.textContent = '▸';
        icon.classList.remove('tree-folder-open');
        icon.classList.add('tree-folder-closed');
        folderIcon.textContent = '📁';
    }
}

// 更新单元格信息
// 缓存DOM元素引用，避免重复查询
let cellInfoElements = null;

// 初始化DOM元素缓存
function initCellInfoElements() {
    if (!cellInfoElements) {
        cellInfoElements = {
            cellType: document.querySelector('[data-id="cellType"]') || document.getElementById('cell-type'),
            cellId: document.querySelector('[data-id="cellId"]') || document.getElementById('cell-id'),
            cellSource: document.querySelector('[data-id="cellSource"]') || document.getElementById('cell-source'),
            cellUnit: document.querySelector('[data-id="cellUnit"]') || document.getElementById('cell-unit'),
            cellPrecision: document.querySelector('[data-id="cellPrecision"]') || document.getElementById('cell-precision'),
            cellCalcRule: document.querySelector('[data-id="cellCalcRule"]') || document.getElementById('cell-calc-rule'),
            cellTimeUnit: document.querySelector('[data-id="cellTimeUnit"]') || document.getElementById('cell-time-unit'),
            cellValueType: document.querySelector('[data-id="cellValueType"]') || document.getElementById('cell-value-type')
        };

        // 为所有配置输入框添加失焦事件监听，实现失焦自动保存
        Object.values(cellInfoElements).forEach(element => {
            if (element) {
                element.addEventListener('blur', function () {
                    console.log('配置项失焦，自动保存配置');
                    saveCellConfiguration();
                });
            }
        });
    }
    return cellInfoElements;
}

function updateCellInfo(cell) {
    // 获取缓存的DOM元素
    const elements = initCellInfoElements();
    const { cellType, cellId, cellSource, cellUnit, cellPrecision, cellCalcRule, cellTimeUnit, cellValueType } = elements;

    // 获取单元格位置信息
    const rowIndex = cell.parentElement.rowIndex;
    const colIndex = Array.from(cell.parentElement.cells).indexOf(cell);
    const colLetter = String.fromCharCode(64 + colIndex); // A, B, C...
    const cellReference = `${colLetter}${rowIndex}`;
    console.log('单元格引用:', cellReference);

    // 获取单元格内容和元数据
    const content = cell.textContent;
    
    // 为扩展列单元格提供默认值和初始化
    if (!cell.dataset.type) {
        // 确保单元格已被正确初始化
        cell.dataset.type = 'text';
        cell.dataset.name = content || cellReference;
        
        // 初始化单元格配置
        if (!window.cellConfigurations) {
            window.cellConfigurations = {};
        }
        
        if (!window.cellConfigurations[cellReference]) {
            window.cellConfigurations[cellReference] = {
                type: 'text',
                name: content || cellReference,
                source: '',
                unit: '',
                precision: 2,
                calcRule: 'sum',
                timeUnit: '',
                valueType: 'string'
            };
        }
    }
    
    // 获取单元格数据，现在确保所有单元格都有数据属性
    const type = cell.dataset.type;
    const name = cell.dataset.name || content;

    // 更新表单
    if (cellType) cellType.value = type;
    if (cellId) cellId.value = cellReference;

    // 尝试从localStorage恢复配置（用于测试）
    let configFromStorage = null;
    try {
        const storedConfig = localStorage.getItem('cellConfig_' + cellReference);
        if (storedConfig) {
            configFromStorage = JSON.parse(storedConfig);
            console.log('从localStorage恢复配置:', configFromStorage);
        }
    } catch (e) {
        console.error('解析localStorage配置失败:', e);
    }

    // 检查是否有该单元格的配置，如果没有则创建默认配置
    if (!cellConfigurations[cellReference]) {
        // 如果localStorage有配置，优先使用
        if (configFromStorage) {
            cellConfigurations[cellReference] = configFromStorage;
        } else {
            if (window.configsCleared) {
                cellConfigurations[cellReference] = {
                    type: type,
                    source: type === 'indicator' ? name : '',
                    unit: '',
                    precision: '2',
                    calcRule: 'today',
                    timeUnit: 'none',
                    valueType: 'point'
                };
            } else {
                // 原始默认配置
                cellConfigurations[cellReference] = {
                    type: type,
                    source: type === 'indicator' ? name : '',
                    unit: '',
                    precision: '2',
                    calcRule: 'today',
                    timeUnit: 'none',
                    valueType: 'point'
                };
            }
        }
    }

    // 应用已保存的配置到右侧面板
    const config = cellConfigurations[cellReference];
    console.log('恢复配置:', cellReference, config);

    // 应用基本配置
    if (cellUnit) cellUnit.value = config.unit || '';
    if (cellPrecision) cellPrecision.value = config.precision || '2';
    if (cellCalcRule) cellCalcRule.value = config.calcRule || 'today';
    if (cellTimeUnit) cellTimeUnit.value = config.timeUnit || 'none';
    if (cellValueType) cellValueType.value = config.valueType || 'point';
}

// 保存单元格配置（增强版本）
function saveCellConfiguration(cellReference) {
    console.log('开始保存单元格配置');

    // 如果没有提供单元格引用，从当前选中的单元格获取
    if (!cellReference && currentSelectedCell) {
        const rowIndex = currentSelectedCell.parentElement.rowIndex;
        const colIndex = Array.from(currentSelectedCell.parentElement.cells).indexOf(currentSelectedCell);
        const colLetter = String.fromCharCode(64 + colIndex);
        cellReference = `${colLetter}${rowIndex}`;
        console.log('从currentSelectedCell获取引用:', cellReference);
    }



    // 获取缓存的DOM元素
    const elements = initCellInfoElements();
    const {
        cellType,
        cellSource,
        cellUnit,
        cellPrecision,
        cellCalcRule,
        cellTimeUnit,
        cellValueType
    } = elements;

    // 初始化配置对象（如果不存在）
    if (!cellConfigurations[cellReference]) {
        if (window.configsCleared) {
            cellConfigurations[cellReference] = {
                type: 'text',
                source: '',
                unit: '',
                precision: '2',
                calcRule: 'today',
                timeUnit: 'none',
                valueType: 'point'
            };
        } else {
            // 原始默认配置
            cellConfigurations[cellReference] = {
                type: 'text',
                source: '',
                unit: '',
                precision: '2',
                calcRule: 'today',
                timeUnit: 'none',
                valueType: 'point'
            };
        }
    }

    // 保存基本配置（添加null检查）
    if (cellType) cellConfigurations[cellReference].type = cellType.value;
    if (cellSource && cellType && cellType.value === 'indicator') {
        cellConfigurations[cellReference].source = cellSource.value;
    } else {
        cellConfigurations[cellReference].source = '';
    }

    // 保存其他配置项（添加null检查）
    if (cellUnit) cellConfigurations[cellReference].unit = cellUnit.value;
    if (cellPrecision) cellConfigurations[cellReference].precision = cellPrecision.value;
    if (cellCalcRule) cellConfigurations[cellReference].calcRule = cellCalcRule.value;
    if (cellTimeUnit) cellConfigurations[cellReference].timeUnit = cellTimeUnit.value;
    if (cellValueType) cellConfigurations[cellReference].valueType = cellValueType.value;

    // 为了测试和持久化，也保存到localStorage
    try {
        localStorage.setItem('cellConfig_' + cellReference, JSON.stringify(cellConfigurations[cellReference]));
        console.log('配置已保存到localStorage');
    } catch (e) {
        console.error('保存到localStorage失败:', e);
    }

    console.log('保存配置:', cellReference, cellConfigurations[cellReference]);
}

// 确保只绑定一次保存按钮事件
if (typeof saveButtonBound === 'undefined') {
    window.saveButtonBound = true;
    window.addEventListener('DOMContentLoaded', function () {
        console.log('尝试绑定保存按钮事件');
        // 为底部保存按钮绑定事件监听器（使用有效的选择器）
        const saveButton = document.querySelector('.bottom-actions .save-button') ||
            document.querySelector('.save-button');

        if (saveButton) {
            console.log('成功绑定保存按钮事件');
            // 先移除可能存在的事件监听器，避免重复绑定
            saveButton.removeEventListener('click', handleSaveClick);

            function handleSaveClick() {
                console.log('保存按钮被点击，仅执行配置导出操作');

                // 只调用导出配置功能，不再保存单元格配置
                if (typeof handleSaveConfig === 'function') {
                    console.log('调用导出配置功能');
                    handleSaveConfig();
                } else if (window.handleSaveConfig) {
                    console.log('通过window对象调用导出配置功能');
                    window.handleSaveConfig();
                } else {
                    console.warn('未找到导出配置功能');
                }
            }

            saveButton.addEventListener('click', handleSaveClick);
        } else {
            console.warn('未找到保存按钮，请检查DOM结构');
            // 尝试在文档中查找所有按钮，看是否有包含"保存"文本的按钮
            const allButtons = document.querySelectorAll('button');
            allButtons.forEach(button => {
                if (button.textContent.includes('保存')) {
                    console.log('找到包含"保存"文本的按钮:', button);
                    button.addEventListener('click', function () {
                        console.log('通过文本找到的保存按钮被点击');
                        saveCellConfiguration();
                    });
                }
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 初始化时加载所有单元格配置
    loadAllCellConfigurations();

    // 初始化单元格选中信息显示
    clearCellSelectionInfo();

    // 页面卸载时自动保存当前配置，防止配置丢失
    window.addEventListener('beforeunload', () => {
        if (currentSelectedCell) {
            console.log('页面卸载前自动保存当前单元格配置');
            saveCellConfiguration();
        }
    });
});



