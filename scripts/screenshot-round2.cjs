/* eslint-disable no-console */
/**
 * 第二轮全量截图验证（2026-08-08，验收报告 13 项检查清单复验）。
 *
 * 通过 miniprogram-automator 连接微信开发者工具 9420 端口：
 * 1. 预取真实数据（会话/话题/帖子/活动 id），供带参页面渲染真实内容；
 * 2. 60 个页面逐一 reLaunch + 截图，保存到 截图存档/2026-08-08-2/client/；
 * 3. 全程采集 console error / exceptionOccurred，写入 _run-errors.json。
 *
 * 运行：node scripts/screenshot-round2.cjs
 * 前置：微信开发者工具已打开 dist/build/mp-weixin 且 9420 端口监听；
 *       后端 real profile 已启动（http://127.0.0.1:8080）。
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const OUT_DIR = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-08-2\\client';
const WAIT_MS = 9000;

const errors = [];

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

async function api(pathname, options = {}) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

/** 预取带参页面所需 id（尽力而为，失败不影响截图流程） */
async function preFetch() {
  const ctx = { token: '', conversationId: '', campusTopicId: '', circleTopicId: '', postId: '', activityId: '' };
  try {
    const guest = await api('/auth/guest-login', { method: 'POST', body: '{}' });
    ctx.token = guest.token || '';
    if (!ctx.token) return ctx;
    const headers = { Authorization: `Bearer ${ctx.token}`, 'Content-Type': 'application/json' };
    const get = (p) => fetch(`${API_BASE}${p}`, { headers }).then((r) => r.json());
    try {
      const conv = await get('/messages/conversations');
      const items = Array.isArray(conv) ? conv : conv.items || conv.content || [];
      if (items.length) ctx.conversationId = items[0].id || items[0].conversationId || '';
    } catch (e) { console.log(`[prefetch] conversations: ${e.message}`); }
    try {
      const topics = await get('/campus/topics');
      const items = topics.content || topics.items || (Array.isArray(topics) ? topics : []);
      if (items.length) ctx.campusTopicId = items[0].id;
    } catch (e) { console.log(`[prefetch] campus topics: ${e.message}`); }
    try {
      const topics = await get('/circle-topics');
      const items = Array.isArray(topics) ? topics : topics.content || topics.items || [];
      if (items.length) ctx.circleTopicId = items[0].id;
    } catch (e) { console.log(`[prefetch] circle topics: ${e.message}`); }
    try {
      const posts = await get('/posts?page=1&size=1');
      const items = posts.items || posts.content || (Array.isArray(posts) ? posts : []);
      if (items.length) ctx.postId = items[0].id;
    } catch (e) { console.log(`[prefetch] posts: ${e.message}`); }
    try {
      const acts = await get('/recommendations/activities');
      const items = Array.isArray(acts) ? acts : acts.items || acts.content || [];
      if (items.length) ctx.activityId = items[0].id;
    } catch (e) { console.log(`[prefetch] activities: ${e.message}`); }
  } catch (e) {
    console.log(`[prefetch] guest-login 失败: ${e.message}`);
  }
  return ctx;
}

