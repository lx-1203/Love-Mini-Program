/* eslint-disable no-console */
/**
 * 全页面截图审查（2026-08-14）
 *
 * 目标：对 pages.json 全部路由（主包 + 分包）逐一 reLaunch + 截图 + console 错误采集，
 * 长页追加滚动截图；失败自动重试 1 次，冻结自动恢复。产出截图存档 + _run-errors/_run-results。
 *
 * 前置：
 * - dist/build/mp-weixin 已构建（real 模式，含最新改动）
 * - 微信开发者工具自动化端口 9420 已开启（cli.bat auto --project <root> --auto-port 9420 --trust-project）
 * - 后端 8080 在线（guest-login 取 token）
 *
 * 运行：node scripts/shoot-all-pages-audit.cjs
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const REPO = 'D:\\6\\恋爱小程序';
const OUT_DIR = path.join(REPO, '截图存档', '2026-08-14-全页面截图审查', 'client');
const WAIT_MS = 9000;
const SCROLL_WAIT_MS = 4000;

/** 长页：额外滚动截图 */
const LONG_PAGES = new Set([
  '/pages/home/index',
  '/pages/messages/index',
  '/pages/village/index',
  '/pages/likes/index',
  '/pages/love-center/index',
  '/pages/wallet/index',
  '/pages/settings/index',
  '/pages/vip/index',
  '/pages/profile/index',
  '/pages/discover/index',
  '/pages/nearby/index',
]);

const errors = [];
const results = [];

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

