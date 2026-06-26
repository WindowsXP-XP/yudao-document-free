// v2.2.0 自动化三轮测试
const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TEST_PAGE = 'file:///' + path.resolve(__dirname, 'popup-remover-test.html').replace(/\\/g, '/');

(async () => {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => logs.push('[' + msg.type() + '] ' + msg.text()));
    page.on('pageerror', err => logs.push('[pageerror] ' + err.message));

    await page.goto(TEST_PAGE, { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__ready === true', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 300));

    // 运行页面内置的三轮测试
    const pass = await page.evaluate(() => runAllTests());

    // 打印证据日志
    console.log('\n========== 关键劫持证据 ==========');
    console.log('拦截auth次数:', logs.filter(l => l.includes('已拦截 auth')).length);
    console.log('阻止清cookie次数:', logs.filter(l => l.includes('已阻止清除')).length);
    console.log('VIP拦截发生次数:', logs.filter(l => l.includes('★★★')).length);

    console.log('\n========== 完整日志 ==========');
    logs.forEach(l => console.log(l));

    await browser.close();

    console.log('\n========== 最终结论 ==========');
    console.log(pass ? '✅✅✅ 三轮测试全部通过，v2.2.0 方案有效 ✅✅✅' : '❌❌❌ 测试未通过，需继续修复 ❌❌❌');
    process.exit(pass ? 0 : 1);
})().catch(e => { console.error('测试执行错误:', e.message); process.exit(2); });
