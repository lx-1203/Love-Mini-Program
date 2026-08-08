/* eslint-disable no-console */
/**
 * 小程序端全链路走查截图（2026-08-08 v3，体验账号走查交付）。
 *
 * 与 mp-shoot-full.cjs 的区别：
 * - JWT 不再硬编码：启动后运行时 POST /auth/guest-login（主账号 47）或
 *   POST /auth/phone-login（副账号 8）取真实 token 注入 setStorage；
 * - 页清单对齐「体验账号全链路走查手册-2026-08-08.md」12 站；
 * - 两轮运行：--round=1 主账号全量 12 站；--round=2 副账号双账号页；
 * - OUT_DIR 按轮次区分（截图存档/2026-08-08-3/client 与 client-acct8）。
 *
 * 关键经验（承自 mp-shoot-full.cjs）：
 * - automator 0.12.1 的 reLaunch/currentPage 会崩 inspectee，
 *   必须用 miniProgram.callWxMethod('reLaunch', {url}) + screenshot() 绕过；
 * - 前提：dist/build/mp-weixin 完整（app.json 存在）、微信开发者工具调试端口 9420 开启。
 *
 * 运行：
 *   node scripts/mp-shoot-walkthrough.cjs --round=1   # 主账号 47 全量
 *   node scripts/mp-shoot-walkthrough.cjs --round=2   # 副账号 8 双账号页
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

// 2026-08-08：自动化服务端口由启动命令决定 ——
// cli.bat auto --project <root> --auto-port 9420 --trust-project
const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const BASE_OUT = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-08-3';
const WAIT_MS = 9000;

const round = process.argv.includes('--round=2') ? 2 : 1;
const OUT_DIR = round === 2 ? path.join(BASE_OUT, 'client-acct8') : path.join(BASE_OUT, 'client');

/* ========== 12 站页清单（与走查手册一一对应） ========== */
const PAGES_ROUND1 = [
  // 站 1：登录与首页
  { name: '01-login', route: '/pages/login/index' },
  { name: '02-home', route: '/pages/home/index' },
  // 站 2：匹配推荐流（重构后：顶部三行 + 卡片区主导）
  { name: '03-discover', route: '/pages/discover/index' },
  { name: '04-discover-history', route: '/pages/discover/history' },
  // 站 3：喜欢 / 访客 / 心动信号
  { name: '05-likes', route: '/pages/likes/index' },
  { name: '06-likes-visitors', route: '/pages/likes-visitors/index' },
  { name: '07-heart-signals', route: '/pages/heart-signals/index' },
  // 站 4：聊天
  { name: '08-messages', route: '/pages/messages/index' },
  { name: '09-chat-session', route: '/pages/chat-session/index?sessionId=1' },
  { name: '10-official-chat', route: '/pages/official-chat/index' },
  // 站 5：钱包与红包
  { name: '11-wallet', route: '/pages/wallet/index' },
  { name: '12-vip-red-packet', route: '/pages/vip/red-packet' },
  { name: '13-chat-red-packet', route: '/pages/chat/red-packet' },
  // 站 6：视频通话（状态机展示）
  { name: '14-chat-video-call', route: '/pages/chat/video-call' },
  // 站 7：帖子与圈子（含每日一问入口）
  { name: '15-village', route: '/pages/village/index' },
  { name: '16-village-post', route: '/pages/village/post' },
  { name: '17-village-detail', route: '/pages/village/detail?id=352' },
  { name: '18-village-tag-posts', route: '/pages/village/tag-posts?tagName=%E7%94%9F%E6%B4%BB%E8%AE%B0%E5%BD%95' },
  { name: '19-circles', route: '/pages/circles/index' },
  { name: '20-circles-topics', route: '/pages/circles/topics?circleId=1' },
  { name: '21-circles-topic-detail', route: '/pages/circles/topic-detail?topicId=1' },
  // 站 8：校园
  { name: '22-campus', route: '/pages/campus/index' },
  { name: '23-campus-certification', route: '/pages/campus/certification' },
  { name: '24-campus-topic-detail', route: '/pages/campus/topic-detail?topicId=1' },
  // 站 9：活动
  { name: '25-activities-detail', route: '/pages/activities/detail?id=1' },
  // 站 10：成长（签到弹窗页内验证；每日一问页）
  { name: '26-daily-question', route: '/pages/daily-question/index' },
  { name: '27-profile-tasks', route: '/pages/profile/tasks' },
  // 站 11：VIP（展示态）
  { name: '28-vip', route: '/pages/vip/index' },
  { name: '29-vip-promo-code', route: '/pages/vip/promo-code' },
  { name: '30-vip-bills', route: '/pages/vip/bills' },
  // 站 12：我的 / 资料 / 恋爱中心 / 商城
  { name: '31-profile', route: '/pages/profile/index' },
  { name: '32-profile-album', route: '/pages/profile/album' },
  { name: '33-profile-privacy', route: '/pages/profile/privacy' },
  { name: '34-love-center', route: '/pages/love-center/index' },
  { name: '35-love-center-nearby', route: '/pages/love-center/nearby' },
  { name: '36-love-center-mbti', route: '/pages/love-center/mbti' },
  { name: '37-love-center-consulting', route: '/pages/love-center/consulting' },
  { name: '38-shop', route: '/pages/shop/index' },
  { name: '39-help', route: '/pages/help/index' },
  { name: '40-feedback-history', route: '/pages/feedback/history' },
  { name: '41-settings', route: '/pages/settings/index' },
  { name: '42-settings-dnd', route: '/pages/settings/dnd' },
];

