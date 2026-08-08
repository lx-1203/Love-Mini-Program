/* eslint-disable no-console */
/**
 * 诊断脚本 v2：查询高度链各节点实际尺寸 + 卡片 style。
 * 运行：node scripts/diag-discover-card.cjs
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const OUT_DIR = 'D:\\6\\恋爱小程序\\截图存档\\diag';

function ts() { return new Date().toISOString().replace('T', ' ').substring(0, 23); }

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[${ts()}] connecting ${WS_ENDPOINT}...`);

  let token = '';
  try {
    const res = await fetch(`${API_BASE}/auth/guest-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await res.json();
    token = data.token || (data.data && data.data.token) || '';
    console.log(`[${ts()}] token len=${token.length}`);
  } catch (e) {
    console.log(`[${ts()}] token fetch FAIL: ${e.message}`);
  }

  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] connected`);

  await new Promise((r) => setTimeout(r, 3000));

  if (token) {
    await miniProgram.callWxMethod('setStorage', { key: 'token', data: token });
    await miniProgram.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
    console.log(`[${ts()}] token injected`);
  }

  await miniProgram.callWxMethod('reLaunch', { url: '/pages/discover/index' });
  await new Promise((r) => setTimeout(r, 10000));

  const page = await miniProgram.currentPage();
  console.log(`[${ts()}] page: ${page.path}`);

  const selectors = [
    '.discover-page',
    '.card-area',
    'card-swiper',
    '.card-swiper',
    '.card-stack',
    '.card--current',
    '.card--next',
    '.card__content',
    '.card__bg-wrap',
    '.card__bg',
    '.action-bar',
  ];

  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (!el) {
        console.log(`[MISS] ${sel} -> NOT FOUND`);
        continue;
      }
      const size = await el.size();
      const offset = await el.offset();
      console.log(`[NODE] ${sel} -> w=${size && size.width}, h=${size && size.height}, top=${offset && offset.top}, left=${offset && offset.left}`);
      if (sel === 'card-swiper') {
        try {
          const fl = await el.style('flex');
          const disp = await el.style('display');
          const cls = await el.attribute('class');
          console.log(`       flex=${fl}, display=${disp}, class=${cls}`);
        } catch (_e) { /* ignore */ }
      }
      if (sel === '.card--current' || sel === '.card--next') {
        try {
          const opacity = await el.style('opacity');
          const transform = await el.style('transform');
          console.log(`       opacity=${opacity}, transform=${String(transform).slice(0, 120)}`);
        } catch (_e) { /* ignore */ }
      }
    } catch (e) {
      console.log(`[ERR] ${sel}: ${e.message}`);
    }
  }

  // 页面级信息：page 根节点高度
  try {
    const pageNode = await page.$('page');
    if (pageNode) {
      const s = await pageNode.size();
      console.log(`[PAGE] page -> w=${s && s.width}, h=${s && s.height}`);
    }
  } catch (_e) { /* ignore */ }

  // 截图
  const shotPath = path.join(OUT_DIR, 'discover-diag.png');
  await miniProgram.screenshot({ path: shotPath });
  const size = fs.statSync(shotPath).size;
  console.log(`[SHOT] saved ${shotPath} (${size}B)`);

  await miniProgram.disconnect();
  console.log(`[${ts()}] done`);
}

main().catch((e) => {
  console.error(`[FATAL] ${e.message}`);
  process.exit(1);
});
