/* eslint-disable no-console */
/**
 * 逐轮用例执行器（Manifest 驱动，轮次参数化）— scripts/qa/r-exec.cjs
 *
 * 本文件是 scripts/qa/r1-exec.cjs 的 fork：执行逻辑与锁语义逐字节保持，
 * 只参数化「轮次目录」与「自动化端口」两类历史上被写死、会静默毁掉取证的东西。
 *
 * 输入：reports/audit/<dirLabel>/ops/*.json（cases[]: id/page/title/tier/pre/action/expected[/requiresReal]）
 * 连接：miniprogram-automator → ws://127.0.0.1:<发现的端口>（单写者，持 UI Lock）
 *       端口由 EXEC_PORT_CANDIDATES 逐个 TCP 连接探测得出；一个都没听到 → exit(2)，绝不硬跑
 * Suite：默认由 ops 目录派生（EXEC_SUITE_MODE=auto，见 planSuitesFromOps，每 Suite ≤6 页，
 *        id=P-<manifest>-<两位序号>）；EXEC_SUITE_MODE=legacy 才用下面硬编码的 S01..S21。
 *        每 Suite 独立连接；检查点 tmp/qa/checkpoints/exec-<tag>.json（suite/status/executedCaseIds）
 * 产出：
 *   reports/audit/<dirLabel>/interact/exec-results.json（suite/manifest/id/page/tier/observed/route/toast/console/evidence/status/requiresReal）
 *     键语义（与 scripts/verify-queue-reconcile.mjs 的接线契约）：
 *       suite    = 派生规划器 id（P-<manifest>-<seq>），console-<suite>.log / 检查点续跑用它，**不参与对账**
 *       manifest = ops 文件名去掉 .json，轮末队列对账与计划侧同轴用的就是它
 *       行主键    = manifest + "/" + id（裸 id 跨套会撞：round-2 的 941 行只有 911 个唯一 id）
 *   reports/screenshots/<dirLabel>-interact/<PAGE>-<caseId>-before|after.png（critical/normal 按 tier）
 *   reports/screenshots/<dirLabel>-interact/wxml/<PAGE>-<caseId>-after.wxml（critical）
 *   reports/audit/<dirLabel>/interact/console-<suite>.log（全量 console）
 *
 * 环境变量：
 *   EXEC_ROUND=6|F1..F4|P3   轮次（未设置 = round-1 / exec-R1.json，与 r1-exec 零漂移）
 *   EXEC_PORT_CANDIDATES     默认 '9420,9430'，逗号分隔，按顺序取第一个真在听的
 *   EXEC_WS_ENDPOINT         显式指定 ws 端点（跳过探测，锁文件名按该端口派生）
 *   EXEC_NODE22_DIR          miniprogram-automator 的依赖解析目录（运行时路径，非业务路径）
 *   EXEC_SELFCHECK=1         只打印派生结果与 ops 实读统计后退出：
 *                            不 require automator、不连端口、不写任何证据文件
 *   EXEC_SUITE_MODE          derived|legacy|auto（默认 auto）Suite 表来源：
 *                            auto    = 用 ops 目录派生的规划表；同时打印旧硬编码表与 ops 实读的差集；
 *                                      派生表覆盖不全 → exit 2 报 FAIL，禁止回落旧表（那正是 157 例
 *                                      静默不跑的成因）
 *                            legacy  = 只用下面的硬编码 SUITES（历史轮数字复现通道，语义与输出零改动）
 *                            derived = 只用派生表（不打印旧表差集以外的判定，行为同 auto 的派生分支）
 *                            派生算法：ops/*.json 文件名升序（UTF-16 码点序）→ 按 case.page 分组
 *                            （page 缺失归 (nopage) 组，绝不丢弃）→ 页名升序 → 每 ≤6 页切一个 Suite
 *                            → id = P-<manifest>-<两位序号>，形状仍是 {id, manifests:[...], pages:[...]}
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
 *   EXEC_SELFCHECK=1 EXEC_ROUND=6 node scripts/qa/r-exec.cjs   # 只看派生结果与统计，不碰端口/不写证据
 *   EXEC_SELFCHECK=1 EXEC_SUITE_MODE=legacy EXEC_ROUND=6 node scripts/qa/r-exec.cjs  # 复现历史轮旧表数字
 *   EXEC_SELFCHECK=1 EXEC_SUITE_MODE=derived EXEC_ROUND=6 node scripts/qa/r-exec.cjs # 只看派生表
 *   node scripts/qa/r-exec.cjs --dry-parse           # 仅解析全部 Manifest，统计解析覆盖
 *   node scripts/qa/r-exec.cjs --discover            # 仅做端口探测，打印 EXEC_PORT=.. discover=..
 *   node scripts/qa/r-exec.cjs --suite S01-auth      # 跑一个 Suite（检查点已完成则跳过）
 *   node scripts/qa/r-exec.cjs --all                 # 顺序跑全部未完成 Suite
 *   RERUN_CASES=LG04,LG05 node ... --suite S01-auth   # 补跑指定用例
 */
const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const { execFile } = require('child_process');

// node22 目录是「运行时依赖解析路径」，不是业务路径，所以可用 EXEC_NODE22_DIR 覆盖
const NODE22_DIR = process.env.EXEC_NODE22_DIR || 'D:\\codex-tools\\node-v22.17.0-win-x64';
const require2 = createRequire(path.join(NODE22_DIR, 'node_modules', 'package.json'));
// automator 延后加载：EXEC_SELFCHECK=1 必须走到退出都不 require 它（真连接只在 connectChannel 里发生）
let automator = null;
function automatorRequired() { if (!automator) automator = require2('miniprogram-automator'); return automator; }

const REPO = path.resolve(__dirname, '..', '..');

/* ================= 轮次参数化（EXEC_ROUND） =================
 * 未设置 → 与 r1-exec 完全一致（round-1 / exec-R1.json）：默认行为零漂移
 *   纯数字 6   → dirLabel=round-6 / 截图根 round-6-interact / 检查点 exec-R6.json
 *   F1..F4     → dirLabel=final-a..final-d / 检查点 exec-F<n>.json
 *   P3         → dirLabel=final / 检查点 exec-P3.json
 * 其它值 → 拒绝启动（不许把用例写进猜出来的目录）
 */
const SELF = process.env.EXEC_SELFCHECK === '1';
const ROUND_RAW = (process.env.EXEC_ROUND || '').trim();
// Suite 规划模式：必须在 Manifest 加载之前定下来（旧表引用缺失时只有 legacy 模式才允许抛错）
const SUITE_MODE = (() => {
  const m = String(process.env.EXEC_SUITE_MODE || 'auto').trim().toLowerCase();
  if (m === 'auto' || m === 'legacy' || m === 'derived') return m;
  console.error('EXEC_PRECHECK=FAIL reason=EXEC_SUITE_MODE 无法解析（接受：auto | legacy | derived）EXEC_SUITE_MODE=' + JSON.stringify(process.env.EXEC_SUITE_MODE));
  process.exit(2);
})();
function deriveRound(r) {
  if (r === '') return { dirLabel: 'round-1', tag: 'R1' };
  if (/^[0-9]+$/.test(r)) return { dirLabel: 'round-' + r, tag: 'R' + r };
  const f = /^F([1-4])$/.exec(r);
  if (f) return { dirLabel: 'final-' + 'abcd'.charAt(Number(f[1]) - 1), tag: r };
  if (r === 'P3') return { dirLabel: 'final', tag: 'P3' };
  return null;
}
const ROUND = deriveRound(ROUND_RAW);
if (!ROUND) {
  console.error('EXEC_PRECHECK=FAIL reason=EXEC_ROUND 无法解析（接受：未设置 | 纯数字 | F1..F4 | P3）EXEC_ROUND=' + JSON.stringify(ROUND_RAW));
  process.exit(2);
}
const DIR_LABEL = ROUND.dirLabel;              // reports/audit/<DIR_LABEL>/…, reports/screenshots/<DIR_LABEL>-interact
const CKPT_TAG = ROUND.tag;                    // exec-<CKPT_TAG>.json
const OPS_DIR = path.join(REPO, 'reports', 'audit', DIR_LABEL, 'ops');
const SHOT_DIR = path.join(REPO, 'reports', 'screenshots', DIR_LABEL + '-interact');
const WXML_DIR = path.join(SHOT_DIR, 'wxml');
const INTERACT_DIR = path.join(REPO, 'reports', 'audit', DIR_LABEL, 'interact');
const RESULTS_FILE = path.join(INTERACT_DIR, 'exec-results.json');
const CKPT_FILE = path.join(REPO, 'tmp', 'qa', 'checkpoints', 'exec-' + CKPT_TAG + '.json');
// 协作式停轮旗标（Windows 下 SIGTERM 钩子不可用，见 runSuite 里的说明）
const STOP_FLAG = process.env.EXEC_STOP_FLAG || path.join(REPO, 'tmp', 'qa', 'stop-' + CKPT_TAG.toLowerCase());

