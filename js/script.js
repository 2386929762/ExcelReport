// script.js - 完整合并版（保留原有功能并加入自动清理与观察逻辑）
// 已恢复工具栏格式化、颜色与字号绑定

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
// 暴露到window对象，供其他模块使用
window.cellConfigurations = cellConfigurations;

// 加载所有单元格配置的函数
function loadAllCellConfigurations() {
    // console.log('开始加载所有单元格配置...');
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
                    // console.log(`加载单元格配置: ${cellReference}`, config);
                }
            }
        }
        // console.log('所有单元格配置加载完成，共加载', Object.keys(cellConfigurations).length, '个配置');
    } catch (error) {
        console.error('加载单元格配置时出错:', error);
    }
}

// 清理某个单元格的 data-* 属性和 localStorage 配置
function cleanCellDataAttributes(cell) {
    if (!cell) return;
    try {
        // 计算单元格引用（列字母 + 行号）
        const rowIndex = cell.parentElement.rowIndex;
        const colIndex = Array.from(cell.parentElement.cells).indexOf(cell);
        const colLetter = String.fromCharCode(64 + colIndex); // 1->A
        const cellRef = `${colLetter}${rowIndex}`;

        // 删除 dataset.data / dataset.type / dataset.name 等
        if (cell.dataset) {
            if ('data' in cell.dataset) delete cell.dataset.data;
            if ('type' in cell.dataset) delete cell.dataset.type;
            if ('name' in cell.dataset) delete cell.dataset.name;
            if ('displayName' in cell.dataset) delete cell.dataset.displayName;
        }
        // 删除 localStorage 中的 cellConfig_{cellRef}
        try {
            localStorage.removeItem('cellConfig_' + cellRef);
            // console.log(`已移除 localStorage 配置: cellConfig_${cellRef}`);
        } catch (e) {
            // ignore
        }
    } catch (e) {
        console.warn('cleanCellDataAttributes 失败:', e);
    }
}

