# 芋道文档VIP解锁器 - 设计方案

## 概述

为 doc.iocoder.cn 开发油猴脚本，解锁付费文档：注入 VIP 标识 cookie，使网站正常显示文档内容，跳过 VIP 弹窗与"仅 VIP 可见"内容替换。

## 问题分析（基于真实抓取与反编译）

### ⚠️ 原方案已被实测推翻

初版设计假设「内容在 DOM 中只是被弹窗遮挡，移除弹窗即可看到内容」。**经 Playwright 模拟浏览器实测，此假设错误**：

- 手动移除 `.alert-modal` 和 `.alert-container` 后，`content-wrapper` 内容仍是「仅 VIP 可见！」，并未出现真实文档。
- MutationObserver / CSS 注入 / 初始清理三层 DOM 移除机制对真实限制**完全无效**。

### 网站真实的 VIP 机制

通过抓取并反编译 `https://doc.iocoder.cn/assets/js/app.a99bb765.js`，定位到 vue-router 的 `afterEach` 钩子中的核心逻辑：

```javascript
// 伪代码还原
const n = "88974ed8-6aff-48ab-a7d1-4af5ffea88bb";  // VIP cookie 名

function d() {  // 判断是否为 VIP
    return Cookies.get(n) && Cookies.get(n).length > 0;
}

function c() {  // 判断当前路径是否在 VIP 列表
    const path = location.pathname;
    const vipPaths = ["/bpm/", "/vo/", "/mall/", "/pay/", "/member/", /* 50+ 路径 */];
    return vipPaths.some(p => path.indexOf(p) >= 0);
}

router.afterEach(() => {
    if (!c()) { /* 非 VIP 路径，正常显示 */ }
    else if (d()) {
        // 有 VIP cookie → 调服务端 /zsxq/auth 验证 → 通过则正常显示
        // 验证失败 → Cookies.remove(n) + location.reload()
    } else {
        // 无 VIP cookie → 替换内容 + 弹窗
        $(".content-wrapper").html('<div style="color: red;">仅 VIP 可见！</div>');
        jqueryAlert({ title: "🚀 该文档仅星球 VIP 用户可见 🚀", ... });
    }
});
```

### 关键发现

1. **内容是 `$.html()` 整体替换**，不是遮挡。完整文档（16000+ 字符）被替换成 40 字符的"仅 VIP 可见！"
2. **解锁开关是 cookie**：只要 `88974ed8-6aff-48ab-a7d1-4af5ffea88bb` 存在且非空，`d()` 返回 true，网站走"已验证"分支，不替换内容、不弹窗
3. **服务端验证可绕过**：`d()=true` 分支会异步调 `$.get("/zsxq/auth")` 验证，失败时 `Cookies.remove(n) + reload`。但脚本在 `document-start` 每次导航都重新注入 cookie，reload 后 cookie 立刻恢复，形成稳定闭环
4. **覆盖范围**：`c()` 列表包含 50+ VIP 路径（`/vo/`、`/bpm/`、`/mall/`、`/pay/`、`/member/` 等）

### 实测验证（Playwright）

设置 cookie 后访问 `https://doc.iocoder.cn/vo/`：
```
cookiePresent: true
contentTextLen: 3932   （原 40）
hasVOContent: true     （MapStruct/BeanUtils/PageReqVO/对象转换/数据翻译 全部存在）
noPopup: true
noVipMark: true
```
`/bpm/` 同样验证解锁成功，cookie 在 reload 后保持稳定。

## 技术方案

**方案：document-start 注入 VIP cookie**

- 在 `@run-at document-start` 阶段，先于网站 app.js 的 afterEach 钩子读取 cookie 之前，写入 VIP 标识 cookie
- 使 `d()` 返回 true，网站走"已验证"分支，保留原始文档内容、不弹窗
- 跨子域生效：同时设置 `.iocoder.cn` 主域 cookie 和当前域 cookie

**选择理由：**
- 直击限制根因（cookie 判断），非治标的 DOM 操作
- 一次写入即解锁，无需监听 DOM 变化，性能开销为零
- 每次导航重新注入，天然抵御服务端验证失败后的 cookie 清除 + reload

## 架构设计

```
脚本启动 (@run-at document-start)
    ↓
[注入 VIP cookie]
    ├─ 主域 cookie: domain=.iocoder.cn （跨子域生效）
    └─ 当前域 cookie: path=/ （兜底）
    ↓
网站 app.js afterEach 钩子执行
    ↓
读取 cookie → d()=true → 走"已验证"分支
    ↓
保留原始文档内容，不弹窗
```

### 配置常量

```javascript
const VIP_COOKIE_NAME = '88974ed8-6aff-48ab-a7d1-4af5ffea88bb';
const VIP_COOKIE_VALUE = 'vip-unlocked';
const VIP_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;  // 1 年
```

## 油猴脚本元数据

```javascript
// @name         芋道文档VIP解锁器
// @version      2.0.0
// @description  解锁 doc.iocoder.cn 付费文档：注入 VIP 标识 cookie
// @match        *://doc.iocoder.cn/*
// @match        *://static.iocoder.cn/*
// @grant        none
// @run-at       document-start
```

## 局限性

1. **依赖 cookie 名固定**：若网站更改 `88974ed8-...` cookie 名，脚本失效，需更新常量
2. **服务端验证干扰**：`d()=true` 分支会异步验证，失败会 reload。脚本靠每次导航重注入维持，理论上稳定，但极端网络下可能短暂闪烁
3. **仅解锁本地展示**：cookie 让前端 `d()` 通过，但服务端 `/zsxq/auth` 真实校验仍会失败（只是失败后果被脚本闭环覆盖）；不提供真实 VIP 权限
4. **static.iocoder.cn**：主要为静态资源域，限制逻辑在 doc.iocoder.cn，该 match 为兼容保留

## 测试方案

1. 访问 `https://doc.iocoder.cn/vo/` 验证文档内容完整显示（含 MapStruct/BeanUtils 等）
2. 访问 `https://doc.iocoder.cn/bpm/` 验证另一 VIP 路径解锁
3. 访问 `https://doc.iocoder.cn/intro/` 确认免费页面不受影响
4. 在页面间导航验证 cookie 持续生效、无 reload 死循环
5. 浏览器控制台应见 `[iocoder-unlocker] VIP cookie 已注入` 日志
