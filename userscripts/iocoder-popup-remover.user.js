// ==UserScript==
// @name         芋道文档VIP解锁器
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  解锁 doc.iocoder.cn 付费文档：注入 VIP cookie + 拦截 auth 校验，SPA 路由切换下稳定解锁，跳过 VIP 弹窗与"仅 VIP 可见"替换
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
    // 只要该 cookie 存在且非空，d() 即返回 true。
    const VIP_COOKIE_NAME = '88974ed8-6aff-48ab-a7d1-4af5ffea88bb';
    const VIP_COOKIE_VALUE = 'vip-unlocked';
    const VIP_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 年（秒）
    // 网站 d()=true 分支会异步调用 $.get(o + "/zsxq/auth", {vip}) 做服务端校验，
    // 假 cookie 必然校验失败 → Cookies.remove(n) + location.reload()。
    // 在 SPA 路由切换下，这个异步清除会清掉 cookie，导致后续点击 d()=false 直接拦截。
    // 因此必须拦截该 auth 请求，让校验恒返回 true，阻止清 cookie 与 reload。
    const AUTH_PATH = '/zsxq/auth';
    const LOG_PREFIX = '[iocoder-unlocker]';

    // ========== 第一层：注入 VIP cookie ==========
    // 必须在 document-start 执行，先于网站 app.js 的 afterEach 钩子读取 cookie，
    // 让 d() 返回 true，网站走"已验证"分支，不替换内容、不弹窗。
    function injectVIPCookie() {
        // 主域 cookie，保证跨子域（doc.iocoder.cn / static.iocoder.cn）生效
        document.cookie = `${VIP_COOKIE_NAME}=${VIP_COOKIE_VALUE}; max-age=${VIP_COOKIE_MAX_AGE}; path=/; domain=.iocoder.cn`;
        // 兜底：不带 domain 的当前域 cookie
        document.cookie = `${VIP_COOKIE_NAME}=${VIP_COOKIE_VALUE}; max-age=${VIP_COOKIE_MAX_AGE}; path=/`;
        console.log(`${LOG_PREFIX} VIP cookie 已注入`);
    }

    // ========== 第二层：拦截 jQuery auth 校验 ==========
    // 网站 d()=true 时执行：
    //   $.get(o + "/zsxq/auth", {host, vip}, callback)
    //   callback(true) → 正常；callback(false) → Cookies.remove(n) + location.reload()
    // 劫持 $.get，当 URL 含 /zsxq/auth 时，直接用 true 调起 callback，不发真实请求。
    // 这样校验恒通过，cookie 不会被清，不会 reload，SPA 连续点击也稳定。
    function hijackJQueryAuth() {
        // jQuery 尚未加载时，轮询等待 $.get 可用再劫持
        const tryHijack = () => {
            const $ = window.jQuery || window.$;
            if (!$ || typeof $.get !== 'function') {
                // jQuery 通常在 head 脚本中同步加载，document-start 时可能还未就绪
                return setTimeout(tryHijack, 30);
            }
            const origGet = $.get;
            $.get = function(url, data, callback) {
                // 兼容 $.get(url, callback) 与 $.get(url, data, callback) 两种签名
                const urlStr = String(url);
                const cb = typeof data === 'function' ? data : callback;
                // 精确匹配 /zsxq/auth 校验请求（避免误拦 /zsxq/auth-url、/zsxq/auth-callback）
                // 校验请求的 URL 形如 o + "/zsxq/auth"，data 含 vip 字段
                const isAuthCheck = urlStr.indexOf('/zsxq/auth') >= 0
                    && urlStr.indexOf('/zsxq/auth-') < 0
                    && data && typeof data === 'object' && 'vip' in data;
                if (isAuthCheck && typeof cb === 'function') {
                    console.log(`${LOG_PREFIX} 已拦截 auth 校验，直接放行`);
                    // 异步回调 true，模拟 jQuery 的成功回调时机
                    setTimeout(() => cb(true), 0);
                    return;
                }
                return origGet.apply(this, arguments);
            };
            // 同步备份到 $，防止网站用别名引用
            if (window.$ && window.$ !== $) {
                window.$.get = $.get;
            }
            console.log(`${LOG_PREFIX} jQuery $.get 劫持完成`);
        };
        tryHijack();
    }

    // ========== 第三层：cookie 防清除兜底 ==========
    // 即便上述劫持因时序未生效，auth 校验失败会 Cookies.remove(n)。
    // 用 MutationObserver/定时器太重，改用更轻量的方式：
    // 覆盖 js.cookie 的 remove，禁止清除 VIP cookie（仅当脚本已生效时）。
    // 注意：Cookies 可能在 document-start 时未加载，需等待。
    function protectVIPCookie() {
        const tryProtect = () => {
            const Cookies = window.Cookies;
            if (!Cookies || typeof Cookies.remove !== 'function') {
                return setTimeout(tryProtect, 30);
            }
            const origRemove = Cookies.remove;
            Cookies.remove = function(key, attrs) {
                if (key === VIP_COOKIE_NAME) {
                    console.log(`${LOG_PREFIX} 已阻止清除 VIP cookie`);
                    // 不真正删除，但重新写入以保证存在
                    injectVIPCookie();
                    return;
                }
                return origRemove.apply(this, arguments);
            };
            console.log(`${LOG_PREFIX} Cookies.remove 保护完成`);
        };
        tryProtect();
    }

    // ========== 主程序入口 ==========
    console.log(`${LOG_PREFIX} 芋道文档VIP解锁器启动`);

    // 第一层：立即注入 cookie（document-start）
    injectVIPCookie();

    // 第二层：劫持 auth 校验（jQuery 加载后生效）
    hijackJQueryAuth();

    // 第三层：cookie 防清除（js.cookie 加载后生效）
    protectVIPCookie();

    // SPA 路由切换不触发 document-start，用 popstate + history 钩子补注入
    const reInject = () => {
        if (!document.cookie.includes(VIP_COOKIE_NAME)) {
            injectVIPCookie();
        }
    };
    window.addEventListener('popstate', reInject);
    // 劫持 pushState/replaceState 以捕获 router-link 内部导航
    ['pushState', 'replaceState'].forEach(method => {
        const orig = history[method];
        history[method] = function() {
            const ret = orig.apply(this, arguments);
            setTimeout(reInject, 0);
            return ret;
        };
    });

    console.log(`${LOG_PREFIX} 脚本初始化完成`);
})();
