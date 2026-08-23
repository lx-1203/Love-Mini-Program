/**
 * WeChat Mini Program automation screenshot script
 * Uses miniprogram-automator to connect to WeChat DevTools and take page screenshots
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const globalRoot = 'D:\\codex-tools\\node-v22.17.0-win-x64\\node_modules';
const require2 = createRequire(path.join(globalRoot, 'package.json'));
const automator = require2('miniprogram-automator');

const PROJECT_PATH = 'd:\\6\\恋爱小程序';
const SCREENSHOT_DIR = path.join(PROJECT_PATH, '截图存档', '2026-08-19-mp');

const PAGES = [
  { name: '08-login', url: '/pages/login/index', desc: '登录页' },
  { name: '01-discover', url: '/pages/discover/index', desc: '寻觅首页' },
  { name: '02-home', url: '/pages/home/index', desc: '首页' },
  { name: '07-messages', url: '/pages/messages/index', desc: '消息页' },
  { name: '09-matching', url: '/pages/discover/matching', desc: '匹配中' },
  { name: '10-match-success', url: '/pages/discover/match-success', desc: '匹配成功' },
  { name: '11-campus', url: '/pages/campus/hub', desc: '校园圈' },
  { name: '03-nearby', url: '/pages/nearby/index', desc: '附近页' },
  { name: '04-profile', url: '/pages/profile/index', desc: '个人主页' },
  { name: '12-circle-detail', url: '/pages/campus/index', desc: '圈子详情' },
];

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('[screenshot] Connecting to WeChat DevTools...');

  let miniProgram;
  try {
    miniProgram = await automator.connect({
      appPath: 'D:\\微信开发者\\微信web开发者工具\\微信开发者工具.exe',
      projectPath: PROJECT_PATH,
    });
    console.log('[screenshot] Connected successfully');
  } catch (err) {
    console.error('[screenshot] Connection failed:', err.message);
    process.exit(1);
  }

  const results = [];

  for (const page of PAGES) {
    console.log(`\n[screenshot] ${page.desc} (${page.url})`);
    try {
      const currentPage = await miniProgram.navigateTo(page.url);
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const filePath = path.join(SCREENSHOT_DIR, `${page.name}.png`);
      await currentPage.screenshot({
        path: filePath,
        fullPage: true,
      });
      console.log(`  -> Saved: ${filePath}`);
      results.push({ ...page, status: 'OK', file: filePath });
    } catch (err) {
      console.error(`  -> Failed: ${err.message}`);
      results.push({ ...page, status: 'FAIL', error: err.message });
    }
  }

  try { await miniProgram.navigateTo('/pages/home/index'); } catch (_) {}

  console.log('\n========== Summary ==========');
  for (const r of results) {
    const icon = r.status === 'OK' ? '[OK]' : '[FAIL]';
    console.log(`${icon} ${r.desc}: ${r.name} ${r.error || ''}`);
  }
  console.log(`\nDir: ${SCREENSHOT_DIR}`);
  console.log(`Total: ${results.filter(r => r.status === 'OK').length}/${results.length} OK`);

  process.exit(0);
}

main().catch((err) => {
  console.error('[screenshot] Fatal:', err);
  process.exit(1);
});
