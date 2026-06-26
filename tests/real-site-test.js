// 真实网站完整测试：模拟用户点击侧边栏链接，验证SPA路由切换稳定性
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SCRIPT = fs.readFileSync(path.resolve(__dirname, '../userscripts/iocoder-popup-remover.user.js'), 'utf-8');

// 检查页面是否被VIP拦截
async function checkBlocked(page) {
    return await page.evaluate(() => {
        const cw = document.querySelector('.content-wrapper');
        return {
            isVipMark: cw ? cw.textContent.includes('仅 VIP 可见') : true,
            hasAlertContainer: !!document.querySelector('.alert-container'),
            hasAlertModal: !!document.querySelector('.alert-modal'),
            contentLen: cw ? cw.textContent.trim().length : 0,
            cookieOk: document.cookie.includes('88974ed8'),
            path: location.pathname
        };
    });
}

// 等待页面稳定（afterEach + auth校验完成）
async function waitStable(page, ms = 3500) {
    await new Promise(r => setTimeout(r, ms));
}

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const logs = [];
    page.on('console', msg => logs.push('[' + msg.type() + '] ' + msg.text()));
    page.on('pageerror', err => logs.push('[pageerror] ' + err.message));

    // 模拟油猴 @run-at document-start
    await page.evaluateOnNewDocument(SCRIPT);

    console.log('=== 访问首页 /vo/ ===');
    await page.goto('https://doc.iocoder.cn/vo/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitStable(page);
    let r = await checkBlocked(page);
    console.log('首次 /vo/:', r.isVipMark ? '✗拦截' : '✓正常', '| contentLen=' + r.contentLen, '| cookie=' + r.cookieOk);

    // 采集侧边栏真实链接
    const sidebarLinks = await page.evaluate(() => {
        // VuePress 侧边栏链接
        const links = Array.from(document.querySelectorAll('aside .sidebar-link, aside a.sidebar-link, .sidebar-group-items a'));
        return links.map(a => ({
            text: a.textContent.trim().substring(0, 25),
            href: a.getAttribute('href')
        })).filter(l => l.href && l.href.startsWith('/'));
    });
    console.log('\n=== 采集到侧边栏链接 ' + sidebarLinks.length + ' 个 ===');
    sidebarLinks.slice(0, 20).forEach(l => console.log('  ' + l.href + '  ' + l.text));

    // 筛选真正跨页面的 VIP 路径链接（去掉锚点，去重 pathname）
    const vipPaths = ['/vo/', '/bpm/', '/bpm-preview/', '/pay/', '/member/', '/mall/', '/message-queue/', '/report/', '/mybatis-pro/', '/dynamic-datasource/', '/job/', '/idempotent/', '/rate-limiter/', '/api-encrypt/', '/http-sign/', '/file/', '/sms/', '/mail/', '/notify/', '/social-user/', '/oauth2/', '/saas-tenant/', '/resource-permission/', '/data-permission/', '/erp/', '/crm/', '/mes/', '/wms/', '/im/', '/websocket/', '/ai/', '/iot/', '/mp/', '/system-log/', '/api-doc/', '/module-new/', '/new-feature/', '/dev-hot-swap/', '/project-rename/', '/delete-code/'];
    const seen = new Set();
    const testLinks = sidebarLinks.filter(l => {
        const path = l.href.split('#')[0]; // 去锚点
        if (seen.has(path)) return false;
        if (!vipPaths.some(p => path === p || path.startsWith(p))) return false;
        seen.add(path);
        return true;
    }).slice(0, 10);
    console.log('\n=== 筛选跨页面VIP链接 ' + testLinks.length + ' 个 ===');
    testLinks.forEach(l => console.log('  ' + l.href + '  ' + l.text));

    // ============ 第一轮：顺序点击每个跨页面侧边栏链接 ============
    console.log('\n========== 第一轮：顺序点击跨页面侧边栏链接 ==========');
    let round1Ok = true;
    for (const link of testLinks) {
        const targetPath = link.href.split('#')[0];
        // 真实点击侧边栏元素
        const clicked = await page.evaluate((href) => {
            const a = document.querySelector('aside a.sidebar-link[href="' + href + '"], aside a[href="' + href + '"]');
            if (a) { a.click(); return true; }
            return false;
        }, link.href);
        await waitStable(page, 3500);
        r = await checkBlocked(page);
        const ok = !r.isVipMark && !r.hasAlertContainer && r.cookieOk;
        if (!ok) round1Ok = false;
        console.log((ok ? '✓' : '✗') + ' ' + r.path + ' (' + link.text + ') | ' + (r.isVipMark ? 'VIP拦截' : '正常') + ' | len=' + r.contentLen + (clicked ? '' : ' [未点到元素]'));
    }
    console.log('第一轮结果: ' + (round1Ok ? '✓全部通过' : '✗存在拦截'));

    // ============ 第二轮：快速连点（复现用户问题）============
    console.log('\n========== 第二轮：快速连点 ==========');
    // 快速连续点击，不给auth校验留时间
    const quickLinks = testLinks.slice(0, 5);
    for (const link of quickLinks) {
        await page.evaluate((href) => {
            const a = document.querySelector('aside a[href="' + href + '"]');
            if (a) a.click();
        }, link.href);
        await new Promise(r => setTimeout(r, 300)); // 仅300ms间隔，模拟快速点击
    }
    await waitStable(page, 4000);
    r = await checkBlocked(page);
    const round2Ok = !r.isVipMark && !r.hasAlertContainer && r.cookieOk;
    console.log('快速连点后最终状态: ' + (round2Ok ? '✓正常' : '✗拦截') + ' | path=' + r.path + ' | len=' + r.contentLen);

    // ============ 第三轮：再回到各页面验证稳定性 ============
    console.log('\n========== 第三轮：再次逐个验证 ==========');
    let round3Ok = true;
    for (const link of testLinks.slice().reverse()) {
        await page.evaluate((href) => {
            const a = document.querySelector('aside a[href="' + href + '"]');
            if (a) a.click();
        }, link.href);
        await waitStable(page, 2500);
        r = await checkBlocked(page);
        const ok = !r.isVipMark && !r.hasAlertContainer && r.cookieOk;
        if (!ok) round3Ok = false;
        console.log((ok ? '✓' : '✗') + ' ' + link.href + ' | ' + (r.isVipMark ? 'VIP拦截' : '正常') + ' | len=' + r.contentLen);
    }
    console.log('第三轮结果: ' + (round3Ok ? '✓全部通过' : '✗存在拦截'));

    // 统计劫持证据
    console.log('\n========== 劫持证据统计 ==========');
    console.log('拦截auth次数:', logs.filter(l => l.includes('已拦截 auth')).length);
    console.log('阻止清cookie次数:', logs.filter(l => l.includes('已阻止清除')).length);
    console.log('VIP拦截日志(★★★):', logs.filter(l => l.includes('★★★')).length);
    console.log('页面错误:', logs.filter(l => l.includes('pageerror')).length);
    const errors = logs.filter(l => l.includes('pageerror'));
    if (errors.length) { console.log('错误详情:'); errors.slice(0, 5).forEach(e => console.log('  ' + e)); }

    const allPass = r && !r.isVipMark && round1Ok && round2Ok && round3Ok;
    // 重新检查最终状态
    const finalCheck = await checkBlocked(page);
    const finalOk = !finalCheck.isVipMark && !finalCheck.hasAlertContainer && finalCheck.cookieOk;
    const pass = round1Ok && round2Ok && round3Ok && finalOk;

    console.log('\n========== 最终结论 ==========');
    console.log('第一轮顺序点击: ' + (round1Ok ? '✓' : '✗'));
    console.log('第二轮快速连点: ' + (round2Ok ? '✓' : '✗'));
    console.log('第三轮再次验证: ' + (round3Ok ? '✓' : '✗'));
    console.log(pass ? '✅✅✅ 真实网站三轮测试全部通过 ✅✅✅' : '❌❌❌ 真实网站测试未通过，需继续修复 ❌❌❌');

    await browser.close();
    process.exit(pass ? 0 : 1);
})().catch(e => { console.error('测试错误:', e.message); process.exit(2); });
