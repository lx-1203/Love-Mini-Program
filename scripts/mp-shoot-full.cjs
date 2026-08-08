/* eslint-disable no-console */
/**
 * 小程序端全量走查 + 截图（2026-08-08 v2，automator 0.12.1 + 微信开发者工具 2.02）。
 *
 * 关键经验（2026-08-08 排查）：
 * - automator 0.12.1 的 reLaunch/currentPage 内部调用 App.getCurrentPage →
 *   新版工具 inspectee 崩溃（getPageMetaByWebviewId null）→ 命令无响应超时；
 * - 绕过方案：miniProgram.callWxMethod('reLaunch', {url}) 直接调 wx API +
 *   miniProgram.screenshot({path})（App.captureScreenshot，不走 inspectee）。
 * - 前提：dist/build/mp-weixin 必须完整（app.json 存在），否则项目加载不了。
 *
 * 运行：node scripts/mp-shoot-full.cjs
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const OUT_DIR = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-08-2\\client';
const WAIT_MS = 9000;

const errors = [];
const results = [];

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

const PAGES = [
  { name: '01-home', route: '/pages/home/index' },
  { name: '02-discover', route: '/pages/discover/index' },
  { name: '03-discover-history', route: '/pages/discover/history' },
  { name: '04-discover-video-player', route: '/pages/discover/video-player' },
  { name: '05-likes', route: '/pages/likes/index' },
  { name: '06-likes-visitors', route: '/pages/likes-visitors/index' },
  { name: '07-village', route: '/pages/village/index' },
  { name: '08-village-post', route: '/pages/village/post' },
  { name: '09-village-detail', route: '/pages/village/detail?id=352' },
  { name: '10-village-tag-posts', route: '/pages/village/tag-posts?tagName=%E7%94%9F%E6%B4%BB%E8%AE%B0%E5%BD%95' },
  { name: '11-messages', route: '/pages/messages/index' },
  { name: '13-chat-session', route: '/pages/chat-session/index?sessionId=1' },
  { name: '14-official-chat', route: '/pages/official-chat/index' },
  { name: '15-profile', route: '/pages/profile/index' },
  { name: '16-profile-visitors', route: '/pages/profile/visitors' },
  { name: '17-profile-privacy', route: '/pages/profile/privacy' },
  { name: '18-profile-album', route: '/pages/profile/album' },
  { name: '19-profile-tasks', route: '/pages/profile/tasks' },
  { name: '20-circles', route: '/pages/circles/index' },
  { name: '21-circles-topics', route: '/pages/circles/topics?circleId=1' },
  { name: '22-circles-topic-detail', route: '/pages/circles/topic-detail?topicId=1' },
  { name: '23-circles-post-topic', route: '/pages/circles/post-topic' },
  { name: '24-campus', route: '/pages/campus/index' },
  { name: '25-campus-post-topic', route: '/pages/campus/post-topic' },
  { name: '26-campus-topic-detail', route: '/pages/campus/topic-detail?topicId=1' },
  { name: '27-campus-certification', route: '/pages/campus/certification' },
  { name: '28-daily-question', route: '/pages/daily-question/index' },
  { name: '29-love-center', route: '/pages/love-center/index' },
  { name: '30-love-center-nearby', route: '/pages/love-center/nearby' },
  { name: '31-love-center-mbti', route: '/pages/love-center/mbti' },
  { name: '32-love-center-consulting', route: '/pages/love-center/consulting' },
  { name: '33-heart-signals', route: '/pages/heart-signals/index' },
  { name: '34-help', route: '/pages/help/index' },
  { name: '35-security', route: '/pages/security/index' },
  { name: '36-shop', route: '/pages/shop/index' },
  { name: '37-settings', route: '/pages/settings/index' },
  { name: '38-settings-dnd', route: '/pages/settings/dnd' },
  { name: '39-verification', route: '/pages/verification/index' },
  { name: '40-vip', route: '/pages/vip/index' },
  { name: '41-vip-promo-code', route: '/pages/vip/promo-code' },
  { name: '42-vip-bills', route: '/pages/vip/bills' },
  { name: '43-wallet', route: '/pages/wallet/index' },
  { name: '44-feedback-history', route: '/pages/feedback/history' },
  { name: '45-showcase', route: '/pages/showcase/index' },
  { name: '46-sub-setup-profile', route: '/subpackages/setup/profile/index' },
  { name: '47-sub-setup-campus', route: '/subpackages/setup/campus/index' },
  { name: '48-sub-setup-schedule', route: '/subpackages/setup/schedule/index' },
  { name: '49-sub-setup-recommend-pref', route: '/subpackages/setup/recommend-pref/index' },
  { name: '50-sub-support-feedback', route: '/subpackages/support/feedback/index' },
  { name: '51-sub-discover-discussions', route: '/subpackages/discover/discussions/index' },
  { name: '52-sub-discover-activities', route: '/subpackages/discover/activities/index' },
  { name: '53-sub-legal-privacy', route: '/subpackages/legal/privacy/index' },
  { name: '54-sub-legal-agreement', route: '/subpackages/legal/agreement/index' },
  { name: '55-chat-red-packet', route: '/pages/chat/red-packet' },
  { name: '56-chat-video-call', route: '/pages/chat/video-call' },
  { name: '57-activities-detail', route: '/pages/activities/detail?id=1' },
  { name: '58-vip-red-packet', route: '/pages/vip/red-packet' },
  { name: '59-login', route: '/pages/login/index' },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[${ts()}] connecting ${WS_ENDPOINT} ...`);
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] connected`);

  miniProgram.on('console', (msg) => {
    if (!msg || msg.type !== 'error') return;
    const text = String((msg.args || []).map((a) => {
      if (typeof a === 'string') return a;
      if (a && a.value !== undefined) return String(a.value);
      if (a && a.description) return a.description;
      return JSON.stringify(a);
    }).join(' ')).slice(0, 400);
    errors.push({ time: ts(), type: 'console', text });
    console.log(`[err] ${text.slice(0, 150)}`);
  });
  miniProgram.on('exception', (err) => {
    errors.push({ time: ts(), type: 'exception', text: (err && err.message ? err.message : String(err)).slice(0, 400) });
    console.log(`[exception] ${String(err && err.message).slice(0, 150)}`);
  });

  await new Promise((r) => setTimeout(r, 4000));
  // 注入有效 token（2026-08-08 排查：evaluate 沙箱无 uni，改用 callWxMethod setStorage）
  try {
    await miniProgram.callWxMethod('setStorage', { key: 'token', data: 'eyJraWQiOiIxIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiI0NyIsImp0aSI6IjZjNTM2NmIxLWNlZTMtNGMzZi05ODJmLTgwOTZhM2Y0OTNkYSIsImlhdCI6MTc4NjE1NDE1NiwiZXhwIjoxNzg2MjQwNTU2fQ.Xha1-Ax0ssbJNxcSyt7x-q32qyPgcm1vEO6xupuHe4w' });
    await miniProgram.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
    console.log('[${ts()}] token injected via setStorage');
  } catch (e) {
    console.log('[${ts()}] token inject FAIL:', e.message);
  }


  for (const p of PAGES) {
    const before = errors.length;
    try {
      await miniProgram.callWxMethod('reLaunch', { url: p.route });
      await new Promise((r) => setTimeout(r, WAIT_MS));
      const shotPath = path.join(OUT_DIR, `${p.name}.png`);
      await miniProgram.screenshot({ path: shotPath });
      const size = fs.statSync(shotPath).size;
      const newErr = errors.length - before;
      console.log(`[OK] ${p.name} ${p.route} (${size}B, err=${newErr})`);
      results.push({ name: p.name, route: p.route, ok: true, newErrors: newErr });
    } catch (e) {
      console.log(`[FAIL] ${p.name} ${p.route}: ${e.message}`);
      results.push({ name: p.name, route: p.route, ok: false, error: e.message });
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify({ errors, ts: ts() }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify({ results, ts: ts() }, null, 2), 'utf-8');
  console.log(`\n===== 汇总: ${results.filter((r) => r.ok).length}/${results.length} OK, 错误 ${errors.length} =====`);
  for (const e of errors.slice(0, 30)) {
    console.log(`  ${e.time} [${e.type}] ${e.text}`);
  }

  await miniProgram.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