/* ================= 自动化端口发现 =================
 * 端口写死是本仓实测确认的最致命失效模式：9420 无人监听时照固定端口跑完整一轮 =
 * 0 条 UI 证据，而且不报错（比构建失败更致命，因为它让「有证据」这件事静默失败）。
 * 所以候选端口逐个做 TCP 连接探测（node:net；PATH 上的 node16 没有全局 fetch，不用 fetch），
 * 取第一个真在听的；一个都没听到就 exit(2)，禁止「默认用 9420 硬跑」。
 * WS_ENDPOINT / LOCK_FILE 都由发现结果派生；EXEC_WS_ENDPOINT 可显式覆盖（覆盖时不探测）。
 * 自检模式（SELF）绝不探测：连端口都不碰，锁路径按「首个候选」派生并标注 probe=skipped。
 */
const PORT_CANDIDATES = (process.env.EXEC_PORT_CANDIDATES || '9420,9430')
  .split(',').map((s) => Number(String(s).trim()))
  .filter((n) => Number.isInteger(n) && n > 0 && n < 65536);
if (!PORT_CANDIDATES.length) {
  console.error('EXEC_PRECHECK=FAIL reason=EXEC_PORT_CANDIDATES 无合法端口 EXEC_PORT_CANDIDATES=' + JSON.stringify(process.env.EXEC_PORT_CANDIDATES || ''));
  process.exit(2);
}
const PROBE_TIMEOUT_MS = Number(process.env.EXEC_PROBE_TIMEOUT_MS) > 0 ? Number(process.env.EXEC_PROBE_TIMEOUT_MS) : 800;
const portFromEndpoint = (ep) => { const m = /:(\d{2,5})(?:[/?]|$)/.exec(String(ep).replace(/^wss?:\/\//, '')); return m ? Number(m[1]) : null; };
let WS_ENDPOINT = null;      // 由 setPort 派生，真实值来自 EXEC_WS_ENDPOINT 覆盖或 TCP 探测
let LOCK_FILE = null;        // wechat-automation-<port>.lock（9420 的旧锁文件是历史轮墓碑，不复用、不删除、不改写）
let LOCK_RESOURCE = null;
let RUN_PORT = null;
let PORT_DISCOVER = 'none';  // ok | none | override | skipped
function setPort(port, how) {
  RUN_PORT = port;
  WS_ENDPOINT = 'ws://127.0.0.1:' + port;
  LOCK_RESOURCE = 'wechat-automation-' + port;
  LOCK_FILE = path.join(REPO, 'tmp', 'qa', 'locks', 'wechat-automation-' + port + '.lock');
  PORT_DISCOVER = how;
  return port;
}
// 占位端口（永不用于连接）：只保证 WS_ENDPOINT/LOCK_FILE 在任何时点都不是 null，真值由 precheckPort 覆盖
setPort(portFromEndpoint(process.env.EXEC_WS_ENDPOINT) || PORT_CANDIDATES[0], process.env.EXEC_WS_ENDPOINT ? 'override' : 'pending');
/** 仅 TCP 三次握手即断开：不发送任何应用层字节 */
function tcpProbe(port) {
  return new Promise((resolve) => {
    let settled = false;
    const sock = net.connect({ host: '127.0.0.1', port });
    const done = (ok) => { if (settled) return; settled = true; try { sock.destroy(); } catch (e) { /* ignore */ } resolve(ok); };
    sock.setTimeout(PROBE_TIMEOUT_MS);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
    sock.once('close', () => done(false));
  });
}
/** 候选端口按序探测，返回第一个在听的端口；都没听到返回 null */
async function precheckPort() {
  const ep = (process.env.EXEC_WS_ENDPOINT || '').trim();
  if (ep) {
    const p = portFromEndpoint(ep);
    if (!p) { console.error('EXEC_PRECHECK=FAIL reason=EXEC_WS_ENDPOINT 无法解析端口 ' + ep); process.exit(2); }
    WS_ENDPOINT = ep;
    setPort(p, 'override');
    console.log('[precheck] 显式端点覆盖，跳过探测 ' + WS_ENDPOINT);
    return p;
  }
  PORT_DISCOVER = 'none'; // 探测过但一个都没听到 → none（不保留占位态，避免日志把 pending 当成结果）
  for (const p of PORT_CANDIDATES) {
    const listening = await tcpProbe(p);
    console.log(`[precheck] ${now()} tcp-probe 127.0.0.1:${p} => ${listening ? 'LISTENING' : 'no-listener'}`);
    if (listening) return setPort(p, 'ok');
  }
  return null;
}
/** 真实执行前的硬闸：没有端口就绝不进入锁获取与连接阶段 */
async function requirePort() {
  const p = await precheckPort();
  if (!p) {
    console.error('EXEC_PRECHECK=FAIL reason=无自动化端口在听 candidates=' + PORT_CANDIDATES.join(',') + ' round=' + DIR_LABEL + '（禁止固定端口硬跑：那会产出 0 条 UI 证据且不报错）');
    process.exit(2);
  }
  console.log(`EXEC_PORT=${p} discover=${PORT_DISCOVER} ws=${WS_ENDPOINT} lock=${LOCK_FILE}`);
  return p;
}

// provenance 必须运行时取，不能写死：这里曾固定 'aefd8a72'，而当时 HEAD 已是 18c91ccf，
// 于是整轮证据按 G6"同轮同 SHA"契约全部过期（D1 实测事故）。取不到就拒绝起跑，
// 宁可不出证据，也不出一条对不上提交的证据。
const GIT_SHA = (() => {
  try {
    return require('child_process').execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.error('[provenance] 取不到 gitSha：' + e.message);
    process.exit(1);
  }
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const clampStr = (s, n) => String(s === undefined || s === null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
// requiresReal 只允许 true/false/null：manifest 没这个字段就是 null，禁止猜成 false
// （下游判定员要在 mock 轮把 requiresReal 断言记成 NOT-EVIDENCED，猜 false 等于把断言洗白成可 mock）
const reqRealOf = (c) => (c && c.requiresReal === true ? true : (c && c.requiresReal === false ? false : null));
const realOnlyTextOf = (c) => { try { return /REAL_ONLY/.test(JSON.stringify(c)); } catch (e) { return false; } };

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
const MANIFEST_LOAD_ERRORS = []; // 仅自检模式会填（非自检保持基线行为：直接抛错，不静默少跑 Suite）
// 例外：规划模式为 auto/derived 时旧表已不是权威表，缺文件只记账不抛错（真跑要用派生表，
// 而派生表的可跑性绝不能被一张过期旧表的引用给拦住 —— 但也不许反过来拿旧表去顶替派生表）
const ALLOW_MISSING_LEGACY_REFS = SELF || SUITE_MODE !== 'legacy';
for (const s of SUITES) for (const mf of s.manifests) {
  if (MANIFESTS[mf]) continue;
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(OPS_DIR, mf + '.json'), 'utf8'));
  } catch (e) {
    if (!ALLOW_MISSING_LEGACY_REFS) throw e;
    MANIFESTS[mf] = { cases: [], byId: {} };
    MANIFEST_LOAD_ERRORS.push(mf + '(' + (e.code || e.message) + ')');
    continue;
  }
  MANIFESTS[mf] = { cases: raw.cases || [], byId: {} };
  try {
    for (const c of MANIFESTS[mf].cases) MANIFESTS[mf].byId[c.id] = c;
  } catch (e) {
    // cases 不是可迭代数组（半个 manifest）：legacy 真跑口径仍按基线抛错；
    // 自检/派生模式记账后继续，让下面可读的规划门禁去 FAIL，而不是抛裸栈
    if (!ALLOW_MISSING_LEGACY_REFS) throw e;
    MANIFESTS[mf] = { cases: [], byId: {} };
    MANIFEST_LOAD_ERRORS.push(mf + '(' + (e.code || 'SHAPE_ERR') + ')');
  }
}
/* 页分组语义：page 缺失/空串一律归 (nopage) 组 —— 历史上「按页过滤把没有 page 字段的用例
 * 静默删掉」是本仓记过名的失效模式，所以派生表必须能把这一组显式排出来，且不许丢。
 * 对旧表而言 pageGroupKey(c) === c.page（旧表 pages 里全是真页名，且永不含 (nopage)），
 * 因此 legacy 路径的匹配结果与改造前逐例一致。 */
const NOPAGE_LABEL = '(nopage)';
const MAX_PAGES_PER_SUITE = 6; // 本仓规则：每 Suite ≤6 页
function pageGroupKey(c) {
  const p = c && c.page;
  return (p === undefined || p === null || p === '') ? NOPAGE_LABEL : String(p);
}
function pageMatches(suite, c) {
  if (!suite.pages) return true;
  return suite.pages.includes(c.page) || suite.pages.includes(pageGroupKey(c));
}
function suiteCases(suite) {
  const out = [];
  for (const mf of suite.manifests) {
    for (const c of MANIFESTS[mf].cases) {
      if (!pageMatches(suite, c)) continue;
      out.push({ mf, c });
    }
  }
  return out;
}

/* ================= Suite 派生规划（从 ops 目录实读结果生成，确定性、可审计） =================
 * 硬编码 SUITES 的实测失效（round-6，改造前基线）：表里引用 27 个 manifest 名，其中 5 个在 ops
 * 目录根本不存在；同时 ops 里的 次要18(88 例)/次要19(69 例) 没有任何 Suite 引用 —— 1107 例只排进
 * 669 例，438 例静默不跑。派生表把「文件在 ops 目录里」直接变成「文件一定被排进 Suite」，所以这一类
 * 漏排在规划阶段就必然表现为 coverage != 100% → exit 2，而不是等轮末对账才发现。
 * 覆盖不全时绝不回落到旧表：ACTIVE_SUITES 置空，真跑一条也不会执行。
 */
function planSuitesFromOps() {
  const res = {
    mode: SUITE_MODE, suites: [], ops: null, scheduledFiles: [], emptyFiles: [], anomalies: [],
    pages: 0, cases: 0, requiresReal: 0, nopageGroups: 0, nopageCases: 0,
    maxPagesPerSuite: 0, scheduled: 0, complete: false, reason: '',
  };
  const ops = scanOpsDir();
  res.ops = ops;
  if (!ops.exists) { res.reason = 'ops 目录不存在或不是目录：' + OPS_DIR; return res; }
  // 文件名升序：Array#sort 默认比较器就是 UTF-16 码点序，与 locale / 折叠大小写无关 → 跨机器确定性
  const names = ops.files.map((f) => f.replace(/\.json$/, '')).sort();
  for (const name of names) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(OPS_DIR, name + '.json'), 'utf8'));
    } catch (e) {
      res.anomalies.push(name + '(unreadable:' + (e.code || 'PARSE_ERR') + ')');
      continue;
    }
    if (!Array.isArray(raw.cases)) {
      // 「半个 manifest」在这里显性失败：cases 缺失 / cases 不是数组都算覆盖不全，
      // 因为这种文件里的用例既数不出来也排不出来，静默跳过就是当年那 157 例的成因
      res.anomalies.push(name + (raw && typeof raw === 'object' && 'cases' in raw
        ? '(cases_not_array:' + (Array.isArray(raw.cases) ? 'array' : typeof raw.cases) + ')'
        : '(cases_missing)'));
      continue;
    }
    if (!MANIFESTS[name] || !MANIFESTS[name].cases.length) {
      // 旧表没引用过的 ops 文件（round-6 的 次要18/次要19）必须由派生表补齐加载
      MANIFESTS[name] = { cases: raw.cases, byId: {} };
      for (const c of raw.cases) MANIFESTS[name].byId[c.id] = c;
    }
    if (!raw.cases.length) { res.emptyFiles.push(name); continue; }
    const groups = new Map(); // pageGroupKey -> 该页用例数
    for (const c of raw.cases) {
      const k = pageGroupKey(c);
      groups.set(k, (groups.get(k) || 0) + 1);
    }
    const pageKeys = [...groups.keys()].sort(); // 页名升序（同样 UTF-16 码点序）
    if (groups.has(NOPAGE_LABEL)) { res.nopageGroups++; res.nopageCases += groups.get(NOPAGE_LABEL); }
    res.scheduledFiles.push(name);
    res.pages += pageKeys.length;
    res.cases += raw.cases.length;
    for (const c of raw.cases) if (reqRealOf(c) === true) res.requiresReal++;
    for (let i = 0, seq = 1; i < pageKeys.length; i += MAX_PAGES_PER_SUITE, seq++) {
      const chunk = pageKeys.slice(i, i + MAX_PAGES_PER_SUITE);
      const suite = {
        id: 'P-' + name + '-' + String(seq).padStart(2, '0'),
        manifests: [name],
        pages: chunk,
        // 以下统计字段只用于打印/检查点审计，runSuite 只消费 id/manifests/pages
        planFile: name, planPages: chunk.length, planCases: 0, planRequiresReal: 0,
        planHasNopage: chunk.includes(NOPAGE_LABEL),
      };
      for (const { c } of suiteCases(suite)) { suite.planCases++; if (reqRealOf(c) === true) suite.planRequiresReal++; }
      res.suites.push(suite);
      res.maxPagesPerSuite = Math.max(res.maxPagesPerSuite, chunk.length);
    }
  }
  res.scheduled = res.suites.reduce((n, s) => n + s.planCases, 0);
  // 覆盖判定：派生表自己数出来的例数必须等于 ops 目录实读例数，且没有异常文件、没有漏排文件
  const uncovered = ops.files.map((f) => f.replace(/\.json$/, ''))
    .filter((n) => (ops.perFileCases[n] || 0) > 0
      && !res.scheduledFiles.includes(n) && !res.anomalies.some((a) => a.startsWith(n + '(')));
  res.uncoveredFiles = uncovered;
  const reasons = [];
  if (res.anomalies.length) reasons.push('无法解析或结构异常的 ops 文件：' + res.anomalies.join(',') + '（这些文件里的用例既数不出来也排不出来，coverage 分母不含它们，所以即使 coverage 显示 100% 也算覆盖不全）');
  if (uncovered.length) reasons.push('有用例但没被任何派生 Suite 覆盖的文件：' + uncovered.join(','));
  if (res.maxPagesPerSuite > MAX_PAGES_PER_SUITE) reasons.push('派生 Suite 页数越界：' + res.maxPagesPerSuite + '>' + MAX_PAGES_PER_SUITE);
  if (res.scheduled !== ops.cases) reasons.push(`排进 Suite 的例数 ${res.scheduled} != ops 目录实读例数 ${ops.cases}`);
  if (res.scheduled === 0) reasons.push('派生表为空（ops 目录：' + OPS_DIR + '）');
  res.complete = reasons.length === 0;
  res.reason = reasons.join('；');
  return res;
}

