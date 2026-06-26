// 用真实Chrome加载扩展，模拟用户点击侧边栏三轮测试
// 注：puppeteer --load-extension 加载 MV3 扩展在临时 profile 下常因扩展未启用而失败，
// 故改用读取 extension/content.js 真实代码 + evaluateOnNewDocument 注入，
// 注入时机等价于 manifest 的 run_at:document_start + world:MAIN，验证的是扩展里的真实逻辑。
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CONTENT_JS = fs.readFileSync(path.resolve(__dirname, '../extension/content.js'), 'utf-8');

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

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1400,900']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    // 注入扩展的真实 content.js（document_start + 页面主上下文）
    await page.evaluateOnNewDocument(CONTENT_JS);
    const logs = [];
    page.on('console', msg => logs.push('[' + msg.type() + '] ' + msg.text()));
    page.on('pageerror', err => logs.push('[pageerror] ' + err.message));

    console.log('### 注入 extension/content.js，访问 /vo/ ###');
    await page.goto('https://doc.iocoder.cn/vo/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 6000));
    let r = await checkBlocked(page);
    console.log('首次 /vo/:', r.isVipMark ? '✗VIP拦截' : '✓正常', '| len=' + r.contentLen, '| cookie=' + r.cookieOk);
    console.log('扩展日志:', logs.filter(l => l.includes('iocoder-unlocker')).join(' | '));

    // 采集侧边栏跨页面 VIP 链接
    const sidebarLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('aside a.sidebar-link, aside a[href]'));
        return links.map(a => ({ text: a.textContent.trim().substring(0, 20), href: a.getAttribute('href') }))
            .filter(l => l.href && l.href.startsWith('/') && !l.href.includes('#'));
    });
    const vipPaths = ['/vo/', '/bpm/', '/api-doc/', '/module-new/', '/new-feature/', '/resource-permission/', '/delete-code/', '/dev-hot-swap/', '/project-rename/', '/mybatis-pro/'];
    const seen = new Set();
    const testLinks = sidebarLinks.filter(l => {
        if (seen.has(l.href)) return false;
        if (!vipPaths.some(p => l.href === p || l.href.startsWith(p))) return false;
        seen.add(l.href); return true;
    }).slice(0, 8);
    console.log('\n测试链接:', testLinks.map(l => l.href).join(', '));

    // 第一轮：顺序点击
    console.log('\n========== 第一轮：顺序点击侧边栏 ==========');
    let round1Ok = true;
    for (const link of testLinks) {
        await page.evaluate((href) => { const a = document.querySelector('aside a[href="' + href + '"]'); if (a) a.click(); }, link.href);
        await new Promise(r => setTimeout(r, 3500));
        r = await checkBlocked(page);
        const ok = !r.isVipMark && !r.hasAlertContainer && r.cookieOk;
        if (!ok) round1Ok = false;
        console.log((ok ? '✓' : '✗') + ' ' + r.path + ' | len=' + r.contentLen);
    }
    console.log('第一轮: ' + (round1Ok ? '✓通过' : '✗拦截'));

    // 第二轮：快速连点
    console.log('\n========== 第二轮：快速连点 ==========');
    for (const link of testLinks.slice(0, 5)) {
        await page.evaluate((href) => { const a = document.querySelector('aside a[href="' + href + '"]'); if (a) a.click(); }, link.href);
        await new Promise(r => setTimeout(r, 400));
    }
    await new Promise(r => setTimeout(r, 5000));
    r = await checkBlocked(page);
    const round2Ok = !r.isVipMark && !r.hasAlertContainer && r.cookieOk;
    console.log('快速连点后: ' + (round2Ok ? '✓正常' : '✗拦截') + ' | path=' + r.path + ' | len=' + r.contentLen);

    // 第三轮：反向验证
    console.log('\n========== 第三轮：反向验证 ==========');
    let round3Ok = true;
    for (const link of testLinks.slice().reverse()) {
        await page.evaluate((href) => { const a = document.querySelector('aside a[href="' + href + '"]'); if (a) a.click(); }, link.href);
        await new Promise(r => setTimeout(r, 2500));
        r = await checkBlocked(page);
        const ok = !r.isVipMark && !r.hasAlertContainer && r.cookieOk;
        if (!ok) round3Ok = false;
        console.log((ok ? '✓' : '✗') + ' ' + r.path + ' | len=' + r.contentLen);
    }
    console.log('第三轮: ' + (round3Ok ? '✓通过' : '✗拦截'));

    console.log('\n========== 统计 ==========');
    console.log('拦截auth:', logs.filter(l => l.includes('已拦截 auth')).length);
    console.log('阻止清cookie:', logs.filter(l => l.includes('已阻止清除')).length);
    console.log('VIP拦截:', logs.filter(l => l.includes('★★★') || l.includes('仅 VIP 可见')).length);
    console.log('页面错误:', logs.filter(l => l.includes('pageerror')).length);
    logs.filter(l => l.includes('pageerror')).slice(0, 5).forEach(l => console.log('  ' + l));

    const pass = round1Ok && round2Ok && round3Ok;
    console.log('\n========== 最终结论 ==========');
    console.log(pass ? '✅✅✅ 扩展方案真实浏览器三轮测试全部通过 ✅✅✅' : '❌❌❌ 扩展方案测试未通过 ❌❌❌');

    await new Promise(r => setTimeout(r, 3000));
    await browser.close();
    process.exit(pass ? 0 : 1);
})().catch(e => { console.error('错误:', e.message); process.exit(2); });
