# 芋道文档VIP弹窗移除器 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建油猴脚本，移除 doc.iocoder.cn 网站的VIP付费弹窗和图片弹窗

**Architecture:** 三层清除机制 - CSS注入立即隐藏 + MutationObserver实时移除 + 初始清理兜底

**Tech Stack:** JavaScript, Tampermonkey/Greasemonkey, MutationObserver API

---

## 文件结构

```
userscripts/
  iocoder-popup-remover.user.js    # 主脚本文件（包含所有模块）

tests/
  popup-remover-test.html          # 本地测试页面
```

---

## Task 1: 创建项目结构和配置常量

**Files:**
- Create: `userscripts/iocoder-popup-remover.user.js`

- [ ] **Step 1: 创建userscripts目录和脚本文件骨架**

创建文件 `userscripts/iocoder-popup-remover.user.js`：

```javascript
// ==UserScript==
// @name         芋道文档VIP弹窗移除器
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  移除 doc.iocoder.cn 网站的 VIP 付费弹窗和图片弹窗
// @author       YourName
// @match        *://doc.iocoder.cn/*
// @match        *://static.iocoder.cn/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ========== 配置常量 ==========
    const POPUP_SELECTORS = [
        '.alert-modal',           // VIP遮罩层
        '.alert-container',       // VIP弹窗内容
        '[class*="img-popup"]',   // 图片弹窗
        '[class*="image-layer"]',
        '[class*="photo-popup"]',
        '[class*="lightbox"]',
        '[class*="modal-popup"]',
        '[class*="dialog-popup"]'
    ];

    const LOG_PREFIX = '[iocoder-popup-remover]';

    // 后续模块将在此处添加

    console.log(`${LOG_PREFIX} 芋道文档VIP弹窗移除器启动`);

})();
```

- [ ] **Step 2: 验证文件创建成功**

Run: `cat userscripts/iocoder-popup-remover.user.js`
Expected: 文件内容显示正常，包含完整的UserScript头部和配置常量

- [ ] **Step 3: 提交初始结构**

```bash
git add userscripts/iocoder-popup-remover.user.js
git commit -m "feat: 初始化油猴脚本骨架和配置常量"
```

---

## Task 2: 实现CSS注入模块

**Files:**
- Modify: `userscripts/iocoder-popup-remover.user.js:23-26`

- [ ] **Step 1: 在配置常量后添加CSS注入函数**

在 `// 后续模块将在此处添加` 注释之前插入：