// 初始化并绑定设计区单元格事件（选中、输入等）
function bindDesignTableCellEvents() {
    const cells = document.querySelectorAll('#design-table td[contenteditable="true"]');
    cells.forEach(cell => {
        // 点击选中
        cell.addEventListener('click', () => {
            // 自动保存前一个选中单元格配置
            if (currentSelectedCell && currentSelectedCell !== cell) {
                // console.log('自动保存前一个单元格配置');
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

        // 监听单元格内容变化，更新上方输入框，并在清空时清理 dataset
        cell.addEventListener('input', function () {
            if (this.classList.contains('selected')) {
                const inputElement = document.querySelector('.cell-content-input');
                if (inputElement) inputElement.value = this.textContent || '';
            }

            // 如果单元格被清空（没有文字且没有格式化子元素），清除相关 dataset 与 localStorage 配置
            const isEmpty = (this.textContent || '').trim() === '' && this.querySelectorAll('span, b, i').length === 0;
            if (isEmpty) {
                cleanCellDataAttributes(this);
            }
        });
    });
}

// 更新单元格内容的函数（用于上方输入框）
function updateCellContent() {
    if (currentSelectedCell) {
        currentSelectedCell.textContent = this.value;
        // 如果变为空，清理 dataset
        const isEmpty = (this.value || '').trim() === '';
        if (isEmpty) cleanCellDataAttributes(currentSelectedCell);
    }
}

// 文本格式化函数 - 支持选中文本格式化
function formatText(formatType) {
    if (!currentSelectedCell) return;

    try {
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
                    try {
                        range.surroundContents(span);
                    } catch (e) {
                        // Fallback: extract and insert
                        const selectedText = range.toString();
                        range.deleteContents();
                        span.textContent = selectedText;
                        range.insertNode(span);
                    }

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

// 应用样式到选中文本（保留原实现）
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

// 更新单元格信息（包含 initCellInfoElements）
let cellInfoElements = null;

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
            cellValueType: document.querySelector('[data-id="cellValueType"]') || document.getElementById('cell-value-type'),
            cellDataDate: document.querySelector('[data-id="cellDataDate"]') || document.getElementById('cell-data-date'),
            cellCurrency: document.querySelector('[data-id="cellCurrency"]') || document.getElementById('cell-currency'),
            cellOrganization: document.querySelector('[data-id="cellOrganization"]') || document.getElementById('cell-organization')
        };

        // 为所有配置输入框添加失焦事件监听，实现失焦自动保存
        Object.values(cellInfoElements).forEach(element => {
            if (element) {
                element.addEventListener('blur', function () {
                    // console.log('配置项失焦，自动保存配置');
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
    const { cellType, cellId, cellSource, cellUnit, cellPrecision, cellCalcRule, cellTimeUnit, cellValueType, cellDataDate, cellCurrency, cellOrganization } = elements;

    // 获取单元格位置信息
    const rowIndex = cell.parentElement.rowIndex;
    const colIndex = Array.from(cell.parentElement.cells).indexOf(cell);
    const colLetter = String.fromCharCode(64 + colIndex); // A, B, C...
    const cellReference = `${colLetter}${rowIndex}`;
    // console.log('单元格引用:', cellReference);

    // 获取单元格内容和元数据
    const content = cell.textContent;
    const type = cell.dataset.type || 'text';
    const name = cell.dataset.name || content;

    // 更新表单
    if (cellType) cellType.value = type;
    if (cellId) cellId.value = cellReference;

    // 如果是指标单元格，设置来源指标
    if (cellSource) {
        if (type === 'indicator') {
            cellSource.value = name;
        } else {
            cellSource.value = '';
        }
    }

    // 尝试从localStorage恢复配置（用于测试）
    let configFromStorage = null;
    try {
        const storedConfig = localStorage.getItem('cellConfig_' + cellReference);
        if (storedConfig) {
            configFromStorage = JSON.parse(storedConfig);
            // console.log('从 localStorage恢复配置:', configFromStorage);
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
            // 检查是否已执行清空操作，如果是则不添加额外的维度字段
            if (window.configsCleared) {
                cellConfigurations[cellReference] = {
                    type: type,
                    source: type === 'indicator' ? name : '',
                    unit: '',
                    precision: '2',
                    calcRule: 'today',
                    timeUnit: 'none',
                    valueType: 'point',
                    dataDate: '',
                    currency: 'CNY',
                    organization: 'head'
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
                    valueType: 'point',
                    dataDate: '',
                    currency: 'CNY',
                    organization: 'head'
                };
            }
        }
    }

    // 应用已保存的配置到右侧面板
    const config = cellConfigurations[cellReference];
    // console.log('恢复配置:', cellReference, config);

    // 应用基本配置
    if (cellUnit) cellUnit.value = config.unit || '';
    if (cellPrecision) cellPrecision.value = config.precision || '2';
    if (cellCalcRule) cellCalcRule.value = config.calcRule || 'today';
    if (cellTimeUnit) cellTimeUnit.value = config.timeUnit || 'none';
    if (cellValueType) cellValueType.value = config.valueType || 'point';
    if (cellDataDate) cellDataDate.value = config.dataDate || '';
    if (cellCurrency) cellCurrency.value = config.currency || 'CNY';
    if (cellOrganization) cellOrganization.value = config.organization || 'head';
}

// 保存单元格配置（增强版本）
function saveCellConfiguration(cellReference) {
    // console.log('开始保存单元格配置');

    // 如果没有提供单元格引用，从当前选中的单元格获取
    if (!cellReference && currentSelectedCell) {
        const rowIndex = currentSelectedCell.parentElement.rowIndex;
        const colIndex = Array.from(currentSelectedCell.parentElement.cells).indexOf(currentSelectedCell);
        const colLetter = String.fromCharCode(64 + colIndex);
        cellReference = `${colLetter}${rowIndex}`;
        // console.log('从currentSelectedCell获取引用:', cellReference);
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
        cellValueType,
        cellDataDate,
        cellCurrency,
        cellOrganization
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
                valueType: 'point',
                dataDate: '',
                currency: 'CNY',
                organization: 'head'
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
                valueType: 'point',
                dataDate: '',
                currency: 'CNY',
                organization: 'head'
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
    if (cellDataDate) cellConfigurations[cellReference].dataDate = cellDataDate.value;
    if (cellCurrency) cellConfigurations[cellReference].currency = cellCurrency.value;
    if (cellOrganization) cellConfigurations[cellReference].organization = cellOrganization.value;

    // 为了测试和持久化，也保存到localStorage
    try {
        localStorage.setItem('cellConfig_' + cellReference, JSON.stringify(cellConfigurations[cellReference]));
        // console.log('配置已保存到localStorage');
    } catch (e) {
        console.error('保存到localStorage失败:', e);
    }

    // console.log('保存配置:', cellReference, cellConfigurations[cellReference]);

    // 静默保存，不显示提示框
}

// 确保只绑定一次保存按钮事件
if (typeof saveButtonBound === 'undefined') {
    window.saveButtonBound = true;
    window.addEventListener('DOMContentLoaded', function () {
        // console.log('尝试绑定保存按钮事件');
        // 为底部保存按钮绑定事件监听器（使用有效的选择器）
        const saveButton = document.querySelector('.bottom-actions .save-button') ||
            document.querySelector('.save-button');

        if (saveButton) {
            // console.log('成功绑定保存按钮事件');
            // 先移除可能存在的事件监听器，避免重复绑定
            saveButton.removeEventListener('click', handleSaveClick);

            function handleSaveClick() {
                // console.log('保存按钮被点击，仅执行配置导出操作');

                // 只调用导出配置功能，不再保存单元格配置
                if (typeof handleSaveConfig === 'function') {
                    // console.log('调用导出配置功能');
                    handleSaveConfig();
                } else if (window.handleSaveConfig) {
                    // console.log('通过window对象调用导出配置功能');
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
                    // console.log('找到包含"保存"文本的按钮:', button);
                    button.addEventListener('click', function () {
                        // console.log('通过文本找到的保存按钮被点击');
                        saveCellConfiguration();
                    });
                }
            });
        }
    });
}

// 初始化拖拽功能与页面就绪时的绑定
document.addEventListener('DOMContentLoaded', () => {
    // 初始化时加载所有单元格配置
    loadAllCellConfigurations();

    // 绑定设计区单元格事件
    bindDesignTableCellEvents();

    // 绑定工具栏格式化按钮、颜色/字号选择等（修复：之前缺失导致按钮无响应）
    (function bindToolbarFormatting() {
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
                const fv = document.querySelector('.font-size-value');
                if (fv) fv.textContent = size;

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
    })();

    // 查看页按钮点击事件
    const viewPageBtn = document.querySelector('.view-page-btn');
    if (viewPageBtn) {
        viewPageBtn.addEventListener('click', function () {
            // console.log('跳转到查看页');

            // 获取表格数据（使用与预览相同的方式）
            if (typeof collectTableDataForPreview === 'function') {
                // 模拟预览模式获取数据
                const tableData = collectTableDataForPreview();

                // 将表格数据序列化为JSON并编码
                const tableDataStr = encodeURIComponent(JSON.stringify(tableData));

                // 构建URL，将数据作为查询参数传递
                const viewPageUrl = `viewPage.html?tableData=${tableDataStr}`;

                // 跳转到查看页
                window.open(viewPageUrl, '_blank');
            } else {
                console.error('collectTableDataForPreview函数不可用');
                // 如果查询模块不可用，尝试直接跳转
                window.open('viewPage.html', '_blank');
            }
        });
    }

    // 初始化单元格选中信息显示
    clearCellSelectionInfo();

    // 页面卸载时自动保存当前配置，防止配置丢失
    window.addEventListener('beforeunload', () => {
        if (currentSelectedCell) {
            // console.log('页面卸载前自动保存当前单元格配置');
            saveCellConfiguration();
        }
    });

    // 启动 MutationObserver 监听设计表格变化
    observeDesignTableMutations();
});

// 添加指标到表格
function addIndicatorToTable(cell, name) {
    // 设置当前单元格为指标名称和数据
    cell.textContent = `{${name}}`;
    cell.dataset.type = 'indicator';
    cell.dataset.name = name;
    cell.dataset.displayName = name;

    // 获取单元格引用，用于加载已保存的配置
    const rowIndex = cell.parentElement.rowIndex;
    const colIndex = Array.from(cell.parentElement.cells).indexOf(cell);
    const colLetter = String.fromCharCode(64 + colIndex);
    const cellReference = `${colLetter}${rowIndex}`;

    // 尝试从localStorage加载该单元格可能存在的已保存配置
    try {
        const storedConfig = localStorage.getItem('cellConfig_' + cellReference);
        if (storedConfig) {
            const config = JSON.parse(storedConfig);
            // console.log('从localStorage加载已保存配置:', cellReference, config);
            // 直接更新到cellConfigurations对象，确保预览时能使用正确的配置
            cellConfigurations[cellReference] = config;
        }
    } catch (e) {
        console.error('加载localStorage配置失败:', e);
    }

    // 设置示例数据 - 结构化数据包含多个字段和多条记录
    let indicatorData = [];

    switch (name) {
        case '个人存款余额':
            indicatorData = [
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '北京',
                    department: '零售银行部',
                    organization: 'head',
                    balance: '1,523,456,789.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'USD',
                    region: '北京',
                    department: '零售银行部',
                    organization: 'head',
                    balance: '234,567,890.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '上海',
                    department: '零售银行部',
                    organization: 'head',
                    balance: '876,543,210.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'USD',
                    region: '上海',
                    department: '零售银行部',
                    organization: 'head',
                    balance: '123,456,789.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'EUR',
                    region: '上海',
                    department: '零售银行部',
                    organization: 'head',
                    balance: '56,789,012.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '广州',
                    department: '零售银行部',
                    organization: 'head',
                    balance: '987,654,321.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'HKD',
                    region: '广州',
                    department: '零售银行部',
                    organization: 'head',
                    balance: '456,789,012.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '日',
                    currency: 'USD',
                    region: '北京',
                    department: '零售银行部',
                    organization: 'head',
                    balance: '345,678,901.00',
                    source: '核心系统'
                }
            ];
            break;

        case '对公存款余额':
            indicatorData = [
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '北京',
                    department: '零售银行部',
                    organization: 'head',
                    balance: '1,523,456,789.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'USD',
                    region: '北京',
                    department: '公司银行部',
                    organization: 'head',
                    balance: '345,678,901.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '上海',
                    department: '公司银行部',
                    organization: 'branch-shanghai',
                    balance: '1,876,543,210.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'JPY',
                    region: '上海',
                    department: '公司银行部',
                    organization: 'branch-shanghai',
                    balance: '456,789,012.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '广州',
                    department: '公司银行部',
                    organization: 'branch-guangzhou',
                    balance: '1,543,210,987.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'EUR',
                    region: '广州',
                    department: '公司银行部',
                    organization: 'branch-guangzhou',
                    balance: '89,765,432.00',
                    source: '核心系统'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '广州',
                    department: '公司银行部',
                    organization: 'branch-guangzhou',
                    balance: '1,234,567,890.00',
                    source: '核心系统'
                }
            ];
            break;

        case '总存款余额':
            indicatorData = [
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '上海',
                    department: '总行',
                    organization: 'head',
                    balance: '3,647,013,510.00',
                    source: '汇总计算'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '上海',
                    department: '总行',
                    organization: 'head',
                    balance: '213,222,221.00',
                    source: '汇总计算'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '广州',
                    department: '总行',
                    organization: 'head',
                    balance: '3,456,789,012.00',
                    source: '汇总计算'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '全国',
                    department: '总行',
                    organization: 'head',
                    balance: '8,987,654,321.00',
                    source: '汇总计算'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '全国',
                    department: '总行',
                    organization: 'head',
                    balance: '567,890,123.00',
                    source: '汇总计算'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '全国',
                    department: '总行',
                    organization: 'head',
                    balance: '10,234,567,890.00',
                    source: '汇总计算'
                }
            ];
            break;

        default:
            indicatorData = [
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '深圳',
                    department: '总行',
                    organization: 'head',
                    balance: '1,000,000.00',
                    source: '测试数据'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '深圳',
                    department: '总行',
                    organization: 'branch-shanghai',
                    balance: '950,000.00',
                    source: '测试数据'
                },
                {
                    date: '2025-11-25',
                    period: '季度',
                    currency: 'CNY',
                    region: '深圳',
                    department: '总行',
                    organization: 'branch-shenzhen',
                    balance: '150,000.00',
                    source: '测试数据'
                }
            ];
    }

    // 将完整的结构化数据直接存储在当前单元格的dataset中
    cell.dataset.data = JSON.stringify(indicatorData);

    // 更新右侧单元格信息
    updateCellInfo(cell);
}

// 工具栏下拉、颜色选择、字号选择等相关函数（保留原实现）
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

// 应用样式到选中文本（已在上方实现 applyStyleToSelection）
// 颜色选择、填充颜色、字号选择绑定（在 DOMContentLoaded 中已经处理）
// 我们在 toolbarActions.js 中也有绑定逻辑，这里不重复绑定全部逻辑（保留原兼容调用点）

// MutationObserver：监听设计表格内部变化（字符变更、属性、子节点增删）
function observeDesignTableMutations() {
    const table = document.getElementById('design-table');
    if (!table) return;

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === 'characterData') {
                const parent = m.target.parentElement;
                // 找到包含该文本的 td
                const td = parent.closest('td');
                if (td) {
                    const isEmpty = (td.textContent || '').trim() === '' && td.querySelectorAll('span, b, i').length === 0;
                    if (isEmpty) {
                        cleanCellDataAttributes(td);
                    }
                }
            } else if (m.type === 'attributes') {
                const target = m.target;
                if (target.tagName === 'TD') {
                    // 如果 data-type 被移除或变为空，则清理 data-data
                    const dt = target.getAttribute('data-type');
                    const txt = (target.textContent || '').trim();
                    if (!dt || dt === '') {
                        // 若单元格文本为空或没有类型，就移除 dataset.data
                        if (txt === '') cleanCellDataAttributes(target);
                    }
                }
            } else if (m.type === 'childList') {
                // 对于被移除的节点：尝试从 localStorage 中删除相关配置（如果能推断位置）
                if (m.removedNodes && m.removedNodes.length > 0) {
                    m.removedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'TR') {
                            // 行被移除：尝试删除该行相关的配置项（遍历行内的 td）
                            node.querySelectorAll('td').forEach(td => {
                                // 计算引用：注意 rowIndex 无效（行已被移除），所以这里不删除 localStorage 项（仅当能计算出引用时才删除）
                                if ((td.textContent || '').trim() === '') {
                                    // 如果为空且有 data-*，尝试清理 data 属性
                                    cleanCellDataAttributes(td);
                                }
                            });
                        }
                    });
                }
            }
        }
    });

    observer.observe(table, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['data-type', 'data-data', 'data-name', 'contenteditable']
    });
}