/** 读取 pages.json（JSONC：去注释） */
function loadPages() {
  const raw = fs.readFileSync(path.join(REPO, 'apps', 'client', 'src', 'pages.json'), 'utf8');
  const clean = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const json = JSON.parse(clean);
  const routes = [];
  for (const p of json.pages) {
    routes.push({ name: p.path.replace(/\//g, '-').replace(/^-/, ''), route: '/' + p.path });
  }
  for (const sub of json.subPackages) {
    for (const p of sub.pages) {
      routes.push({ name: (sub.root + '/' + p.path).replace(/\//g, '-'), route: '/' + sub.root + '/' + p.path });
    }
  }
  return routes;
}

/** 带参路由兜底映射（预取失败用示例 id） */
function applyParams(route, ctx) {
  if (route.includes('/chat-session/index')) return route + `?sessionId=${encodeURIComponent(ctx.conversationId || '1')}`;
  if (route.includes('/village/detail')) return route + `?id=${encodeURIComponent(ctx.postId || '352')}`;
  if (route.includes('/village/tag-posts')) return route + '?tagName=%E7%94%9F%E6%B4%BB%E8%AE%B0%E5%BD%95';
  if (route.includes('/circles/topics')) return route + `?circleId=${encodeURIComponent(ctx.circleId || '1')}`;
  if (route.includes('/circles/topic-detail')) return route + `?topicId=${encodeURIComponent(ctx.topicId || '1')}`;
  if (route.includes('/campus/topic-detail')) return route + `?topicId=${encodeURIComponent(ctx.topicId || '1')}`;
  if (route.includes('/activities/detail')) return route + `?id=${encodeURIComponent(ctx.activityId || '1')}`;
  if (route.includes('/market/detail')) return route + `?id=${encodeURIComponent(ctx.productId || '1')}`;
  return route;
}

async function api(pathname, options = {}) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

/** 预取带参页面所需 id（尽力而为） */
async function preFetch() {
  const ctx = { token: '', conversationId: '', postId: '', circleId: '', topicId: '', activityId: '', productId: '' };
  try {
    const guest = await api('/auth/guest-login', { method: 'POST', body: '{}' });
    ctx.token = guest.token || (guest.data && guest.data.token) || '';
    if (!ctx.token) return ctx;
    const headers = { Authorization: `Bearer ${ctx.token}`, 'Content-Type': 'application/json' };
    const get = (p) => fetch(`${API_BASE}${p}`, { headers }).then((r) => r.json());
    try {
      const conv = await get('/messages/conversations');
      const items = Array.isArray(conv) ? conv : conv.items || conv.content || [];
      if (items.length) ctx.conversationId = String(items[0].id || items[0].conversationId || '');
    } catch (e) { console.log(`[prefetch] conversations: ${e.message}`); }
    try {
      const posts = await get('/posts?page=1&size=1');
      const items = posts.items || posts.content || (Array.isArray(posts) ? posts : []);
      if (items.length) ctx.postId = String(items[0].id || '');
    } catch (e) { console.log(`[prefetch] posts: ${e.message}`); }
    try {
      const circles = await get('/circles');
      const items = Array.isArray(circles) ? circles : circles.items || circles.content || [];
      if (items.length) ctx.circleId = String(items[0].id || '');
    } catch (e) { console.log(`[prefetch] circles: ${e.message}`); }
    try {
      const topics = await get('/circle-topics?page=1&size=1');
      const items = Array.isArray(topics) ? topics : topics.items || topics.content || [];
      if (items.length) ctx.topicId = String(items[0].id || '');
    } catch (e) { console.log(`[prefetch] topics: ${e.message}`); }
    try {
      const acts = await get('/recommendations/activities');
      const items = Array.isArray(acts) ? acts : acts.items || acts.content || [];
      if (items.length) ctx.activityId = String(items[0].id || '');
    } catch (e) { console.log(`[prefetch] activities: ${e.message}`); }
    try {
      const products = await get('/products?page=1&size=1');
      const items = products.items || products.content || (Array.isArray(products) ? products : []);
      if (items.length) ctx.productId = String(items[0].id || '');
    } catch (e) { console.log(`[prefetch] products: ${e.message}`); }
  } catch (e) {
    console.log(`[prefetch] guest-login 失败: ${e.message}`);
  }
  return ctx;
}

process.on('uncaughtException', (err) => {
  console.log(`[${ts()}] [uncaught] ${err && err.message ? err.message : String(err)}`);
});
process.on('unhandledRejection', (err) => {
  console.log(`[${ts()}] [unhandled] ${err && err.message ? err.message : String(err)}`);
});

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pages = loadPages();
  console.log(`[${ts()}] 共 ${pages.length} 个路由，连接 ${WS_ENDPOINT} ...`);
  let miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
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

  // 注入真实 token
  const ctx = await preFetch();
  if (ctx.token) {
    try {
      await miniProgram.callWxMethod('setStorage', { key: 'token', data: ctx.token });
      await miniProgram.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
      console.log(`[${ts()}] token injected len=${ctx.token.length}`);
    } catch (e) {
      console.log(`[${ts()}] token inject FAIL: ${e.message}`);
    }
  } else {
    console.log(`[${ts()}] WARN: 无 token，受保护页将显示登录/锁定态`);
  }

  let lastShotSize = -1;

  async function recover() {
    console.log(`[${ts()}] [recover] reconnecting...`);
    try { await miniProgram.disconnect(); } catch (_e) { /* ignore */ }
    await new Promise((r) => setTimeout(r, 3000));
    miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
    await new Promise((r) => setTimeout(r, 3000));
    try {
      await miniProgram.callWxMethod('reLaunch', { url: '/pages/home/index' });
      await new Promise((r) => setTimeout(r, 6000));
    } catch (_e) { /* ignore */ }
  }

  async function shoot(route, shotPath, waitMs) {
    await miniProgram.callWxMethod('reLaunch', { url: route });
    await new Promise((r) => setTimeout(r, waitMs));
    await miniProgram.screenshot({ path: shotPath });
    return fs.statSync(shotPath).size;
  }

  for (const p of pages) {
    const before = errors.length;
    const route = applyParams(p.route, ctx);
    const baseName = `${String(results.length + 1).padStart(2, '0')}-${p.name}`;
    const shotPath = path.join(OUT_DIR, `${baseName}.png`);
    try {
      let size = await shoot(route, shotPath, WAIT_MS);
      // 冻结检测
      if (size === lastShotSize && lastShotSize > 0) {
        console.log(`[WARN] ${p.name} frozen (${size}B), recovering...`);
        await recover();
        size = await shoot(route, shotPath, WAIT_MS);
      }
      lastShotSize = size;
      const newErr = errors.length - before;
      console.log(`[OK] ${baseName} ${route} (${size}B, err=${newErr})`);
      results.push({ name: baseName, route, ok: true, bytes: size, newErrors: newErr, shots: 1 });

      // 长页滚动截图
      if (LONG_PAGES.has(p.route)) {
        const scrollPath = path.join(OUT_DIR, `${baseName}-scroll.png`);
        try {
          await miniProgram.callWxMethod('pageScrollTo', { scrollTop: 500, duration: 0 });
          await new Promise((r) => setTimeout(r, SCROLL_WAIT_MS));
          await miniProgram.screenshot({ path: scrollPath });
          const sSize = fs.statSync(scrollPath).size;
          console.log(`[OK] ${baseName}-scroll (${sSize}B)`);
          const last = results[results.length - 1];
          if (last) last.shots = 2;
        } catch (e) {
          console.log(`[WARN] ${baseName}-scroll 失败: ${e.message}`);
        }
      }
    } catch (e) {
      console.log(`[FAIL] ${p.name} ${route}: ${e.message}`);
      // 重试 1 次
      try {
        await recover();
        await shoot(route, shotPath, WAIT_MS);
        const size = fs.statSync(shotPath).size;
        lastShotSize = size;
        const newErr = errors.length - before;
        console.log(`[RETRY-OK] ${baseName} ${route} (${size}B, err=${newErr})`);
        results.push({ name: baseName, route, ok: true, bytes: size, newErrors: newErr, retried: true, shots: 1 });
      } catch (e2) {
        console.log(`[RETRY-FAIL] ${baseName} ${route}: ${e2.message}`);
        results.push({ name: baseName, route, ok: false, error: e2.message });
        await recover().catch(() => {});
      }
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify({ errors, ts: ts() }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify({ results, total: pages.length, ts: ts() }, null, 2), 'utf-8');
  console.log(`\n===== 汇总: ${results.filter((r) => r.ok).length}/${pages.length} OK, 错误 ${errors.length} =====`);
  for (const e of errors.slice(0, 40)) {
    console.log(`  ${e.time} [${e.type}] ${e.text}`);
  }
  await miniProgram.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});