```javascript
    // ========== 模块1: CSS注入 ==========
    function injectCSS() {
        const style = document.createElement('style');
        style.id = 'iocoder-popup-remover-css';
        style.textContent = `
            .alert-modal,
            .alert-container,
            [class*="img-popup"],
            [class*="image-layer"],
            [class*="photo-popup"],
            [class*="lightbox"],
            [class*="modal-popup"],
            [class*="dialog-popup"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
        `;

        const target = document.head || document.documentElement;
        target.appendChild(style);
        console.log(`${LOG_PREFIX} CSS注入完成`);
    }
```

- [ ] **Step 2: 验证函数语法正确**

Run: `node -c userscripts/iocoder-popup-remover.user.js`
Expected: 无语法错误输出

- [ ] **Step 3: 提交CSS注入模块**

```bash
git add userscripts/iocoder-popup-remover.user.js
git commit -m "feat: 添加CSS注入模块"
```

---

## Task 3: 实现MutationObserver监听模块

**Files:**
- Modify: `userscripts/iocoder-popup-remover.user.js:52-54`

- [ ] **Step 1: 在CSS注入模块后添加MutationObserver函数**

在 `injectCSS()` 函数后插入：

```javascript
    // ========== 模块2: MutationObserver监听 ==========
    function setupMutationObserver() {
        function removePopups(node) {
            // 检查节点本身是否是弹窗
            for (const selector of POPUP_SELECTORS) {
                if (node.matches && node.matches(selector)) {
                    node.remove();
                    console.log(`${LOG_PREFIX} 已移除弹窗:`, node.className);
                    return;
                }
            }

            // 检查节点的子元素中是否有弹窗
            if (node.querySelectorAll) {
                for (const selector of POPUP_SELECTORS) {
                    node.querySelectorAll(selector).forEach(popup => {
                        popup.remove();
                        console.log(`${LOG_PREFIX} 已移除子弹窗:`, popup.className);
                    });
                }
            }
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            removePopups(node);
                        }
                    });
                }
            }
        });

        const config = {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        };

        const target = document.body || document.documentElement;
        observer.observe(target, config);
        console.log(`${LOG_PREFIX} MutationObserver已启动`);

        return observer;
    }
```

- [ ] **Step 2: 验证函数语法正确**

Run: `node -c userscripts/iocoder-popup-remover.user.js`
Expected: 无语法错误输出

- [ ] **Step 3: 提交MutationObserver模块**

```bash
git add userscripts/iocoder-popup-remover.user.js
git commit -m "feat: 添加MutationObserver监听模块"
```

---

## Task 4: 实现初始清理模块

**Files:**
- Modify: `userscripts/iocoder-popup-remover.user.js:101-103`

- [ ] **Step 1: 在MutationObserver模块后添加初始清理函数**

在 `setupMutationObserver()` 函数后插入：

```javascript
    // ========== 模块3: 初始清理 ==========
    function removeExistingPopups() {
        const selector = POPUP_SELECTORS.join(', ');
        const popups = document.querySelectorAll(selector);

        popups.forEach(popup => {
            popup.remove();
            console.log(`${LOG_PREFIX} 初始清理:`, popup.className);
        });

        console.log(`${LOG_PREFIX} 初始清理完成，移除${popups.length}个弹窗`);
    }
```

- [ ] **Step 2: 验证函数语法正确**

Run: `node -c userscripts/iocoder-popup-remover.user.js`
Expected: 无语法错误输出

- [ ] **Step 3: 提交初始清理模块**

```bash
git add userscripts/iocoder-popup-remover.user.js
git commit -m "feat: 添加初始清理模块"
```

---

## Task 5: 实现主程序入口

**Files:**
- Modify: `userscripts/iocoder-popup-remover.user.js:117-120`

- [ ] **Step 1: 替换原有的主程序日志为完整入口逻辑**

将文件末尾的：
```javascript
    console.log(`${LOG_PREFIX} 芋道文档VIP弹窗移除器启动`);
```

替换为：
```javascript
    // ========== 主程序入口 ==========
    console.log(`${LOG_PREFIX} 芋道文档VIP弹窗移除器启动`);

    // 第一层：立即注入CSS
    injectCSS();

    // 第二层和第三层：启动Observer和清理
    if (document.body) {
        // body已存在，直接启动
        setupMutationObserver();
        removeExistingPopups();
    } else {
        // body不存在，等待DOMContentLoaded事件
        document.addEventListener('DOMContentLoaded', () => {
            setupMutationObserver();
            removeExistingPopups();
        });
    }

    console.log(`${LOG_PREFIX} 脚本初始化完成`);
```

- [ ] **Step 2: 验证完整脚本语法**

Run: `node -c userscripts/iocoder-popup-remover.user.js`
Expected: 无语法错误输出

- [ ] **Step 3: 提交主程序入口**

```bash
git add userscripts/iocoder-popup-remover.user.js
git commit -m "feat: 完成主程序入口逻辑"
```

---

## Task 6: 创建本地测试页面

**Files:**
- Create: `tests/popup-remover-test.html`

- [ ] **Step 1: 创建测试HTML文件**

创建文件 `tests/popup-remover-test.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>弹窗移除器测试页面</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        .test-section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .test-section h3 {
            margin-top: 0;
            color: #333;
        }
        button {
            padding: 10px 20px;
            margin: 5px;
            cursor: pointer;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
        }
        button:hover {
            background: #0056b3;
        }
        .result {
            margin-top: 10px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <h1>🧪 芋道文档VIP弹窗移除器 - 测试页面</h1>

    <div class="test-section">
        <h3>测试1: 模拟VIP弹窗</h3>
        <button onclick="createVIPPopup()">创建VIP弹窗</button>
        <div class="result" id="test1-result">点击按钮后，弹窗应该在100ms内被移除</div>
    </div>

    <div class="test-section">
        <h3>测试2: 模拟图片弹窗</h3>
        <button onclick="createImagePopup()">创建图片弹窗</button>
        <div class="result" id="test2-result">点击按钮后，图片弹窗应该被移除</div>
    </div>

    <div class="test-section">
        <h3>测试3: 批量弹窗</h3>
        <button onclick="createMultiplePopups()">创建多个弹窗</button>
        <div class="result" id="test3-result">所有弹窗应该被移除</div>
    </div>

    <div class="test-section">
        <h3>测试4: CSS注入验证</h3>
        <button onclick="checkCSSInjection()">检查CSS注入</button>
        <div class="result" id="test4-result">点击按钮检查样式是否存在</div>
    </div>

    <script>
        // 模拟VIP弹窗
        function createVIPPopup() {
            const modal = document.createElement('div');
            modal.className = 'alert-modal';
            modal.style.cssText = 'position:fixed;z-index:1000;background:rgba(0,0,0,0.7);width:100%;height:100%;';
            document.body.appendChild(modal);

            const container = document.createElement('div');
            container.className = 'alert-container';
            container.style.cssText = 'position:fixed;z-index:1001;background:white;width:300px;height:200px;top:50%;left:50%;margin-left:-150px;margin-top:-100px;padding:20px;';
            container.innerHTML = '<h2>VIP弹窗测试</h2><p>这是一个模拟的VIP弹窗</p>';
            document.body.appendChild(container);

            document.getElementById('test1-result').textContent = '弹窗已创建，等待移除...';

            setTimeout(() => {
                const stillExists = document.querySelector('.alert-modal, .alert-container');
                document.getElementById('test1-result').textContent = stillExists
                    ? '❌ 测试失败：弹窗未被移除'
                    : '✅ 测试成功：弹窗已被移除';
            }, 200);
        }

        // 模拟图片弹窗
        function createImagePopup() {
            const popup = document.createElement('div');
            popup.className = 'img-popup-layer';
            popup.style.cssText = 'position:fixed;z-index:999;background:yellow;width:200px;height:150px;top:100px;left:100px;padding:20px;';
            popup.innerHTML = '<h3>图片弹窗测试</h3>';
            document.body.appendChild(popup);

            document.getElementById('test2-result').textContent = '图片弹窗已创建，等待移除...';

            setTimeout(() => {
                const stillExists = document.querySelector('[class*="img-popup"]');
                document.getElementById('test2-result').textContent = stillExists
                    ? '❌ 测试失败：图片弹窗未被移除'
                    : '✅ 测试成功：图片弹窗已被移除';
            }, 200);
        }

        // 批量弹窗
        function createMultiplePopups() {
            const types = ['alert-modal', 'alert-container', 'lightbox-test'];
            types.forEach((type, i) => {
                const popup = document.createElement('div');
                popup.className = type;
                popup.style.cssText = `position:fixed;z-index:${1000+i};background:red;width:100px;height:100px;top:${100+i*50}px;left:${100+i*50}px;`;
                popup.textContent = `弹窗 ${i+1}: ${type}`;
                document.body.appendChild(popup);
            });

            document.getElementById('test3-result').textContent = '已创建3个弹窗，等待移除...';

            setTimeout(() => {
                const remaining = document.querySelectorAll('.alert-modal, .alert-container, [class*="lightbox"]');
                document.getElementById('test3-result').textContent = remaining.length === 0
                    ? '✅ 测试成功：所有弹窗已被移除'
                    : `❌ 测试失败：仍有 ${remaining.length} 个弹窗`;
            }, 200);
        }

        // 检查CSS注入
        function checkCSSInjection() {
            const style = document.getElementById('iocoder-popup-remover-css');
            if (style) {
                const hasImportant = style.textContent.includes('!important');
                const hasAlertModal = style.textContent.includes('.alert-modal');
                const hasAlertContainer = style.textContent.includes('.alert-container');

                document.getElementById('test4-result').textContent =
                    hasImportant && hasAlertModal && hasAlertContainer
                        ? '✅ CSS注入正确：包含所有必要规则'
                        : '⚠️ CSS存在但规则不完整';
            } else {
                document.getElementById('test4-result').textContent = '❌ 未检测到CSS注入（需要在油猴中运行）';
            }
        }
    </script>
</body>
</html>
```

- [ ] **Step 2: 提交测试文件**

```bash
git add tests/popup-remover-test.html
git commit -m "feat: 添加本地测试页面"
```

---

## Task 7: 创建README文档

**Files:**
- Create: `userscripts/README.md`

- [ ] **Step 1: 创建使用说明文档**

创建文件 `userscripts/README.md`：

```markdown
# 芋道文档VIP弹窗移除器

油猴脚本，用于移除 doc.iocoder.cn 网站的VIP付费弹窗和图片弹窗。

## 功能特性

- ✅ 移除VIP付费弹窗遮罩层
- ✅ 移除VIP购买引导弹窗
- ✅ 移除各类图片弹窗
- ✅ 实时监听，动态弹窗也能拦截
- ✅ CSS预隐藏，无感知加载

## 安装方法

### 前置要求

确保已安装油猴插件：
- Chrome: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- Firefox: [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- Edge: [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 安装步骤

1. 打开油猴插件管理面板
2. 点击"添加新脚本"或"+"按钮
3. 将 `iocoder-popup-remover.user.js` 的内容粘贴到编辑器
4. 按 `Ctrl+S` 保存
5. 访问 https://doc.iocoder.cn/vo/ 测试效果

## 使用说明

安装后脚本会自动运行，无需手动操作。访问以下网站时生效：
- `https://doc.iocoder.cn/*`
- `https://static.iocoder.cn/*`

### 验证脚本运行

打开浏览器控制台（F12），应能看到以下日志：
```
[iocoder-popup-remover] 芋道文档VIP弹窗移除器启动
[iocoder-popup-remover] CSS注入完成
[iocoder-popup-remover] MutationObserver已启动
[iocoder-popup-remover] 初始清理完成，移除X个弹窗
[iocoder-popup-remover] 脚本初始化完成
```

## 本地测试

打开 `tests/popup-remover-test.html` 文件进行功能测试：

1. 在浏览器中直接打开该HTML文件
2. 点击各个测试按钮验证功能
3. 注意：CSS注入测试需要在油猴环境中运行

## 工作原理

脚本采用三层清除机制：

1. **CSS注入（第一层）**：在 `document-start` 阶段立即注入CSS样式，隐藏已知弹窗
2. **MutationObserver（第二层）**：监听DOM变化，实时移除新增弹窗元素
3. **初始清理（第三层）**：页面加载时清理已存在的弹窗

## 配置选项

如需自定义拦截规则，修改脚本中的 `POPUP_SELECTORS` 数组：

```javascript
const POPUP_SELECTORS = [
    '.alert-modal',           // VIP遮罩层
    '.alert-container',       // VIP弹窗内容
    '[class*="img-popup"]',   // 图片弹窗
    // 添加更多选择器...
];
```

## 已知局限

1. 仅移除DOM遮罩，如果内容本身未加载到页面中，仍无法查看
2. 如果网站更新弹窗类名，需要更新 `POPUP_SELECTORS` 配置
3. `static.iocoder.cn` 主要用于静态资源，实际弹窗主要在 `doc.iocoder.cn`

## 许可证

MIT License

## 更新日志

### v1.0.0 (2026-06-26)
- 初始版本
- 支持移除VIP付费弹窗
- 支持移除图片弹窗
- 三层清除机制
```

- [ ] **Step 2: 提交README文档**

```bash
git add userscripts/README.md
git commit -m "docs: 添加使用说明文档"
```

---

## Task 8: 最终验证和打包

**Files:**
- Read: `userscripts/iocoder-popup-remover.user.js`

- [ ] **Step 1: 完整性检查 - 验证脚本语法**

Run: `node -c userscripts/iocoder-popup-remover.user.js`
Expected: 无语法错误

- [ ] **Step 2: 完整性检查 - 验证文件结构**

Run: `ls -la userscripts/ tests/`
Expected:
```
userscripts/:
  iocoder-popup-remover.user.js
  README.md

tests/:
  popup-remover-test.html
```

- [ ] **Step 3: 创建发布标签**

```bash
git tag -a v1.0.0 -m "Release v1.0.0: 芋道文档VIP弹窗移除器初始版本"
git push origin v1.0.0
```

---

## 自检清单

**Spec覆盖检查：**
- ✅ VIP遮罩层 `.alert-modal` 处理
- ✅ VIP弹窗内容 `.alert-container` 处理
- ✅ 图片弹窗处理（属性选择器匹配）
- ✅ CSS注入模块
- ✅ MutationObserver监听模块
- ✅ 初始清理模块
- ✅ 油猴元数据配置正确
- ✅ 测试方案已包含

**Placeholder扫描：**
- ✅ 无 TBD、TODO 等占位符
- ✅ 所有代码步骤包含完整实现
- ✅ 所有命令步骤包含具体命令

**类型一致性：**
- ✅ `POPUP_SELECTORS` 在所有任务中使用一致
- ✅ `LOG_PREFIX` 命名一致
- ✅ 函数签名与调用一致
