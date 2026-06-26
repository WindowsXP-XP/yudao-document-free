# 芋道文档VIP弹窗移除器 - 设计方案

## 概述

为 doc.iocoder.cn 和 static.iocoder.cn 开发油猴脚本，移除VIP付费弹窗和图片弹窗，恢复被遮罩的文档内容访问。

## 问题分析

### 页面弹窗机制

通过实际访问 https://doc.iocoder.cn/vo/ 分析得出：

1. **VIP遮罩层** (`.alert-modal`)：
   - `position: fixed; z-index: 1000`
   - 全屏黑色半透明遮罩，阻挡用户与页面内容交互

2. **VIP弹窗内容** (`.alert-container`)：
   - `position: fixed; z-index: 1001`
   - 640x640px 白色弹窗，显示VIP购买引导信息
   - 标题：「该文档仅芋道快速开发平台 Boot + Cloud 星球 VIP 用户可见」
   - 内容包含：视频教程、付费文档、VIP功能、技术解答、技术专栏等介绍
   - 底部按钮：引导加入知识星球

3. **弹窗加载方式**：
   - 由 `answer.js` 弹窗组件创建
   - 在页面DOM加载后动态插入到 `body` 的尾部
   - 非VIP页面（如 /intro/）不会触发弹窗

4. **内容可见性**：
   - 文档内容已加载到DOM中，仅被遮罩层遮挡
   - 移除遮罩层和弹窗后，内容可正常浏览

## 技术方案

**方案选择：轻量级DOM移除方案**

- 使用 MutationObserver 监听DOM变化，实时移除弹窗
- CSS注入作为第一道防线，立即隐藏已知弹窗样式
- 初始清理处理页面加载时已存在的弹窗

**选择理由：**
- 响应快速，弹窗出现瞬间即被移除
- 不依赖网站逻辑，通用性强
- 符合KISS原则，简洁高效

## 架构设计

### 三层清除机制

```
┌─────────────────────────────────┐
│  第一层：CSS注入（立即隐藏）       │
│  无运行时开销，页面渲染前生效     │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│  第二层：MutationObserver（核心） │
│  实时监听DOM变化，彻底移除弹窗    │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│  第三层：初始清理（兜底）         │
│  处理页面加载时已存在的弹窗      │
└─────────────────────────────────┘
```

### 模块划分

| 模块 | 职责 | 触发时机 |
|------|------|----------|
| CSS注入 | 隐藏已知弹窗样式 | document-start |
| MutationObserver | 实时移除新增弹窗DOM | DOMContentLoaded |
| 初始清理 | 移除已存在的弹窗 | DOMContentLoaded |

### 配置常量

```javascript
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
```

## 详细设计

### 1. CSS注入模块

- 在 `document-start` 阶段立即执行
- 创建 `<style>` 元素，注入隐藏规则
- 使用 `!important` 确保样式优先级
- 包含 `display: none`、`visibility: hidden`、`opacity: 0` 三重隐藏
- 注入目标：`document.head` 或 `document.documentElement`

### 2. MutationObserver监听模块

- 监听 `document.body` 的 `childList` 变化（`subtree: true`）
- 不监听属性和文本变化（性能优化）
- 双重检查：节点本身匹配 + 子元素匹配
- 只处理 `ELEMENT_NODE` 类型节点

### 3. 初始清理模块

- 合并选择器为单一查询字符串（减少DOM查询次数）
- `querySelectorAll` + `forEach` 批量移除

### 4. 主程序入口

```
脚本启动 (@run-at document-start)
    ↓
[注入CSS]
    ↓
document.body 存在？
    ├─ 是 → 启动 Observer + 初始清理
    └─ 否 → 等待 DOMContentLoaded → 启动
```

## 油猴脚本元数据

```javascript
// @name         芋道文档VIP弹窗移除器
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  移除 doc.iocoder.cn 网站的 VIP 付费弹窗和图片弹窗
// @match        *://doc.iocoder.cn/*
// @match        *://static.iocoder.cn/*
// @grant        none
// @run-at       document-start
```

## 局限性

1. 仅移除DOM遮罩，如果内容本身未加载到页面中，仍无法查看
2. 如果网站更新弹窗类名，需要更新 `POPUP_SELECTORS` 配置
3. `static.iocoder.cn` 域名主要用于静态资源，弹窗逻辑主要在 `doc.iocoder.cn`

## 测试方案

1. 访问 https://doc.iocoder.cn/vo/ 验证VIP弹窗被移除
2. 访问 https://doc.iocoder.cn/intro/ 确认免费内容页面不受影响
3. 在页面间导航时验证弹窗持续被拦截
4. 检查浏览器控制台日志确认脚本运行状态
