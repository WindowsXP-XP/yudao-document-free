// 芋道文档VIP解锁器 - Chrome扩展 content script
// 运行在 MAIN world（页面主上下文），拦截页面自身的 XMLHttpRequest（网站用 jQuery $.get 走 XHR）

(function() {
    'use strict';

    // ========== 配置常量 ==========
    // 网站 app.js 用此 cookie 判断是否 VIP：Cookies.get(n) 存在且非空即 d()=true
    const VIP_COOKIE_NAME = '88974ed8-6aff-48ab-a7d1-4af5ffea88bb';
    const VIP_COOKIE_VALUE = 'vip-unlocked';
    const VIP_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 年（秒）
    // 网站 d()=true 分支会异步校验：$.get(o+"/zsxq/auth", {vip}, cb)
    //   cb(true) → 正常；cb(false) → Cookies.remove(n) + location.reload()
    // 假 cookie 必然校验失败。SPA 路由切换下，这个异步清除会清掉 cookie，
    // 导致后续点击 d()=false 直接替换内容+弹窗。
    // 拦截该 auth 请求，让其响应体恒为 "true"，校验恒通过。
    // auth 校验请求 URL 特征：含 "/zsxq/auth" 且不含 "/zsxq/auth-url" "/zsxq/auth-callback"
    // jQuery 3.6 的 $.get 最终走 new XMLHttpRequest()，故拦截原生 XHR 最彻底，
    // 不依赖 jQuery 加载时序，覆盖 $.get/$.ajax/直接 XHR 所有形式。
    const LOG_PREFIX = '[iocoder-unlocker]';

    // ========== 第一层：注入 VIP cookie ==========
    // document_start 执行，先于网站 app.js 的 afterEach 读取 cookie，让 d()=true
    function injectVIPCookie() {
        document.cookie = `${VIP_COOKIE_NAME}=${VIP_COOKIE_VALUE}; max-age=${VIP_COOKIE_MAX_AGE}; path=/; domain=.iocoder.cn`;
        document.cookie = `${VIP_COOKIE_NAME}=${VIP_COOKIE_VALUE}; max-age=${VIP_COOKIE_MAX_AGE}; path=/`;
        console.log(`${LOG_PREFIX} VIP cookie 已注入`);
    }

    // ========== 第二层：拦截原生 XMLHttpRequest 的 auth 校验 ==========
    // 覆盖 XMLHttpRequest.prototype.open，当 URL 是 auth 校验请求时标记该 xhr；
    // 覆盖 send，对标记的 xhr 构造假成功响应（status=200, response="true"），
    // 触发 jQuery 的成功回调 cb(true)，从而不清 cookie、不 reload。
    function hijackXHR() {
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            // 记录 url，供 send 判断
            this.__unLockerUrl = String(url || '');
            this.__unLockerFaked = false; // 防止重复伪造响应（onreadystatechange + onload 双触发）
            return origOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            const url = this.__unLockerUrl || '';
            // 精确匹配 auth 校验请求（排除 auth-url / auth-callback）
            const isAuthCheck = url.indexOf('/zsxq/auth') >= 0
                && url.indexOf('/zsxq/auth-') < 0;
            if (isAuthCheck && !this.__unLockerFaked) {
                this.__unLockerFaked = true;
                console.log(`${LOG_PREFIX} 已拦截 auth 校验请求: ${url.substring(0, 60)}`);
                // 构造假响应：jQuery 的 ajaxTransport 读取 xhr.responseText/status
                // 用 setTimeout 模拟异步响应，避免破坏 jQuery 的状态机
                const xhr = this;
                setTimeout(() => {
                    // 直接覆盖只读属性需用 defineProperty
                    Object.defineProperty(xhr, 'readyState', {value: 4, writable: true, configurable: true});
                    Object.defineProperty(xhr, 'status', {value: 200, writable: true, configurable: true});
                    Object.defineProperty(xhr, 'statusText', {value: 'OK', writable: true, configurable: true});
                    Object.defineProperty(xhr, 'responseText', {value: 'true', writable: true, configurable: true});
                    Object.defineProperty(xhr, 'response', {value: 'true', writable: true, configurable: true});
                    // jQuery 3.6 监听 onreadystatechange，单次触发即可（防止回调重复执行）
                    if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange();
                    else xhr.dispatchEvent(new Event('readystatechange'));
                }, 0);
                return; // 不真正发送请求
            }
            return origSend.apply(this, arguments);
        };

        console.log(`${LOG_PREFIX} XMLHttpRequest 劫持完成`);
    }

    // ========== 第三层：cookie 防清除兜底 ==========
    // 即便 XHR 拦截因故未生效，auth 校验失败会 Cookies.remove(n)。
    // 覆盖 js.cookie 的 remove，禁止清除 VIP cookie。
    function protectVIPCookie() {
        const tryProtect = () => {
            const Cookies = window.Cookies;
            if (!Cookies || typeof Cookies.remove !== 'function') {
                return setTimeout(tryProtect, 30);
            }
            const origRemove = Cookies.remove;
            Cookies.remove = function(key) {
                if (key === VIP_COOKIE_NAME) {
                    console.log(`${LOG_PREFIX} 已阻止清除 VIP cookie`);
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

    // 第二层最先：XHR 是浏览器原生，document_start 立即可拦截（不依赖任何库加载）
    hijackXHR();

    // 第一层：注入 cookie
    injectVIPCookie();

    // 第三层：cookie 防清除（js.cookie 加载后生效）
    protectVIPCookie();

    // SPA 路由切换不触发 document_start，补注入 cookie
    const reInject = () => {
        if (!document.cookie.includes(VIP_COOKIE_NAME)) {
            injectVIPCookie();
        }
    };
    window.addEventListener('popstate', reInject);
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