/** 旧硬编码表与 ops 实读的差集（仅打印对照，绝不参与能不能跑的判定） */
function legacyPlanDiff(ops) {
  const refs = [];
  for (const s of SUITES) for (const mf of s.manifests) if (!refs.includes(mf)) refs.push(mf);
  refs.sort();
  const inOps = ops.exists ? ops.files.map((f) => f.replace(/\.json$/, '')).sort() : [];
  const missing = refs.filter((r) => !inOps.includes(r));
  const uncovered = inOps.filter((f) => !refs.includes(f));
  const uncoveredCases = uncovered.reduce((n, f) => n + (ops.perFileCases[f] || 0), 0);
  let suited = 0;
  for (const s of SUITES) suited += suiteCases(s).length;
  return { refCount: refs.length, refs, missing, uncovered, uncoveredCases, suited };
}

const PLAN = SUITE_MODE === 'legacy' ? null : planSuitesFromOps();
// 真跑的表来源：legacy → 旧表；auto/derived → 派生表（覆盖不全时置空，禁止回落旧表静默少跑）
let ACTIVE_SUITES = SUITES;
let PLAN_FAIL = null;
if (PLAN) {
  if (PLAN.complete) ACTIVE_SUITES = PLAN.suites;
  else { ACTIVE_SUITES = []; PLAN_FAIL = PLAN.reason; }
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
  writeLock({ resource: LOCK_RESOURCE, owner: 'r1-exec-subagent-R1', pid: process.pid, batch: CKPT_TAG, status: 'LEASED', leaseUntil: new Date(t + 15 * 60 * 1000).toISOString(), attempt: ((l && l.attempt) || 0) + 1, acquiredAt: now() });
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
    return { round: CKPT_TAG, gitSha: GIT_SHA, script: 'scripts/qa/r-exec.cjs', startedAt: now(), suites: {}, failures: [] };
  }
}
function saveCkpt(c) { fs.mkdirSync(path.dirname(CKPT_FILE), { recursive: true }); c.updatedAt = now(); atomicWrite(CKPT_FILE, JSON.stringify(c, null, 1)); }
let RESULTS = { round: CKPT_TAG, gitSha: GIT_SHA, updatedAt: now(), results: [] };
let ACTIVE_CKPT = null;
try { const prev = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); if (prev && Array.isArray(prev.results)) RESULTS = prev; } catch (e) { /* fresh */ }
/* 权威件与检查点都必须"先写临时文件再原子改名"。
   直接 writeFileSync 一个几百 KB 的 JSON 会先截断再写，读者撞上中间态就是半篇文档——
   本轮 20:45:41 交接期实测读到 `rows=-1`（JSON 解析失败），而 §20 的冻结步、终报的复算
   都要在轮末读这份文件，撞上一次半写就会把"读不到"误报成"台账坏了"。
   同卷 rename 在 Windows/NTFS 上是替换语义，读者要么看到旧的完整文件、要么看到新的完整文件。 */