// 生成列标题 (A, B, C, ..., Z, AA, AB, ...)
function getColumnLabel(index) {
    let label = '';
    while (index >= 0) {
        label = String.fromCharCode(65 + (index % 26)) + label;
        index = Math.floor(index / 26) - 1;
    }
    return label;
}

// 初始化表格函数
function initializeTable(rows = 20, cols = 20) {
    const table = document.getElementById('design-table');
    if (!table) {
        console.error('找不到表格元素');
        return;
    }

    // 清空现有表格
    table.innerHTML = '';

    // 创建表头行（列标题：A, B, C...）
    const thead = table.createTHead();
    const headerRow = thead.insertRow();

    // 左上角空单元格
    const cornerCell = document.createElement('th');
    cornerCell.textContent = '';
    cornerCell.style.width = '40px';
    cornerCell.style.minWidth = '40px';
    headerRow.appendChild(cornerCell);

    for (let i = 0; i < cols; i++) {
        const th = document.createElement('th');
        th.textContent = getColumnLabel(i);
        th.style.minWidth = '120px';
        headerRow.appendChild(th);
    }

    // 创建表体
    const tbody = table.createTBody();
    for (let i = 0; i < rows; i++) {
        const row = tbody.insertRow();

        // 添加行号列
        const rowNumCell = row.insertCell();
        rowNumCell.textContent = i + 1;
        rowNumCell.contentEditable = false;
        rowNumCell.style.backgroundColor = '#f0f0f0';
        rowNumCell.style.fontWeight = 'bold';
        rowNumCell.style.textAlign = 'center';
        rowNumCell.style.width = '40px';
        rowNumCell.style.minWidth = '40px';

        // 添加数据单元格
        for (let j = 0; j < cols; j++) {
            const cell = row.insertCell();
            cell.contentEditable = true;
            cell.style.minWidth = '120px';

            // 添加单元格点击事件
            cell.addEventListener('click', function () {
                if (currentSelectedCell && currentSelectedCell !== this) {
                    // console.log('自动保存前一个单元格配置');
                    saveCellConfiguration();
                }

                const allCells = table.querySelectorAll('td[contenteditable="true"]');
                allCells.forEach(c => c.classList.remove('selected'));

                this.classList.add('selected');
                currentSelectedCell = this;

                updateCellInfo(this);
                updateCellSelectionInfo(this);
            });

            // 监听单元格内容变化
            cell.addEventListener('input', function () {
                if (this.classList.contains('selected')) {
                    const inputElement = document.querySelector('.cell-content-input');
                    if (inputElement) {
                        inputElement.value = this.textContent || '';
                    }
                }
            });
        }
    }

    // console.log(`表格初始化完成: ${rows}行 x ${cols}列`);
}

