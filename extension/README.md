# 芋道文档VIP解锁器 - 浏览器扩展

Chrome / Edge 浏览器扩展，解锁 doc.iocoder.cn 付费文档：注入 VIP cookie + 拦截 auth 校验，SPA 路由切换下稳定解锁。

## 工作原理

网站 `app.js` 的 vue-router `afterEach` 钩子通过名为 `88974ed8-6aff-48ab-a7d1-4af5ffea88bb` 的 cookie 判断是否为 VIP：

- **无 cookie** → 用 jQuery `$.html()` 把文档内容替换成「仅 VIP 可见！」并弹出购买引导
- **有 cookie** → 走"已验证"分支，但会异步调用 `$.get("/zsxq/auth")` 服务端校验，假 cookie 必然失败 → 清 cookie + reload → SPA 切换下导致后续点击 `d()=false` 直接拦截

扩展三层防护（content script 运行在 `document_start` + `MAIN` world）：
1. **注入 VIP cookie** → 多层保险策略：当前域 + 顶级域 `.iocoder.cn` + 各子域独立设置，显式声明 `SameSite=Lax` 避免跨平台策略差异，让 `d()` 返回 true
2. **拦截 XMLHttpRequest** → auth 校验恒返回 `true`，阻止清 cookie 与 reload（覆盖 `$.get`/`$.ajax`/直接 XHR 所有形式）
3. **覆盖 Cookies.remove** → 兜底禁止清除 VIP cookie

## 安装步骤（加载未打包扩展）

### Chrome
1. 打开 `chrome://extensions/`
2. 右上角开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目的 `extension/` 文件夹
5. 访问 https://doc.iocoder.cn/vo/ 验证

### Edge
1. 打开 `edge://extensions/`
2. 左下开启「开发人员模式」
3. 点击「加载解压缩的扩展」
4. 选择 `extension/` 文件夹
5. 访问 https://doc.iocoder.cn/vo/ 验证

## 验证

打开浏览器控制台（F12），应看到：
```
[iocoder-unlocker] 芋道文档VIP解锁器启动
[iocoder-unlocker] XMLHttpRequest 劫持完成
[iocoder-unlocker] VIP cookie 已注入 (当前域: doc.iocoder.cn)
[iocoder-unlocker] 脚本初始化完成
[iocoder-unlocker] Cookies.remove 保护完成
[iocoder-unlocker] 已拦截 auth 校验请求: ...
```

访问 `https://doc.iocoder.cn/vo/`，应看到完整的「VO 对象转换、数据翻译」文档，而非"仅 VIP 可见！"。快速切换多个左侧侧边栏 VIP 链接，应稳定显示内容。

**跨子域支持**：扩展同时支持 `doc.iocoder.cn`、`cloud.iocoder.cn`、`static.iocoder.cn` 三个子域，通过多层 cookie 注入策略确保跨平台兼容（macOS/Linux/Windows）。

## 配置

如网站更改 VIP cookie 名，修改 `content.js` 中的常量：
```javascript
const VIP_COOKIE_NAME = '88974ed8-6aff-48ab-a7d1-4af5ffea88bb';
```

## 文件结构

```
extension/
  ├── manifest.json   # MV3 清单（content_scripts + world:MAIN）
  └── content.js      # 解锁逻辑
```

## 已知局限

1. 依赖 cookie 名固定，网站更改则需更新常量
2. `world: MAIN` 让脚本运行在页面主上下文以拦截页面 XHR，需 Chrome 111+ / Edge 111+
3. 仅解锁前端展示，不提供真实 VIP 权限
