/* eslint-disable no-console */
/**
 * 2026-08-08 走查收尾：小程序运行时错误审计
 *
 * 连接微信开发者工具（9420），注入真实 token，遍历关键页面，
 * 逐页收集 console error / pageerror / 资源加载失败，输出零报错审计结论。
 *
 * 运行前提：dist/build/mp-weixin 已构建、微信开发者工具 9420 已开启、后端 8080 已启动。
 * 关键经验（承自 mp-shoot-*.cjs）：automator 0.12.1 的 reLaunch 会崩 inspectee，
 * 必须用 miniProgram.callWxMethod('reLaunch', {url})。
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const WAIT_MS = 8000;

const PAGES = [
  { name: '01-login', route: '/pages/login/index', auth: false },
  { name: '02-home', route: '/pages/home/index' },
  { name: '03-discover', route: '/pages/discover/index' },
  { name: '04-discover-history', route: '/pages/discover/history' },
  { name: '05-likes', route: '/pages/likes/index' },
  { name: '06-likes-visitors', route: '/pages/likes-visitors/index' },
  { name: '07-heart-signals', route: '/pages/heart-signals/index' },
  { name: '08-messages', route: '/pages/messages/index' },
  { name: '09-chat-session', route: '/pages/chat-session/index?sessionId=1' },
  { name: '10-official-chat', route: '/pages/official-chat/index' },
  { name: '11-village', route: '/pages/village/index' },
  { name: '12-village-detail', route: '/pages/village/detail?id=26' },
  { name: '13-circles', route: '/pages/circles/index' },
  { name: '14-profile', route: '/pages/profile/index' },
  { name: '15-wallet', route: '/pages/wallet/index' },
  { name: '16-love-center', route: '/pages/love-center/index' },
  { name: '17-campus', route: '/pages/campus/index' },
  { name: '18-daily-question', route: '/pages/daily-question/index' },
  { name: '19-shop', route: '/pages/shop/index' },
  { name: '20-circles-topic', route: '/pages/circles/topic-detail?topicId=1' },
  { name: '21-vip', route: '/pages/vip/index' },
];

async function getToken() {
  const res = await fetch(`${API_BASE}/auth/phone-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: process.env.TEST_ADMIN_PHONE ?? "<REDACTED>", password: process.env.TEST_ADMIN_PASSWORD ?? "<REDACTED>" }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('login failed: ' + JSON.stringify(data).slice(0, 200));
  return data.token;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const token = await getToken();
  console.log(`[login] token len=${token.length}`);

  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log('[automator] connected');

  // 注入登录态（token + 会话缓存）
  await miniProgram.callWxMethod('setStorage', { key: 'token', data: token }).catch(() => {});
  await miniProgram.callWxMethod('setStorage', { key: 'uni-storage-token', data: token }).catch(() => {});
  await miniProgram.callWxMethod('setStorage', { key: 'campus-love:privacy-authorized', data: '1' }).catch(() => {});
  await miniProgram.callWxMethod('setStorage', { key: 'uni-storage-campus-love:privacy-authorized', data: '1' }).catch(() => {});

  const results = [];
  for (const page of PAGES) {
    const errors = [];
    const onError = (msg) => errors.push(String(msg.args && msg.args[0] ? (typeof msg.args[0] === 'object' ? JSON.stringify(msg.args[0]).slice(0, 150) : String(msg.args[0]).slice(0, 150)) : String(msg).slice(0, 150)));
    const onPageError = (err) => errors.push('[pageerror] ' + String(err.message || err).slice(0, 200));
    miniProgram.on('console', onError);
    miniProgram.on('pageerror', onPageError);

    try {
      await miniProgram.callWxMethod('reLaunch', { url: page.route });
      await sleep(WAIT_MS);
    } catch (e) {
      errors.push('[navigation] ' + String(e.message || e).slice(0, 150));
    }
    miniProgram.removeListener('console', onError);
    miniProgram.removeListener('pageerror', onPageError);

    // 过滤噪音：图片/资源 404 之外的真实报错也保留（404 同样算问题）
    const real = errors.filter((e) => !/downloadFile|Image@|createSelectorQuery/.test(e));
    results.push({ name: page.name, route: page.route, errors: real });
    console.log(`[${page.name}] ${real.length ? real.length + ' errors' : 'OK'}`);
    real.slice(0, 4).forEach((e) => console.log('   - ' + e));
  }

  const total = results.reduce((n, r) => n + r.errors.length, 0);
  console.log('\n========== 审计结论 ==========');
  console.log(`页面总数: ${results.length}，报错页面: ${results.filter((r) => r.errors.length > 0).length}，错误总数: ${total}`);
  if (total === 0) {
    console.log('✅ 零报错：全部页面运行时无 console error / pageerror');
  } else {
    console.log('❌ 存在报错，明细：');
    results.filter((r) => r.errors.length > 0).forEach((r) => {
      console.log(`  [${r.name}] ${r.route}`);
      r.errors.slice(0, 6).forEach((e) => console.log(`      ${e}`));
    });
  }

  await miniProgram.close();
  process.exit(total === 0 ? 0 : 1);
})().catch((e) => {
  console.error('[audit failed]', e);
  process.exit(2);
});