// 暴露函数到全局
window.initializeTable = initializeTable;

// 初始化拖拽功能
function initDragAndDrop() {
    // 初始化拖拽项
    const draggableItems = document.querySelectorAll('.draggable');
    const tableCells = document.querySelectorAll('#design-table td[contenteditable="true"]');

    // console.log('初始化拖拽功能，找到', draggableItems.length, '个拖拽项和', tableCells.length, '个单元格');

    // 设置拖拽源
    draggableItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: item.dataset.type,
                name: item.dataset.name
            }));
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
    });

    // 设置表格单元格为放置目标
    tableCells.forEach(cell => {
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.classList.add('drop-target');
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drop-target');
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drop-target');

            const data = JSON.parse(e.dataTransfer.getData('text/plain'));

            // 处理指标类型的拖拽
            if (data.type === 'indicator') {
                addIndicatorToTable(cell, data.name);
            }
        });
    });
}

// 行列添加功能
document.addEventListener('DOMContentLoaded', function () {
    // 初始化表格
    initializeTable(20, 20);

    // 表格初始化后，初始化拖拽功能
    setTimeout(() => {
        initDragAndDrop();
    }, 100);

    // 添加行按钮
    const addRowBtn = document.getElementById('add-row-btn');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', function () {
            const table = document.getElementById('design-table');
            if (!table) return;

            const tbody = table.tBodies[0];
            if (!tbody) return;

            const colCount = table.rows[0].cells.length;
            const newRow = tbody.insertRow();

            // 添加行号
            const rowNumCell = newRow.insertCell();
            rowNumCell.textContent = tbody.rows.length;
            rowNumCell.contentEditable = false;
            rowNumCell.style.backgroundColor = '#f0f0f0';
            rowNumCell.style.fontWeight = 'bold';
            rowNumCell.style.textAlign = 'center';
            rowNumCell.style.width = '40px';
            rowNumCell.style.minWidth = '40px';

            // 添加数据单元格
            for (let i = 1; i < colCount; i++) {
                const cell = newRow.insertCell();
                cell.contentEditable = true;
                cell.style.minWidth = '120px';

                cell.addEventListener('click', function () {
                    if (currentSelectedCell && currentSelectedCell !== this) {
                        saveCellConfiguration();
                    }

                    const allCells = table.querySelectorAll('td[contenteditable="true"]');
                    allCells.forEach(c => c.classList.remove('selected'));

                    this.classList.add('selected');
                    currentSelectedCell = this;

                    updateCellInfo(this);
                    updateCellSelectionInfo(this);
                });

                cell.addEventListener('input', function () {
                    if (this.classList.contains('selected')) {
                        const inputElement = document.querySelector('.cell-content-input');
                        if (inputElement) {
                            inputElement.value = this.textContent || '';
                        }
                    }
                });
            }

            // console.log('已添加新行');
        });
    }

    // 添加列按钮
    const addColBtn = document.getElementById('add-col-btn');
    if (addColBtn) {
        addColBtn.addEventListener('click', function () {
            const table = document.getElementById('design-table');
            if (!table) return;

            const thead = table.tHead;
            const tbody = table.tBodies[0];
            if (!thead || !tbody) return;

            const currentColCount = thead.rows[0].cells.length;
            const newColLabel = getColumnLabel(currentColCount - 1);

            // 在表头添加新列
            const headerRow = thead.rows[0];
            const th = document.createElement('th');
            th.textContent = newColLabel;
            th.style.minWidth = '120px';
            headerRow.appendChild(th);

            // 在每一行添加新单元格
            for (let i = 0; i < tbody.rows.length; i++) {
                const row = tbody.rows[i];
                const cell = row.insertCell();
                cell.contentEditable = true;
                cell.style.minWidth = '120px';

                cell.addEventListener('click', function () {
                    if (currentSelectedCell && currentSelectedCell !== this) {
                        saveCellConfiguration();
                    }

                    const allCells = table.querySelectorAll('td[contenteditable="true"]');
                    allCells.forEach(c => c.classList.remove('selected'));

                    this.classList.add('selected');
                    currentSelectedCell = this;

                    updateCellInfo(this);
                    updateCellSelectionInfo(this);
                });

                cell.addEventListener('input', function () {
                    if (this.classList.contains('selected')) {
                        const inputElement = document.querySelector('.cell-content-input');
                        if (inputElement) {
                            inputElement.value = this.textContent || '';
                        }
                    }
                });
            }

            // console.log('已添加新列:', newColLabel);
        });
    }
});
