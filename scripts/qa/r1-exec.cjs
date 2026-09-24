/* eslint-disable no-console */
/**
 * R1 逐用例执行器（Manifest 驱动）— scripts/qa/r1-exec.cjs
 *
 * 输入：reports/audit/round-1/ops/*.json（cases[]: id/page/title/tier/pre/action/expected）
 * 连接：miniprogram-automator → ws://127.0.0.1:9420（单写者，持 UI Lock）
 * Suite：S01..S21（见 SUITES，每 Suite ≤6 页），每 Suite 独立连接；
 *        检查点 tmp/qa/checkpoints/exec-R1.json（suite/status/executedCaseIds）
 * 产出：
 *   reports/audit/round-1/interact/exec-results.json（id/page/tier/observed/route/toast/console/evidence/status）
 *   reports/screenshots/round-1-interact/<PAGE>-<caseId>-before|after.png（critical/normal 按 tier）
 *   reports/screenshots/round-1-interact/wxml/<PAGE>-<caseId>-after.wxml（critical）
 *   reports/audit/round-1/interact/console-<suite>.log（全量 console）
 *
 * 证据预算（严格按 tier）：
 *   critical  = before + after 截图 + 路由 + Toast + console（+ wxml dump）
 *   normal    = after 截图 + 路由 + console
 *   navigation= 路由断言 + console（不截图）
 *   noop      = 执行日志（scroll 位置等）+ console（不截图）
 *
 * 身份（real profile，后端 http://127.0.0.1:8080 实时签发）：
 *   A = 100158 曦风  POST /api/v1/auth/phone-login {13800006666, Abc12345}
 *   B = 100159 小新生 POST /api/v1/auth/phone-login {13800007777, NewUser@123}
 *   guest = 100151 阿辰 POST /api/v1/auth/guest-login {}
 *   注入（r11 同款两步）：wx.setStorageSync('token'/'refresh_token') → session store .bootstrap() → 轮询 isLoggedIn
 *
 * 运行：
 *   node scripts/qa/r1-exec.cjs --dry-parse           # 仅解析全部 Manifest，统计解析覆盖
 *   node scripts/qa/r1-exec.cjs --suite S01-auth      # 跑一个 Suite（检查点已完成则跳过）
 *   node scripts/qa/r1-exec.cjs --all                 # 顺序跑全部未完成 Suite
 *   RERUN_CASES=LG04,LG05 node ... --suite S01-auth   # 补跑指定用例
 */
const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execFile } = require('child_process');

const require2 = createRequire(path.join('D:\\codex-tools\\node-v22.17.0-win-x64\\node_modules', 'package.json'));
const automator = require2('miniprogram-automator');

const REPO = 'D:\\6\\恋爱小程序';
const OPS_DIR = path.join(REPO, 'reports', 'audit', 'round-1', 'ops');
const SHOT_DIR = path.join(REPO, 'reports', 'screenshots', 'round-1-interact');
const WXML_DIR = path.join(SHOT_DIR, 'wxml');
const INTERACT_DIR = path.join(REPO, 'reports', 'audit', 'round-1', 'interact');
const RESULTS_FILE = path.join(INTERACT_DIR, 'exec-results.json');
const CKPT_FILE = path.join(REPO, 'tmp', 'qa', 'checkpoints', 'exec-R1.json');
const LOCK_FILE = path.join(REPO, 'tmp', 'qa', 'locks', 'wechat-automation-9420.lock');
const WS_ENDPOINT = 'ws://127.0.0.1:9420';
const GIT_SHA = 'aefd8a72';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const clampStr = (s, n) => String(s === undefined || s === null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/* ================= Suite 划分（按页面域，每 Suite ≤6 页） ================= */
const SUITES = [
  { id: 'S01-auth', manifests: ['PAGES-LOGIN-INDEX', 'PAGES-REGISTER-INDEX', 'PAGES-REGISTER-SUCCESS'] },
  { id: 'S02-home-nearby', manifests: ['PAGES-HOME-INDEX', 'PAGES-NEARBY-INDEX'] },
  { id: 'S03-discover-messages', manifests: ['PAGES-DISCOVER-INDEX', 'PAGES-MESSAGES-INDEX'] },
  { id: 'S04-profile', manifests: ['PAGES-PROFILE-INDEX'] },
  { id: 'S05-village', manifests: ['SUBPACKAGES-VILLAGE-VILLAGE-INDEX', 'SUBPACKAGES-VILLAGE-VILLAGE-PUBLISH', 'SUBPACKAGES-VILLAGE-VILLAGE-POST'] },
  { id: 'S06-circles-campus', manifests: ['SUBPACKAGES-CIRCLES-CIRCLES-INDEX', 'SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC', 'SUBPACKAGES-CAMPUS-CAMPUS-HUB'] },
  { id: 'S07-campus-matching', manifests: ['SUBPACKAGES-CAMPUS-CAMPUS-INDEX', 'SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC', 'SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING'] },
  { id: 'S08-match-chat', manifests: ['SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCH-SUCCESS', 'SUBPACKAGES-CHAT-CHAT-SESSION-INDEX', 'SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX'] },
  { id: 'S09-c20a', manifests: ['次要20'], pages: ['subpackages/village/village/detail', 'subpackages/village/village/tag-posts', 'subpackages/village/village/history', 'subpackages/circles/circles/topics'] },
  { id: 'S10-c20b', manifests: ['次要20'], pages: ['subpackages/circles/circles/topic-detail', 'subpackages/circles/circles/circle-home', 'subpackages/campus/campus/topic-detail', 'subpackages/campus/campus/certification'] },
  { id: 'S11-c21a', manifests: ['次要21'], pages: ['subpackages/discover-extra/home/segment', 'subpackages/discover-extra/nearby/people', 'subpackages/discover-extra/discover/history', 'subpackages/discover-extra/likes/index'] },
  { id: 'S12-c21b', manifests: ['次要21'], pages: ['subpackages/discover-extra/likes-visitors/index', 'subpackages/tools/daily-question/index', 'subpackages/tools/love-center/index', 'subpackages/tools/help/index'] },
  { id: 'S13-c22a', manifests: ['次要22'], pages: ['subpackages/tools/security/index', 'subpackages/tools/search/index', 'subpackages/tools/heart-signals/index', 'subpackages/tools/activities/detail'] },
  { id: 'S14-c22b', manifests: ['次要22'], pages: ['subpackages/tools/love-center/nearby', 'subpackages/tools/love-center/mbti', 'subpackages/tools/love-center/consulting', 'subpackages/profile-extra/settings/index'] },
  { id: 'S15-c23a', manifests: ['次要23'], pages: ['subpackages/profile-extra/verification/index', 'subpackages/profile-extra/verification/real-name', 'subpackages/profile-extra/profile/visitors', 'subpackages/profile-extra/profile/other'] },
  { id: 'S16-c23b', manifests: ['次要23'], pages: ['subpackages/profile-extra/profile/location', 'subpackages/profile-extra/profile/privacy', 'subpackages/profile-extra/profile/album', 'subpackages/profile-extra/profile/favorites'] },
  { id: 'S17-c24a', manifests: ['次要24'], pages: ['subpackages/profile-extra/profile/tasks', 'subpackages/profile-extra/settings/dnd', 'subpackages/profile-extra/feedback/history', 'subpackages/setup/profile/index'] },
  { id: 'S18-c24b', manifests: ['次要24'], pages: ['subpackages/setup/campus/index', 'subpackages/setup/schedule/index', 'subpackages/setup/recommend-pref/index', 'subpackages/setup/interest/index'] },
  { id: 'S19-c25a', manifests: ['次要25'], pages: ['subpackages/setup/dev/index', 'subpackages/setup/showcase/index', 'subpackages/support/feedback/index', 'subpackages/discover/discussions/index'] },
  { id: 'S20-c25b', manifests: ['次要25'], pages: ['subpackages/discover/activities/index', 'subpackages/legal/privacy/index', 'subpackages/legal/agreement/index', 'subpackages/market/detail/index'] },
  { id: 'S21-c26', manifests: ['次要26'], pages: ['subpackages/market/shop/index', 'subpackages/market/wallet/index', 'subpackages/vip/index', 'subpackages/vip/promo-code', 'subpackages/vip/bills'] },
];

/* ================= 用例级操作覆写（解析器覆盖不到的复杂动作，证据驱动补录） ================= */
const OVERRIDES = {};

/* ================= Manifest 加载 ================= */
const MANIFESTS = {}; // key -> {cases:[], byId:{}}
for (const s of SUITES) for (const mf of s.manifests) {
  if (MANIFESTS[mf]) continue;
  const raw = JSON.parse(fs.readFileSync(path.join(OPS_DIR, mf + '.json'), 'utf8'));
  MANIFESTS[mf] = { cases: raw.cases || [], byId: {} };
  for (const c of MANIFESTS[mf].cases) MANIFESTS[mf].byId[c.id] = c;
}
function suiteCases(suite) {
  const out = [];
  for (const mf of suite.manifests) {
    for (const c of MANIFESTS[mf].cases) {
      if (suite.pages && !suite.pages.includes(c.page)) continue;
      out.push({ mf, c });
    }
  }
  return out;
}

/* ================= Lock ================= */
let lockTimer = null;
function readLock() { try { return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8')); } catch (e) { return null; } }
function writeLock(patch) {
  const l = Object.assign({}, readLock() || {}, patch, { lastHeartbeat: now() });
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify(l, null, 1));
  return l;
}
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}
function acquireLock() {
  const l = readLock();
  const t = Date.now();
  if (l && l.status === 'LEASED' && l.leaseUntil && new Date(l.leaseUntil).getTime() + 30000 > t) {
    if (l.owner === 'r1-exec-subagent-R1' && l.pid === process.pid) { writeLock({ leaseUntil: new Date(t + 15 * 60 * 1000).toISOString() }); return true; }
    // 本执行器先前进程遗留的锁：owner 相同且旧 pid 已死 → 接管
    if (l.owner === 'r1-exec-subagent-R1' && l.pid && !pidAlive(l.pid)) {
      console.log('[lock] taking over stale own lock from dead pid', l.pid);
      writeLock({ pid: process.pid, leaseUntil: new Date(t + 15 * 60 * 1000).toISOString(), attempt: (l.attempt || 0) + 1, takenOverAt: now() });
      return true;
    }
    console.error('[lock] BUS by', JSON.stringify(l));
    return false;
  }
  writeLock({ resource: 'wechat-automation-9420', owner: 'r1-exec-subagent-R1', pid: process.pid, batch: 'R1', status: 'LEASED', leaseUntil: new Date(t + 15 * 60 * 1000).toISOString(), attempt: ((l && l.attempt) || 0) + 1, acquiredAt: now() });
  console.log('[lock] acquired');
  return true;
}
function startHeartbeat() {
  if (lockTimer) return;
  lockTimer = setInterval(() => { try { const l = readLock(); if (l && l.owner === 'r1-exec-subagent-R1') writeLock({ leaseUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString() }); } catch (e) { /* ignore */ } }, 4000);
  if (lockTimer.unref) lockTimer.unref();
}
function releaseLock() {
  if (lockTimer) { clearInterval(lockTimer); lockTimer = null; }
  const l = readLock();
  if (l && l.owner === 'r1-exec-subagent-R1') {
    writeLock({ status: 'released', releasedAt: now() });
    try { fs.unlinkSync(LOCK_FILE); } catch (e) { /* ignore */ }
    console.log('[lock] released & removed');
  }
}

/* ================= Checkpoint / Results ================= */
function loadCkpt() {
  try { return JSON.parse(fs.readFileSync(CKPT_FILE, 'utf8')); } catch (e) {
    return { round: 'R1', gitSha: GIT_SHA, script: 'scripts/qa/r1-exec.cjs', startedAt: now(), suites: {}, failures: [] };
  }
}
function saveCkpt(c) { fs.mkdirSync(path.dirname(CKPT_FILE), { recursive: true }); c.updatedAt = now(); fs.writeFileSync(CKPT_FILE, JSON.stringify(c, null, 1)); }
let RESULTS = { round: 'R1', gitSha: GIT_SHA, updatedAt: now(), results: [] };
try { const prev = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); if (prev && Array.isArray(prev.results)) RESULTS = prev; } catch (e) { /* fresh */ }
function saveResults() { RESULTS.updatedAt = now(); fs.mkdirSync(INTERACT_DIR, { recursive: true }); fs.writeFileSync(RESULTS_FILE, JSON.stringify(RESULTS, null, 1)); }
function upsertResult(r) {
  const i = RESULTS.results.findIndex((x) => x.suite === r.suite && x.manifest === r.manifest && x.id === r.id);
  if (i >= 0) RESULTS.results[i] = r; else RESULTS.results.push(r);
  saveResults();
}

