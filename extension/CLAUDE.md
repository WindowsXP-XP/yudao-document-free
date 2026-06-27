[根目录](../CLAUDE.md) > **extension**

# extension · 浏览器扩展核心模块

> 由 init-architect 于 2026-06-27 10:13:41 生成。本模块是项目的核心交付物：一个 Chrome/Edge MV3 浏览器扩展，用于解锁 `doc.iocoder.cn` 付费文档。

---

## 模块职责

以 Manifest V3 content script 形式，在 `doc.iocoder.cn` / `static.iocoder.cn` 页面 `document_start` 时机、`MAIN` world（页面主上下文）内运行三层防护逻辑，绕过站点的 VIP 校验：

1. 注入 VIP cookie（让站点 `d()` 判定返回 `true`）；
2. 劫持原生 `XMLHttpRequest`，伪造 `/zsxq/auth` 校验响应为 `"true"`；
3. 覆盖 `js.cookie` 的 `Cookies.remove`，禁止清除 VIP cookie；
4. 监听/劫持 SPA 路由事件（`popstate`、`history.pushState|replaceState`），路由切换后补注入 cookie。

---

## 入口与启动

| 文件 | 角色 | 说明 |
| --- | --- | --- |
| `manifest.json` | MV3 清单 | `manifest_version: 3`，`name: 芋道文档VIP解锁器`，`version: 2.2.0`；`permissions: []`（无额外权限），`host_permissions` 限定 `*://doc.iocoder.cn/*` 与 `*://static.iocoder.cn/*`；`content_scripts` 指定 `matches` 同上，`js: ["content.js"]`，`run_at: "document_start"`，`world: "MAIN"`。 |
| `content.js` | 解锁逻辑入口 | IIFE 自执行，按顺序调用 `hijackXHR()` → `injectVIPCookie()` → `protectVIPCookie()`，并注册 SPA 路由补注入。 |

### 启动时序（关键）

`document_start` 执行顺序**不可随意调换**：
1. **先 `hijackXHR()`**：XMLHttpRequest 是浏览器原生对象，`document_start` 时立即可拦截，不依赖任何库加载；
2. **再 `injectVIPCookie()`**：先于站点 `app.js` 的 `afterEach` 读取 cookie；
3. **最后 `protectVIPCookie()`**：需轮询等待 `js.cookie` 加载后才覆盖 `Cookies.remove`（每 30ms 重试）。

---

## 对外接口

本模块**不对外暴露编程接口**，仅通过浏览器扩展机制注入页面。对外可观察的"接口"为：

- **控制台日志**：统一前缀 `[iocoder-unlocker]`，输出启动、劫持、注入、拦截、保护等事件（详见根 `CLAUDE.md` 第六节）。
- **行为契约**：在 `doc.iocoder.cn` 任意 VIP 文档页，文档正文（`.content-wrapper`）应完整展示，不出现「仅 VIP 可见」文案，不出现 `.alert-container` / `.alert-modal` 弹窗。

---

## 关键依赖与配置

### 模块内常量（`content.js` 顶部）

| 常量 | 值 | 含义 |
| --- | --- | --- |
| `VIP_COOKIE_NAME` | `'88974ed8-6aff-48ab-a7d1-4af5ffea88bb'` | 站点判断 VIP 的 cookie 名；**站点改名需同步修改此处** |
| `VIP_COOKIE_VALUE` | `'vip-unlocked'` | 注入的 cookie 值（任意非空即可，站点仅判断存在性） |
| `VIP_COOKIE_MAX_AGE` | `365 * 24 * 60 * 60` | cookie 有效期 1 年（秒） |
| `LOG_PREFIX` | `'[iocoder-unlocker]'` | 日志前缀 |

### auth 校验请求匹配规则

```javascript
const isAuthCheck = url.indexOf('/zsxq/auth') >= 0
    && url.indexOf('/zsxq/auth-') < 0;   // 排除 /zsxq/auth-url / /zsxq/auth-callback
```

### 运行环境依赖

