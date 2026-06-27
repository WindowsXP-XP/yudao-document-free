[根目录](../CLAUDE.md) > **tests**

# tests · 自动化测试模块

> 由 init-architect 于 2026-06-27 10:13:41 生成。本模块使用 Puppeteer-core 驱动真实 Chrome，对 `extension/content.js` 的解锁逻辑进行真实浏览器三轮验证。

---

## 模块职责

以真实 Chrome 浏览器加载 `extension/content.js` 的真实代码（通过 `evaluateOnNewDocument` 注入，等价于 manifest 的 `run_at: document_start` + `world: MAIN`），访问 `https://doc.iocoder.cn/vo/`，模拟用户点击侧边栏 VIP 链接，执行三轮测试（顺序点击 / 快速连点 / 反向验证），判定扩展方案在 SPA 路由切换下是否稳定解锁。

---

## 入口与启动

| 文件 | 角色 | 说明 |
| --- | --- | --- |
| `extension-test.js` | 唯一测试入口 | Node.js CommonJS 脚本，`puppeteer.launch` 启动真实 Chrome → 注入 `content.js` → 三轮测试 → 统计 → `process.exit(pass ? 0 : 1)`。 |

### 运行方式

```bash
npm install puppeteer-core   # 根 package.json 未声明，需手动安装
node tests/extension-test.js
```

退出码：`0` = 三轮全通过；`1` = 未通过；`2` = 运行异常。

---

## 对外接口

无编程对外接口。脚本以退出码与控制台输出汇报结果，关键输出示例：

```
### 注入 extension/content.js，访问 /vo/ ###
首次 /vo/: ✓正常 | len=... | cookie=true
========== 第一轮：顺序点击侧边栏 ==========
✓ /vo/ | len=...
...
第一轮: ✓通过
========== 第二轮：快速连点 ==========
快速连点后: ✓正常 | path=... | len=...
========== 第三轮：反向验证 ==========
第三轮: ✓通过
========== 统计 ==========
拦截auth: N
阻止清cookie: N
VIP拦截: 0
页面错误: 0
========== 最终结论 ==========
✅✅✅ 扩展方案真实浏览器三轮测试全部通过 ✅✅✅
```

---

## 关键依赖与配置

| 依赖/配置 | 值 | 说明 |
| --- | --- | --- |
| `puppeteer-core` | 运行时依赖 | 需手动 `npm install`；不自带 Chrome，需本机已装 |
| `CHROME` 常量 | `'C:/Program Files/Google/Chrome/Application/chrome.exe'` | **硬编码 Windows 默认路径**，跨平台/非默认路径需手动改第 8 行 |
| `CONTENT_JS` | 启动时 `fs.readFileSync` 读取 `../extension/content.js` | 测试的是扩展内的真实逻辑，非测试用副本 |
| 启动参数 | `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --window-size=1400,900` | headless: false（可见窗口） |
| 注入方式 | `page.evaluateOnNewDocument(CONTENT_JS)` | 等价于 manifest 的 `document_start` + `MAIN` world |

### 测试目标路径（VIP 候选）

```javascript
const vipPaths = ['/vo/', '/bpm/', '/api-doc/', '/module-new/', '/new-feature/',
  '/resource-permission/', '/delete-code/', '/dev-hot-swap/',
  '/project-rename/', '/mybatis-pro/'];
```

---

## 数据模型

无持久化数据。测试运行时的判定结构（`checkBlocked` 返回）：

```javascript
{
  isVipMark: boolean,       // .content-wrapper 是否含「仅 VIP 可见」
  hasAlertContainer: boolean,
  hasAlertModal: boolean,
  contentLen: number,       // 正文文本长度
  cookieOk: boolean,        // document.cookie 是否含 '88974ed8'
  path: string              // location.pathname
}
```

通过判定：`!isVipMark && !hasAlertContainer && cookieOk`。

---

## 测试与质量

- **测试结构**：三轮
  - 第一轮：顺序点击侧边栏 VIP 链接（最多 8 个），每点击后等 3.5s 检查；
  - 第二轮：快速连点前 5 个链接（间隔 0.4s），最后等 5s 统一检查；
  - 第三轮：反向遍历同样链接（每 2.5s 检查）。
- **统计指标**：拦截 auth 次数、阻止清 cookie 次数、VIP 拦截次数、页面错误数。
- **无单元测试框架**：本脚本即唯一的自动化测试，无 Jest/Mocha/Tap。
- **截图目录**：`tests/screenshots/`（被 `.gitignore` 忽略，本模块当前未生成截图）。

---

## 常见问题 (FAQ)

**Q1：为什么用 `evaluateOnNewDocument` 而不是 `--load-extension`？**
A：Puppeteer 加载 MV3 扩展在临时 profile 下常因扩展未启用而失败。`evaluateOnNewDocument` 注入 `content.js` 真实代码，注入时机等价于 `document_start` + `MAIN`，验证的是扩展里的真实逻辑，更稳定可靠。

**Q2：测试报错 "Chrome 路径不存在"？**
A：修改第 8 行 `CHROME` 常量为本机 Chrome 实际路径，或改用 `puppeteer`（自带 Chromium）替代 `puppeteer-core`。

**Q3：测试中途页面卡住？**
A：脚本内多处用 `setTimeout` 等待站点异步加载，若网络慢可能误判。可适当调大 `await new Promise(r => setTimeout(r, ...))` 的等待时长。

**Q4：能否用于 CI？**
A：可以，退出码 `0/1/2` 可被 CI 系统识别。但 `headless: false` 需改为 `headless: 'new'` 或配 Xvfb，且 Chrome 路径需参数化。

---

## 相关文件清单

| 文件 | 行数 | 说明 |
| --- | --- | --- |
| `extension-test.js` | 113 | Puppeteer 真实 Chrome 三轮测试脚本 |

### 已删除的历史测试文件（git status 标记 `D`，待提交删除）

- `popup-remover-test.html`
- `real-site-test.js`
- `run-test.js`

> 这些是油猴脚本方案时期的测试文件，已被 `extension-test.js` 替代。

---

## 变更记录 (Changelog)

| 时间 | 操作 | 说明 |
| --- | --- | --- |
| 2026-06-27 10:13:41 | 初始化 | init-architect 生成模块级 `CLAUDE.md`，含导航面包屑、入口/配置/判定结构/三轮测试说明/FAQ。 |