/** 副账号 8：双账号协作页（双向聊天/红包/视频通话/临时会话相关） */
const PAGES_ROUND2 = [
  { name: 'b1-messages', route: '/pages/messages/index' },
  { name: 'b2-chat-session', route: '/pages/chat-session/index?sessionId=1' },
  { name: 'b3-official-chat', route: '/pages/official-chat/index' },
  { name: 'b4-chat-red-packet', route: '/pages/chat/red-packet' },
  { name: 'b5-chat-video-call', route: '/pages/chat/video-call' },
  { name: 'b6-vip-red-packet', route: '/pages/vip/red-packet' },
  { name: 'b7-discover', route: '/pages/discover/index' },
  { name: 'b8-likes', route: '/pages/likes/index' },
  { name: 'b9-profile', route: '/pages/profile/index' },
];

const PAGES = round === 2 ? PAGES_ROUND2 : PAGES_ROUND1;

const errors = [];
const results = [];

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

/** 运行时登录换取真实 token（主 47 guest-login / 副 8 phone-login） */
async function fetchToken() {
  let body;
  if (round === 2) {
    body = JSON.stringify({ phone: '13800000002', password: 'Walkthrough@123' });
  } else {
    body = '{}';
  }
  const url = round === 2 ? `${API_BASE}/auth/phone-login` : `${API_BASE}/auth/guest-login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    throw new Error(`login ${url} -> HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const token = data.token || (data.data && data.data.token);
  if (!token) {
    throw new Error(`login ${url} -> no token in response: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return token;
}

// 2026-08-08：automator 0.12.1 与新版 IDE 协议偶发帧解析崩溃（ws Receiver），
// 兜底捕获避免进程直接退出——后续调用由逐页 try/catch + recover() 恢复
process.on('uncaughtException', (err) => {
  console.log(`[${ts()}] [uncaught] ${err && err.message ? err.message : String(err)}`);
});
process.on('unhandledRejection', (err) => {
  console.log(`[${ts()}] [unhandled] ${err && err.message ? err.message : String(err)}`);
});

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[${ts()}] round=${round} connecting ${WS_ENDPOINT} ...`);
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

  // 运行时注入真实 token（绕过过期硬编码 JWT）
  try {
    const token = await fetchToken();
    await miniProgram.callWxMethod('setStorage', { key: 'token', data: token });
    await miniProgram.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
    console.log(`[${ts()}] token injected (round=${round}, len=${token.length})`);
  } catch (e) {
    console.log(`[${ts()}] token inject FAIL:`, e.message);
    process.exitCode = 1;
  }

  /** 冻结检测：模拟器渲染层卡死时，连续两页截图字节完全一致（2026-08-08 实测 7970B 复现） */
  let lastShotSize = -1;

  /** 自动恢复：重连 + 回首页 + 等待，解除渲染层冻结 */
  async function recover() {
    console.log(`[${ts()}] [recover] renderer frozen, reconnecting...`);
    try { await miniProgram.disconnect(); } catch (_e) { /* ignore */ }
    await new Promise((r) => setTimeout(r, 3000));
    miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
    await new Promise((r) => setTimeout(r, 3000));
    try {
      await miniProgram.callWxMethod('reLaunch', { url: '/pages/home/index' });
      await new Promise((r) => setTimeout(r, 6000));
    } catch (_e) { /* ignore */ }
  }

  for (const p of PAGES) {
    const before = errors.length;
    try {
      await miniProgram.callWxMethod('reLaunch', { url: p.route });
      await new Promise((r) => setTimeout(r, WAIT_MS));
      const shotPath = path.join(OUT_DIR, `${p.name}.png`);
      await miniProgram.screenshot({ path: shotPath });
      const size = fs.statSync(shotPath).size;
      // 冻结检测：与上一页截图字节一致 → 触发一次自动恢复后重试本页
      if (size === lastShotSize && lastShotSize > 0) {
        console.log(`[WARN] ${p.name} frozen frame detected (${size}B), recovering...`);
        await recover();
        await miniProgram.callWxMethod('reLaunch', { url: p.route });
        await new Promise((r) => setTimeout(r, WAIT_MS));
        await miniProgram.screenshot({ path: shotPath });
        const retrySize = fs.statSync(shotPath).size;
        console.log(`[${ts()}] ${p.name} retry size=${retrySize}B`);
        lastShotSize = retrySize;
      } else {
        lastShotSize = size;
      }
      const newErr = errors.length - before;
      console.log(`[OK] ${p.name} ${p.route} (${lastShotSize}B, err=${newErr})`);
      results.push({ name: p.name, route: p.route, ok: true, newErrors: newErr });
    } catch (e) {
      console.log(`[FAIL] ${p.name} ${p.route}: ${e.message}`);
      results.push({ name: p.name, route: p.route, ok: false, error: e.message });
      // 失败后尝试恢复，避免后续页全部冻结
      await recover().catch(() => {});
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, '_run-errors.json'), JSON.stringify({ errors, ts: ts() }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(OUT_DIR, '_run-results.json'), JSON.stringify({ results, round, ts: ts() }, null, 2), 'utf-8');
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
