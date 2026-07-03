# 芋道文档 VIP 解锁器

> Chrome / Edge 浏览器扩展（Manifest V3），解锁 `doc.iocoder.cn` 付费（VIP）文档，**SPA 路由切换下稳定生效**。

![version](https://img.shields.io/badge/version-1.0.0-blue)
![manifest](https://img.shields.io/badge/Manifest-V3-orange)
![platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-green)
![license](https://img.shields.io/badge/license-MIT-lightgrey)
![deps](https://img.shields.io/badge/dependencies-zero-success)

通过 **cookie 注入 + 拦截 `XMLHttpRequest` auth 校验 + cookie 防清除** 三层防护，在不修改目标站点源码的前提下绕过 VIP 校验，让你阅读被遮挡的技术文档（VO 对象转换、BPM、API 文档等）。

---

## ✨ 功能特性

- 🚀 **三层防护**：cookie 注入 → XHR 劫持 → cookie 防清除，层层兜底
- 🔄 **SPA 稳定**：劫持 `history.pushState/replaceState` + 监听 `popstate`，路由切换后自动补注入
- 🪶 **零依赖**：纯原生 JS，无框架、无打包、无 TypeScript，浏览器直接加载
- 🛡️ **最小权限**：无 `permissions`，仅声明 `host_permissions`
- 🧪 **真实测试**：Puppeteer-core 驱动真实 Chrome 三轮自动化验证（顺序点击 / 快速连点 / 反向验证）

---

## 📦 安装

### Chrome

1. 打开 `chrome://extensions/`
2. 右上角开启「**开发者模式**」
3. 点击「**加载已解压的扩展程序**」
4. 选择本项目的 [`extension/`](./extension) 文件夹
5. 访问 <https://doc.iocoder.cn/vo/> 验证

### Edge

1. 打开 `edge://extensions/`
2. 左下开启「**开发人员模式**」
3. 点击「**加载解压缩的扩展**」
4. 选择 [`extension/`](./extension) 文件夹
5. 访问 <https://doc.iocoder.cn/vo/> 验证

> ⚠️ 需 Chrome / Edge **111+**（依赖 content script 的 `world: MAIN`）。

---

## 🔍 验证

打开浏览器控制台（F12），应依次看到：

```
[iocoder-unlocker] 芋道文档VIP解锁器启动
[iocoder-unlocker] XMLHttpRequest 劫持完成
[iocoder-unlocker] VIP cookie 已注入 (当前域: doc.iocoder.cn)
[iocoder-unlocker] 脚本初始化完成
[iocoder-unlocker] Cookies.remove 保护完成
[iocoder-unlocker] 已拦截 auth 校验请求: ...
```

访问 <https://doc.iocoder.cn/vo/>，应看到完整的「VO 对象转换、数据翻译」文档，而非「仅 VIP 可见！」。快速切换多个左侧侧边栏 VIP 链接，应**稳定显示内容**（不 reload、不拦截）。

**跨子域支持**：扩展通过多层 cookie 注入策略（当前域 + 顶级域 + 各子域独立设置 + 显式 `SameSite=Lax`）同时支持 `doc.iocoder.cn`、`cloud.iocoder.cn`、`static.iocoder.cn`，确保 macOS/Linux/Windows 跨平台兼容。

---

## 🧩 工作原理

目标站点 `app.js` 的 vue-router `afterEach` 钩子通过名为 `88974ed8-6aff-48ab-a7d1-4af5ffea88bb` 的 cookie 判断是否 VIP：

- **无 cookie** → 用 jQuery `$.html()` 把文档替换成「仅 VIP 可见！」并弹出购买引导
- **有 cookie** → 走「已验证」分支，但会异步调用 `$.get("/zsxq/auth")` 服务端校验，**假 cookie 必然失败** → 清 cookie + `reload()` → SPA 切换下后续点击 `d()=false` 直接拦截

扩展以 content script（`document_start` + `MAIN` world）三层破解：

```mermaid
flowchart TD
    A[扩展加载 content.js<br/>document_start + MAIN world] --> B[第二层: 劫持 XMLHttpRequest<br/>伪造 /zsxq/auth 响应 = true]
    A --> C[第一层: 注入 VIP cookie<br/>让 d\(\) = true]
    A --> D[第三层: 覆盖 Cookies.remove<br/>禁止清除 VIP cookie]
    A --> E[SPA 补注入<br/>劫持 pushState/replaceState + popstate]

    B --> F[站点发 /zsxq/auth 校验]
    F --> G[命中劫持 → response = true]
    G --> H[校验通过: 不清 cookie / 不 reload]
    H --> I[✅ 文档正常展示]

    C --> I
    D --> I
    E --> I
```

| 层级 | 机制 | 作用 |
| --- | --- | --- |
| 第一层 | `document.cookie` 多层注入策略 | 当前域 + 顶级域 `.iocoder.cn` + 各子域独立设置，显式 `SameSite=Lax`，确保跨平台/跨子域兼容，让站点 `d()` 判定返回 `true` |
| 第二层 | 劫持 `XMLHttpRequest.prototype.open/send` | 拦截 `/zsxq/auth`，伪造 `status=200, response="true"`，校验恒通过 |
| 第三层 | 覆盖 `js.cookie` 的 `Cookies.remove` | 兜底禁止清除 VIP cookie |
| 路由层 | 劫持 `history.pushState/replaceState` + `popstate` 监听 | SPA 路由切换后自动补注入 cookie |

---

## 📁 项目结构

```
yudao-document-free/
├── extension/              # MV3 浏览器扩展（核心交付物）
│   ├── manifest.json       # MV3 清单（content_scripts + world: MAIN）
│   ├── content.js          # 三层解锁逻辑
│   └── README.md           # 扩展模块说明
├── tests/                  # Puppeteer-core 自动化测试
│   └── extension-test.js   # 真实 Chrome 三轮验证
├── package.json            # 测试依赖声明与 npm test 入口
├── .gitignore              # 忽略 node_modules、各 CLAUDE.md 等本地文件
└── README.md               # 本文件
```

---

## 🧪 自动化测试

使用 Puppeteer-core 驱动真实 Chrome，对 `extension/content.js` 进行三轮验证：

1. **顺序点击** —— 依次点击侧边栏 VIP 链接，逐个验证解锁
2. **快速连点** —— 模拟快速切换，验证 SPA 路由切换下稳定
3. **反向验证** —— 验证未被拦截的非 auth 请求正常放行

```bash
# 1. 安装测试依赖（需本机已装 Chrome）
npm install

# 2. 运行三轮测试
npm test
# 或等价写法：node tests/extension-test.js
```

> ✅ **Chrome 路径自动检测**：测试脚本已支持 macOS/Linux/Windows 三平台自动检测 Chrome/Chromium/Edge 路径。如检测失败或使用非默认路径，可设置 `CHROME` 环境变量：
> ```bash
> # macOS/Linux
> export CHROME="/path/to/your/chrome"
> npm test
> 
> # Windows (cmd)
> set CHROME=C:\custom\path\chrome.exe && npm test
> ```
>
> 测试以 `process.exit(pass ? 0 : 1)` 返回退出码，可用于 CI 门禁。

---

## ⚙️ 配置

如网站更改 VIP cookie 名，修改 `extension/content.js` 顶部常量：

```javascript
const VIP_COOKIE_NAME = '88974ed8-6aff-48ab-a7d1-4af5ffea88bb';
```

并同步更新 `tests/extension-test.js` 中 `cookieOk: document.cookie.includes('88974ed8')` 的判断串。

---

## ⚠️ 已知局限

1. 依赖 cookie 名固定，网站改名需同步更新常量
2. `world: MAIN` 让脚本运行在页面主上下文以拦截页面 XHR，需 Chrome 111+ / Edge 111+
3. 仅解锁前端展示，**不提供真实 VIP 权限**（无服务端鉴权）
4. `tests/extension-test.js` Chrome 路径硬编码为 Windows 默认路径，非默认路径/非 Windows 需手动改第 8 行 `CHROME` 常量（详见上文「自动化测试」章节）

---

## ⚖️ 免责声明

本项目仅供**学习与技术研究所用**，旨在分析前端鉴权机制与浏览器扩展开发实践。

- 本项目**不存储、不传输、不破解**任何真实账号凭据，仅通过客户端 cookie 与请求拦截改变前端展示
- 请**支持正版**，如需长期、完整、稳定访问付费文档，请前往 [芋道源码](https://www.iocoder.cn/) 购买 VIP
- 使用本项目产生的一切后果由使用者自行承担，作者不对任何因使用或滥用本项目造成的直接或间接损失负责
- 若本项目侵犯了站点权益，请联系作者删除

---

## 🙏 鸣谢

- [linux.do](https://linux.do) —— 感谢社区在浏览器扩展开发、前端逆向分析等方向的交流与启发

---

## 📄 许可证

[MIT License](./LICENSE)