- Chrome / Edge **111+**（`world: "MAIN"` 所需）；
- 目标站点使用 jQuery 3.6（`$.get` 最终走 `new XMLHttpRequest()`，故劫持原生 XHR 可覆盖 `$.get` / `$.ajax` / 直接 XHR 所有形式）。

---

## 数据模型

本模块无持久化数据模型，唯一的"数据"是浏览器 cookie：

- 注入位置：`domain=.iocoder.cn` 与默认 domain 各写一份（`path=/`）；
- 防清除：覆盖 `Cookies.remove(VIP_COOKIE_NAME)`，命中时改为重新 `injectVIPCookie()` 并直接 return。

伪造的 XHR 响应（非持久化，运行时构造）：
```
readyState=4, status=200, statusText='OK', responseText='true', response='true'
```
通过 `Object.defineProperty` 覆盖只读属性，`setTimeout(0)` 模拟异步，触发 `onreadystatechange` 让 jQuery 成功回调收到 `cb(true)`。

---

## 测试与质量

- **测试位置**：`../tests/extension-test.js`（Puppeteer 真实 Chrome 三轮测试）。
- **测试方式**：读取本模块 `content.js` 源码 → `page.evaluateOnNewDocument` 注入（等价于 manifest 的 `document_start` + `MAIN`，验证的是本模块的真实逻辑）。
- **验证要点**：`.content-wrapper` 不含「仅 VIP 可见」、无 `.alert-container`、cookie 含 `88974ed8`；日志中出现「已拦截 auth 校验请求」「已阻止清除 VIP cookie」。
- **本地手动验证**：加载 `extension/` 文件夹后访问 `https://doc.iocoder.cn/vo/`，并快速切换多个侧边栏 VIP 链接。
- **本模块无单元测试框架**：无 Jest/Mocha，依赖端到端 Puppeteer 脚本。

---

## 常见问题 (FAQ)

**Q1：为什么必须用 `world: "MAIN"`？**
A：站点用 jQuery `$.get` 发起 XHR，`$.get` 最终调用页面主上下文的 `new XMLHttpRequest()`。只有 content script 运行在 `MAIN` world，才能劫持到页面自身的 `XMLHttpRequest.prototype`。默认 `ISOLATED` world 拿到的是独立的副本，劫持无效。

**Q2：为什么 `hijackXHR` 要最先执行？**
A：XMLHttpRequest 是浏览器原生对象，`document_start` 时已存在；而 cookie 注入需在站点 `app.js` 读取前完成、`Cookies.remove` 覆盖需等 `js.cookie` 加载。先劫持 XHR 可确保即便后续站点立即发 auth 校验也能被拦截。

**Q3：站点把 cookie 名改了怎么办？**
A：修改 `content.js` 的 `VIP_COOKIE_NAME` 常量，并同步 `tests/extension-test.js` 中 `cookieOk: document.cookie.includes('88974ed8')` 的判断串。

**Q4：为什么用 `Object.defineProperty` 覆盖 XHR 只读属性？**
A：`readyState` / `status` / `responseText` 等在原生 XHR 上是只读的，直接赋值无效，必须用 `defineProperty` 并设 `writable: true, configurable: true`。

**Q5：SPA 路由切换为什么不会重新触发 `document_start`？**
A：SPA 路由切换是 `history.pushState/replaceState` 或 `popstate`，不重新加载文档，content script 不会重新注入。故本模块额外劫持 `history` 方法 + 监听 `popstate`，在路由切换后补注入 cookie。

---

## 相关文件清单

| 文件 | 行数 | 说明 |
| --- | --- | --- |
| `manifest.json` | 24 | MV3 清单：host_permissions、content_scripts（`document_start` + `MAIN`） |
| `content.js` | 127 | 三层解锁逻辑（IIFE，无依赖原生 JS） |
| `README.md` | 67 | 安装步骤（Chrome/Edge）、验证方法、配置说明、已知局限 |

---

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
| --- | --- | --- |
| 2026-06-27 10:13:41 | 初始化 | init-architect 生成模块级 `CLAUDE.md`，含导航面包屑、入口/接口/常量/数据模型/FAQ 等。 |
