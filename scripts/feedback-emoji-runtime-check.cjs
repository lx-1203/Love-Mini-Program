/* eslint-disable no-console */
/**
 * 反馈改版收尾验证：H5 渲染层 emoji 运行时检测 + 页面截图
 *
 * 逐页访问并检查渲染后 DOM 中是否残留彩色 emoji 字符（Unicode 1F000-1FAFF / 2600-27BF / FE0F），
 * 截图保存到 verification_logs/emoji-check-20260805/。
 * 仅检测渲染输出，不检测注释/源码。
 */
const puppeteer = require('D:/6/恋爱小程序/node_modules/puppeteer');

const BASE = 'http://localhost:5173';
const OUT_DIR = 'verification_logs/emoji-check-20260805';

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/u;

const PAGES = [
  { name: 'discover', url: '/#/pages/discover/index' },
  { name: 'home', url: '/#/pages/home/index' },
  { name: 'village', url: '/#/pages/village/index' },
  { name: 'messages', url: '/#/pages/messages/index' },
  { name: 'profile', url: '/#/pages/profile/index' },
  { name: 'love-center', url: '/#/pages/love-center/index' },
  { name: 'privacy', url: '/#/pages/profile/privacy' },
  { name: 'settings', url: '/#/pages/settings/index' },
  { name: 'login', url: '/#/pages/login/index' },
  { name: 'vip', url: '/#/pages/vip/index' },
  { name: 'chat-session', url: '/#/pages/chat-session/index' },
  { name: 'likes', url: '/#/pages/likes/index' },
];

async function main() {
  const fs = require('fs');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  const errors = [];
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message.slice(0, 200)}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text().slice(0, 200)}`);
  });

  const results = [];
  for (const item of PAGES) {
    try {
      await page.goto(BASE + item.url, { waitUntil: 'networkidle2', timeout: 60000 });
      // 等待渲染
      await new Promise((r) => setTimeout(r, 5000));
      const check = await page.evaluate((reSrc) => {
        const re = new RegExp(reSrc, 'u');
        const hits = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent || '';
          const m = text.match(re);
          if (m) {
            hits.push({ text: text.slice(0, 80), char: m[0] });
          }
        }
        // 属性值也可能渲染 emoji（如 aria-label / placeholder）
        document.querySelectorAll('*').forEach((el) => {
          for (const attr of ['placeholder', 'aria-label', 'title', 'alt']) {
            const v = el.getAttribute(attr);
            if (v && re.test(v)) hits.push({ text: `[${attr}] ${v.slice(0, 80)}`, char: v.match(re)[0] });
          }
        });
        return { bodyTextLen: (document.body.innerText || '').length, hits };
      }, EMOJI_RE.source);

      const ok = check.hits.length === 0;
      results.push({ name: item.name, ok, bodyTextLen: check.bodyTextLen, hits: check.hits.slice(0, 5) });
      await page.screenshot({ path: `${OUT_DIR}/${item.name}.png`, fullPage: false });
      console.log(`[${ok ? 'OK' : 'EMOJI!'}] ${item.name} bodyText=${check.bodyTextLen} hits=${check.hits.length}`);
      check.hits.slice(0, 5).forEach((h) => console.log(`    hit: ${JSON.stringify(h)}`));
    } catch (e) {
      results.push({ name: item.name, ok: false, error: e.message });
      console.log(`[FAIL] ${item.name}: ${e.message}`);
    }
  }

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n===== 汇总: PASS ${pass} / ${results.length} =====`);
  if (errors.length) {
    console.log(`页面错误(${errors.length} 条, 前 5 条):`);
    errors.slice(0, 5).forEach((e) => console.log('  ' + e));
  }
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