function atomicWrite(p, text) {
  const tmp = p + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, p);
}
function saveResults() { RESULTS.updatedAt = now(); fs.mkdirSync(INTERACT_DIR, { recursive: true }); atomicWrite(RESULTS_FILE, JSON.stringify(RESULTS, null, 1)); }
// 对账主键纪律（2026-09-25 接线修复）：suite = 派生规划器 id（P-<manifest>-<seq>），只用于
// console-<suite>.log 与检查点 ckpt.suites[<suite>] 续跑；manifest = ops 文件名去掉 .json，
// 是轮末队列对账唯一能与计划侧同轴的键。缺了 manifest，这一行在对账侧只能退回 suite 轴，
// 而 suite 轴与 ops 文件名天然零交集 —— 实测后果是「跑满 1107 例仍永远报 GAP=1107」。
// 因此在写入点就报，不留到轮末靠人读日志。
let RECONCILE_KEY_VIOLATIONS = 0;
function upsertResult(r) {
  if (typeof r.manifest !== 'string' || !r.manifest.trim()) {
    RECONCILE_KEY_VIOLATIONS++;
    console.error(`EXEC_RECONCILE_KEY=VIOLATION 行缺 manifest 字段（suite=${r.suite} id=${r.id}）：轮末对账将退回 suite 轴并与 ops 文件名零交集`);
  }
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
      mp = await automatorRequired().connect({ wsEndpoint: WS_ENDPOINT });
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
/* ================= .cmd 启动形态（node22 兼容，实测阻塞点） =================
 * node22 起 execFile/spawn 直接指向 .cmd/.bat 会**同步抛 spawn EINVAL**（Node 对 CVE-2024-27980 的
 * 收紧：Windows 下批处理必须经 shell 起）。实测现场：本轮 --all 跑到「每 15 例主动刷新」时
 * refreshSimulator 同步抛错 → new Promise 的 executor 抛出即 reject → 冒到 main().catch
 * → 整轮 EXIT=1，权威件停在第 15 例（.zcode/tmp/exec-wiring/run-A-e2e.log 原文）。
 * 后果不是少一条日志，而是**任何 >15 例的 Suite 都永远跑不完**（DISCOVER 45 例 / HOME 48 例），
 * 也就是队列对账永远补不满。复现与修法见 .zcode/tmp/exec-wiring/probe-cmd-shape.cjs：
 *   V1 现状 execFile(<.cmd>, args, {windows:true})  => SYNC THROW code=EINVAL
 *   V2 shell:true                                   => 正常，但参数被拼成字符串，路径含空格会拆
 *   V3 ComSpec + /d /s /c + 原 args                 => 正常，且 Node 仍逐参数加引号（本处采用）
 * 只换「起进程的目标」：回调、timeout、maxBuffer、windows 全部原样保留。
 * 同时把「恢复动作」恢复成 best-effort：刷新失败绝不允许再把整轮打死（try/catch 兜住同类变化步）。
 */
const CLI_LAUNCHER = process.env.ComSpec || 'cmd.exe';
function cliSpawnForm(invokedArgs) { return [CLI_LAUNCHER, ['/d', '/s', '/c', CLI_CMD, ...invokedArgs]]; }
function refreshSimulator() {
  return new Promise((resolve) => {
    let cmd, args;
    try { [cmd, args] = cliSpawnForm(['-c', 'ZCode', 'simulator_refresh', '--project', CLI_PROJECT]); }
    catch (e) { console.log('[recovery] simulator_refresh 启动形态不可用 ' + clampStr(e.message, 60) + '（降级为跳过刷新）'); resolve(); return; }
    try {
      execFile(cmd, args, { timeout: 90000, windows: true }, (err) => {
        console.log('[recovery] simulator_refresh ' + (err ? 'ERR ' + clampStr(err.message, 60) : 'ok'));
        resolve();
      });
    } catch (e) { console.log('[recovery] simulator_refresh THREW ' + clampStr(e.message, 60) + '（不再冒杀整轮）'); resolve(); }
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

/** 取证存在性校验（v3.2 补 D19）：只有"文件真在盘上且非零字节"才允许进 evidence[]。
 *  实测教训：round-6 的 701 条证据里 241 条指向盘上不存在的文件——截图调用超时后压根没写出来，
 *  却把"本该在的路径 + (ERROR:...)"当证据记了下来，后果是 281 条 EXECUTED 只有 111 条握有真图，
 *  零像素 60.5%（critical 档 30 条）。不存在的文件不得当证据，只能进 missingEvidence[] 供改判。 */
function evidenceVerdict(shot) {
  let size = -1;
  try { size = fs.statSync(shot.path).size; } catch (e) { size = -1; }
  if (shot.error) return { ok: false, miss: shot.path + '(未写出:ERROR:' + String(shot.error).slice(0, 60) + ' 盘上存在=' + (size >= 0) + ')' };
  if (size <= 0) return { ok: false, miss: shot.path + '(写出为 0 字节或不可读)' };
  return { ok: true, entry: shot.path + '(' + size + 'B)' };
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
    let cmd, spawnArgs;
    try { [cmd, spawnArgs] = cliSpawnForm(['-c', 'ZCode', ...args]); }
    catch (e) { resolve({ err: 'cli-spawn-form: ' + e.message, raw: '', json: null }); return; }
    try {
      execFile(cmd, spawnArgs, { timeout: timeoutMs || 60000, windows: true, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
        const raw = String(stdout || '') + String(stderr || '');
        const json = cliJson(raw);
        resolve({ err: err && err.message, raw, json });
      });
    } catch (e) { resolve({ err: 'cli-spawn: ' + e.message, raw: '', json: null }); }
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
const OBSERVE_MARKERS = /探测|观察|进入断言|进入后断言|无输入|无操作|不打点|等待|采样|复拍|双拍|连续截图|读取|读|检查|是否|核对|扫描|统计|列出|断言|冷启动|不操作|逐元素|确认后观察|落定后|启动后|进入页面后|截全页|首帧|触发返回|navigateBack|滚动|scroll|快照|观察卡片|静置|boundingClient|逐一取|测量|热区|fullPage|evaluate|getCurrentPages|width\/height|收集|network|停留|进入/;
/* 上面 读|检查|是否|核对|扫描|统计|列出 是本轮补的，不是顺手加宽——
   round-6 实测 135 条 `action-not-automatable: …` 里有 131 种不同写法，
   主力形态是 `读 .nearby-home__search-btn`、`检查 .match-info__intro 区域是否…` 这类观察型断言，
   而原表只有复合词 `读取`，`读` 后带空格接选择器的写法一条都命中不了（旧表对这 135 条命中 0 条）。
   判据有界：这条只在 `actOps.length === 0`（执行器一个可执行动作都没解析出来）时才被咨询。
   曾一度加过 `逐一`，实测会把 `逐个点击…（点击而非滑动）` 这类多点扫描吞成 observe-only，已撤。 */
/* 反向守卫：串里只要含"执行器真没有的 op"，就不许降级成 observe-only。
   实测 7 条能力缺口（拖动 / 滑块 / 连续滑动 / 依次点 / 逐个点击），其中 2 条同时还带"读、检查"字样
   （如 `① 登录态读 .discover-quota…；② 连续滑动 5 张后再读一次`），
   整体当"已观察"就是拿 observe-only 冒充被验，比如实 SKIPPED 更坏。
   词表来自本轮 SKIPPED 原文而非猜测；回归测试 scripts/qa/test-observe-markers.cjs 盯住这一条。 */
const UNIMPLEMENTABLE_ACTION_RE = /(拖动|拖拽|滑块|滑动|swipe|drag|长按|依次点|逐个点击)/i;
function isObserveOnly(action) {
  const s = String(action || '');
  return OBSERVE_MARKERS.test(s) && !UNIMPLEMENTABLE_ACTION_RE.test(s);
}
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
/* 渲染树标签预检：用一次 wxml 往返代替最多 400 次 text() 往返。
   下面页面级扫描的历史成本 = 每个"页面上真没有"的标签，都要把 400 个节点逐个 .text() 问一遍，
   实测把 round-6 后半程从 19.5s/条拖到 ~170s/条（监督器日志：一个 40 分钟 attempt 只推进 14 行）。
   判"没有"之前必须先确认手里这棵子树看起来就是页面根（class= 计数 ≥20，与实采 wxml 的量级一致）；
   拿不到就退回旧扫描 —— 宁可慢，也不允许把"探针没抓到根节点"说成"产品页面上没有这个文案"。 */
async function renderedLabelCheck(page, label) {
  const needle = String(label == null ? '' : label).replace(/\s+/g, "");
  if (!needle) return { verdict: "unknown", reason: "empty-label" };
  if (/[&<>"]/.test(needle)) return { verdict: "unknown", reason: "label-has-entity-char" };
  let root = null;
  try { root = await page.$('view'); } catch (e) { return { verdict: 'unknown', reason: 'root-error' }; }
  if (!root) return { verdict: 'unknown', reason: 'no-root-view' };
  let w = '';
  try { w = String(await root.wxml()); } catch (e) { return { verdict: 'unknown', reason: 'wxml-error' }; }
  const cls = (w.match(/class=/g) || []).length;
  if (cls < 20) return { verdict: 'unknown', reason: 'root-too-small(' + cls + ')' };
  const flat = w.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
  return { verdict: flat.indexOf(needle) >= 0 ? 'yes' : 'no', len: w.length, classes: cls };
}

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
  // 页面自身子树的最后一级回退。此前只遍历 components，而文案是 `{{e}}` 数据绑定的页面
  // （如 campus/circles 的 post-topic 提交钮 `.post-header__submit > .submit-text`）
  // 既不在候选类里、其**静态** wxml 又不含"发布"二字 → 标签解析直接落空，
  // 实测把 15 条用例打成 FAILED "element not found: __CAND__(\"发布\")"，
  // 而同一次执行抓到的渲染后 DOM 里 `class="submit-text">发布` 明明白白在屏上
  // （.zcode/tmp/publish-button-probe.cjs + wxml/SUBPACKAGES-CAMPUS-CAMPUS-POST-TOPIC-*.wxml）。
  // 也就是这是执行器找不到，不是产品没有——所以补页面级扫描，而不是去改用例文案。
  // 上限 400 个节点：本页节点数远小于此，纯防止一拖拖死整轮（同 :1211 的封顶思路）。
  const pre = await renderedLabelCheck(page, label);
  if (pre.verdict === 'no') {
    if (ctx) ctx.renderedMiss = 'label-不在渲染树("' + label + '" wxml=' + pre.len + 'B class=' + pre.classes + ')';
    return null;
  }
  if (ctx && pre.verdict === 'unknown') ctx.renderedProbe = '预检=' + pre.reason;
  const pageNodes = (await page.$$("view, text, button").catch(() => [])).slice(0, 400);
  for (const n of pageNodes) {
    const t = String(await n.text().catch(() => ''));
    if (t && t.includes(label)) return n;
  }
  return null;
}
/* 定位失败时必须把"找过什么"写进消息（v3.2 D22）。
   此前走候选解析且 op 无 label 时，消息只剩哨兵 __CAND__，既不写 label 也不写候选列表 ——
   round-6 有 41 条 FAILED 因此事后无法复核：分不清"页面上真没有"和"候选表本来就空"。
   纯诊断信息，不改变任何判定，所以可以在轮中生效。 */
function whatWasSearched(op, ctx) {
  var cands = [].concat((op && op.candidates) || [], (ctx && ctx.candidates) || []);
  var seen = {}, uniq = [];
  for (var i = 0; i < cands.length; i++) { var c = String(cands[i] || ''); if (c && !seen[c]) { seen[c] = 1; uniq.push(c); } }
  var bits = [];
  if (op && op.selector) bits.push('selector=' + op.selector);
  if (op && op.label) bits.push('label="' + op.label + '"');
  bits.push('candidates[' + uniq.length + ']=' + (uniq.slice(0, 8).join('|') || '(空)'));
  if (ctx && ctx.renderedMiss) bits.push(ctx.renderedMiss);
  if (ctx && ctx.renderedProbe) bits.push(ctx.renderedProbe);
  return bits.join(' ');
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
          throw new Error('element not found: ' + whatWasSearched(op, ctx));
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
        throw new Error('element not found: ' + whatWasSearched(op, ctx));
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
  const missingEvidence = [];
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
    upsertResult({ ...key, page: mc.page, tier, requiresReal: reqRealOf(mc), status: 'FAILED', observed: 'parse-error: ' + e.message, route: null, toast: [], console: [], evidence: [], durationMs: Date.now() - t0 });
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
      const vb = evidenceVerdict(b);
      if (vb.ok) evidence.push(vb.entry); else missingEvidence.push(vb.miss);
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
    if (!actOps.length && !isObserveOnly(mc.action || '') && !override) {
      upsertResult({
        ...key, page: mc.page, tier, requiresReal: reqRealOf(mc), title: mc.title, status: 'SKIPPED',
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
      const va = evidenceVerdict(a);
      if (va.ok) evidence.push(va.entry); else missingEvidence.push(va.miss);
      if (/复拍|双拍|连续截图|两次截图/.test(mc.action || '')) {
        await sleep(1800);
        const a2 = await screenshot(`${pageUp}-${mc.id}-after2`);
        const va2 = evidenceVerdict(a2);
        if (va2.ok) evidence.push(va2.entry); else missingEvidence.push(va2.miss);
      }
      if (tier === 'critical') {
        try {
          const page = await mp.currentPage();
          if (page) {
            const el = await page.$('view');
            if (el) { const w = await el.wxml(); const wp = path.join(WXML_DIR, `${pageUp}-${mc.id}-after.wxml`); fs.mkdirSync(WXML_DIR, { recursive: true }); fs.writeFileSync(wp, String(w)); let wsz = -1; try { wsz = fs.statSync(wp).size; } catch (e) {} if (wsz > 0) evidence.push(wp + '(' + wsz + 'B)'); else missingEvidence.push(wp + '(DOM 快照为空)'); }
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
      requiresReal: reqRealOf(mc),
      title: mc.title,
      status, observed, missingEvidence,
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
      ...key, page: mc.page, tier, requiresReal: reqRealOf(mc), title: mc.title, status: 'FAILED',
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
  // 套件起手这行是全进程生命周期里第一次写 INTERACT_DIR：saveResults() 的 mkdir 在 finally 里，
  // 赶不到前面。全新轮次目录（ops/ 是拷进去的、interact/ 还不存在）因此必然 ENOENT——
  // 21:24 用临时轮复测停轮旗标时撞到（round-6 因为目录早就存在，从未暴露）。
  fs.mkdirSync(INTERACT_DIR, { recursive: true });
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
            upsertResult({ suite: suite.id, manifest: mf2, id: cid, page: (MANIFESTS[mf2].byId[cid] || {}).page || '?', tier: (MANIFESTS[mf2].byId[cid] || {}).tier || '?', requiresReal: reqRealOf(MANIFESTS[mf2].byId[cid]), status: 'SKIPPED', observed: 'channel-lost after 3 reconnect attempts', route: null, toast: [], console: [], evidence: [] });
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
      if (rec.status === 'FAILED') {
        failed.push(rec.id);
        // v3.2 补 D21：检查点的 failures[] 从建场起就是恒空数组，等于这个字段没有信息量。
        // 这里按"最近 300 条"封顶写入，保证 checkpoint.failures[] 可被 verify-state-truth 直接消费。
        ckpt.failures = ckpt.failures || [];
        ckpt.failures.push({ at: now(), suite: suite.id, manifest: mf, id: rec.id, page: rec.page, reason: clampStr(rec.failureReason || rec.observed || '', 160) });
        if (ckpt.failures.length > 300) ckpt.failures.splice(0, ckpt.failures.length - 300);
      }
    }
    /* 停轮只能协作式：Windows 上 supervisor 的 child.kill('SIGTERM') 实为 TerminateProcess，
       process.on('SIGTERM') 永远不会跑（02:45 attempt 到点即实测：日志无 EXEC_SIGNAL、exit=-1）。
       所以编排层先 touch 旗标，执行员在每例收尾处检查：落权威件 + 落检查点 + 正常释锁 + 退 0。
       效果比信号钩子更强——它是"跑完这一例再停"，不丢在途结果。 */
    if (STOP_FLAG && fs.existsSync(STOP_FLAG)) {
      console.log('[suite ' + suite.id + '] 见到停轮旗标 ' + STOP_FLAG + '，在 ' + (done + 1) + '/' + cases.length + ' 例处体面收尾');
      saveResults();
      saveCkpt(ckpt);
      releaseLock();
      console.log('EXEC_STOPPED=clean suite=' + suite.id + ' done=' + done + ' rows=' + RESULTS.results.length + ' ckpt_failures=' + ((ckpt && ckpt.failures || []).length));
      process.exit(0);
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
  for (const s of ACTIVE_SUITES) for (const { mf, c } of suiteCases(s)) {
    total++;
    const preOps = expandOps(parseText(c.pre || '', 'pre'), mf);
    const actOps = expandOps(parseText(c.action || '', 'action'), mf);
    const meaningful = actOps.filter((o) => o.op !== 'wait');
    // 自检口径必须与 runSuite 里那条真实判据同一个函数，否则 dry-parse 报的"可执行率"
    // 会比真实跑出来的高——这就是"预检说没事、起跑才暴雷"的那类分裂。
    const observeOnly = isObserveOnly(c.action || '');
    if (meaningful.length || observeOnly) ok++;
    else { unknown++; unknownList.push(`${mf}:${c.id} :: ${clampStr(c.action, 70)}`); }
  }
  console.log(`dry-parse: total=${total} ok=${ok} unknown=${unknown} (${(100 * ok / total).toFixed(1)}%)`);
  unknownList.forEach((l) => console.log('  ', l));
}

/* ================= 自检（只打印派生结果与 ops 实读统计） =================
 * 硬约束：不 require automator、不 TCP 探测任何端口、不写任何证据/锁/检查点文件，
 * 且在 requirePort()/acquireLock() 之前就退出。统计为「本轮 ops 目录 manifest 的实读结果」，
 * 目录缺失或用例为空一律 FAIL —— 绝不允许自检查静默 0 通过（那正是本轮取证最致命的失效模式）。
 */
function statOrNull(p) { try { return fs.statSync(p); } catch (e) { return null; } }
function scanOpsDir() {
  const st = statOrNull(OPS_DIR);
  const out = { exists: !!(st && st.isDirectory()), files: [], perFileCases: {}, manifestsWithCases: 0, cases: 0, requiresReal: 0, realOnlyText: 0, realOnlyUnion: 0, unreadable: [] };
  if (!out.exists) return out;
  for (const f of fs.readdirSync(OPS_DIR).sort()) {
    if (!f.endsWith('.json')) continue;
    const p = path.join(OPS_DIR, f);
    const s = statOrNull(p);
    if (!s || !s.isFile()) continue;
    out.files.push(f);
    let raw;
    try { raw = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { out.unreadable.push(f + '=' + (e.code || 'PARSE_ERR')); continue; }
    const cases = Array.isArray(raw.cases) ? raw.cases : [];
    out.perFileCases[f.replace(/\.json$/, '')] = cases.length;
    if (!cases.length) continue;
    out.manifestsWithCases++;
    out.cases += cases.length;
    for (const c of cases) {
      const isRR = reqRealOf(c) === true;
      const isTxt = realOnlyTextOf(c);
      if (isRR) out.requiresReal++;
      if (isTxt) out.realOnlyText++;
      if (isRR || isTxt) out.realOnlyUnion++;
    }
  }
  return out;
}
function selfcheck() {
  const ops = scanOpsDir();
  let suitesWithCases = 0; let suitedCases = 0;
  for (const s of ACTIVE_SUITES) { const n = suiteCases(s).length; if (n) suitesWithCases++; suitedCases += n; }
  const lg = SUITE_MODE === 'legacy' ? null : legacyPlanDiff(ops);
  const legacySuited = lg ? lg.suited : suitedCases;
  const pathsLine = `round=${DIR_LABEL} ops=${OPS_DIR} shots=${SHOT_DIR} results=${RESULTS_FILE} ckpt=${CKPT_FILE} lock=${LOCK_FILE} portCandidates=${PORT_CANDIDATES.join(',')}`;
  console.log('EXEC_SELFCHECK_BEGIN ' + pathsLine);
  console.log(`EXEC_SELFCHECK derived wxml=${WXML_DIR} repo=${REPO} tag=${CKPT_TAG} port=${RUN_PORT} portDiscover=${PORT_DISCOVER} ws=${WS_ENDPOINT} probe=${SELF ? 'skipped' : PORT_DISCOVER}`);
  console.log(`EXEC_SUITES=${suitesWithCases} EXEC_SUITES_TOTAL=${ACTIVE_SUITES.length} EXEC_MANIFESTS=${ops.manifestsWithCases} EXEC_CASES=${ops.cases} EXEC_REAL_ONLY_CASES=${ops.realOnlyUnion}`);
  console.log(`EXEC_CASES_REQUIRESREAL=${ops.requiresReal} EXEC_CASES_REALONLY_TEXT=${ops.realOnlyText} EXEC_SUITED_CASES=${suitedCases} EXEC_OPS_FILES=${ops.files.length}`);
  console.log(`EXEC_SELFCHECK guards: automator_required=${automator ? 'YES(VIOLATION)' : 'no'} tcp_probe=${SELF ? 'skipped' : 'ran'} evidence_files_written=${SELF ? 'none(mkdir/write not reached)' : 'n/a'}`);
  if (ops.unreadable.length) console.log('EXEC_SELFCHECK unreadable_ops=' + ops.unreadable.join(','));
  if (MANIFEST_LOAD_ERRORS.length) console.log('EXEC_SELFCHECK missing_referenced_manifests=' + MANIFEST_LOAD_ERRORS.join(','));
  /* ===== 追加：Suite 规划表对照（legacy 模式不进入这里，历史轮输出逐字节不变） =====
   * 这三行是「规划阶段就拦住」的证据：旧表排了多少例、哪些 ops 文件旧表根本没引用、
   * 哪些旧表引用在 ops 里不存在，全部显性打印，再不允许靠启动行的排队数反推。 */
  if (SUITE_MODE !== 'legacy') {
    console.log(`EXEC_PLAN_SOURCE mode=${SUITE_MODE} active_suites=${ACTIVE_SUITES.length} table=${PLAN.complete ? 'derived_from_ops' : 'none(plan_failed_no_fallback)'} legacy_table_suites=${SUITES.length}`);
    console.log(`EXEC_PLAN_MODE=derived suites=${PLAN.suites.length} cases=${PLAN.scheduled} files=${PLAN.scheduledFiles.length} pages=${PLAN.pages}`);
    console.log(`EXEC_PLAN_COVERAGE=${PLAN.scheduled}/${ops.cases} pct=${ops.cases ? (100 * PLAN.scheduled / ops.cases).toFixed(2) : '0.00'}%`);
    console.log(`EXEC_PLAN_FILES=${PLAN.scheduledFiles.length}/${ops.files.length} empty_files=${PLAN.emptyFiles.join(',') || '-'} uncovered_files=${(PLAN.uncoveredFiles || []).join(',') || '-'}`);
    console.log(`EXEC_PLAN_MAX_PAGES_PER_SUITE=${PLAN.maxPagesPerSuite} limit=${MAX_PAGES_PER_SUITE} ok=${PLAN.maxPagesPerSuite <= MAX_PAGES_PER_SUITE ? 1 : 0}`);
    console.log(`EXEC_PLAN_NOPAGE_GROUPS=${PLAN.nopageGroups} EXEC_PLAN_NOPAGE_CASES=${PLAN.nopageCases}（page 缺失用例归 (nopage) 组，不丢弃）`);
    console.log(`EXEC_PLAN_REQUIRESREAL=${PLAN.requiresReal}/${PLAN.scheduled}`);
    if (PLAN.anomalies.length) console.log('EXEC_PLAN_ANOMALY_FILES=' + PLAN.anomalies.join(','));
    console.log(`EXEC_PLAN_LEGACY_REFS=${lg.refCount} EXEC_PLAN_LEGACY_SUITED_CASES=${lg.suited}/${ops.cases} EXEC_PLAN_LEGACY_SUITES_TOTAL=${SUITES.length} EXEC_PLAN_LEGACY_SUITES_WITH_CASES=${SUITES.filter((s) => suiteCases(s).length).length}`);
    console.log(`EXEC_PLAN_LEGACY_MISSING_REFS=${lg.missing.join(',') || '-'}`);
    console.log(`EXEC_PLAN_LEGACY_UNCOVERED_FILES=${lg.uncovered.join(',') || '-'} EXEC_PLAN_LEGACY_UNCOVERED_CASES=${lg.uncoveredCases}`);
    for (const s of PLAN.suites) {
      console.log(`EXEC_PLAN_SUITE id=${s.id} manifest=${s.manifests[0]} pages=${s.pages.length} cases=${s.planCases} requiresReal=${s.planRequiresReal} nopage=${s.planHasNopage ? 1 : 0} page_list=${s.pages.join('|')}`);
    }
    console.log(`EXEC_PLAN_IDS=${PLAN.suites.map((s) => s.id).join(',')}`);
  }
  if (!ops.exists) {
    console.log(`EXEC_SELFCHECK=FAIL reason=ops 目录无用例（ops 目录不存在：${OPS_DIR}）round=${DIR_LABEL}`);
    process.exit(2);
  }
  if (ops.cases === 0) {
    console.log(`EXEC_SELFCHECK=FAIL reason=ops 目录无用例（${OPS_DIR} 内 ${ops.files.length} 个文件、0 条 cases）round=${DIR_LABEL}`);
    process.exit(2);
  }
  if (MANIFEST_LOAD_ERRORS.length) {
    if (SUITE_MODE === 'legacy') {
      console.log(`EXEC_SELFCHECK=FAIL reason=ops 目录 manifest 不全（SUITES 引用但读不到：${MANIFEST_LOAD_ERRORS.join(',')}）round=${DIR_LABEL} EXEC_SUITES=${suitesWithCases}/${SUITES.length}`);
      process.exit(2);
    }
    // 派生模式下旧表不是权威表：缺失引用只作为「旧表已过期」的事实打印，不作为 FAIL；
    // 真正决定是否可跑的是下面的 EXEC_PLAN_COVERAGE 门禁。
    console.log(`EXEC_SELFCHECK note=旧表有 ${MANIFEST_LOAD_ERRORS.length} 个引用在 ops 目录不存在（${MANIFEST_LOAD_ERRORS.join(',')}），当前模式=${SUITE_MODE} 不以旧表为准，故不作 FAIL`);
  }
  if (SUITE_MODE !== 'legacy') {
    if (!PLAN.complete || PLAN.scheduled !== ops.cases) {
      const why = PLAN.scheduled !== ops.cases
        ? PLAN.reason + `；重算：排进 Suite ${PLAN.scheduled} != ops 实读 ${ops.cases}`
        : PLAN.reason;
      console.log(`EXEC_SELFCHECK=FAIL reason=派生表覆盖不全（${why}）round=${DIR_LABEL} mode=${SUITE_MODE} coverage=${PLAN.scheduled}/${ops.cases} 禁止回落旧表（旧表只能排 ${legacySuited} 例，回落即静默少跑）`);
      process.exit(2);
    }
    if (ACTIVE_SUITES !== PLAN.suites) {
      console.log(`EXEC_SELFCHECK=FAIL reason=派生表覆盖完整却没被采用（active_table=${ACTIVE_SUITES === SUITES ? 'legacy' : 'other'}）round=${DIR_LABEL}`);
      process.exit(2);
    }
  }
  if (automator) {
    console.log('EXEC_SELFCHECK=FAIL reason=自检模式竟然 require 了 automator');
    process.exit(2);
  }
  console.log('EXEC_SELFCHECK=OK ' + pathsLine);
  console.log('EXEC_SELFCHECK=OK no_port_probe=1 no_automator_require=1 no_evidence_write=1');
  if (SUITE_MODE !== 'legacy') {
    console.log(`EXEC_SELFCHECK=PASS mode=${SUITE_MODE} table=derived suites=${PLAN.suites.length} coverage=${PLAN.scheduled}/${ops.cases} max_pages_per_suite=${PLAN.maxPagesPerSuite} nopage_groups=${PLAN.nopageGroups} legacy_would_schedule=${legacySuited}/${ops.cases}`);
  }
  process.exit(0);
}

/* ================= main ================= */
async function main() {
  const args = process.argv.slice(2);
  console.log(`[exec] r-exec parser-r6 startup round=${DIR_LABEL} tag=${CKPT_TAG} ${now()}`);
  if (SELF) { selfcheck(); return; }
  // 规划门禁：派生表覆盖不全 → 一条都不跑（此时 ACTIVE_SUITES 已被置空，绝不允许拿旧表凑数）
  if (PLAN_FAIL) {
    console.error('EXEC_PLAN=FAIL mode=' + SUITE_MODE + ' round=' + DIR_LABEL + ' reason=派生表覆盖不全（' + PLAN_FAIL + '）');
    console.error('EXEC_PLAN=FAIL 已拒绝起跑：ACTIVE_SUITES=0，未连端口、未取锁、未写证据。要看明细跑 EXEC_SELFCHECK=1；要复现历史轮数字显式 EXEC_SUITE_MODE=legacy。');
    process.exit(2);
  }
  console.log(`EXEC_PLAN mode=${SUITE_MODE} table=${SUITE_MODE === 'legacy' ? 'legacy_hardcoded' : 'derived_from_ops'} suites=${ACTIVE_SUITES.length}`);
  if (args.includes('--dry-parse')) { dryParse(); return; }
  if (args.includes('--discover')) {
    const p = await precheckPort();
    console.log(`EXEC_PORT=${p || 'none'} discover=${PORT_DISCOVER} portCandidates=${PORT_CANDIDATES.join(',')}`);
    if (!p) { console.error('EXEC_PRECHECK=FAIL reason=无自动化端口在听 candidates=' + PORT_CANDIDATES.join(',') + ' round=' + DIR_LABEL); process.exit(2); }
    return;
  }
  if (args.includes('--parse-case')) {
    const [mf, id] = args[args.indexOf('--parse-case') + 1].split(':');
    const mc = MANIFESTS[mf].byId[id];
    console.log('PRE ops:', JSON.stringify(expandOps(parseText(mc.pre || '', 'pre'), mf), null, 1));
    console.log('ACT ops:', JSON.stringify(expandOps(parseText(mc.action || '', 'action'), mf), null, 1));
    return;
  }
  await requirePort();
  const rerunIds = process.env.RERUN_CASES ? process.env.RERUN_CASES.split(',').map((s) => s.trim()) : null;
  const ckpt = loadCkpt();
  ACTIVE_CKPT = ckpt;
  if (!acquireLock()) { console.error('LOCK_BUSY'); process.exit(3); }
  startHeartbeat();
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.mkdirSync(WXML_DIR, { recursive: true });
  let exitCode = 0;
  try {
    if (args.includes('--suite')) {
      const want = args[args.indexOf('--suite') + 1];
      const s = ACTIVE_SUITES.find((x) => x.id === want);
      if (!s) throw new Error(`suite not found in active table (mode=${SUITE_MODE}, suites=${ACTIVE_SUITES.length})：先看 EXEC_SELFCHECK=1 的 EXEC_PLAN_IDS=`);
      const r = await runSuite(s, ckpt, rerunIds);
      if (r && r.aborted) exitCode = 2;
    } else if (args.includes('--all')) {
      for (const s of ACTIVE_SUITES) {
        const r = await runSuite(s, ckpt, null);
        if (r && r.aborted) { exitCode = 2; break; }
      }
    } else {
      /* 没给模式却退出码 0：21:23 实测一次误调用（不带参数的 r-exec）打了 usage 就安静结束，
         0 用例、0 报错、exit 0 —— 调用方无法区分"跑完了"和"根本没跑"。误调用必须是失败。 */
      console.error('EXEC_USAGE=FAIL 必须显式指定 --dry-parse | --suite <id> | --all（不给模式不再当成功处理）');
      exitCode = 2;
    }
  } finally {
    try { if (mp && connected) await mp.disconnect(); } catch (e) { /* ignore */ }
    saveResults();
    saveCkpt(ckpt);
    console.log(`EXEC_RECONCILE_KEY axis=manifest rows=${RESULTS.results.length} violations=${RECONCILE_KEY_VIOLATIONS} manifests=${new Set(RESULTS.results.map((x) => x.manifest).filter(Boolean)).size} plan_suites=${new Set(RESULTS.results.map((x) => x.suite)).size}`);
    if (RECONCILE_KEY_VIOLATIONS) console.error('EXEC_RECONCILE_KEY=FAIL 有行缺 manifest 字段，队列对账无法按 ops 文件名核到这些用例');
    releaseLock();
  }
  process.exit(exitCode);
}
/* v3.2 补 D20：硬停也必须把已跑用例落盘并正常释锁。监督器每 20 分钟走
 * SIGTERM→(20s)→SIGKILL 这条路，没有钩子的结果是每轮边界都可能丢最后几条、
 * 并留下一把死主 LEASED 的锁（round-6 在 00:11 与 01:57 各吃一次，只能靠 stale-pid 接管）。*/
let SHUTTING_DOWN = false;
function emergencyFlush(sig) {
  if (SHUTTING_DOWN) return;
  SHUTTING_DOWN = true;
  let n = -1, cf = -1;
  try { saveResults(); n = RESULTS.results.length; } catch (e) { }
  try { if (ACTIVE_CKPT) { saveCkpt(ACTIVE_CKPT); cf = (ACTIVE_CKPT.failures || []).length; } } catch (e) { }
  console.log('EXEC_SIGNAL=' + sig + ' flushed_rows=' + n + ' ckpt_failures=' + cf);
  try { releaseLock(); } catch (e) { }
  process.exit(17);
}
for (const sig of ['SIGINT', 'SIGTERM']) { process.on(sig, () => emergencyFlush(sig)); }
/* 测试钩子（v3.2 补 D20 的自检缺口）：本轮三次实测 —— ①监督器 child.kill('SIGTERM')、
   ②监督器 child.kill('SIGINT')、③进程内 process.kill(process.pid,'SIGINT')，
   在 Windows 上都送不到上面这两个监听器（②③见 test-signal-flush.cjs 与 sigprobe 的实测输出）。
   也就是说"钩子存在"在这台机器上是一条**无法用信号验证**的保证。为了不把 D20 留成一个装饰性承诺，
   给落盘逻辑本身开一条不依赖信号送达的验证路径：设 EXEC_SELF_FLUSH=<ms> 即定时自我调用同一个
   emergencyFlush（信号名记 SELF-FLUSH，与真实信号区分）。默认不设 ⇒ 生产路径零影响。 */
if (Number(process.env.EXEC_SELF_FLUSH) > 0) {
  setTimeout(() => emergencyFlush('SELF-FLUSH'), Number(process.env.EXEC_SELF_FLUSH));
}

main().catch((e) => { console.error('FATAL', e.message); releaseLock(); process.exit(1); });