/** 60 个页面（带参模板 {xxx} 在运行时替换） */
function buildPages(ctx) {
  return [
    { name: '01-home', route: '/pages/home/index' },
    { name: '02-discover', route: '/pages/discover/index' },
    { name: '03-discover-history', route: '/pages/discover/history' },
    { name: '04-discover-video-player', route: '/pages/discover/video-player' },
    { name: '05-likes', route: '/pages/likes/index' },
    { name: '06-likes-visitors', route: '/pages/likes-visitors/index' },
    { name: '07-village', route: '/pages/village/index' },
    { name: '08-village-post', route: '/pages/village/post' },
    { name: '09-village-detail', route: `/pages/village/detail?id=${ctx.postId}` },
    { name: '10-village-tag-posts', route: '/pages/village/tag-posts?tagName=%E7%94%9F%E6%B4%BB%E8%AE%B0%E5%BD%95' },
    { name: '11-messages', route: '/pages/messages/index' },
    { name: '13-chat-session', route: `/pages/chat-session/index?sessionId=${ctx.conversationId}` },
    { name: '14-official-chat', route: '/pages/official-chat/index' },
    { name: '15-profile', route: '/pages/profile/index' },
    { name: '16-profile-visitors', route: '/pages/profile/visitors' },
    { name: '17-profile-privacy', route: '/pages/profile/privacy' },
    { name: '18-profile-album', route: '/pages/profile/album' },
    { name: '19-profile-tasks', route: '/pages/profile/tasks' },
    { name: '20-circles', route: '/pages/circles/index' },
    { name: '21-circles-topics', route: `/pages/circles/topics?circleId=${ctx.circleTopicId}` },
    { name: '22-circles-topic-detail', route: `/pages/circles/topic-detail?topicId=${ctx.circleTopicId}` },
    { name: '23-circles-post-topic', route: '/pages/circles/post-topic' },
    { name: '24-campus', route: '/pages/campus/index' },
    { name: '25-campus-post-topic', route: '/pages/campus/post-topic' },
    { name: '26-campus-topic-detail', route: `/pages/campus/topic-detail?topicId=${ctx.campusTopicId}` },
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
    { name: '57-activities-detail', route: `/pages/activities/detail?id=${ctx.activityId}` },
    { name: '58-vip-red-packet', route: '/pages/vip/red-packet' },
    { name: '59-login', route: '/pages/login/index' },
  ];
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[${ts()}] 连接 ${WS_ENDPOINT} ...`);
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  console.log(`[${ts()}] 已连接`);

  miniProgram.on('console', (msg) => {
    if (msg.type !== 'error') return;
    const text = (msg.args || []).map((a) => {
      if (typeof a === 'string') return a;
      if (a && a.value !== undefined) return String(a.value);
      if (a && a.description) return a.description;
      return JSON.stringify(a);
    }).join(' ').slice(0, 400);
    errors.push({ time: ts(), type: 'console', text });
  });
  miniProgram.on('exceptionOccurred', (err) => {
    errors.push({ time: ts(), type: 'exception', text: (err && err.message ? err.message : String(err)).slice(0, 400) });
  });

  await new Promise((r) => setTimeout(r, 4000));

  const ctx = await preFetch();
  console.log(`[${ts()}] 预取完成: conversationId=${ctx.conversationId || '-'} campusTopicId=${ctx.campusTopicId || '-'} circleTopicId=${ctx.circleTopicId || '-'} postId=${ctx.postId || '-'} activityId=${ctx.activityId || '-'}`);

  const results = [];
  const pages = buildPages(ctx);
  for (const p of pages) {
    const before = errors.length;
    try {
      await miniProgram.reLaunch(p.route);
      await new Promise((r) => setTimeout(r, WAIT_MS));
      const shotPath = path.join(OUT_DIR, `${p.name}.png`);
      try {
        await miniProgram.screenshot({ path: shotPath });
        const size = fs.statSync(shotPath).size;
        console.log(`[${ts()}] [OK] ${p.name} ${p.route} (${size}B, 新错误 ${errors.length - before})`);
        results.push({ name: p.name, route: p.route, ok: true, newErrors: errors.length - before });
      } catch (e) {
        console.log(`[${ts()}] [SHOT-FAIL] ${p.name}: ${e.message}`);
        results.push({ name: p.name, route: p.route, ok: false, error: `screenshot: ${e.message}` });
      }
    } catch (e) {
      console.log(`[${ts()}] [FAIL] ${p.name} ${p.route}: ${e.message}`);
      results.push({ name: p.name, route: p.route, ok: false, error: e.message });
    }
  }

  console.log(`\n===== 结果汇总 =====`);
  for (const r of results) {
    console.log(`[${r.ok ? 'OK' : 'FAIL'}] ${r.name} 新增错误: ${r.newErrors ?? '-'}${r.error ? ' | ' + r.error : ''}`);
  }
  console.log(`\n===== 全部错误（${errors.length}） =====`);
  for (const e of errors.slice(0, 40)) {
    console.log(`  ${e.time} [${e.type}] ${e.text}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify({ errors }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify({ results, ts: ts() }, null, 2), 'utf-8');
  console.log(`\n结果已保存: ${OUT_DIR}`);

  await miniProgram.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
