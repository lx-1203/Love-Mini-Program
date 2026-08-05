// eslint-disable-next-line @typescript-eslint/no-var-requires
/* eslint-disable no-console */
/**
 * 微信开发者工具小程序自动化截图验证脚本 v2
 *
 * 通过 miniprogram-automator 连接 9420，依次 reLaunch 七个页面，
 * 对每个页面截图（模拟器真实渲染画面），并读取页面渲染状态。
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT_DIR = 'D:\\6\\恋爱小程序\\verification_logs';
const WAIT_MS = 9000;

const errors = [];

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

const PAGES = [
  { name: 'discover', route: '/pages/discover/index' },
  { name: 'home', route: '/pages/home/index' },
  { name: 'village', route: '/pages/village/index' },
  { name: 'messages', route: '/pages/messages/index' },
  { name: 'profile', route: '/pages/profile/index' },
  { name: 'love-center', route: '/pages/love-center/index' },
  { name: 'privacy', route: '/pages/profile/privacy' },
];

async function main() {
  console.log(`[${ts()}] 连接 ${WS_ENDPOINT} ...`);
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] 已连接`);

  miniProgram.on('console', (msg) => {
    let text = '';
    if (msg && msg.args) {
      text = msg.args.map((a) => {
        if (typeof a === 'string') return a;
        if (a && a.value !== undefined) return String(a.value);
        if (a && a.description) return a.description;
        return JSON.stringify(a);
      }).join(' ');
    } else if (msg && msg.text) {
      text = String(msg.text);
    }
    if (msg && (msg.type === 'error')) {
      errors.push({ time: ts(), type: msg.type, text: text.slice(0, 400) });
    }
  });
  miniProgram.on('exceptionOccurred', (err) => {
    errors.push({ time: ts(), type: 'exception', text: err && err.message ? err.message.slice(0, 400) : String(err) });
  });

  await new Promise((r) => setTimeout(r, 5000));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const p of PAGES) {
    const before = errors.length;
    try {
      console.log(`[${ts()}] reLaunch → ${p.route}`);
      await miniProgram.reLaunch(p.route);
      await new Promise((r) => setTimeout(r, WAIT_MS));

      // 截图模拟器画面
      const shotPath = path.join(OUT_DIR, `feedback-mp-${p.name}.png`);
      try {
        const page = await miniProgram.currentPage();
        await page.screenshot(shotPath);
        console.log(`[${ts()}] 截图: ${shotPath}`);
      } catch (e) {
        console.log(`[${ts()}] 截图失败: ${e.message}`);
      }

      const newErrors = errors.length - before;
      results.push({ name: p.name, route: p.route, ok: true, newErrors });
    } catch (e) {
      results.push({ name: p.name, route: p.route, ok: false, error: e.message });
    }
  }

  console.log('\n===== 结果 =====');
  for (const r of results) {
    console.log(`[${r.ok ? 'OK' : 'FAIL'}] ${r.name} 新增错误: ${r.newErrors ?? '-'}`);
    if (r.error) console.log(`   ${r.error}`);
  }
  console.log(`\n===== 全部错误（${errors.length}） =====`);
  for (const e of errors.slice(0, 25)) {
    console.log(`  ${e.time} [${e.type}] ${e.text}`);
  }

  await miniProgram.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
