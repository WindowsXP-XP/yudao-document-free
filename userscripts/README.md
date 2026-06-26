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
