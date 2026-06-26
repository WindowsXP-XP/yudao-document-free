# 芋道文档VIP解锁器

油猴脚本，用于解锁 doc.iocoder.cn 付费文档：注入 VIP 标识 cookie，使文档内容正常显示，跳过 VIP 弹窗与"仅 VIP 可见"替换。

## 功能特性

- ✅ 解锁 50+ 付费文档路径（`/vo/`、`/bpm/`、`/mall/`、`/pay/`、`/member/` 等）
- ✅ 注入 VIP cookie，使网站走"已验证"分支，保留原始文档内容
- ✅ 跳过 VIP 购买引导弹窗与"仅 VIP 可见"内容替换
- ✅ 跨子域生效（doc.iocoder.cn / static.iocoder.cn）
- ✅ document-start 注入，每次导航自动维持解锁状态

## 工作原理

网站 `app.js` 的 vue-router `afterEach` 钩子通过名为 `88974ed8-6aff-48ab-a7d1-4af5ffea88bb` 的 cookie 判断是否为 VIP 用户：

- **无 cookie** → 用 jQuery `$.html()` 把文档内容替换成「仅 VIP 可见！」并弹出购买引导
- **有 cookie** → 走"已验证"分支，保留原始文档内容、不弹窗

本脚本在 `document-start` 阶段（早于网站脚本）写入该 VIP cookie，使判断恒为"已验证"，从而解锁全部付费文档。

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
[iocoder-unlocker] 芋道文档VIP解锁器启动
[iocoder-unlocker] VIP cookie 已注入
[iocoder-unlocker] 脚本初始化完成
```

验证解锁效果：访问 `https://doc.iocoder.cn/vo/`，应看到完整的「VO 对象转换、数据翻译」文档内容（含 MapStruct、BeanUtils、PageReqVO 等），而非"仅 VIP 可见！"。

## 配置选项

如网站更改 VIP cookie 名，修改脚本中的常量：

```javascript
const VIP_COOKIE_NAME = '88974ed8-6aff-48ab-a7d1-4af5ffea88bb';
const VIP_COOKIE_VALUE = 'vip-unlocked';
const VIP_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;  // 1 年
```

## 已知局限

1. **依赖 cookie 名固定**：若网站更改 `88974ed8-...` cookie 名，脚本失效，需更新常量
2. **服务端验证干扰**：网站会异步校验 cookie，失败时会清 cookie + reload；脚本靠每次导航重注入维持，理论上稳定，但极端网络下可能短暂闪烁
3. **仅解锁前端展示**：cookie 让前端判断通过，不提供真实 VIP 权限，服务端真实校验仍会失败（其失败后果被脚本闭环覆盖）
4. `static.iocoder.cn` 主要为静态资源域，限制逻辑在 doc.iocoder.cn，该 match 为兼容保留

## 许可证

MIT License

## 更新日志

### v2.0.0 (2026-06-26)
- 重写为 cookie 注入方案（原 DOM 移除方案经实测无效）
- 解锁 50+ 付费文档路径
- document-start 注入，每次导航自动维持

### v1.0.0 (2026-06-26)
- 初始版本（DOM 移除方案，后被证伪）