/* ================= 后端身份 ================= */
function apiPost(jsonPath, payload) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload || {}), 'utf8');
    const req = http.request({ host: '127.0.0.1', port: 8080, path: jsonPath, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }, timeout: 15000 },
      (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('api timeout')));
    req.write(body); req.end();
  });
}
const IDENT_DEFS = {
  A: { userId: '100158', nick: '曦风', body: { phone: '13800006666', password: 'Abc12345', deviceId: 'r1-exec-a' }, ep: '/api/v1/auth/phone-login' },
  B: { userId: '100159', nick: '小新生', body: { phone: '13800007777', password: 'NewUser@123', deviceId: 'r1-exec-b' }, ep: '/api/v1/auth/phone-login' },
  guest: { userId: '100151', nick: '阿辰', body: {}, ep: '/api/v1/auth/guest-login' },
};
const tokenCache = {}; // kind -> {token, refreshToken, userId, expMs}
async function mintToken(kind) {
  const cached = tokenCache[kind];
  if (cached && cached.expMs - Date.now() > 10 * 60 * 1000) return cached;
  const def = IDENT_DEFS[kind];
  const r = await apiPost(def.ep, def.body);
  if (r.status !== 200) throw new Error('mint ' + kind + ' http ' + r.status + ' ' + r.body.slice(0, 100));
  const j = JSON.parse(r.body);
  let expMs = Date.now() + 60 * 60 * 1000;
  try { const p = JSON.parse(Buffer.from(j.token.split('.')[1], 'base64').toString('utf8')); if (p.exp) expMs = p.exp * 1000; } catch (e) { /* ignore */ }
  tokenCache[kind] = { token: j.token, refreshToken: j.refreshToken || '', userId: j.userId, expMs };
  return tokenCache[kind];
}

/* ================= 连接管理 ================= */
let mp = null;
let connected = false;
let consoleBuf = [];
let consoleFile = null;
function consoleMark() { return consoleBuf.length; }
function consoleDrain(mark) { return consoleBuf.slice(mark); }
function attachListeners(m) {
  m.on('console', (msg) => {
    try {
      const args = (msg.args || []).map((a) => (a && a.value !== undefined) ? a.value : JSON.stringify(a));
      consoleBuf.push(`[${now()}][${msg.type}] ${clampStr(args.join(' '), 500)}`);
      if (consoleBuf.length > 4000) consoleBuf.splice(0, 1000);
    } catch (e) { /* ignore */ }
  });
  m.on('exception', (err) => {
    consoleBuf.push(`[${now()}][EXCEPTION] ${clampStr(err && err.message ? err.message : err, 500)}`);
  });
}
async function connectChannel() {
  for (let a = 1; a <= 3; a++) {
    try {
      mp = await automator.connect({ wsEndpoint: WS_ENDPOINT });
      connected = true;
      attachListeners(mp);
      console.log('[chan] connected to', WS_ENDPOINT);
      await installToastHook();
      return;
    } catch (e) {
      console.log(`[chan] connect attempt ${a} fail: ${e.message}`);
      await sleep(8000);
    }
  }
  throw new Error('channel connect failed after 3 attempts');
}
// ---- 模拟器刷新（r11 反卡死同款：通道僵死时调用）----
function refreshSimulator() {
  return new Promise((resolve) => {
    execFile(CLI_CMD, ['-c', 'ZCode', 'simulator_refresh', '--project', CLI_PROJECT], { timeout: 90000, windows: true }, (err) => {
      console.log('[recovery] simulator_refresh ' + (err ? 'ERR ' + clampStr(err.message, 60) : 'ok'));
      resolve();
    });
  });
}
async function ensureConnected() {
  if (connected && mp) {
    try { await withTimeout(mp.evaluate(function () { return String(getCurrentPages().length); }), 8000); return; } catch (e) { connected = false; }
  }
  try { if (mp) await mp.disconnect(); } catch (e) { /* ignore */ }
  try {
    await connectChannel();
  } catch (e) {
    // 通道僵死：刷新模拟器后重连
    console.log('[recovery] connect failed after wedge; refreshing simulator');
    await refreshSimulator();
    await sleep(12000);
    connected = false;
    await connectChannel();
  }
}
const isChannelErr = (m) => /connect|channel|closed|ECONN|socket|disconnect|timeout|timed out/i.test(String(m));

function withTimeout(p, ms, tag) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('watchdog-timeout ' + (tag || '') + ' ' + ms + 'ms')), ms))]);
}

/* ================= App 内执行（evaluate 直接传函数+参数；app 上下文无 eval，2026-09-23 实测） ================= */
async function runInApp(fn, ...args) {
  const res = await withTimeout(mp.evaluate(fn, ...args), 20000, 'eval');
  if (typeof res === 'string') {
    try { return JSON.parse(res); } catch (e) { return { __plain: res }; }
  }
  return res === undefined ? { __plain: 'undefined' } : res;
}
async function installToastHook() {
  const r = await runInApp(function () {
    try {
      if (globalThis.__qaHooked) return 'already';
      globalThis.__qaToasts = [];
      const wrap = (name) => {
        try {
          const orig = wx[name] ? wx[name].bind(wx) : null;
          if (!orig) return;
          wx[name] = function (o) {
            try { globalThis.__qaToasts.push({ api: name, title: o && o.title, ts: Date.now() }); } catch (e) { /* ignore */ }
            return orig.apply(wx, arguments);
          };
        } catch (e) { /* ignore */ }
      };
      wrap('showToast'); wrap('hideToast'); wrap('showModal'); wrap('showLoading');
      globalThis.__qaHooked = true;
      return 'installed';
    } catch (e) { return 'ERR ' + e.message; }
  }, 'hook').catch((e) => ({ __err: e.message }));
  return r;
}
async function drainToasts() {
  try {
    const r = await runInApp(function () { return JSON.stringify((globalThis.__qaToasts || []).splice(0)); }, 'drain');
    return Array.isArray(r) ? r : [];
  } catch (e) { return []; }
}
async function getRouteChain() {
  try {
    const r = await runInApp(function () {
      return JSON.stringify(getCurrentPages().map((p) => ({ route: p.route, options: p.options || {} })));
    }, 'route');
    if (r && r.__err) return { __err: r.__err };
    return r;
  } catch (e) { return { __err: e.message }; }
}
async function topRoute() {
  const chain = await getRouteChain();
  if (Array.isArray(chain) && chain.length) return chain[chain.length - 1].route;
  return null;
}

/* ================= 登录/登出（r11 两步注入同款） ================= */
let currentIdent = null; // 'A' | 'B' | 'guest' | null(logged out)
async function injectLogin(kind) {
  const t = await mintToken(kind);
  const def = IDENT_DEFS[kind];
  const boot = await runInApp(function (token, refreshToken) {
    try {
      wx.setStorageSync('token', token);
      wx.setStorageSync('refresh_token', refreshToken || '');
      var app = getApp(); var vm = app.$vm;
      var s = (vm.$pinia && vm.$pinia._s) ? vm.$pinia._s.get('session') : null;
      if (!s) return { __err: 'no-session-store' };
      var r = s.bootstrap();
      return { started: true, async: !!(r && r.then) };
    } catch (e) { return { __err: String(e && e.message) }; }
  }, t.token, t.refreshToken || '');
  if (boot.__err) return { ok: false, err: boot.__err };
  // 轮询 isLoggedIn ≤8s
  for (let i = 0; i < 16; i++) {
    await sleep(500);
    const st = await runInApp(function () {
      try {
        var s = getApp().$vm.$pinia._s.get('session');
        return JSON.stringify({ loggedIn: !!s.isLoggedIn, userId: s.userSession && s.userSession.userId, loading: !!s.loading });
      } catch (e) { return JSON.stringify({ __err: String(e && e.message) }); }
    }, 'loginPoll');
    if (st.__err) return { ok: false, err: st.__err };
    if (st.loggedIn) {
      const match = String(st.userId) === def.userId;
      currentIdent = kind;
      return { ok: true, userId: String(st.userId), expected: def.userId, match, polls: i + 1 };
    }
  }
  return { ok: false, err: 'isLoggedIn not true after 8s' };
}
async function logoutInApp() {
  const r = await runInApp(function () {
    try {
      wx.removeStorageSync('token'); wx.removeStorageSync('refresh_token');
      var s = getApp().$vm.$pinia._s.get('session');
      if (s) { s.$patch({ userSession: null, loading: false }); }
      return { ok: true, loggedIn: s ? !!s.isLoggedIn : null };
    } catch (e) { return { __err: String(e && e.message) }; }
  });
  currentIdent = null;
  return r;
}
async function ensureLogin(kind) {
  const st = await runInApp(function () {
    try {
      var s = getApp().$vm.$pinia._s.get('session');
      return JSON.stringify({ loggedIn: !!s.isLoggedIn, userId: s.userSession && s.userSession.userId });
    } catch (e) { return JSON.stringify({ __err: String(e && e.message) }); }
  }, 'whoami');
  if (!st.__err && st.loggedIn && String(st.userId) === IDENT_DEFS[kind].userId) { currentIdent = kind; return { ok: true, already: true }; }
  const r = await injectLogin(kind);
  return r;
}

/* ================= 截图（base64 落盘；with-path 模式 SDK 超时，实测 2026-09-23） ================= */
async function screenshot(fileBase) {
  const p = path.join(SHOT_DIR, fileBase + '.png');
  try {
    const b64 = await withTimeout(mp.screenshot(), 45000, 'shot');
    fs.writeFileSync(p, Buffer.from(String(b64), 'base64'));
    return { path: p, bytes: fs.statSync(p).size };
  } catch (e) {
    return { path: p, error: e.message };
  }
}

