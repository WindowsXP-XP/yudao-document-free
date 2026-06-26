// ==UserScript==
// @name         芋道文档VIP弹窗移除器
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  移除 doc.iocoder.cn 网站的 VIP 付费弹窗和图片弹窗
// @author       YourName
// @match        *://doc.iocoder.cn/*
// @match        *://static.iocoder.cn/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ========== 配置常量 ==========
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

    const LOG_PREFIX = '[iocoder-popup-remover]';

    // ========== 模块1: CSS注入 ==========
    function injectCSS() {
        const style = document.createElement('style');
        style.id = 'iocoder-popup-remover-css';
        style.textContent = `
            .alert-modal,
            .alert-container,
            [class*="img-popup"],
            [class*="image-layer"],
            [class*="photo-popup"],
            [class*="lightbox"],
            [class*="modal-popup"],
            [class*="dialog-popup"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
        `;

        const target = document.head || document.documentElement;
        target.appendChild(style);
        console.log(`${LOG_PREFIX} CSS注入完成`);
    }

    // ========== 模块2: MutationObserver监听 ==========
    function setupMutationObserver() {
        function removePopups(node) {
            // 检查节点本身是否是弹窗
            for (const selector of POPUP_SELECTORS) {
                if (node.matches && node.matches(selector)) {
                    node.remove();
                    console.log(`${LOG_PREFIX} 已移除弹窗:`, node.className);
                    return;
                }
            }

            // 检查节点的子元素中是否有弹窗
            if (node.querySelectorAll) {
                for (const selector of POPUP_SELECTORS) {
                    node.querySelectorAll(selector).forEach(popup => {
                        popup.remove();
                        console.log(`${LOG_PREFIX} 已移除子弹窗:`, popup.className);
                    });
                }
            }
        }

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            removePopups(node);
                        }
                    });
                }
            }
        });

        const config = {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        };

        const target = document.body || document.documentElement;
        observer.observe(target, config);
        console.log(`${LOG_PREFIX} MutationObserver已启动`);

        return observer;
    }

    // 后续模块将在此处添加

    console.log(`${LOG_PREFIX} 芋道文档VIP弹窗移除器启动`);

})();
