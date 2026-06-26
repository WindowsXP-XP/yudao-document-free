// ==UserScript==
// @name         芋道文档VIP解锁器
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  解锁 doc.iocoder.cn 付费文档：注入 VIP 标识 cookie，使内容正常显示，跳过 VIP 弹窗与"仅 VIP 可见"替换
// @author       YourName
// @match        *://doc.iocoder.cn/*
// @match        *://static.iocoder.cn/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ========== 配置常量 ==========
    // 网站 app.js 用此 cookie 名判断是否为 VIP 用户：
    //   function d(){ return Cookies.get(n) && Cookies.get(n).length > 0 }
    // 只要该 cookie 存在且非空，d() 即返回 true，网站不会替换内容、不会弹窗。
    // cookie 值本身无需通过服务端校验（验证失败仅清 cookie + reload，
    // 而本脚本在 document-start 每次导航都会重新注入，故可稳定保持解锁状态）。
    const VIP_COOKIE_NAME = '88974ed8-6aff-48ab-a7d1-4af5ffea88bb';
    const VIP_COOKIE_VALUE = 'vip-unlocked';
    // cookie 有效期：1 年（秒级）
    const VIP_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
    const LOG_PREFIX = '[iocoder-unlocker]';

    // ========== 核心：注入 VIP cookie ==========
    // 必须在 document-start 执行，确保在网站 app.js 的 afterEach 钩子
    // 读取 cookie 之前就已写入，从而让 d() 返回 true。
    function injectVIPCookie() {
        // 设置主域 cookie，保证跨子域（doc.iocoder.cn / static.iocoder.cn）均生效
        document.cookie = `${VIP_COOKIE_NAME}=${VIP_COOKIE_VALUE}; max-age=${VIP_COOKIE_MAX_AGE}; path=/; domain=.iocoder.cn`;
        // 兜底：不带 domain 的当前域 cookie
        document.cookie = `${VIP_COOKIE_NAME}=${VIP_COOKIE_VALUE}; max-age=${VIP_COOKIE_MAX_AGE}; path=/`;

        console.log(`${LOG_PREFIX} VIP cookie 已注入`);
    }

    // ========== 主程序入口 ==========
    console.log(`${LOG_PREFIX} 芋道文档VIP解锁器启动`);

    injectVIPCookie();

    console.log(`${LOG_PREFIX} 脚本初始化完成`);
})();