/* ================= 解析器：pre/action 文本 → op 序列 ================= */
const SEL = /[.#][a-zA-Z][\w-]*(?:\s+[\w-]+)*(?:\s+[.#][a-zA-Z][\w-]*)*/; // 占位（简化：逐 token 提取）
const SEL_TOKEN = /[.#][a-zA-Z][\w-]*(?:::[\w-]+)?(?:\s+[.#][a-zA-Z][\w-]*(?:::[\w-]+)?)*/g;
const NAV_RE = /\b(reLaunch|navigateTo|redirectTo|switchTab)\(\s*['"`](\/[^'"`\s]+)/g;
const BACK_RE = /navigateBack\s*\(\s*(?:\{[^}]*delta\s*:\s*(\d+))?/g;
const STO_RE = /wx\.(setStorageSync|removeStorageSync)\(\s*['"]([^'"]+)['"]\s*(?:,\s*([^)]+?))?\s*\)/g;
const REF_RE = /(?:同|接|承|参照|复用)\s*([A-Z]{2,6}\d{2,3})/;
const ORD = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
const TABS = {
  '发现': '/pages/discover/index', '寻觅': '/pages/discover/index', '首页': '/pages/home/index',
  '消息': '/pages/messages/index', '我的': '/pages/profile/index', '附近': '/pages/nearby/index',
};
let PARAM_MAP = {};
try { PARAM_MAP = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'r11-param-map.json'), 'utf8')); } catch (e) { PARAM_MAP = {}; }
function paramMapUrl(page) {
  // 固化表真实结构是 {main:[route], sub:[route], params:{route:"?k=v"}}；旧写法按数组 find
  // 和顶层 PARAM_MAP[page] 取值，对每个页面都返回 null，深链参数被静默丢弃。
  const norm = String(page || '').replace(/^\//, '');
  const entry = PARAM_MAP && PARAM_MAP.params ? PARAM_MAP.params[norm] : undefined;
  if (typeof entry === 'string' && entry.startsWith('?')) return '/' + norm + entry;
  const legacy = Array.isArray(PARAM_MAP)
    ? PARAM_MAP.find((r) => r.route === '/' + norm || r.route === norm)
    : null;
  return legacy ? legacy.url || legacy.route : null;
}
function parseWaitMs(seg, defMs) {
  const m = seg.match(/([\d.]+)\s*(ms|毫秒|s|秒)/);
  if (!m) return defMs;
  const v = parseFloat(m[1]);
  return /ms|毫秒/.test(m[2]) ? v : v * 1000;
}
/** 剔除代码引用（index.vue:96 / navigation.ts:279 / mp.reLaunch( 等），避免污染选择器候选 */
function stripCodeRefs(s) {
  return String(s)
    .replace(/[\w./-]+\.(?:vue|ts|js|json|png|jpg|jpeg|gif|css|scss|log|md)(?::\d+(?:[-/]\d+)?)?/g, '')
    .replace(/\b[A-Z][A-Z_0-9]*(?:\.[A-Z][A-Z_0-9]*)+\b/g, '')
    .replace(/\B@\w+\.\w+/g, '')
    .replace(/\b\w+\.(?:reLaunch|navigateTo|redirectTo|switchTab|navigateBack|currentPage|pageStack|evaluate|callWxMethod|callMethod|setStorageSync|removeStorageSync|getStorageSync|screenshot)\s*\(/g, '')
    .replace(/\.(?:reLaunch|navigateTo|redirectTo|switchTab|navigateBack|currentPage|pageStack|evaluate|callWxMethod|callMethod)\b/g, '');
}
const SEL_BLACKLIST = new Set(['vue', 'ts', 'js', 'json', 'png', 'jpg', 'css', 'scss', 'log', 'com', 'cn', 'www', 'http', 'value', 'then', 'catch']);
const ROUTE_CONST = {
  REGISTER: '/pages/register/index', LOGIN: '/pages/login/index', DISCOVER: '/pages/discover/index',
  HOME: '/pages/home/index', MESSAGES: '/pages/messages/index', PROFILE: '/pages/profile/index', NEARBY: '/pages/nearby/index',
  AGREEMENT: '/subpackages/legal/agreement/index', PRIVACY: '/subpackages/legal/privacy/index',
};
function cleanSels(seg) {
  const toks = stripCodeRefs(seg).match(SEL_TOKEN) || [];
  return toks.filter((x) => {
    const b = x.slice(1).toLowerCase();
    return b.length >= 3 && !SEL_BLACKLIST.has(b) && !/^\d/.test(b);
  });
}
function firstSel(seg) { const m = cleanSels(seg); return m.length ? m[0] : null; }
function allSels(seg) { return cleanSels(seg); }
function parseText(text, phase) { // phase: 'pre' | 'action'
  const ops = [];
  if (!text) return ops;
  // 预清洗：@tap.stop 之类修饰与 step.action 之类属性引用会污染动词/选择器扫描
  const t = text.replace(/\s+/g, ' ').replace(/\B@\w+\.\w+/g, ' ').replace(/\b[A-Za-z]+\.(?:stop|action|prevent|stopPropagation)\b/g, ' ').replace(/\binput\.v-model=\w+/g, ' ');
  // 引用解析（仅 pre；执行期展开；「承接 X 的栈/链路」附带 X 的动作导航以复现栈深）
  const ref = t.match(REF_RE);
  if (ref) ops.push({ op: 'ref', caseId: ref[1], stack: /栈|链路/.test(t) });
  // 登录/登出意图
  const wantsLogout = /清.{0,10}登录态|removeStorageSync\(\s*['"]token|无\s*token|未登录|退出登录|清空\s*token|清\s*token|清除\s*token|清登录态/.test(t);
  const mA = /身份\s*A|100158/.test(t);
  const mB = /身份\s*B|100159/.test(t);
  const mG = /游客登录|体验登录|guest-login|体验账号|100151/.test(t);
  if (phase === 'pre') {
    if (wantsLogout) ops.push({ op: 'logout' });
    if (mA) ops.push({ op: 'login', ident: 'A' });
    else if (mB) ops.push({ op: 'login', ident: 'B' });
    else if (mG && /(登录|注入)/.test(t)) ops.push({ op: 'login', ident: 'guest' });
  }
  // storage 操作
  let m2;
  const stoRe = new RegExp(STO_RE.source, 'g');
  while ((m2 = stoRe.exec(t))) {
    if (m2[1] === 'removeStorageSync') ops.push({ op: 'storageRemove', key: m2[2] });
    else ops.push({ op: 'storageSet', key: m2[2], value: (m2[3] || '').trim().replace(/^['"]|['"]$/g, '') });
  }
  // 导航（括号形式）
  const navSeen = new Set();
  const pushNav = (op) => { const k = op.type + '|' + (op.url || op.delta || '') + (op.param || ''); if (!navSeen.has(k)) { navSeen.add(k); ops.push(op); } };
  const navRe = new RegExp(NAV_RE.source, 'g');
  while ((m2 = navRe.exec(t))) pushNav({ op: 'nav', type: m2[1], url: m2[2] });
  const backRe = new RegExp(BACK_RE.source, 'g');
  while ((m2 = backRe.exec(t))) pushNav({ op: 'nav', type: 'navigateBack', delta: m2[1] ? parseInt(m2[1]) : 1 });
  // 无括号导航
  const navBare = new RegExp('\\b(reLaunch|navigateTo|redirectTo|switchTab)\\s*(?:至|到|直达|直开|回|落|进入)?\\s*(/(?:pages|subpackages)/[\\w/-]+(?:\\?[\\w=&%:-]*)?)?', 'g');
  const hasExplicitNav = /\b(reLaunch|navigateTo|redirectTo|switchTab)\s*\(\s*['"`]\//.test(text);
  while ((m2 = navBare.exec(t))) {
    if (m2[2]) pushNav({ op: 'nav', type: m2[1], url: m2[2] });
    else if (/带参/.test(t)) pushNav({ op: 'navParam', type: m2[1] });
    else if (!hasExplicitNav && /本页|进入|直达|冷启动|落页|进入页面|待渲染|就绪/.test(t)) pushNav({ op: 'nav', type: m2[1], url: '__CASE_PAGE__' });
  }
  if (/reLoad|重新加载/.test(t) && !navSeen.size) pushNav({ op: 'nav', type: 'reLaunch', url: '__CASE_PAGE__' });
  // 触发返回
  if (!navSeen.has('navigateBack|1') && /navigateBack|左上角返回|返回键|点返回|执行返回|返回上一页|触发返回|立即返回|点 AppShell 返回键/.test(t)) pushNav({ op: 'nav', type: 'navigateBack', delta: 1 });
  // switchTab 中文 / 「Tab 名」
  const quotedTabs = [...t.matchAll(/[「]([^」]{1,4})[」]/g)].map((m) => m[1]).filter((x) => TABS[x]);
  for (const q of quotedTabs) pushNav({ op: 'nav', type: 'switchTab', url: TABS[q] });
  if (quotedTabs.length === 0) {
    for (const [name, url] of Object.entries(TABS)) {
      if (/switchTab|切到|切回|切至|切往|切出/.test(t) && t.includes(name)) { pushNav({ op: 'nav', type: 'switchTab', url }); break; }
    }
  }
  if (/切走再切回|切出再切回|切.{0,2}再切回/.test(t)) ops.push({ op: 'awayBack' });
  // wx.pageScrollTo(N)
  const pst = t.match(/wx\.pageScrollTo\s*\(\s*(\d+)\s*\)/);
  if (pst) ops.push({ op: 'scroll', to: parseInt(pst[1]) === 0 ? 'top' : 'bottom' });
  // 循环进出（带/不带 URL）
  const cyc = t.match(/循环\s*(\d+)\s*次[^。]*?(navigateTo|reLaunch)\(\s*['"]([^'"]+)['"]/);
  if (cyc) ops.push({ op: 'repeatNav', type: cyc[2], url: cyc[3], times: parseInt(cyc[1]) });
  else {
    const cyc2 = t.match(/循环\s*(\d+)\s*次[^。]*?\b(navigateTo|reLaunch)\b/);
    if (cyc2) ops.push({ op: 'repeatNav', type: cyc2[2], url: '__CASE_PAGE__', times: parseInt(cyc2[1]) });
  }
  // 下拉刷新
  if (/下拉刷新|下拉手势|startPullDownRefresh/.test(t)) ops.push({ op: 'pullDown' });
  if (/stopPullDownRefresh/.test(t)) ops.push({ op: 'evalStopRefresh' });
  // 表单视图保障（登录页 快捷视图→表单视图 展开态前置）
  if (/表单已展开|展开表单|showPhoneLogin=true/.test(t)) ops.push({ op: 'ensureSel', need: '.form-btns', via: '.btn-phone-quick' });
  // trigger 形态：$$('sel')[N] .? trigger/input/tap ; page.$('sel') trigger ; sel.trigger
  const idxCall = [...t.matchAll(/\$\$\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\[\s*(\d+)\s*\]\s*\.?\s*(input|trigger|tap|longpress)\s*\(\s*(['"]?)([^)'"]*)\4\s*(?:,\s*(\{[^}]*\}))?\s*\)/g)];
  for (const ic of idxCall) {
    let detail = null;
    if (ic[6]) { try { detail = JSON.parse(ic[6].replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"')); } catch (e) { detail = null; } }
    const map = { input: 'inputIndex', trigger: 'triggerIndex', tap: 'tapIndex', longpress: 'longpress' };
    const base = { op: map[ic[3]], selector: ic[1], index: parseInt(ic[2]) + 1 };
    if (ic[3] === 'input') base.value = ic[5];
    if (ic[3] === 'trigger') { base.event = ic[5] || 'change'; base.detail = detail || { value: '' }; }
    ops.push(base);
  }
  const pTrg = [...t.matchAll(/\$\(\s*['"]([^'"]+)['"]\s*\)\s*\.?\s*trigger\s*\(\s*['"](\w+)['"]\s*(?:,\s*(\{[^)]*\}))?\s*\)/g)];
  // $('sel').tap() 直调形式 / $$('.sel') 按序 tap
  const dotTap = [...t.matchAll(/\$\(\s*['"]([^'"]+)['"]\s*\)\s*\.?\s*tap\s*\(\s*\)/g)];
  for (const dt of dotTap) ops.push({ op: 'tap', selector: dt[1] });
  const seqTap = [...t.matchAll(/\$\$\s*\(\s*['"]([^'"]+)['"]\s*\)[^。]*?按序\s*tap/g)];
  for (const st of seqTap) ops.push({ op: 'seqTap', selector: st[1], times: 3 });
  for (const tg of pTrg) {
    let detail = null;
    if (tg[3]) { try { detail = JSON.parse(tg[3].replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"')); } catch (e) { detail = { value: '' }; } }
    ops.push({ op: 'trigger', selector: tg[1], event: tg[2], detail: detail || { value: '' } });
  }
  const trg = [...t.matchAll(/([.#][\w-]+)\s*\.?\s*trigger\s*\(\s*['"](\w+)['"]\s*(?:,\s*(\{[^)]*\}))?\s*\)/g)];
  for (const tg of trg) {
    let detail = null;
    if (tg[3]) { try { detail = JSON.parse(tg[3].replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"')); } catch (e) { detail = { value: '' }; } }
    ops.push({ op: 'trigger', selector: tg[1], event: tg[2], detail: detail || { value: '' } });
  }
  // 对 sel 触发 evt（confirm 等）
  const confTrg = [...t.matchAll(/对\s*([.#][\w-]+)[^,，;；。]{0,10}?触发\s*(confirm|change|input|blur|error)/g)];
  for (const ct of confTrg) ops.push({ op: 'trigger', selector: ct[1], event: ct[2], detail: { value: '' } });
  // 触发 sel @error（图片加载失败）
  const imgErr = t.match(/触发\s*([.#][\w-]+)\s*@?error/);
  if (imgErr) ops.push({ op: 'trigger', selector: imgErr[1], event: 'error', detail: {} });
  // 快速连点（多形态）
  const rapidPats = [
    /(?:快速连点|快击|连点|连续点击|快速点|连续快速点击|连续快速\s*tap)\s*([.#][\w-]+)[^0-9×]{0,8}×?\s*(\d+)\s*次?/,
    /(?:快击|连点)\s*(\d+)\s*次\s*([.#][\w-]+)/,
    /对\s*(?:第一[张个条]|该|此)?\s*([.#][\w-]+)[^0-9]{0,14}(?:快速\s*)?tap\s*[×x]\s*(\d+)/,
    /对[「]([^」]{1,10})[」][^0-9]{0,10}(?:连续快速点击|快速点击|连点|连续点击)\s*(\d+)\s*次/,
    /对\s*([.#][\w-]+)\s*快速(?:连点|点击|点)\s*(\d+)\s*次/,
    /(?:快击|连击)\s*([\u4e00-\u9fa5]{1,4})?(?:提交)?(?:按钮|钮)?\s*[×x]\s*(\d+)/,
    /([\u4e00-\u9fa5]{1,4})钮\s*\d+\s*ms\s*内连击\s*(\d+)\s*次/,
    /对\s*[\u4e00-\u9fa5]{0,4}\s*([.#][\w-]+)[^0-9]{0,14}快速连续\s*tap\s*[×x]\s*(\d+)/,
    /连续\s*tap\s*(\d+)\s*次/,
  ];
  for (let ri = 0; ri < rapidPats.length; ri++) {
    const rm = t.match(rapidPats[ri]);
    if (!rm) continue;
    let sel = null, times = 0, label = null;
    if (ri === 0) { sel = rm[1]; times = parseInt(rm[2]); }
    else if (ri === 1) { times = parseInt(rm[1]); sel = rm[2]; }
    else if (ri === 2) { sel = rm[1]; times = parseInt(rm[2]); }
    else if (ri === 3) { label = rm[1]; times = parseInt(rm[2]); }
    else if (ri === 4) { sel = rm[1]; times = parseInt(rm[2]); }
    else if (ri === 5) { label = rm[1] || '提交'; times = parseInt(rm[2]); }
    else if (ri === 6) { label = rm[1]; times = parseInt(rm[2]); }
    else if (ri === 7) { sel = rm[1]; times = parseInt(rm[2]); }
    else { times = parseInt(rm[1]); sel = '__CAND__'; }
    if (sel && /^[.#]/.test(sel)) ops.push({ op: 'rapidTap', selector: sel, times });
    else ops.push({ op: 'rapidTap', selector: '__CAND__', times, label });
    break;
  }
  // 再点 label ×N（如 再点喜欢 ×3）
  const rp2 = t.match(/(?:再?点|连续点)\s*([\u4e00-\u9fa5]{1,6})\s*[×x]\s*(\d+)/);
  if (rp2 && !/返回|关闭|取消|删除/.test(rp2[1])) ops.push({ op: 'rapidTap', selector: '__CAND__', label: rp2[1], times: parseInt(rp2[2]) });
  // 连点开关1 ×5 / 快速连点 N 次（无选择器）
  const rp3 = t.match(/连点\s*([\u4e00-\u9fa5\d]{1,8})\s*[×x]\s*(\d+)/);
  if (rp3 && !ops.some((o) => o.op === 'rapidTap')) ops.push({ op: 'rapidTap', selector: '__CAND__', label: /开关|按钮|钮/.test(rp3[1]) || /^\d+$/.test(rp3[1]) ? null : rp3[1], times: parseInt(rp3[2]) });
  const rp4 = t.match(/快速连点(?:提交)?\s*(\d+)\s*次/) || t.match(/快速连点提交\s*(\d+)\s*次/);
  if (rp4 && !ops.some((o) => o.op === 'rapidTap')) ops.push({ op: 'rapidTap', selector: '__CAND__', label: /提交/.test(t) ? '提交' : null, times: parseInt(rp4[1]) });
  // 逐字段清空
  if (/逐字段清空|全删/.test(t)) ops.push({ op: 'input', selector: '__CAND__', value: '' });
  // 重复进出 N 次 / 重复 N 次
  const repN = t.match(/重复进出\s*[×x]?\s*(\d+)?/) || t.match(/重复\s*(\d+)\s*次/) || t.match(/再进入（?间隔/);
  if (repN && !ops.some((o) => o.op === 'repeatNav')) ops.push({ op: 'repeatNav', type: 'navigateTo', url: '__CASE_PAGE__', times: parseInt(repN[1] || '2') });
  // 「进入」单步动作
  if (/^进入$|^进入 →/.test(t.trim()) || t.trim() === '进入') pushNav({ op: 'nav', type: 'reLaunch', url: '__CASE_PAGE__' });
  // 下拉触发 refresherrefresh
  const rref = t.match(/下拉触发\s*([\w-]+)?/);
  if (rref) ops.push({ op: 'refresherPull', handler: rref[1] || 'refresherrefresh' });
  // 清空指定输入框
  const clrSel = t.match(/清空\s*([.#][\w-]+)/);
  if (clrSel) ops.push({ op: 'input', selector: clrSel[1], value: '' });
  // 「X 进入本页 → 返回」循环 ×N / 两次进出本页 / 点…进入本页
  const cycN = t.match(/循环\s*[×x]?\s*(\d+)/);
  if (cycN && /进入本页|返回/.test(t) && !navSeen.size && !t.includes('navigateTo(') && !t.includes('reLaunch(')) ops.push({ op: 'repeatNav', type: 'navigateTo', url: '__CASE_PAGE__', times: parseInt(cycN[1]) });
  if (/两次进出本页|连续两次进出/.test(t)) ops.push({ op: 'repeatNav', type: 'navigateTo', url: '__CASE_PAGE__', times: 2 });
  if (!navSeen.size && /点[^。]{0,14}进入本页/.test(t)) pushNav({ op: 'nav', type: 'reLaunch', url: '__CASE_PAGE__' });
  // 互切
  const tog = t.match(/互切\s*(\d+)\s*次/);
  if (tog) ops.push({ op: 'toggleTap', times: parseInt(tog[1]) });
  // 长按（中英）
  if (/长按/.test(t)) {
    const lp = t.match(/长按\s*([.#][\w-]+)?/);
    ops.push({ op: 'longpress', selector: (lp && lp[1]) || '__CAND__' });
  } else if (/\blongpress\b/i.test(t)) {
    const lp = t.match(/longpress\s*(?:该|此)?\s*([.#][\w-]+)/i);
    ops.push({ op: 'longpress', selector: (lp && lp[1]) || '__CAND__' });
  }
  // 按下不抬起 → touchSeq
  const th = t.match(/([.#][\w-]+)?[^。]{0,12}按下不抬起[^0-9]*(\d+)\s*ms/);
  if (th) ops.push({ op: 'touchHold', selector: th[1] || '__CAND__', ms: parseInt(th[2]) });
  // 粘贴 N 字 / 分三步递增长文
  const paste = t.match(/粘贴\s*(\d+)\s*字/);
  const step3 = t.match(/(?:分三步|依次)[^。]*?(\d{2,4})\s*字[^。]*?(\d{2,4})\s*字[^。]*?(\d{2,4})\s*字/);
  const GEN = (n) => '测'.repeat(Math.max(1, Math.min(n, 800)));
  if (step3) ops.push({ op: 'inputSeq', selector: '__CAND__', values: [GEN(+step3[1]), GEN(+step3[2]), GEN(+step3[3])] });
  else if (paste) ops.push({ op: 'input', selector: '__CAND__', value: GEN(+paste[1]) });
  // 清空输入
  if (/全选删除|清空标题|清空输入|清空后/.test(t)) ops.push({ op: 'input', selector: '__CAND__', value: '' });
  // SEL 填「VAL」多赋值
  const fills = [...t.matchAll(/([.#][\w-]+)\s*填\s*(?:入)?\s*(?:合法内容|合法表单|内容|长文|[「]([^」]{0,80})[」])?/g)];
  for (const fl of fills) {
    const v = fl[2] !== undefined ? fl[2] : (/合法|内容|长文/.test(fl[0]) ? '自动化测试内容-' + Date.now() % 10000 : null);
    if (v === null) continue;
    ops.push({ op: 'input', selector: fl[1], value: v });
  }
  // SEL=VALUE 显式赋值输入（如 #login-phone=13800138000）
  const assigns = [...t.matchAll(/([.#][\w-]{3,40})=([^，。；、\s'"{}\[\]]{1,60})/g)];
  for (const as of assigns) {
    if (as[2] === 'true' || as[2] === 'false') ops.push({ op: 'input', selector: as[1], value: as[2] });
    else ops.push({ op: 'input', selector: as[1], value: as[2] });
  }
  // 输入（含依次多值；排除「无输入/不输入/未输入」否定语境）
  if (/输入|填写|\binput\b/.test(t) && !/无输入|不输入|未输入|无操作/.test(t)) {
    const isel = t.match(/([.#][\w-]+)\s*(?:中|内|里|依次|逐次)?(?:输入|填入|填[^入])/) || t.match(/(?:输入|填写|填)(?:框|到)?\s*([.#][\w-]+)/) || t.match(/\binput\s+([.#][\w-]+)/);
    const quotedVals = [...t.matchAll(/[「]([^」]{0,80})[」]/g)].map((m) => m[1]);
    const callVals = [...t.matchAll(/\binput\s*\(\s*'([^']*)'\s*\)/g)].map((m) => m[1]);
    const seqVals = [];
    if (/依次|逐次|分三次/.test(t)) {
      const parts = t.split(/[→]/);
      for (const p of parts) {
        const v = p.match(/[「'"]([^」'"]*)[」'"]/);
        if (v) seqVals.push(v[1]);
        else if (/空|清空/.test(p)) seqVals.push('');
      }
      for (const cv of callVals) if (!seqVals.includes(cv)) seqVals.push(cv);
    }
    const target = isel ? isel[1] : '__CAND__';
    if (/超长\s*(\d+)\s*[字符字]/.test(t)) {
      const n = parseInt(t.match(/超长\s*(\d+)\s*[字符字]/)[1]);
      seqVals.push(GEN(n));
    }
    if (seqVals.length >= 2) ops.push({ op: 'inputSeq', selector: target, values: seqVals });
    else if (isel || /输入|填写/.test(t)) {
      const v = callVals[0] !== undefined ? callVals[0] : quotedVals[0] !== undefined ? quotedVals[0] : '';
      ops.push({ op: 'input', selector: target, value: v });
    }
  }
  // 滚动
  const toBottom = /滚动到底|滑到底|scroll[^。]*底|滚到底|到底部/.test(t);
  const toTop = /回顶|回到顶部|回顶部|到顶部|滚动到顶/.test(t);
  if (toBottom) ops.push({ op: 'scroll', to: 'bottom' });
  if (toTop) ops.push({ op: 'scroll', to: 'top' });
  const elScroll = t.match(/([.#][\w-]+)\s*(?:scroll-view\s*)?(?:滚|滑)(?:动)?到底/);
  if (elScroll) ops.push({ op: 'scrollElement', selector: elScroll[1], to: 'bottom' });
  // 滑动/手势位移
  const swipeDir = t.match(/(左滑|右滑|上滑|下滑|左移|右移|上移|下移)/);
  if (swipeDir) {
    const dirMap = { '左滑': 'left', '右滑': 'right', '上滑': 'up', '下滑': 'down', '左移': 'left', '右移': 'right', '上移': 'up', '下移': 'down' };
    const at = t.indexOf(swipeDir[1]);
    const ssel = firstSel(t.slice(Math.max(0, at - 40), at + 60));
    ops.push({ op: 'swipe', dir: dirMap[swipeDir[1]], selector: ssel });
  }
  // boundingClientRect 实测热区后 tap
  const mt = t.match(/取\s*([.#][\w-]+)\s*的?\s*boundingClientRect[^。]*?tap/);
  if (mt) ops.push({ op: 'measureTap', selector: mt[1] });
  // tap（最后通用解析）
  const UI_NOUN = /^(确认|确定|取消|关闭|删除|拉黑|举报|知道了|跳过|重试|提交|发布|保存|登录|同意|拒绝|允许|打个招呼|喜欢|谁可以看|提及|清空|创建|移除|回复|分享|收藏|关注|退出)$/;
  const PURE_CN = (s) => /^[\u4e00-\u9fa5＋＃#]{1,10}$/.test(s.replace(/^[＃#]/, ''));
  if (!/探测|观察|进入断言|进入后断言|无输入|无操作|不打点|逐一取|不操作|无点击交互/.test(t) || /\btap\b|点击|点按|轻点/.test(t)) {
    const taken = new Set();
    const vre = /\btap\b|点击|点按|轻点|点\s*第|点\s*[.#]|点「|轻触|点确|点取/g;
    let vm;
    while ((vm = vre.exec(t))) {
      const seg = stripCodeRefs(t.slice(vm.index, vm.index + 110));
      const idx = seg.match(/第\s*([1-9一二三四五六])\s*个|第\s*([1-9一二三四五六])\s*项/);
      const idxN = idx ? (ORD[idx[1]] || parseInt(idx[1] || idx[2])) : null;
      const quoteM = seg.match(/[「]([^」:]{1,12})[」]/);
      const parenM = seg.match(/[（]([^）:；]{2,14})[）]/);
      let label = null;
      if (quoteM && PURE_CN(quoteM[1])) label = quoteM[1].replace(/^[＃#]/, '');
      else if (parenM && UI_NOUN.test(parenM[1].replace(/\s+/g, ''))) label = parenM[1].replace(/\s+/g, '');
      const selM = seg.match(SEL_TOKEN);
      if (selM) {
        const sel = selM[0];
        const key = sel + (idxN ? '#' + idxN : '');
        if (taken.has(key)) continue;
        taken.add(key);
        if (idxN) ops.push({ op: 'tapIndex', selector: sel, index: idxN, label });
        else ops.push({ op: 'tap', selector: sel, label });
      } else if (label) {
        const key = 'LBL:' + label + (idxN ? '#' + idxN : '');
        if (taken.has(key)) continue;
        taken.add(key);
        ops.push({ op: idxN ? 'tapIndex' : 'tap', selector: '__CAND__', label, index: idxN });
      } else {
        // 裸动词：tap + 名词（发布钮/添加话题行/加号格/清空…）
        const nounM = seg.match(/\btap\s+(?:[^。；\n]{0,8})?([\u4e00-\u9fa5]{1,4})(?:钮|按钮|行|卡|格|片|区|入口|选项|图标|链接|大卡|缩略图)/) || seg.match(/\btap\s+(?:header\s+|左侧\s+|右侧\s+|底部\s+|已选区\s+\d+\s*个\s*)?([\u4e00-\u9fa5]{1,4})/);
        const word = nounM ? nounM[1] : null;
        const enComp = seg.match(/\btap\s+([A-Z][\w]{2,20})\b/);
        const prev = [...ops].reverse().find((o) => ['tap', 'tapIndex'].includes(o.op));
        const key = 'BARE:' + vm.index;
        if (taken.has(key)) continue;
        taken.add(key);
        if (word && (UI_NOUN.test(word) || /[钮行卡格区片]/.test((seg.slice(seg.indexOf(word), seg.indexOf(word) + 8))))) {
          ops.push({ op: idxN ? 'tapIndex' : 'tap', selector: '__CAND__', label: word, index: idxN });
        } else if (enComp) {
          ops.push({ op: idxN ? 'tapIndex' : 'tap', selector: '__CAND__', label: null, index: idxN });
        } else if (prev) {
          ops.push({ op: 'tap', selector: prev.selector, label: prev.label });
        }
      }
    }
  }
  // 等待
  const wm = t.match(/等待[^0-9]{0,6}([\d.]+\s*(?:ms|s|秒|毫秒))/);
  if (wm) ops.push({ op: 'wait', ms: parseWaitMs(wm[1], 1000) });
  const zhWait = t.match(/静置\s*([\d.]+)\s*(?:s|秒)/) || t.match(/停留\s*(\d+)\s*s/);
  if (zhWait) ops.push({ op: 'wait', ms: parseFloat(zhWait[1]) * 1000 });
  // 路由常量映射：uni.navigateTo ROUTES.REGISTER / SUBPACKAGE_ROUTES.LEGAL.AGREEMENT
  const constRoute = [...t.matchAll(/(navigateTo|redirectTo|switchTab)\s*[:\s]?\s*(?:uni\.)?(?:SUBPACKAGE_)?ROUTES\.(?:[A-Z_]+\.)*([A-Z_]+)/g)];
  for (const cr of constRoute) {
    const target = ROUTE_CONST[cr[2]];
    if (target) pushNav({ op: 'nav', type: cr[1], url: target });
  }
  if (process.env.DBG_PARSE) console.log('DBG t:', JSON.stringify(t));
  if (process.env.DBG_PARSE) console.log('DBG pre-clean ops:', JSON.stringify(ops));
  // 清洗：__CAND__ tap 且 label 含箭头/拉丁/数字等非 UI 文案特征 → 丢弃（避免把注释/输入值当点击目标）
  const cleaned = ops.filter((op) => {
    if (op.op === 'tap' && op.selector === '__CAND__' && op.label) {
      const norm = op.label.replace(/\s+/g, '');
      return !/[→×/:＝=]/.test(norm) && !/^[a-zA-Z0-9]+$/.test(norm) && norm.length <= 12;
    }
    return true;
  });
  return cleaned;
}

function resolveRef(caseId, mf, depth, stack) {
  if (depth > 3) return [];
  const man = MANIFESTS[mf];
  let target = man.byId[caseId];
  if (!target) { // 全局找唯一
    const hits = [];
    for (const k of Object.keys(MANIFESTS)) if (MANIFESTS[k].byId[caseId]) hits.push(k);
    if (hits.length === 1) target = MANIFESTS[hits[0]].byId[caseId];
  }
  if (!target) return [];
  const base = parseText(target.pre || '', 'pre');
  if (stack) {
    const actNavs = parseText(target.action || '', 'action').filter((o) => ['nav', 'navParam'].includes(o.op));
    return [...base, ...actNavs];
  }
  return base;
}
function expandOps(ops, mf) {
  const out = [];
  for (const op of ops) {
    if (op.op === 'ref') out.push(...expandOps(resolveRef(op.caseId, mf, 1, op.stack), mf));
    else out.push(op);
  }
  return out;
}

/* ================= wechatide CLI（automation_element_action：选择器引擎可穿透自定义组件，SDK page.$ 不可） ================= */
const CLI_CMD = 'D:\\微信开发者\\微信web开发者工具\\wechatide.cmd';
const CLI_PROJECT = 'D:\\6\\恋爱小程序\\apps\\client\\dist\\build\\mp-weixin';
let cliCounter = 0;
function cliJson(raw) {
  const s = raw.indexOf('{');
  const e = raw.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(raw.slice(s, e + 1)); } catch (err) { return null; }
}
function cliRun(args, timeoutMs) {
  return new Promise((resolve) => {
    execFile(CLI_CMD, ['-c', 'ZCode', ...args], { timeout: timeoutMs || 60000, windows: true, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      const raw = String(stdout || '') + String(stderr || '');
      const json = cliJson(raw);
      resolve({ err: err && err.message, raw, json });
    });
  });
}
// 元素动作：CLI 优先（穿透组件），失败返回 {ok:false}
async function cliElement(action, selector, opts) {
  const o = opts || {};
  const args = ['automation_element_action', '--project', CLI_PROJECT, '--action', action, '--selector', selector];
  if (o.waitForSelector) args.push('--wait-for-selector', o.waitForSelector);
  if (o.value !== undefined && o.value !== null && o.value !== '') args.push('--value', String(o.value));
  if (o.type) args.push('--type', o.type);
  if (o.detail) args.push('--detail', JSON.stringify(o.detail));
  if (o.name) args.push('--name', o.name);
  const r = await cliRun(args, o.timeoutMs || 45000);
  const j = r.json;
  const ok = !!(j && (j.success !== false && !j.error)) && !r.err;
  return { ok, json: j, raw: r.raw, err: r.err || (j && (j.error || j.message)) };
}


const lastScroll = { pos: null };
const OBSERVE_MARKERS = /探测|观察|进入断言|进入后断言|无输入|无操作|不打点|等待|采样|复拍|双拍|连续截图|读取|断言|冷启动|不操作|逐元素|确认后观察|落定后|启动后|进入页面后|截全页|首帧|触发返回|navigateBack|滚动|scroll|快照|观察卡片|静置|boundingClient|逐一取|测量|热区|fullPage|evaluate|getCurrentPages|width\/height|收集|network|停留|进入/;
/** 枚举当前页自定义组件（shadow-root 元素）。SDK $ 不穿透组件，但组件元素的子树 $ 可行。
 *  跨用例缓存（按页面 route 键），wxml 探测上限 16 个以控时；force=true 时强制重算。 */
const COMP_CACHE = { key: null, comps: [] };
async function getComponents(page, ctx, force) {
  const key = page.path || (page && page.__path) || 'unknown';
  if (!force && COMP_CACHE.key === key && COMP_CACHE.comps.length) return COMP_CACHE.comps;
  const views = await page.$$('view').catch(() => []);
  let hash = null;
  if (views.length) {
    const w = String(await views[0].wxml().catch(() => ''));
    const m = w.match(/data-v-[0-9a-f]+/);
    hash = m && m[0];
  }
  if (!hash) return [];
  const list = await page.$$('.' + hash).catch(() => []);
  const comps = [];
  for (const c of list.slice(0, 24)) {
    const w = String(await c.wxml().catch(() => ''));
    if (w.startsWith('<#shadow-root>')) {
      comps.push(c);
      if (comps.length >= 16) break;
    }
  }
  COMP_CACHE.key = key;
  COMP_CACHE.comps = comps;
  return comps;
}
/** 深度解析选择器：页面直查 → 逐组件子树查询 */
async function deepResolve(page, selector, ctx) {
  let el = await page.$(selector).catch(() => null);
  if (el) return el;
  if (selector.includes(' ')) {
    el = await page.$(selector.split(/\s+/).pop()).catch(() => null);
    if (el) return el;
  }
  for (const c of await getComponents(page, ctx, false)) {
    const inner = await c.$(selector).catch(() => null);
    if (inner) return inner;
  }
  return null;
}
/** 文本定位：候选类 × 页面/组件 子树，text 含 label 即命中 */
async function deepResolveLabel(page, label, candidates, ctx) {
  for (const sel of candidates) {
    const el = await deepResolve(page, sel, ctx);
    if (el) {
      const t = String(await el.text().catch(() => ''));
      if (t.includes(label)) return el;
    }
  }
  for (const c of await getComponents(page, ctx, false)) {
    const w = String(await c.wxml().catch(() => ''));
    if (!w.includes(label)) continue;
    for (const sel of candidates) {
      const el = await c.$(sel).catch(() => null);
      if (el) {
        const t = String(await el.text().catch(() => ''));
        if (t.includes(label)) return el;
      }
    }
    const inners = await c.$$('view').catch(() => []);
    for (const iv of inners) {
      const t = String(await iv.text().catch(() => ''));
      if (t.includes(label)) return iv;
    }
  }
  return null;
}
async function resolveSelector(page, op, ctx) {
  if (!op.selector || op.selector === '__CAND__') {
    const label = op.label || null;
    const cands = op.candidates && op.candidates.length ? op.candidates : (ctx.candidates || []);
    if (label) return deepResolveLabel(page, label, cands, ctx);
    for (const sel of cands) {
      const el = await deepResolve(page, sel, ctx);
      if (el) return el;
    }
    return null;
  }
  return deepResolve(page, op.selector, ctx);
}
async function applyOp(op, ctx) {
  switch (op.op) {
    case 'login': {
      const r = await ensureLogin(op.ident);
      if (!r.ok) throw new Error('login ' + op.ident + ' fail: ' + (r.err || JSON.stringify(r)));
      return 'login ' + op.ident + ' ok' + (r.already ? '(already)' : ' userId=' + r.userId + (r.match === false ? ' MISMATCH!' : ''));
    }
    case 'logout': {
      const r = await logoutInApp();
      if (r.__err) throw new Error('logout fail: ' + r.__err);
      return 'logout ok';
    }
    case 'storageSet': {
      let v = op.value;
      let bootAfter = false;
      if (op.key === 'token' && (/JWT/i.test(v) || !v || v.includes('有效'))) {
        const kind = (ctx.identHint) || 'guest';
        const t = await mintToken(kind);
        v = t.token;
        bootAfter = true;
      } else if (op.key === 'campus-love:pending-login-redirect' || new RegExp('^/(pages|subpackages)/').test(v) || v === 'true' || v === 'false' || /^-?\d+(\.\d+)?$/.test(v)) {
        // 原样写入
      } else if (/^[\[{]/.test(v)) { try { v = JSON.stringify(JSON.parse(v)); } catch (e) { /* 原样 */ } }
      const r = await runInApp(function (k, val) {
        try { wx.setStorageSync(k, val); return { ok: true }; } catch (e) { return { __err: String(e && e.message) }; }
      }, op.key, v);
      if (r.__err) throw new Error('storageSet ' + op.key + ': ' + r.__err);
      if (bootAfter) {
        const b = await runInApp(function () {
          try {
            var s = getApp().$vm.$pinia._s.get('session');
            if (!s) return { __err: 'no-session-store' };
            s.bootstrap();
            return { booting: true };
          } catch (e) { return { __err: String(e && e.message) }; }
        });
        if (b.__err) return 'storageSet token(bootstrap ERR ' + b.__err + ')';
        for (let i = 0; i < 12; i++) {
          await sleep(500);
          const st = await runInApp(function () {
            try {
              var s = getApp().$vm.$pinia._s.get('session');
              return { loggedIn: !!s.isLoggedIn, userId: s.userSession && s.userSession.userId };
            } catch (e) { return { __err: String(e && e.message) }; }
          });
          if (st.loggedIn) { currentIdent = 'guest'; return 'storageSet token + bootstrap ok userId=' + st.userId; }
        }
        return 'storageSet token (bootstrap pending)';
      }
      return 'storageSet ' + op.key;
    }
    case 'storageRemove': {
      const r = await runInApp(function (k) {
        try { wx.removeStorageSync(k); return { ok: true }; } catch (e) { return { __err: String(e && e.message) }; }
      }, op.key);
      if (r.__err) throw new Error('storageRemove: ' + r.__err);
      return 'storageRemove ' + op.key;
    }
    case 'seqTap': {
      const page = await withTimeout(mp.currentPage(), 10000, 'curPage');
      const list = await page.$$(op.selector).catch(() => []);
      const taps = [];
      for (let i = 0; i < Math.min(op.times || 3, (list || []).length); i++) {
        try { await withTimeout(list[i].tap(), 10000, 'seq'); taps.push(i + 1); await sleep(900); } catch (e) { taps.push('ERR' + (i + 1)); }
      }
      return `seqTap ${op.selector} tapped=[${taps.join(',')}]`;
    }
    case 'ensureSel': {
      const page = await withTimeout(mp.currentPage(), 10000, 'curPage');
      if (!page) return 'ensureSel no-page';
      const has = await page.$(op.need).catch(() => null);
      if (has) return `ensureSel ${op.need} already-present`;
      const viaEl = await page.$(op.via).catch(() => null);
      if (!viaEl) return `ensureSel via-missing ${op.via}`;
      try { await withTimeout(viaEl.tap(), 12000, 'ensureTap'); } catch (e) { return 'ensureSel via-tap ERR:' + clampStr(e.message, 60); }
      await sleep(1000);
      const has2 = await page.$(op.need).catch(() => null);
      return `ensureSel ${op.need} via ${op.via} → ${has2 ? 'present' : 'STILL-missing'}`;
    }
    case 'navParam': {
      COMP_CACHE.key = null;
      const url = paramMapUrl(ctx.casePage) || '/' + ctx.casePage;
      try {
        await withTimeout(mp[op.type || 'reLaunch'](url), 15000, 'navParam');
        await sleep(1500);
        return (op.type || 'reLaunch') + ' ' + url + ' (param-map)';
      } catch (e) { ctx.navError = clampStr(e.message, 160); return 'navParam ' + url + ' NAV_ERROR: ' + ctx.navError; }
    }
    case 'awayBack': {
      const away = TABS['首页'];
      try { await withTimeout(mp.switchTab(away), 12000, 'away'); } catch (e) { /* ignore */ }
      await sleep(1200);
      try { await withTimeout(mp.switchTab('/' + ctx.casePage.replace(/^\/+/, '')), 12000, 'back'); return 'awayBack via ' + away; } catch (e) {
        try { await withTimeout(mp.reLaunch('/' + ctx.casePage), 12000, 'backRl'); return 'awayBack reLaunch back'; } catch (e2) { return 'awayBack ERR:' + clampStr(e2.message, 80); }
      }
    }
    case 'toggleTap': {
      const cands = ctx.candidates || [];
      const els = [];
      for (const sel of cands) { try { const el = await (await mp.currentPage()).$(sel); if (el) els.push(el); } catch (e) { /* ignore */ } if (els.length >= 2) break; }
      if (els.length < 2) return 'toggleTap: need 2 elements, found ' + els.length;
      let okN = 0;
      for (let i = 0; i < op.times * 2; i++) { try { await els[i % 2].tap(); okN++; } catch (e) { /* ignore */ } await sleep(250); }
      return `toggleTap x${op.times} done=${okN}`;
    }
    case 'nav': {
      let url = op.url;
      COMP_CACHE.key = null;
      if (url === '__CASE_PAGE__') url = '/' + ctx.casePage;
      url = url + (url && url.includes('?') ? '' : '');
      const fn = mp[op.type];
      if (!fn) throw new Error('unknown nav ' + op.type);
      const args = op.type === 'navigateBack' ? [{ delta: op.delta || 1 }] : [url];
      try {
        await withTimeout(fn.apply(mp, args), 15000, 'nav');
        await sleep(1200);
        return op.type + ' ' + (op.type === 'navigateBack' ? 'delta' + (op.delta || 1) : url);
      } catch (e) {
        // 导航失败可能是用例预期（404/兜底），记录为观察事实
        ctx.navError = clampStr(e.message, 160);
        return op.type + ' ' + url + ' NAV_ERROR: ' + ctx.navError;
      }
    }
    case 'repeatNav': {
      const logs = [];
      for (let i = 0; i < op.times; i++) {
        try { await withTimeout(mp[op.type](op.url), 15000, 'repeatNav'); } catch (e) { logs.push('navErr:' + clampStr(e.message, 60)); }
        await sleep(i === 0 ? 1800 : 1200);
        if (i < op.times - 1) { try { await withTimeout(mp.navigateBack(), 10000, 'back'); } catch (e) { /* ignore */ } await sleep(600); }
      }
      return `repeatNav ${op.type} ${op.url} x${op.times} ${logs.join(',')}`;
    }    case 'tap':
    case 'tapIndex':
    case 'rapidTap':
    case 'longpress':
    case 'input':
    case 'inputIndex':
    case 'trigger':
    case 'triggerIndex': {
      const page = await withTimeout(mp.currentPage(), 10000, 'curPage');
      if (!page) throw new Error('currentPage null');
      // inputSeq：同选择器依次多值输入
      if (op.op === 'inputSeq') {
        let seqEl = await page.$(op.selector).catch(() => null);
        if (!seqEl) seqEl = await resolveSelector(page, op, ctx);
        if (!seqEl) {
          // CLI 兜底（组件穿透）
          const r = await cliElement('input', op.selector, { value: (op.values || ['']).join(' → '), waitForSelector: op.selector });
          if (r.ok) return `inputSeq ${op.selector} (cli)`;
          throw new Error('element not found: ' + op.selector);
        }
        const got = [];
        for (const v of (op.values || [''])) {
          try { await withTimeout(seqEl.input(v), 10000, 'seqInput'); got.push(JSON.stringify(clampStr(v, 16))); } catch (e) { got.push('ERR:' + clampStr(e.message, 30)); }
          await sleep(250);
        }
        return `inputSeq ${op.selector} [${got.join(',')}]`;
      }
      // ===== SDK 回退（扁平页面/索引类）=====
      let el = null;
      for (let attempt = 0; attempt < 4 && !el; attempt++) {
        el = await resolveSelector(page, op, ctx);
        if (!el && attempt < 3) { if (attempt >= 1) COMP_CACHE.key = null; await sleep(600); }
      }
      if (!el) {
        throw new Error('element not found: ' + (op.selector || '') + (op.label ? `("${op.label}")` : ''));
      }
      if (op.op === 'tap') { await withTimeout(el.tap(), 10000, 'tap'); return 'tap ' + (op.selector === '__CAND__' ? (op.label ? `"${op.label}"` : 'candidate') : op.selector); }
      if (op.op === 'tapIndex') { await withTimeout(el.tap(), 12000, 'tapIdx'); return `tapIndex ${op.selector}#${op.index}${op.label ? `("${op.label}")` : ''} tapped`; }
      if (op.op === 'longpress') { await withTimeout(el.longpress(), 12000, 'lp'); return 'longpress ' + (op.selector === '__CAND__' ? 'candidate' : op.selector); }
      if (op.op === 'input' || op.op === 'inputIndex') {
        const val = op.value || ('自动化输入-' + ctx.caseId);
        await withTimeout(el.input(val), 12000, 'input');
        return `input ${op.selector}="${clampStr(val, 30)}"`;
      }
      if (op.op === 'trigger' || op.op === 'triggerIndex') { await withTimeout(el.trigger(op.event, op.detail), 12000, 'trigger'); return `trigger ${op.selector} ${op.event} ${JSON.stringify(op.detail)}`; }
      // rapidTap（SDK 回退）
      let done = 0; const errs = [];
      for (let i = 0; i < op.times; i++) {
        try { await withTimeout(el.tap(), 8000, 'rapid'); done++; } catch (e) { errs.push(clampStr(e.message, 40)); }
        await sleep(60);
      }
      return `rapidTap ${op.selector} x${op.times} done=${done}${errs.length ? ' errs=' + errs.slice(0, 2).join('|') : ''}`;
    }
    case 'scroll': {
      const info = await runInApp(function () {
        try { var p = getCurrentPages(); var c = p[p.length - 1]; var w = c.getWindowInfo ? undefined : undefined; return JSON.stringify({ h: 1 }); } catch (e) { return JSON.stringify({ __err: String(e && e.message) }); }
      }, 'noop');
      const sys = await mp.systemInfo().catch(() => null);
      const target = op.to === 'top' ? 0 : 99999;
      try {
        await withTimeout(mp.pageScrollTo(target), 12000, 'scrollTo');
        await sleep(600);
        const pos = await mp.evaluate ? null : null;
        let scrollTop = null;
        try {
          const page = await mp.currentPage();
          const r2 = await page.scrollTop ? null : null;
        } catch (e) { /* ignore */ }
        lastScroll.pos = op.to;
        return 'pageScrollTo ' + op.to;
      } catch (e) {
        lastScroll.pos = op.to;
        return 'pageScrollTo ' + op.to + ' ERR:' + clampStr(e.message, 80);
      }
    }
    case 'scrollElement': {
      try {
        const page = await mp.currentPage();
        const el = await page.$(op.selector);
        if (!el) { lastScroll.pos = op.to; return 'scrollElement ' + op.selector + ' element-not-found'; }
        await withTimeout(el.scrollTo(op.to === 'top' ? 0 : 99999), 12000, 'elScroll');
        lastScroll.pos = op.to;
        return 'scrollElement ' + op.selector + ' ' + op.to;
      } catch (e) { lastScroll.pos = op.to; return 'scrollElement ERR:' + clampStr(e.message, 80); }
    }
    case 'pullDown': {
      const r = await runInApp(function () {
        try { var c = getCurrentPages(); var p = c[c.length - 1]; if (typeof uni !== 'undefined' && uni.startPullDownRefresh) { uni.startPullDownRefresh(); return 'uni-ok'; } return 'no-uni'; } catch (e) { return 'ERR ' + e.message; }
      }, 'pull');
      return 'pullDown ' + JSON.stringify(r);
    }
    case 'evalStopRefresh': {
      const r = await runInApp(function () {
        try { if (typeof uni !== 'undefined' && uni.stopPullDownRefresh) { uni.stopPullDownRefresh(); return 'ok'; } return 'no-uni'; } catch (e) { return 'ERR ' + e.message; }
      }, 'stopPull');
      return 'stopPullDownRefresh ' + JSON.stringify(r);
    }
    case 'mockChooseImage': {
      const payload = op.mode === 'cancel'
        ? { errMsg: 'chooseImage:fail cancel' }
        : op.huge
          ? { errMsg: 'chooseImage:ok', tempFilePaths: ['wxfile://tmp/qa-huge.png'], tempFiles: [{ path: 'wxfile://tmp/qa-huge.png', size: 11 * 1024 * 1024 }] }
          : { errMsg: 'chooseImage:ok', tempFilePaths: ['wxfile://tmp/qa-img.png'], tempFiles: [{ path: 'wxfile://tmp/qa-img.png', size: 20480 }] };
      try {
        await withTimeout(mp.mockWxMethod('chooseImage', payload), 15000, 'mockChoose');
        return 'mockWxMethod chooseImage ' + (op.mode || (op.huge ? 'huge' : 'ok'));
      } catch (e) { return 'mockChooseImage ERR:' + clampStr(e.message, 80); }
    }
    case 'restoreWx': {
      try { await withTimeout(mp.restoreWxMethod('chooseImage'), 10000, 'restoreWx'); return 'restoreWxMethod chooseImage'; } catch (e) { return 'restoreWx ERR:' + clampStr(e.message, 60); }
    }
    case 'evalSnippet': {
      const snippets = {
        commerceOn: function () {
          try {
            var keys = ['appConfig', 'app-config', 'appConfigStore', 'config'];
            for (var i = 0; i < keys.length; i++) {
              var s = getApp().$vm.$pinia._s.get(keys[i]);
              if (s && s.switches) { s.switches['commerce.enabled'] = true; return 'set via ' + keys[i]; }
            }
            return 'no-switch-store';
          } catch (e) { return 'ERR ' + e.message; }
        },
      };
      const fn = snippets[op.name];
      if (!fn) return 'evalSnippet unknown:' + op.name;
      const r = await runInApp(fn);
      return 'evalSnippet ' + op.name + ' → ' + JSON.stringify(r);
    }
    case 'refresherPull': {
      const out2 = [];
      try {
        const page = await mp.currentPage();
        const svs = await page.$$('scroll-view').catch(() => []);
        if (svs.length) {
          try { await svs[0].trigger('refresherrefresh', {}); out2.push('scroll-view trigger refresherrefresh'); } catch (e) { out2.push('trigger err:' + clampStr(e.message, 40)); }
        } else out2.push('no scroll-view');
        const mNamed = (op.handler || '').replace(/^on/, '');
        for (const name of ['onRefresherrefresh', 'onRefresh', 'handleRefresh', 'onPullDownRefresh']) {
          try { await page.callMethod(name); out2.push('callMethod ' + name + ' ok'); break; } catch (e) { /* try next */ }
        }
      } catch (e) { out2.push('ERR:' + clampStr(e.message, 60)); }
      await sleep(1200);
      return 'refresherPull: ' + out2.join(',');
    }
    case 'touchHold': {
      try {
        const page = await mp.currentPage();
        const el = await resolveSelector(page, op, ctx);
        if (!el) return 'touchHold element-not-found';
        const size = await el.size().catch(() => ({ width: 60, height: 40 }));
        const off = await el.offset().catch(() => ({ left: 10, top: 10 }));
        const x = (off.left || 0) + (size.width || 60) / 2, y = (off.top || 0) + (size.height || 40) / 2;
        await el.touchstart({ touches: [{ x, y }], changedTouches: [{ x, y }] });
        await sleep(op.ms || 150);
        const shotB = await screenshot(`${ctx.shotKey || 'touch'}-hold`);
        await el.touchend({ touches: [], changedTouches: [{ x, y }] });
        return `touchHold ${op.selector} ${op.ms}ms (hold shot: ${shotB.error ? 'ERR' : shotB.bytes + 'B'})`;
      } catch (e) { return 'touchHold ERR:' + clampStr(e.message, 80); }
    }
    case 'measureTap': {
      try {
        const page = await mp.currentPage();
        const el = await page.$(op.selector);
        if (!el) return 'measureTap element-not-found ' + op.selector;
        const size = await el.size();
        const off = await el.offset();
        await el.tap();
        return `measureTap ${op.selector} size=${JSON.stringify(size)} offset=${JSON.stringify(off)} tapped`;
      } catch (e) { return 'measureTap ERR:' + clampStr(e.message, 80); }
    }
    case 'swipe': {
      try {
        const page = await mp.currentPage();
        const sys = await mp.systemInfo().catch(() => ({ windowWidth: 375, windowHeight: 667 }));
        const w = sys.windowWidth || 375, h = sys.windowHeight || 667;
        const sels = op.selector ? [op.selector] : [];
        let el = null;
        if (sels.length) el = await page.$(op.selector).catch(() => null);
        if (el && el.swipeTo) { await withTimeout(el.swipeTo(op.dir), 12000, 'swipe'); return 'swipe ' + op.dir + ' on ' + op.selector; }
        if (el && el.touchstart) {
          const size = await el.size().catch(() => ({ width: w, height: h }));
          const off = await el.offset().catch(() => ({ left: 0, top: 0 }));
          const cx = (off.left || 0) + (size.width || w) / 2, cy = (off.top || 0) + (size.height || h) / 2;
          const d = 80;
          const p2 = { left: op.dir === 'left' ? cx - d : op.dir === 'right' ? cx + d : cx, top: op.dir === 'up' ? cy - d : op.dir === 'down' ? cy + d : cy };
          const p1 = { left: op.dir === 'left' ? cx + d : op.dir === 'right' ? cx - d : cx, top: op.dir === 'up' ? cy + d : op.dir === 'down' ? cy - d : cy };
          await el.touchstart({ touches: [{ x: p1.left, y: p1.top }] }); await el.touchmove({ touches: [{ x: (p1.left + p2.left) / 2, y: (p1.top + p2.top) / 2 }] }); await el.touchend({ touches: [{ x: p2.left, y: p2.top }] });
          return `swipe ${op.dir} touch-seq on ${op.selector || 'page'}`;
        }
        return 'swipe ' + op.dir + ' unsupported(no element api)';
      } catch (e) { return 'swipe ERR:' + clampStr(e.message, 80); }
    }
    case 'wait': await sleep(op.ms); return 'wait ' + op.ms + 'ms';
    case 'observe': return 'observe';
    default: throw new Error('unknown op ' + op.op);
  }
}

/* ================= 用例执行 ================= */
const OVERRIDES_LOAD = (() => { try { return JSON.parse(fs.readFileSync(path.join(REPO, 'tmp', 'qa', 'r1-overrides.json'), 'utf8')); } catch (e) { return OVERRIDES; } })();

function probesFor(mc) {
  const sels = new Set();
  for (const src of [mc.action, mc.expected]) {
    if (!src) continue;
    const m = allSels(String(src));
    for (const s of m.slice(0, 8)) if (s.length < 40) sels.add(s);
    if (sels.size >= 6) break;
  }
  return [...sels].slice(0, 6);
}
async function probeElements(sels) {
  const out = [];
  try {
    const page = await mp.currentPage();
    if (!page) return out;
    // 根节点 wxml 包含自定义组件内部树（SDK $ 查询不穿透，wxml() 可穿透，2026-09-23 实测）
    let wxml = '';
    try {
      const views = await page.$$('view');
      if (views.length) wxml = String(await views[0].wxml());
    } catch (e) { /* ignore */ }
    for (let i = 0; i < sels.length; i++) {
      const s = sels[i];
      if (!wxml) {
        try {
          const el = await page.$(s);
          out.push(el ? `${s}:present` : `${s}:absent`);
        } catch (e) { out.push(`${s}:probeErr`); }
        continue;
      }
      const cls = s.replace(/^[.#]/, '').split(/\s+/).pop();
      const re = new RegExp(cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      out.push(s + (re.test(wxml) ? ':present' : ':absent'));
    }
  } catch (e) { /* ignore */ }
  return out;
}

async function runCase(suite, mf, mc, ckpt) {
  const key = { suite: suite.id, manifest: mf, id: mc.id };
  const t0 = Date.now();
  const mark = consoleMark();
  const ctx = { caseId: mc.id, ident: null, navError: null, shotKey: pageKey(mf, mc.page) + '-' + mc.id };
  ctx.identHint = /身份\s*A|100158/.test((mc.pre || '') + ' ' + (mc.action || '')) ? 'A' : /身份\s*B|100159/.test((mc.pre || '') + ' ' + (mc.action || '')) ? 'B' : /游客|体验|100151|guest/.test((mc.pre || '') + ' ' + (mc.action || '')) ? 'guest' : null;
  const logs = [];
  const evidence = [];
  const tier = mc.tier || 'normal';
  let status = 'EXECUTED';
  let failure = null;
  const override = OVERRIDES_LOAD[`${mf}:${mc.id}`];

  let preOps, actOps;
  try {
    preOps = expandOps(parseText(mc.pre || '', 'pre'), mf);
    actOps = expandOps(parseText(mc.action || '', 'action'), mf);
    // action 文本中的登录注入（如 N42: automation_evaluate 注入 token + bootstrap）
    if (/注入\s*token|mock\s*登录/.test(mc.action || '')) {
      if (/身份\s*A|100158/.test(mc.action)) actOps.unshift({ op: 'login', ident: 'A' });
      else if (/身份\s*B|100159/.test(mc.action)) actOps.unshift({ op: 'login', ident: 'B' });
      else actOps.unshift({ op: 'login', ident: ctx.identHint || 'guest' });
    }
    ctx.casePage = mc.page;
    ctx.candidates = [...new Set([...allSels(mc.action || ''), ...allSels(mc.expected || '')])].slice(0, 8);
    // 登录/注册页表单类用例默认要求未登录态（登录页会自动前进，须先登出）
    if (/^pages\/(login|register)/.test(mc.page || '') && !preOps.some((o) => ['login', 'logout'].includes(o.op))) {
      preOps.unshift({ op: 'logout' });
    }
    if (override) { preOps = override.preOps || preOps; actOps = override.actOps || actOps; }
  } catch (e) {
    upsertResult({ ...key, page: mc.page, tier, status: 'FAILED', observed: 'parse-error: ' + e.message, route: null, toast: [], console: [], evidence: [], durationMs: Date.now() - t0 });
    return;
  }

  const step = (m) => { logs.push(m); };

  try {
    // ---- PRE ----
    // DOM 类操作延后到导航之后执行（先建立页面，再操作页面）
    const DOM_OPS = new Set(['ensureSel', 'tap', 'tapIndex', 'rapidTap', 'longpress', 'input', 'inputIndex', 'inputSeq', 'trigger', 'triggerIndex', 'scrollElement', 'toggleTap', 'measureTap', 'touchHold', 'swipe', 'refresherPull']);
    let preNavSeen = false;
    const deferredDom = [];
    for (const op of preOps) {
      if (op.op === 'nav' || op.op === 'repeatNav' || op.op === 'navParam' || op.op === 'awayBack') preNavSeen = true;
      if (DOM_OPS.has(op.op)) { deferredDom.push(op); continue; }
      try {
        const r = await withTimeout(applyOp(op, ctx), 60000, 'pre-' + op.op);
        step('pre:' + r);
      } catch (e) {
        step('pre-FAIL:' + op.op + ' ' + clampStr(e.message, 120));
      }
      await sleep(150);
    }
    // 用例页保障：栈顶 ≠ 用例页 且 pre 未导航 → 导航到用例页
    let top = await topRoute();
    if (!top || normalize(top) !== normalize(mc.page)) {
      try {
        await withTimeout(mp.reLaunch('/' + mc.page), 15000, 'goto-case-page');
        await sleep(1500);
        step('pre:auto-reLaunch ' + mc.page);
      } catch (e) { step('pre:auto-nav ERR ' + clampStr(e.message, 100)); ctx.navError = clampStr(e.message, 160); }
    } else if (!top) {
      step('pre:no-route');
    }
    await sleep(400);
    top = await topRoute();
    // 延后的 DOM 类前置（此时已在用例页）
    for (const op of deferredDom) {
      try {
        const r = await withTimeout(applyOp(op, ctx), 60000, 'preD-' + op.op);
        step('pre:' + r);
      } catch (e) {
        step('pre-FAIL:' + op.op + ' ' + clampStr(e.message, 120));
      }
      await sleep(150);
    }

    // ---- critical: before 截图 ----
    if (tier === 'critical') {
      const pageUp = pageKey(mf, mc.page);
      const b = await screenshot(`${pageUp}-${mc.id}-before`);
      evidence.push(b.error ? `${b.path}(ERROR:${b.error})` : `${b.path}(${b.bytes}B)`);
    }

    // ---- ACTION ----
    let actionPerformed = false;
    for (const op of actOps) {
      try {
        const r = await withTimeout(applyOp(op, ctx), 25000, 'act-' + op.op);
        actionPerformed = true;
        step('act:' + r);
      } catch (e) {
        step('act-FAIL:' + op.op + '(' + (op.selector || op.url || '') + ') ' + clampStr(e.message, 140));
        if (op.op === 'tap' || op.op === 'tapIndex' || op.op === 'rapidTap' || op.op === 'input' || op.op === 'longpress') {
          failure = failure || `action ${op.op} ${op.selector || ''} failed: ${clampStr(e.message, 120)}`;
        }
      }
      await sleep(200);
    }
    if (override && override.observeOnly) actionPerformed = true;

    // ---- 稳定 ----
    await sleep(tier === 'critical' ? 900 : 600);
    let chain = await getRouteChain();
    for (let i = 0; i < 3; i++) {
      await sleep(450);
      const c2 = await getRouteChain();
      if (JSON.stringify(c2) === JSON.stringify(chain)) break;
      chain = c2;
    }

    // 无动作且非观察类 → 如实 SKIPPED
    if (!actOps.length && !OBSERVE_MARKERS.test(mc.action || '') && !override) {
      upsertResult({
        ...key, page: mc.page, tier, title: mc.title, status: 'SKIPPED',
        observed: 'action-not-automatable: ' + clampStr(mc.action, 120), route: chain, toast: [], console: [], evidence, durationMs: Date.now() - t0,
      });
      return;
    }

    // ---- 采集 ----
    const toasts = await drainToasts();
    const conLines = consoleDrain(mark).filter((l) => !/\[log\]/.test(l) || /error|warn|fail|NAV|TypeError|not defined/i.test(l));
    const probeSels = probesFor(mc);
    const probes = await probeElements(probeSels);
    if (tier === 'critical' || tier === 'normal') {
      const pageUp = pageKey(mf, mc.page);
      const a = await screenshot(`${pageUp}-${mc.id}-after`);
      evidence.push(a.error ? `${a.path}(ERROR:${a.error})` : `${a.path}(${a.bytes}B)`);
      if (/复拍|双拍|连续截图|两次截图/.test(mc.action || '')) {
        await sleep(1800);
        const a2 = await screenshot(`${pageUp}-${mc.id}-after2`);
        evidence.push(a2.error ? `${a2.path}(ERROR:${a2.error})` : `${a2.path}(${a2.bytes}B)`);
      }
      if (tier === 'critical') {
        try {
          const page = await mp.currentPage();
          if (page) {
            const el = await page.$('view');
            if (el) { const w = await el.wxml(); const wp = path.join(WXML_DIR, `${pageUp}-${mc.id}-after.wxml`); fs.mkdirSync(WXML_DIR, { recursive: true }); fs.writeFileSync(wp, String(w)); evidence.push(wp); }
          }
        } catch (e) { /* ignore */ }
      }
    }
    if (tier === 'noop') evidence.push('scrollPos=' + (lastScroll.pos || 'n/a'));

    const observed = [
      `top=${top || '(none)'}`,
      ctx.navError ? `navError=${ctx.navError}` : null,
      actionPerformed ? null : (actOps.length ? 'action-not-performed(see act-FAIL)' : 'observe-only'),
      probes.length ? 'dom: ' + probes.join(' ') : null,
      ...logs.slice(0, 6),
    ].filter(Boolean).join(' | ');

    // console 落盘（suite 文件）
    if (consoleFile && conLines.length) {
      fs.appendFileSync(consoleFile, `\n== ${mc.id} ${mc.page} [${tier}] ==\n` + conLines.join('\n') + '\n');
    }

    status = failure ? 'FAILED' : 'EXECUTED';
    upsertResult({
      ...key, page: mc.page, tier,
      title: mc.title,
      status, observed,
      failureReason: failure,
      route: Array.isArray(chain) ? chain : chain,
      toast: toasts,
      console: conLines.slice(-8).map((l) => clampStr(l, 300)),
      evidence,
      durationMs: Date.now() - t0,
    });
  } catch (e) {
    // 通道级错误：抛给 suite 层重连；业务错误：记 FAILED
    if (isChannelErr(e.message)) throw e;
    upsertResult({
      ...key, page: mc.page, tier, title: mc.title, status: 'FAILED',
      observed: 'case-error: ' + clampStr(e.message, 200), route: null, toast: [], console: [], evidence, durationMs: Date.now() - t0,
    });
  }
}
function normalize(p) { return String(p || '').replace(/^\//, '').replace(/\/$/, ''); }
function pageKey(mf, page) {
  if (MANIFESTS[mf] && MANIFESTS[mf].cases.length && !mf.startsWith('次要')) return mf;
  return page.replace(/\//g, '-').toUpperCase();
}

/* ================= Suite 执行 ================= */
async function runSuite(suite, ckpt, rerunIds) {
  const cases = suiteCases(suite);
  const ck = ckpt.suites[suite.id];
  if (ck && ck.status === 'completed' && !rerunIds) { console.log(`[suite ${suite.id}] already completed, skip`); return { skipped: true }; }
  consoleFile = path.join(INTERACT_DIR, `console-${suite.id}.log`);
  fs.appendFileSync(consoleFile, `\n==== SUITE ${suite.id} start ${now()} git=${GIT_SHA} ====\n`);
  console.log(`[suite ${suite.id}] ${cases.length} cases, pages=${[...new Set(cases.map((x) => x.c.page))].length}`);
  let done = 0; const failed = []; const skipped = [];
  let reconnects = 0; let recoveryReLaunchUsed = false;
  ckpt.suites[suite.id] = { status: 'running', executedCaseIds: [], startedAt: now() };
  saveCkpt(ckpt);
  for (const { mf, c } of cases) {
    if (rerunIds && !rerunIds.includes(c.id)) continue;
    const maxMs = 150000;
    try {
      await withTimeout((async () => {
        await ensureConnected();
        await runCase(suite, mf, c, ckpt);
      })(), maxMs, 'case-' + c.id);
    } catch (e) {
      // 通道断开：重连后本用例重试 1 次
      let retried = false;
      for (let a = 1; a <= 2 && !retried; a++) {
        console.log(`[case ${c.id}] channel error (${clampStr(e.message, 80)}); reconnect attempt ${a}`);
        connected = false;
        if (a >= 2) { await refreshSimulator(); await sleep(10000); }
        else await sleep(8000);
        try { await ensureConnected(); await runCase(suite, mf, c, ckpt); retried = true; }
        catch (e2) { e = e2; }
      }
      if (!retried) {
        reconnects++;
        if (reconnects >= 3) {
          console.error('[suite] channel lost 3 times, aborting suite; remaining cases -> SKIPPED');
          for (const { mf: mf2, c: c2 } of cases) {
            const already = RESULTS.results.find((x) => x.suite === suite.id && x.manifest === mf2 && x.id === c2.id);
            if (!already && (!rerunIds || rerunIds.includes(c2.id))) skipped.push(`${mf2}:${c2.id}`);
          }
          for (const sk of skipped) {
            const [mf2, cid] = sk.split(':');
            upsertResult({ suite: suite.id, manifest: mf2, id: cid, page: (MANIFESTS[mf2].byId[cid] || {}).page || '?', tier: (MANIFESTS[mf2].byId[cid] || {}).tier || '?', status: 'SKIPPED', observed: 'channel-lost after 3 reconnect attempts', route: null, toast: [], console: [], evidence: [] });
          }
          ckpt.suites[suite.id] = { status: 'interrupted', executedCaseIds: ckpt.suites[suite.id].executedCaseIds, updatedAt: now(), skippedCount: skipped.length };
          saveCkpt(ckpt);
          return { aborted: true, skipped };
        }
      }
    }
    // LEVEL 2 整机恢复：栈异常/卡死时（每 Suite 1 次）
    const top = await topRoute().catch(() => null);
    if (top === null && !recoveryReLaunchUsed) {
      recoveryReLaunchUsed = true;
      console.log('[recovery] LEVEL2 reLaunch (route broken), 1/1 for suite');
      try { await ensureConnected(); await mp.reLaunch('/' + cases[0].c.page); } catch (e2) { /* ignore */ }
    }
    done++;
    const rec = RESULTS.results.find((x) => x.suite === suite.id && x.manifest === mf && x.id === c.id);
    if (rec) {
      ckpt.suites[suite.id].executedCaseIds.push(rec.id);
      if (rec.status === 'FAILED') failed.push(rec.id);
    }
    if (done > 0 && done % 15 === 0) {
      console.log(`[suite ${suite.id}] proactive refresh @${done}`);
      connected = false;
      try { if (mp) await mp.disconnect(); } catch (e) { /* ignore */ }
      await refreshSimulator();
      await sleep(8000);
      await ensureConnected();
    }
    if (done % 5 === 0) {
      saveCkpt(ckpt);
      console.log(`[suite ${suite.id}] ${done}/${cases.length} done (failed=${failed.length})`);
    }
  }
  ckpt.suites[suite.id] = { status: 'completed', executedCaseIds: ckpt.suites[suite.id].executedCaseIds, finishedAt: now(), executed: done, failed: failed.length, reconnects };
  saveCkpt(ckpt);
  console.log(`[suite ${suite.id}] DONE executed=${done} failed=[${failed.join(',')}]`);
  return { executed: done, failed };
}

/* ================= dry-parse ================= */
function dryParse() {
  let total = 0, ok = 0, unknown = 0;
  const unknownList = [];
  for (const s of SUITES) for (const { mf, c } of suiteCases(s)) {
    total++;
    const preOps = expandOps(parseText(c.pre || '', 'pre'), mf);
    const actOps = expandOps(parseText(c.action || '', 'action'), mf);
    const meaningful = actOps.filter((o) => o.op !== 'wait');
    const observeOnly = OBSERVE_MARKERS.test(c.action || '');
    if (meaningful.length || observeOnly) ok++;
    else { unknown++; unknownList.push(`${mf}:${c.id} :: ${clampStr(c.action, 70)}`); }
  }
  console.log(`dry-parse: total=${total} ok=${ok} unknown=${unknown} (${(100 * ok / total).toFixed(1)}%)`);
  unknownList.forEach((l) => console.log('  ', l));
}

/* ================= main ================= */
async function main() {
  const args = process.argv.slice(2);
  console.log('[exec] r1-exec parser-r6 startup', now());
  if (args.includes('--dry-parse')) { dryParse(); return; }
  if (args.includes('--parse-case')) {
    const [mf, id] = args[args.indexOf('--parse-case') + 1].split(':');
    const mc = MANIFESTS[mf].byId[id];
    console.log('PRE ops:', JSON.stringify(expandOps(parseText(mc.pre || '', 'pre'), mf), null, 1));
    console.log('ACT ops:', JSON.stringify(expandOps(parseText(mc.action || '', 'action'), mf), null, 1));
    return;
  }
  const rerunIds = process.env.RERUN_CASES ? process.env.RERUN_CASES.split(',').map((s) => s.trim()) : null;
  const ckpt = loadCkpt();
  if (!acquireLock()) { console.error('LOCK_BUSY'); process.exit(3); }
  startHeartbeat();
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.mkdirSync(WXML_DIR, { recursive: true });
  let exitCode = 0;
  try {
    if (args.includes('--suite')) {
      const s = SUITES.find((x) => x.id === args[args.indexOf('--suite') + 1]);
      if (!s) throw new Error('suite not found');
      const r = await runSuite(s, ckpt, rerunIds);
      if (r && r.aborted) exitCode = 2;
    } else if (args.includes('--all')) {
      for (const s of SUITES) {
        const r = await runSuite(s, ckpt, null);
        if (r && r.aborted) { exitCode = 2; break; }
      }
    } else {
      console.log('usage: --dry-parse | --suite <id> | --all');
    }
  } finally {
    try { if (mp && connected) await mp.disconnect(); } catch (e) { /* ignore */ }
    saveResults();
    saveCkpt(ckpt);
    releaseLock();
  }
  process.exit(exitCode);
}
main().catch((e) => { console.error('FATAL', e.message); releaseLock(); process.exit(1); });
