// viewPage.js（精简版：移除导出与在新窗口打开的功能）
// 仅保留：接收 opener 发送的克隆表格 HTML 并渲染；在加载时向 opener 请求最新表格；保留关闭按钮逻辑。

(function () {
    const container = document.getElementById('view-container');

    // 验证消息来源：若有 opener 则优先只接受来自 opener 的消息
    function isTrustedSource(event) {
        try {
            if (!window.opener) return true;
            return event.source === window.opener;
        } catch (e) {
            return false;
        }
    }

    // 处理接收的消息
    window.addEventListener('message', function (event) {
        if (!isTrustedSource(event)) return;
        const payload = event.data;
        if (!payload || payload.type !== 'viewTable') return;
        if (payload.html) {
            // 将接收到的 HTML 插入容器（假定主页面已把必要样式内联或保留类名）
            container.innerHTML = payload.html;

            // 清理交互属性，保证只用于展示
            container.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
            container.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'));

            // 确保表格不超出容器
            container.querySelectorAll('table').forEach(tbl => {
                tbl.style.maxWidth = '100%';
            });
        }
    }, false);

    // 如果页面有 opener，可以主动向 opener 要一次表格（支持刷新同步）
    function requestTableFromOpener() {
        try {
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'requestViewTable' }, '*');
            }
        } catch (e) {
            // ignore
        }
    }

    // 关闭按钮行为
    document.getElementById('close-btn').addEventListener('click', function () {
        window.close();
    });

    // 页面加载完成后请求一次主页面的数据（以支持刷新时同步）
    window.addEventListener('load', function () {
        requestTableFromOpener();
    });

})();