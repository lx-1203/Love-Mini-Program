/* eslint-disable no-console */
/**
 * 匹配 Tab 双层结构验收轮截图（2026-08-08 v4，discover 专项）。
 *
 * 与 mp-shoot-walkthrough.cjs 的关系：复制其成熟链路（automator 0.12.1 + callWxMethod
 * reLaunch + screenshot + 冻结检测 recover + 运行时登录换 token），仅改：
 *   - OUT_DIR → 截图存档/2026-08-08-5/client（round2 为 client-acct8）
 *   - 页清单 → discover 专项（含 [AUTOSHOT] query 钩子驱动详情弹层/签到/筛选弹窗打开，
 *     automator 0.12.1 的 element.tap 不可用，页面内交互必须靠 ?shot= 钩子）
 *
 * 运行（须 Node 22，全局 fetch）：
 *   node scripts/mp-shoot-discover.cjs --round=1   # 主账号 47 全量
 *   node scripts/mp-shoot-discover.cjs --round=2   # 副账号 8 双账号页
 */
const automator = require('C:/Users/dsghy/.trae-cn/work/6a633c3af5ee6dc3c02e0619/node_modules/miniprogram-automator');
const fs = require('fs');
const path = require('path');

const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const API_BASE = 'http://127.0.0.1:8080/api/v1';
const BASE_OUT = 'D:\\6\\恋爱小程序\\截图存档\\2026-08-08-5';
const WAIT_MS = 9000;

const round = process.argv.includes('--round=2') ? 2 : 1;
const OUT_DIR = round === 2 ? path.join(BASE_OUT, 'client-acct8') : path.join(BASE_OUT, 'client');

/* ========== discover 专项页清单 ========== */
const PAGES_ROUND1 = [
  // 骨架屏抢拍（best-effort：reLaunch 后 800ms 截，可能已渲染完成）
  { name: 'd00-skeleton', route: '/pages/discover/index', wait: 800 },
  // 匹配主页：三行顶栏 + 卡片区（身份区/蒙层4行/兴趣胶囊）+ 底部三键权重
  { name: 'd01-discover', route: '/pages/discover/index' },
  // 详情弹层（AUTOSHOT）：hero + 快速资料卡（验证年龄已移除、职业补位）
  { name: 'd02-detail-top', route: '/pages/discover/index?shot=detail&anchor=panel-quick' },
  // 详情弹层（AUTOSHOT）：关于我 2x4 网格
  { name: 'd03-detail-basic', route: '/pages/discover/index?shot=detail&anchor=panel-basic' },
  // 详情弹层（AUTOSHOT）：兴趣圈横滑行 + 单色卡片
  { name: 'd04-detail-circles', route: '/pages/discover/index?shot=detail&anchor=panel-circles' },
  // 详情弹层（AUTOSHOT）：动态（贴吧式）+ 查看全部入口
  { name: 'd05-detail-moments', route: '/pages/discover/index?shot=detail&anchor=panel-moments' },
  // 详情弹层（AUTOSHOT）：期待画像 + IP 属地
  { name: 'd06-detail-expected', route: '/pages/discover/index?shot=detail&anchor=panel-expected' },
  // 签到弹窗（AUTOSHOT）
  { name: 'd07-checkin', route: '/pages/discover/index?shot=checkin' },
  // 快捷筛选弹窗（AUTOSHOT）
  { name: 'd08-filter', route: '/pages/discover/index?shot=filter' },
  // 浏览历史
  { name: 'd09-history', route: '/pages/discover/history' },
  // 关键链路：喜欢的流转 / 消息（双向匹配自动会话）/ 我的
  { name: 'd10-likes', route: '/pages/likes/index' },
  { name: 'd11-messages', route: '/pages/messages/index' },
  { name: 'd12-profile', route: '/pages/profile/index' },
];

/** 副账号 8：双账号视角 discover 页 */
const PAGES_ROUND2 = [
  { name: 'b1-discover', route: '/pages/discover/index' },
  { name: 'b2-detail-top', route: '/pages/discover/index?shot=detail&anchor=panel-quick' },
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

// automator 0.12.1 与新版 IDE 协议偶发帧解析崩溃（ws Receiver），兜底捕获避免进程直接退出
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

  // 运行时注入真实 token
  try {
    const token = await fetchToken();
    await miniProgram.callWxMethod('setStorage', { key: 'token', data: token });
    await miniProgram.callWxMethod('setStorage', { key: 'refreshToken', data: '' });
    console.log(`[${ts()}] token injected (round=${round}, len=${token.length})`);
  } catch (e) {
    console.log(`[${ts()}] token inject FAIL:`, e.message);
    process.exitCode = 1;
  }

  /** 冻结检测：模拟器渲染层卡死时，连续两页截图字节完全一致 */
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
      await new Promise((r) => setTimeout(r, p.wait || WAIT_MS));
      const shotPath = path.join(OUT_DIR, `${p.name}.png`);
      await miniProgram.screenshot({ path: shotPath });
      const size = fs.statSync(shotPath).size;
      // 冻结检测：与上一页截图字节一致 → 触发一次自动恢复后重试本页
      if (size === lastShotSize && lastShotSize > 0) {
        console.log(`[WARN] ${p.name} frozen frame detected (${size}B), recovering...`);
        await recover();
        await miniProgram.callWxMethod('reLaunch', { url: p.route });
        await new Promise((r) => setTimeout(r, p.wait || WAIT_MS));
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
}

main().catch((e) => {
  console.error(`[FATAL] ${e.message}`);
  process.exit(1);
});
