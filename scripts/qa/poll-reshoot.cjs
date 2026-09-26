#!/usr/bin/env node
'use strict';
/*
 * scripts/qa/poll-reshoot.cjs —— round-6「stateNotApplied(aliasLabel:false)」补拍判据工具
 *
 * 唯一职责：把「帧与前一帧字节相同」这一条**歧义**拆成两个可判定的结论。
 *   tour-R6.mjs 的 A-2 规则（.zcode/tmp/tour-R6.mjs:1338-1410 交互块 + save() 去重）产出 37 条
 *   stateNotApplied，其中 aliasLabel:false 的若干条同时兼容两种解释：
 *     (1) 产品缺陷 —— 点下去什么都没发生（按钮死、弹层不出现、校验不触发）；
 *     (2) harness 缺陷 —— 截图采早了，状态当时还没渲染（tour 是固定 sleep 1800/1500/600ms）。
 *   本工具不靠断言消歧：重做**同一次交互**，然后在时间线上按 400ms 轮询页面签名（route + 元素计数 +
 *   文本摘要），把「第几拍才变」这件事本身作为证据落盘。
 *     「第 5 拍 t=2000ms 才变」  ⇒ STATE_APPLIED_LATE = 上一轮采早了（harness 计时问题）
 *     「8s 内 N 拍签名逐拍相同」  ⇒ NO_STATE_CHANGE   = 产品缺陷候选（这才允许这么写）
 *
 * 可比性是前提：触发用的选择器列表**逐字抄** tour-R6.mjs:1061-1069 与 tapSelector 语义(:1031-1038)，
 * 补拍还是找不到东西时，它意味着和上一轮完全相同的事情，而不是另一个新实验。
 *
 * 运行档位（本次交付只允许前两档）：
 *   node scripts/qa/poll-reshoot.cjs --derive-only    # 只读 manifest 派生目标表；不 require automator、不碰端口、不写 reports/
 *   node scripts/qa/poll-reshoot.cjs --selfcheck      # 纯逻辑自检 + 临时目录锁探针；同上三条硬闸
 *   D:\codex-tools\node-v22.17.0-win-x64\node.exe scripts/qa/poll-reshoot.cjs   # 真实补拍（须 UI 空闲）
 *
 * env 旋钮（全部有默认值，端口绝不写死 —— 本仓实测端口 9420→9430→9431 漂移过，见 r-exec.cjs:125-190）：
 *   RESHOOT_PORT_CANDIDATES=9420,9430,9431   RESHOOT_WS_ENDPOINT=ws://127.0.0.1:9431（显式覆盖即不探测）
 *   RESHOOT_NODE22_DIR=D:\codex-tools\node-v22.17.0-win-x64
 *   RESHOOT_LOCK_DIR（默认 tmp/qa/locks；自检必须注入临时目录）  RESHOOT_LOCK_OWNER  RESHOOT_BATCH
 *   RESHOOT_TAKEOVER_FOREIGN_STALE=1        # 默认关闭：本工具绝不改写他人锁文件（含陈旧墓碑）
 *   RESHOOT_POLL_INTERVAL_MS=400  RESHOOT_POLL_TIMEOUT_MS=8000  RESHOOT_MAX_POLLS=60
 *   RESHOOT_SIG_TEXT_MAX=8  RESHOOT_RPC_TIMEOUT_MS=6000  RESHOOT_TARGET_BUDGET_MS=180000
 *   RESHOOT_NAV_WAIT_MS=15000  RESHOOT_IDENT=S01
 *
 * 为什么是 .cjs：PATH 上的 node 是 v16，对 .mjs 跑 `node --check` 会假失败（本仓已记录的坑），
 * .cjs 才让语法自检真的可用；automator 又只在 node22 的 global node_modules 里 ⇒ 沿用 r-exec.cjs
 * 的 createRequire 垫片 + **延后 require**（自检档走到退出都不该加载它）。
 */

const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');

/* ================= 档位 =================
 * derive/selfcheck 是「离线档」：三件事在架构上就被闸住 —— automator 不 require、
 * 不 TCP 连接、只写 .zcode/tmp/reshoot/。判据不是「记得别调用」，而是下面 GUARD + writeOut() 的
 * 白名单：越界写会抛，自检再断言这些计数器为零。 */
const argv = process.argv.slice(2);
const MODE = (() => {
  const d = argv.includes('--derive-only');
  const s = argv.includes('--selfcheck');
  if (d && s) { console.log('RESHOOT_RESULT=FAIL reason=--derive-only 与 --selfcheck 互斥'); process.exit(2); }
  if (d) return 'derive';
  if (s) return 'selfcheck';
  if (argv.includes('--help') || argv.includes('-h')) return 'help';
  if (argv.length && argv[0].indexOf('--') === 0) {
    console.log('RESHOOT_RESULT=FAIL reason=未知参数 ' + argv[0] + '（接受 --derive-only | --selfcheck | --help）');
    process.exit(2);
  }
  return 'real';
})();
const OFFLINE = MODE === 'derive' || MODE === 'selfcheck';

const ENV = (k, d) => (process.env[k] === undefined || process.env[k] === '' ? d : process.env[k]);

/* ================= 路径 ================= */
// RESHOOT_MANIFEST 只用于「空扫描集必须 FAIL」这条闸的离线验证（真实轮不传 → 行为与逐字改前一致）
const MANIFEST_IN = path.resolve(REPO, ENV('RESHOOT_MANIFEST', 'reports/screenshots/round-6-tour/manifest-detail.json'));
const SHOT_DIR = path.join(REPO, 'reports', 'screenshots', 'round-6-reshoot');
const AUDIT_DIR = path.join(REPO, 'reports', 'audit', 'round-6', 'reshoot');
const TMP_DIR = path.join(REPO, '.zcode', 'tmp', 'reshoot');
const SHOT_MANIFEST = path.join(SHOT_DIR, 'manifest-detail.json');
const AUDIT_JSON = path.join(AUDIT_DIR, 'reshoot.json');
const AUDIT_MD = path.join(AUDIT_DIR, 'reshoot.md');
const REAL_LOCK_DIR = path.join(REPO, 'tmp', 'qa', 'locks');

/* ================= 写出白名单（离线档唯一的落盘根 = .zcode/tmp/reshoot/） ================= */
const GUARD = {
  automatorRequired: false,
  tcpConnectAttempts: [],  // 真做过 net.connect 的端口；离线档必须恒为空
  blockedTcp: 0,           // 想连但被离线闸拦下的次数（证明闸在管事前，而不是没人按按钮）
  writes: [],              // { rel, allowed }
};
function toRel(p) { return path.relative(REPO, p).split(path.sep).join('/'); }
function isUnder(p, root) {
  const a = path.resolve(p);
  const b = path.resolve(root);
  return a === b || a.indexOf(b + path.sep) === 0;
}
const WRITE_ROOTS = OFFLINE ? [TMP_DIR] : [SHOT_DIR, AUDIT_DIR, TMP_DIR, path.resolve(ENV('RESHOOT_LOCK_DIR', REAL_LOCK_DIR))];
function writeOut(absPath, text) {
  const rel = toRel(absPath);
  if (!WRITE_ROOTS.some((r) => isUnder(absPath, r))) {
    GUARD.writes.push({ rel: rel, allowed: false });
    // 失败模式：离线档把「没连接」写成「没证据也没关系」——这里直接抛，宁可不产出。
    throw new Error('WRITE_FENCE 拒绝写 ' + rel + '（mode=' + MODE + ' 允许根=' + WRITE_ROOTS.map(toRel).join(',') + '）');
  }
  GUARD.writes.push({ rel: rel, allowed: true });
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, text);
  return rel;
}

/* ================= automator 延后加载（抄 r-exec.cjs:63-75 的 createRequire 垫片） =================
 * automator 只存在于 node22 的 global node_modules，而 --derive-only/--selfcheck 用 PATH 上的 node16
 * 也能跑：所以必须 lazy require，离线档永远不触发。 */
const NODE22_DIR = ENV('RESHOOT_NODE22_DIR', 'D:\\codex-tools\\node-v22.17.0-win-x64');
const require2 = createRequire(path.join(NODE22_DIR, 'node_modules', 'package.json'));
let automator = null;
function automatorRequired() { GUARD.automatorRequired = true; if (!automator) automator = require2('miniprogram-automator'); return automator; }

/* ================= 端口发现（抄 r-exec.cjs:125-190；端口写死是本仓实测最致命的失效模式） =================
 * 9420 无人监听时照固定端口跑完整一轮 = 0 条 UI 证据且不报错。候选逐个 TCP 探测，一个都没听到就 exit 2。 */
const PORT_CANDIDATES = String(ENV('RESHOOT_PORT_CANDIDATES', '9420,9430,9431'))
  .split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0 && n < 65536);
const PROBE_TIMEOUT_MS = Number(ENV('RESHOOT_PROBE_TIMEOUT_MS', 800)) > 0 ? Number(ENV('RESHOOT_PROBE_TIMEOUT_MS', 800)) : 800;
const portFromEndpoint = (ep) => { const m = /:(\d{2,5})(?:[/?]|$)/.exec(String(ep).replace(/^wss?:\/\//, '')); return m ? Number(m[1]) : null; };
let RUN_PORT = null;
let PORT_SOURCE = 'none';   // env | probe | none
let WS_ENDPOINT = null;
function setPort(p, how) { RUN_PORT = p; PORT_SOURCE = how; WS_ENDPOINT = 'ws://127.0.0.1:' + p; return p; }
function tcpProbe(port) {
  if (OFFLINE) { GUARD.blockedTcp += 1; return Promise.resolve(false); }  // 离线闸：连三次握手都不做
  return new Promise((resolve) => {
    let settled = false;
    GUARD.tcpConnectAttempts.push(port);
    const sock = net.connect({ host: '127.0.0.1', port });
    const done = (ok) => { if (settled) return; settled = true; try { sock.destroy(); } catch (e) { /* ignore */ } resolve(ok); };
    sock.setTimeout(PROBE_TIMEOUT_MS);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
    sock.once('close', () => done(false));
  });
}
async function discoverPort() {
  const ep = String(ENV('RESHOOT_WS_ENDPOINT', '')).trim();
  if (ep) {
    const p = portFromEndpoint(ep);
    if (!p) { console.log('RESHOOT_RESULT=FAIL reason=RESHOOT_WS_ENDPOINT 无法解析端口 ' + ep); process.exit(2); }
    setPort(p, 'env');
    console.log('RESHOOT_PORT=' + p + ' source=env endpoint=' + ep + '（显式覆盖，未探测）');
    return p;
  }
  if (!PORT_CANDIDATES.length) { console.log('RESHOOT_RESULT=FAIL reason=RESHOOT_PORT_CANDIDATES 无合法端口'); process.exit(2); }
  for (const p of PORT_CANDIDATES) {
    const listening = await tcpProbe(p);
    console.log('[precheck] tcp-probe 127.0.0.1:' + p + ' => ' + (listening ? 'LISTENING' : 'no-listener'));
    if (listening) {
      setPort(p, 'probe');
      console.log('RESHOOT_PORT=' + p + ' source=probe candidates=' + PORT_CANDIDATES.join(','));
      return p;
    }
  }
  PORT_SOURCE = 'none';
  console.log('RESHOOT_RESULT=FAIL reason=候选端口均无监听者，禁止固定端口硬跑（那会产出 0 条 UI 证据却报成功） candidates=' + PORT_CANDIDATES.join(','));
  process.exit(2);
  return null;
}

/* ================= UI 锁（语义抄 r-exec.cjs + .zcode/tmp/tour-R6.mjs:678-760） =================
 * 工厂化而不是模块级单例：自检档必须能拿一个临时目录跑完整 acquire/BUSY/takeover/release 序列，
 * 却一次都不碰真实 tmp/qa/locks/（那里既有活锁也有历史轮墓碑，本工具一律不删不改）。 */
const LOCK_OWNER = ENV('RESHOOT_LOCK_OWNER', 'poll-reshoot-subagent');
const LOCK_BATCH = ENV('RESHOOT_BATCH', 'R6-reshoot');
const LEASE_MS = Number(ENV('RESHOOT_LEASE_MS', 15 * 60 * 1000));
const HEARTBEAT_MS = Number(ENV('RESHOOT_HEARTBEAT_MS', 4000));
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}
function makeLockCtl(opts) {
  const dir = path.resolve(opts.dir);
  const resource = opts.resource;      // 探针锁一律带 -probe 后缀，绝不与真实墓碑同名（tour-R6.mjs:76-77 同款口径）
  const owner = opts.owner;
  const file = path.join(dir, resource + '.lock');
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; } };
  const write = (patch) => {
    const l = Object.assign({}, read() || {}, patch, { lastHeartbeat: new Date().toISOString() });
    fs.mkdirSync(dir, { recursive: true });
    writeOut(file, JSON.stringify(l, null, 1));
    return l;
  };
  // 返回 'ACQUIRED' | 'BUSY'（他人活锁 —— 本轮要求的判据输出即这一条）| 'FOREIGN'（他人墓碑/过期锁，
  // 默认绝不改写，含「看起来可以复用」的情况；只有显式开关 + 租约过期 + 属主 pid 已死才接管）。
  const acquire = () => {
    const l = read();
    const t = Date.now();
    const leased = !!(l && l.status === 'LEASED' && l.leaseUntil && new Date(l.leaseUntil).getTime() + 30000 > t);
    if (l && l.owner && l.owner !== owner) {
      // 活租约一律 BUSY：即使 pid 看起来已死，租约没到期就仍按「有人在用」处理（r-exec/tour 同口径）
      if (leased) return { state: 'BUSY', lock: l };
      if (!opts.allowForeignTakeover) return { state: 'FOREIGN', lock: l };
      if (l.pid && pidAlive(l.pid)) return { state: 'BUSY', lock: l };
      write({ resource: resource, owner: owner, pid: process.pid, batch: LOCK_BATCH, status: 'LEASED',
        leaseUntil: new Date(t + LEASE_MS).toISOString(), attempt: ((l.attempt || 0) + 1),
        acquiredAt: new Date(t).toISOString(), takenOverFromOwner: l.owner, takenOverFromPid: l.pid });
      return { state: 'ACQUIRED', lock: read(), takeover: 'foreign-stale' };
    }
    if (l && l.owner === owner && leased) {
      if (l.pid === process.pid) { write({ leaseUntil: new Date(t + LEASE_MS).toISOString() }); return { state: 'ACQUIRED', lock: read(), renewal: true }; }
      if (l.pid && !pidAlive(l.pid)) {
        write({ pid: process.pid, leaseUntil: new Date(t + LEASE_MS).toISOString(), attempt: ((l.attempt || 0) + 1), takenOverAt: new Date(t).toISOString() });
        return { state: 'ACQUIRED', lock: read(), takeover: 'stale-own-pid' };
      }
      return { state: 'BUSY', lock: l };
    }
    if (l && l.owner === owner && l.pid && pidAlive(l.pid) && !leased) {
      // 同 owner 活进程但租约已过期：仍按 BUSY 处理，避免两个驱动各自认为独占同一 UI 会话。
      return { state: 'BUSY', lock: l };
    }
    write({ resource: resource, owner: owner, pid: process.pid, batch: LOCK_BATCH, status: 'LEASED',
      leaseUntil: new Date(t + LEASE_MS).toISOString(), attempt: ((l && l.attempt) || 0) + 1, acquiredAt: new Date(t).toISOString() });
    return { state: 'ACQUIRED', lock: read() };
  };
  const heartbeat = () => {
    const l = read();
    if (l && l.owner === owner && l.pid === process.pid) write({ leaseUntil: new Date(Date.now() + LEASE_MS).toISOString() });
    return l;
  };
  // 释锁只动**自己持有**的那把；写 status=released 墓碑后不删文件（留墓碑给下游核对）。
  const release = () => {
    const l = read();
    if (l && l.owner === owner && l.pid === process.pid) { write({ status: 'released', releasedAt: new Date().toISOString() }); return true; }
    return false;
  };
  return { file: file, dir: dir, resource: resource, owner: owner, read: read, acquire: acquire, heartbeat: heartbeat, release: release };
}

/* ================= 判据枚举 ================= */
const VERDICTS = ['STATE_APPLIED_LATE', 'STATE_APPLIED_EARLY', 'NO_STATE_CHANGE', 'NO_TRIGGER_FOUND',
  'NAV_ERROR', 'IDENTITY_UNAVAILABLE', 'LOCK_BUSY', 'CONN_ABORT'];
// 每个枚举值必须有产出路径（自检按这张表判「分类学是全覆盖的」，而不靠人记住漏了谁）
const VERDICT_PRODUCERS = {
  STATE_APPLIED_LATE: 'classifyPoll()',
  STATE_APPLIED_EARLY: 'classifyPoll()',
  NO_STATE_CHANGE: 'classifyPoll()',
  NO_TRIGGER_FOUND: 'runTarget() tapSelector 未命中',
  NAV_ERROR: 'runTarget() 导航落地复核 + classifyPoll() 路由离开（D8 落点分诊）',
  IDENTITY_UNAVAILABLE: 'ensureIdentity()',
  LOCK_BUSY: 'main() 锁闸（不连接即退出，exit 3）',
  CONN_ABORT: 'connectAndPrepare() / 目标期整体异常',
};

/* ================= 触发语义：逐字抄 tour-R6.mjs =================
 * 列表来源 .zcode/tmp/tour-R6.mjs:1061-1069；命中语义 tapSelector 来源 :1031-1038（按序取第一个
 * page.$() 命中的元素并 tap()，返回该选择器；全不命中返回 ''）。
 * 状态→列表的对应来源：交互后 :1342 用 TAP_GENERIC；弹层态 :1367 用 TAP_OVERLAY；
 * 校验错误 :1399（formStates，表单页）用 TAP_SUBMIT。补拍若仍找不到东西 = 与上一轮同一件事。 */
const TAP_GENERIC = ['.card', '.list-item', '.cell', '.item-card', '.tab-item', '.menu-item', '.nav-item',
  '.msg-item', '.message-item', '.post-item', '.topic-item', '.entry-item', '.grid-item', '.user-card',
  '.feed-card', '.action-btn', '.btn', '.button', 'button',
  '.quick-card', '.assistant-card', '.chat-item', '.activity-rec-card', '.warm-item',
  '[class*="card"]', '[class*="btn"]', '[class*="item"]', '[class*="tab"]', '[class*="entry"]', '[class*="cell"]'];
const TAP_OVERLAY = ['[class*="fab"]', '[class*="filter"]', '[class*="share"]', '[class*="more"]',
  '[class*="popup"]', '[class*="publish-btn"]', '[class*="add-btn"]', '[class*="menu-btn"]', '[class*="overlay-open"]',
  '[class*="float"]', '[class*="expand"]', '[class*="drawer"]', '[class*="sheet"]', '[class*="menu"]'];
const TAP_SUBMIT = ['.btn-submit', '.submit-btn', '[class*="submit"]', '.btn-primary', '.primary-btn', 'button'];
// 表单页集合抄 tour-R6.mjs:473-479 —— 只用来记录「校验错误态在本轮语义下是否可达」，不改选择器列表。
const FORM_PAGES = new Set([
  'pages/login/index', 'pages/register/index',
  'subpackages/village/village/publish',
  'subpackages/circles/circles/post-topic', 'subpackages/campus/campus/post-topic',
  'subpackages/support/feedback/index', 'subpackages/setup/profile/index',
]);
function triggerListFor(state) {
  if (state === '交互后') return { name: 'TAP_GENERIC', list: TAP_GENERIC, tourRef: 'tour-R6.mjs:1342,1061-1065', settleMs: 1800 };
  if (state === '弹层态') return { name: 'TAP_OVERLAY', list: TAP_OVERLAY, tourRef: 'tour-R6.mjs:1367,1066-1068', settleMs: 1500 };
  if (state === '校验错误') return { name: 'TAP_SUBMIT', list: TAP_SUBMIT, tourRef: 'tour-R6.mjs:1399,1069', settleMs: 600 };
  return null; // 空态/数据态/滚动-* 由内容存在性定义，不是「点一下」交互态，本工具不重拍
}

/* ================= 纯逻辑：目标派生 =================
 * 绝不写死条数：条数、组合数、被排除的 aliasLabel:true 条数全部从文件实读并打印。
 * 空扫描集一律 FAIL —— 本仓反复吃过「0 命中却像通过」这一类。 */
function sha16(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16); }
function deriveTargets(manifest) {
  const all = Array.isArray(manifest.stateNotApplied) ? manifest.stateNotApplied : [];
  const targets = all.filter((x) => x && x.aliasLabel === false);
  const aliasTrue = all.filter((x) => x && x.aliasLabel === true).length;
  const out = { targets: [], aliasTrueExcluded: aliasTrue, total: all.length, combos: [], errors: [] };
  const comboKeys = new Set();
  const targetKeys = new Set();
  for (const r of all.filter((x) => x && x.aliasLabel === false)) {
    const trig = triggerListFor(String(r.state || ''));
    const dupShot = (manifest.shots || []).find((s) => s && s.page === r.page && s.identity === r.identity && s.state === r.dupOf)
      || (manifest.shots || []).find((s) => s && s.page === r.page && s.identity === r.identity && String(s.state || '').indexOf(String(r.dupOf)) === 0)
      || null;
    const defaultShot = (manifest.shots || []).find((s) => s && s.page === r.page && s.identity === r.identity && s.state === '默认') || null;
    let params = '';
    let paramsSource = '';
    if (dupShot && typeof dupShot.params === 'string') { params = dupShot.params; paramsSource = 'shots[dupOf].params@' + (dupShot.path || ''); }
    else if (defaultShot && typeof defaultShot.params === 'string') { params = defaultShot.params; paramsSource = 'shots[默认].params@' + (defaultShot.path || ''); }
    else {
      // 兜底沿用 tour 自己的参数源 scripts/r11-param-map.json（tour-R6.mjs:94,1545-1546 同法），不新造参数。
      try {
        const pm = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'r11-param-map.json'), 'utf8'));
        params = (pm.params && pm.params[r.page]) || '';
        paramsSource = 'scripts/r11-param-map.json';
      } catch (e) { paramsSource = 'UNRESOLVED(' + e.message.slice(0, 60) + ')'; out.errors.push('params 无法解析 ' + r.identity + ' ' + r.page); }
    }
    const key = r.page + '|' + r.dupOf + '->' + r.state;
    comboKeys.add(key);
    const tkey = [r.identity, r.page, r.state].join('|');
    if (targetKeys.has(tkey)) out.errors.push('目标键重复（同一 identity+page+state 出现两条 aliasLabel:false）: ' + tkey);
    targetKeys.add(tkey);
    out.targets.push({
      identity: r.identity, page: r.page, state: r.state, suite: r.suite, dupOf: r.dupOf,
      contentHash: r.contentHash, notSavedAs: r.notSavedAs, realContentOfFrame: r.realContentOfFrame,
      severity: r.severity, tourAt: r.at,
      params: params, paramsSource: paramsSource,
      dupOfFramePath: dupShot ? dupShot.path : '', dupOfFrameHash: dupShot ? dupShot.contentHash : '',
      dupOfFrameBytes: dupShot ? dupShot.bytes : null,
      dupOfFrameRoute: dupShot ? dupShot.route : '',
      dupOfHashAgrees: !!dupShot ? (dupShot.contentHash === r.contentHash) : null,
      triggerList: trig ? trig.name : 'NONE',
      triggerCandidates: trig ? trig.list.length : 0,
      triggerTourRef: trig ? trig.tourRef : '',
      settleMs: trig ? trig.settleMs : null,
      isFormPage: FORM_PAGES.has(r.page),
      comboKey: key,
      key: tkey,
    });
  }
  out.combos = Array.from(comboKeys);
  return out;
}

/* ================= 纯逻辑：轮询与判据 =================
 * page / signature / trigger 全走参数注入 ⇒ 自检能拿一个 plain JS stub 驱动整条轮询循环，
 * 不需要 automator，也就不需要模拟器。 */
const POLL_INTERVAL_MS = Number(ENV('RESHOOT_POLL_INTERVAL_MS', 400));
const POLL_TIMEOUT_MS = Number(ENV('RESHOOT_POLL_TIMEOUT_MS', 8000));
const MAX_POLLS = Number(ENV('RESHOOT_MAX_POLLS', 60));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollUntilChanged(opts) {
  const signature = opts.signature;
  const targetRoute = opts.targetRoute;
  const intervalMs = Number.isFinite(opts.intervalMs) ? opts.intervalMs : POLL_INTERVAL_MS;
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : POLL_TIMEOUT_MS;
  const maxPolls = Number.isFinite(opts.maxPolls) ? opts.maxPolls : MAX_POLLS;
  const timeline = [];
  const t0 = Date.now();
  let i = 0;
  let stopReason = 'timeout';
  for (;;) {
    i += 1;
    let s = null;
    let sigErr = '';
    try { s = await signature(); } catch (e) { sigErr = (e && e.message ? e.message : String(e)).slice(0, 200); }
    const changed = !!s && s.sigHash !== opts.s0.sigHash;
    const routeLeft = !!s && s.route && s.route !== targetRoute;
    timeline.push({
      i: i,
      tMs: Date.now() - t0,
      sigHash: s ? s.sigHash : ('SIG_ERR:' + sha16(sigErr || 'x')),
      routeDiff: !s ? 'sig-error' : (routeLeft ? ('left:' + s.route) : 'same'),
      sigError: sigErr,
    });
    if (changed) { stopReason = routeLeft ? 'nav' : 'changed'; break; }
    if (i >= maxPolls) { stopReason = 'max-polls'; break; }
    if (Date.now() - t0 >= timeoutMs) { stopReason = 'timeout'; break; }
    await sleep(intervalMs);
  }
  return { timeline: timeline, stopReason: stopReason, polls: timeline.length, elapsedMs: Date.now() - t0 };
}

function classifyPoll(s0, pollRes, targetRoute) {
  const last = pollRes.timeline[pollRes.timeline.length - 1] || null;
  const changedIdx = pollRes.timeline.findIndex((e) => e.sigHash !== s0.sigHash && e.routeDiff === 'same');
  const navIdx = pollRes.timeline.findIndex((e) => String(e.routeDiff).indexOf('left:') === 0);
  const distinct = Array.from(new Set(pollRes.timeline.map((e) => e.sigHash)));
  if (pollRes.stopReason === 'nav' || (navIdx >= 0 && (changedIdx < 0 || navIdx < changedIdx))) {
    const land = String(last.routeDiff).replace(/^left:/, '');
    return { verdict: 'NAV_ERROR', changedAtPoll: navIdx + 1, landingRoute: land,
      note: 'D8 落点分诊：交互后栈顶路由为 ' + (land || '(空)') + ' ≠ 目标页 ' + targetRoute + ' —— 跳出是合法行为，但不是页内状态' };
  }
  if (changedIdx >= 0) {
    const at = pollRes.timeline[changedIdx];
    return {
      verdict: changedIdx === 0 ? 'STATE_APPLIED_EARLY' : 'STATE_APPLIED_LATE',
      changedAtPoll: changedIdx + 1, changedAtMs: at.tMs, landingRoute: targetRoute,
      note: changedIdx === 0
        ? '第 1 拍即已变（首拍 t=' + at.tMs + 'ms，本轮预算 ' + pollRes.elapsedMs + 'ms）：上一轮 A-2 的「采早了」担忧是噪声，状态其实到位了'
        : '签名在第 ' + (changedIdx + 1) + ' 拍 t=' + at.tMs + 'ms 才变化 ⇒ 上一轮固定 sleep 之后再截屏属 harness 计时问题',
    };
  }
  if (distinct.length === 1) {
    return { verdict: 'NO_STATE_CHANGE', changedAtPoll: null, landingRoute: targetRoute,
      note: '轮询 ' + pollRes.polls + ' 拍 / ' + pollRes.elapsedMs + 'ms 签名逐拍相同（stopReason=' + pollRes.stopReason + '）⇒ 产品缺陷候选，需人工看帧' };
  }
  return { verdict: 'NO_STATE_CHANGE', changedAtPoll: null, landingRoute: targetRoute,
    note: '轮询 ' + pollRes.polls + ' 拍出现 ' + distinct.length + ' 个不同签名但均未偏离 S0 判定窗（stopReason=' + pollRes.stopReason + '）；签名抖动不视为状态生效' };
}

/* ================= 纯逻辑：页面签名 =================
 * 组成写进每条记录（signatureSpec），使「签名变了」是可核对的断言而不是黑箱。
 * 有界性：选择器条数固定、文本调用次数封顶（每拍一次 WS 往返 ~50ms，无界就会拖死整轮）。 */
const SIG_OVERLAY_SELECTORS = ['[class*="popup"]', '[class*="mask"]', '[class*="modal"]', '[class*="overlay"]',
  '[class*="sheet"]', '[class*="drawer"]', '[class*="toast"]', '[class*="error"]', '[class*="active"]',
  '[class*="selected"]', '[class*="disabled"]'];
const SIG_TEXT_SELECTORS = ['__ROOT__', '[class*="error"]', '[class*="popup"]', '[class*="mask"]', '[class*="title"]'];
const SIG_TEXT_MAX = Number(ENV('RESHOOT_SIG_TEXT_MAX', 8));
const RPC_TIMEOUT_MS = Number(ENV('RESHOOT_RPC_TIMEOUT_MS', 6000));
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    let done = false;
    const t = setTimeout(() => { if (done) return; done = true; reject(new Error('RPC 超时(' + label + ') >' + ms + 'ms')); }, ms);
    if (t && t.unref) t.unref();
    promise.then((v) => { if (done) return; done = true; clearTimeout(t); resolve(v); },
      (e) => { if (done) return; done = true; clearTimeout(t); reject(e); });
  });
}
async function computeSignature(deps) {
  const page = deps.page;
  const probeRoute = deps.probeRoute;
  const rootMarker = deps.rootMarker || '';
  const extra = deps.extraSelectors || [];
  const sels = [];
  if (rootMarker) sels.push(rootMarker);
  for (const s of SIG_OVERLAY_SELECTORS) if (sels.indexOf(s) < 0) sels.push(s);
  for (const s of extra) if (s && sels.indexOf(s) < 0) sels.push(s);
  const r = await probeRoute();
  const counts = {};
  for (const sel of sels) {
    try {
      const els = await withTimeout(page.$$(sel), deps.rpcTimeoutMs || RPC_TIMEOUT_MS, '$$' + sel);
      counts[sel] = els ? els.length : 0;
    } catch (e) { counts[sel] = 'ERR'; }
  }
  const texts = [];
  let textCalls = 0;
  for (const sel of SIG_TEXT_SELECTORS) {
    if (textCalls >= (deps.textMax || SIG_TEXT_MAX)) { texts.push('~capped'); break; }
    const target = sel === '__ROOT__' ? rootMarker : sel;
    if (!target) continue;
    try {
      const el = await withTimeout(page.$(target), deps.rpcTimeoutMs || RPC_TIMEOUT_MS, '$' + target);
      if (!el) continue;
      const t = await withTimeout(el.text(), deps.rpcTimeoutMs || RPC_TIMEOUT_MS, 'text' + target);
      texts.push(target + '=' + String(t == null ? '' : t).replace(/\s+/g, ' ').slice(0, 120));
      textCalls += 1;
    } catch (e) { texts.push(target + '=ERR'); textCalls += 1; }
  }
  const payload = { route: r.top, depth: r.depth, counts: counts, text: texts.join('|') };
  return {
    sigHash: sha16(JSON.stringify(payload)),
    route: r.top, routeStack: r.stack, routeDepth: r.depth,
    counts: counts, textCalls: textCalls,
    signatureSpec: {
      routeSource: 'getCurrentPages() 栈顶（同 tour-R6.mjs:391-407 probeRoute，不用 currentPage().path —— 跳转在途会滞后报旧页）',
      elementCountSelectors: sels,
      textSelectors: SIG_TEXT_SELECTORS,
      textCallCap: deps.textMax || SIG_TEXT_MAX,
      textCallsMade: textCalls,
      hash: 'sha256(JSON.stringify({route,depth,counts,text})).slice(0,16)',
      rootMarker: rootMarker,
    },
  };
}

/* ================= tapSelector（抄 tour-R6.mjs:1031-1038，逐字同语义） ================= */
async function tapSelector(page, candidates) {
  if (!page) return '';
  for (const sel of candidates) {
    try { const el = await page.$(sel); if (el) { await el.tap(); return sel; } } catch (_) { /* try next */ }
  }
  return '';
}

/* ================= 根标记：从产物 WXML 首元素实读，不用固定 sleep ================= */
function rootMarkerFromWxml(route) {
  const f = path.join(REPO, 'apps', 'client', 'dist', 'build', 'mp-weixin', route + '.wxml');
  let src = '';
  try { src = fs.readFileSync(f, 'utf8'); } catch (e) { return { marker: 'view', source: 'wxml-unreadable(' + toRel(f) + ')', raw: '' }; }
  const m = /^\s*<view[^>]*\sclass="([^"]*)"/.exec(src);
  if (!m) return { marker: 'view', source: 'wxml-no-root-view(' + toRel(f) + ')', raw: src.slice(0, 80) };
  // uni-app 会把 scoped 样式类（data-v-*）与安全区工具类混在根 class 里，那些不是「本页」的标识
  const cls = String(m[1]).split(/\s+/).filter((c) => c && !/^data-v-/.test(c) && c !== 'page-bottom-safe');
  if (!cls.length) return { marker: 'view', source: 'wxml-root-class-only-scoped(' + toRel(f) + ')', raw: m[1] };
  return { marker: '.' + cls[0], source: toRel(f), raw: m[1] };
}

/* ================= provenance：运行时取，禁止字面量 ================= */
function gitSha() {
  try { return execSync('git rev-parse --short HEAD', { cwd: REPO, encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch (e) { return 'unknown'; }
}
const GIT_SHA = gitSha();

/* ================= 身份会话（机制抄 tour-R6.mjs:807-835 mintSession + :941-958 bootIdentity） =================
 * A = tmp/r11_chains2.py 里的手机号密码走 /api/v1/auth/phone-login；B = /api/v1/auth/guest-login；
 * 再把 token 注入 app 存储并 pinia session.bootstrap()，verify 到 isLoggedIn 才算这个身份可用。
 * 复现不了就记 IDENTITY_UNAVAILABLE —— 绝不悄悄拿另一个身份的会话去补拍（那等于伪造可比性）。
 * 不写 token 文件（tour 的 tmp_r2_login.json 在离线档白名单外），只记 token 指纹。 */
function apiPost(jsonPath, payload) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload || {}), 'utf8');
    const req = http.request({
      host: '127.0.0.1', port: Number(ENV('RESHOOT_API_PORT', 8080)), path: jsonPath, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }, timeout: 15000,
    }, (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve({ status: res.statusCode, body: d })); });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('api timeout')));
    req.write(body); req.end();
  });
}
function readACredentials() {
  const src = fs.readFileSync(path.join(REPO, 'tmp', 'r11_chains2.py'), 'utf8');
  const mPhone = src.match(/"phone"\s*:\s*"(\d{11})"/);
  const mPwd = src.match(/"password"\s*:\s*"([^"]+)"/);
  if (!mPhone || !mPwd) throw new Error('cannot read A credentials from tmp/r11_chains2.py');
  return { phone: mPhone[1], password: mPwd[1] };
}
async function mintSession(kind) {
  if (kind === 'A') {
    const cred = readACredentials();
    const r = await apiPost('/api/v1/auth/phone-login', { phone: cred.phone, password: cred.password, deviceId: 'reshoot-a' });
    if (r.status !== 200) throw new Error('phone-login http ' + r.status + ' ' + r.body.slice(0, 120));
    return JSON.parse(r.body);
  }
  const r = await apiPost('/api/v1/auth/guest-login', {});
  if (r.status !== 200) throw new Error('guest-login http ' + r.status + ' ' + r.body.slice(0, 120));
  return JSON.parse(r.body);
}
function makeBootFn(token) {
  return new Function(
    "try { wx.setStorageSync('token', " + JSON.stringify(token) + ");" +
    " var app=getApp(); var vm=app['$vm'];" +
    " var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};" +
    " var p=vm['$pinia']||gp['$pinia'];" +
    " var s=p._s.get('session');" +
    " if(s&&s.bootstrap){ s.bootstrap(); } return 'boot-ok'; } catch(e){ return 'ERR '+e.message; }");
}
function makeVerifyFn() {
  return new Function(
    "try { var app=getApp(); var vm=app['$vm'];" +
    " var gp=(vm.$&&vm.$.appContext.config.globalProperties)||{};" +
    " var p=vm['$pinia']||gp['$pinia'];" +
    " var s=p._s.get('session');" +
    " return s && s.isLoggedIn ? 'logged-in userId=' + (s.userSession&&s.userSession.userId) : 'not-logged-in';" +
    " } catch(e){ return 'ERR '+e.message; }");
}

/* ================= 权限弹窗抑制（方法名与语义抄 tour-R6.mjs:200-276,340-365） =================
 * 不抑制就会有一个原生授权层盖在帧上，截图字节必然与 dupOf 帧不同 —— 那是工具自己造的假「状态生效」。
 * mock 函数体经 Function.prototype.toString 在 app 上下文里重新求值（tour-R6.mjs:337-339），
 * 所以体内不得引用外层变量，字面量全部内联。 */
const PERM_MOCKS = [
  { method: 'getLocation', fn: function mockGetLocation(opts) {
    var res = { latitude: 30.2741, longitude: 120.1551, speed: 0, accuracy: 30, errMsg: 'getLocation:ok' };
    if (opts) { if (opts.success) setTimeout(function () { opts.success(res); }, 0); if (opts.complete) setTimeout(function () { opts.complete(res); }, 0); }
    return res;
  } },
  { method: 'chooseLocation', fn: function mockChooseLocation(opts) {
    var res = { errMsg: 'chooseLocation:fail cancel (mocked by poll-reshoot)' };
    if (opts) { if (opts.fail) setTimeout(function () { opts.fail(res); }, 0); if (opts.complete) setTimeout(function () { opts.complete(res); }, 0); }
    return res;
  } },
  { method: 'authorize', fn: function mockAuthorize(opts) {
    var res = { errMsg: 'authorize:ok' };
    if (opts) { if (opts.success) setTimeout(function () { opts.success(res); }, 0); if (opts.complete) setTimeout(function () { opts.complete(res); }, 0); }
    return res;
  } },
  { method: 'getSetting', fn: function mockGetSetting(opts) {
    var res = { authSetting: { 'scope.userLocation': true, 'scope.record': true }, globalAuthSetting: { 'scope.userLocation': true }, errMsg: 'getSetting:ok' };
    if (opts && opts.success) setTimeout(function () { opts.success(res); }, 0);
    return res;
  } },
  { method: 'requirePrivacyAuthorize', fn: function mockRequirePrivacyAuthorize(opts) {
    var res = { errMsg: 'requirePrivacyAuthorize:ok' };
    if (opts) { if (opts.success) setTimeout(function () { opts.success(res); }, 0); if (opts.complete) setTimeout(function () { opts.complete(res); }, 0); }
    return res;
  } },
  { method: 'getPrivacySetting', fn: function mockGetPrivacySetting(opts) {
    var res = { needAuthorization: false, privacyVer: 0, errMsg: 'getPrivacySetting:ok' };
    if (opts && opts.success) setTimeout(function () { opts.success(res); }, 0);
    return res;
  } },
];

/* ================= 落盘：每条记录一完成就重写（append 语义） =================
 * 硬要求：第 3 个目标崩掉时，盘上必须有前 2 条完整记录 —— 所以每条记录后立刻重写三个产物，
 * 而不是等全部跑完再一次性写。 */
function pngDims(buf) {
  try {
    if (!buf || buf.length < 24) return null;
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch (_) { return null; }
}
function shotFileName(t) {
  return t.page.replace(/\//g, '_') + '__' + t.identity + '__' + t.state + '.png';
}
function buildShotManifest(records, meta) {
  const shots = [];
  for (const rec of records) {
    if (!rec.shot || !rec.shot.path) continue;
    shots.push({
      gitSha: GIT_SHA, path: rec.shot.path, bytes: rec.shot.bytes, width: rec.shot.width, height: rec.shot.height,
      page: rec.page, state: rec.state, identity: rec.identity, route: rec.shot.route, routeStack: rec.shot.routeStack,
      routeDepth: rec.shot.routeDepth, contentHash: rec.shot.contentHash, suite: rec.suite, params: rec.params,
      stateFrame: true, aliasLabel: false, verdict: rec.verdict, dupOfPath: rec.dupOfFramePath,
      dupOfContentHash: rec.dupOfFrameHash, sameBytesAsDupOf: rec.sameBytesAsDupOf,
      reshootOf: 'round-6-tour stateNotApplied(aliasLabel:false)',
    });
  }
  return Object.assign({
    gitSha: GIT_SHA, tool: 'scripts/qa/poll-reshoot.cjs', owner: LOCK_OWNER, batch: LOCK_BATCH,
    generatedAt: new Date().toISOString(),
    sourceManifest: toRel(MANIFEST_IN), sourceGitSha: meta.sourceGitSha,
    port: RUN_PORT, portSource: PORT_SOURCE, wsEndpoint: WS_ENDPOINT,
    pollIntervalMs: meta.pollIntervalMs, pollTimeoutMs: meta.pollTimeoutMs, maxPolls: MAX_POLLS,
    signatureSpec: meta.signatureSpec || null,
    verdictLegend: {
      STATE_APPLIED_LATE: '签名变了（非第 1 拍）—— 上一轮固定 sleep 之后截屏 = harness 计时问题，报告在哪一拍变',
      STATE_APPLIED_EARLY: '第 1 拍就变了 —— 上一轮 A-2 的「采早了」担忧是噪声，状态其实到位',
      NO_STATE_CHANGE: '轮询耗尽且签名逐拍相同 —— 产品缺陷候选（本工具不据此直接判缺陷，只给出这一归类）',
      NO_TRIGGER_FOUND: 'tour 原选择器列表一个都没命中 —— 不新造选择器再宣称状态没问题',
      NAV_ERROR: '交互后栈顶路由离开目标页（D8 落点分诊），落点路由逐字记录',
      IDENTITY_UNAVAILABLE: '该身份的会话无法复现（后端不可达 / bootstrap 未达 isLoggedIn）',
      LOCK_BUSY: 'UI 锁被他人在租，未连接即退出',
      CONN_ABORT: 'automator 连接/会话建立失败',
    },
    records: records,
    shots: shots,
  }, {});
}
function buildAuditMd(payload) {
  const L = [];
  L.push('# round-6 stateNotApplied 补拍时间线（poll-reshoot.cjs）');
  L.push('');
  L.push('- 生成时间：' + payload.generatedAt + '  工具：scripts/qa/poll-reshoot.cjs  gitSha：' + GIT_SHA
    + '（运行时 `git rev-parse --short HEAD`）');
  L.push('- 上游账本：' + payload.sourceManifest + ' gitSha=' + payload.sourceGitSha
    + '；目标集 = stateNotApplied.filter(aliasLabel===false) 实读 ' + payload.targetCount + ' 条 / '
    + payload.comboCount + ' 个 page×(dupOf→state) 组合（排除 aliasLabel:true ' + payload.aliasTrueExcluded + ' 条）');
  L.push('- 端口：RESHOOT_PORT=' + (payload.port == null ? '-' : payload.port) + ' source=' + payload.portSource
    + '；轮询：interval=' + payload.pollIntervalMs + 'ms timeout=' + payload.pollTimeoutMs + 'ms maxPolls=' + payload.maxPolls);
  L.push('- 判据语义：STATE_APPLIED_LATE = harness 采早了；NO_STATE_CHANGE = 产品缺陷候选。二者不是同一件事，别混写。');
  L.push('');
  L.push('| # | 身份 | 页面 | 状态 | 触发列表 | 命中选择器 | 判据 | 变化拍/时刻 | 轮询数 | 截图 | 与 dupOf 同字节 |');
  L.push('|---|------|------|------|----------|------------|------|-------------|--------|------|----------------|');
  payload.records.forEach((r, i) => {
    L.push('| ' + (i + 1) + ' | ' + r.identity + ' | ' + r.page + ' | ' + r.state + ' | ' + (r.triggerList || '-')
      + ' | ' + (r.triggerHit || '-') + ' | ' + r.verdict + ' | '
      + (r.changedAtPoll ? ('#' + r.changedAtPoll + ' @ ' + r.changedAtMs + 'ms') : '-') + ' | '
      + (r.timeline ? r.timeline.length : 0) + ' | ' + (r.shot && r.shot.file ? r.shot.file : '-') + ' | '
      + (r.sameBytesAsDupOf === null || r.sameBytesAsDupOf === undefined ? '-' : String(r.sameBytesAsDupOf)) + ' |');
  });
  L.push('');
  L.push('## 逐目标明细（签名组成 + 时间线 + 落点）');
  for (const r of payload.records) {
    L.push('');
    L.push('### ' + r.identity + ' ' + r.page + ' :: ' + r.state + '（dupOf=' + r.dupOf + '）');
    L.push('- verdict=' + r.verdict + '  stopReason=' + (r.stopReason || '-') + '  note=' + (r.note || '-'));
    L.push('- 上游记录：notSavedAs=' + (r.notSavedAs || '-') + ' contentHash=' + (r.contentHash || '-')
      + ' realContentOfFrame=' + (r.realContentOfFrame || '-') + ' severity=' + (r.severity || '-'));
    L.push('- 启动参数：params=' + JSON.stringify(r.params) + ' 来源=' + (r.paramsSource || '-'));
    L.push('- 触发：列表=' + (r.triggerList || '-') + '（' + (r.triggerTourRef || '-') + '，候选 '
      + (r.triggerCandidates || 0) + ' 条）命中=' + (r.triggerHit || '-') + ' 原生框 mock=' + JSON.stringify(r.mockedWxMethods || []));
    L.push('- 落点路由：' + JSON.stringify(r.landingRoute || '') + '  栈深=' + (r.routeDepth == null ? '-' : r.routeDepth));
    L.push('- 截图：' + (r.shot ? (r.shot.path + ' bytes=' + r.shot.bytes + ' sha256[:16]=' + r.shot.contentHash) : '无')
      + '  与 dupOf 帧同字节=' + String(r.sameBytesAsDupOf));
    if (r.signatureSpec) {
      L.push('- 签名组成：选择器 ' + JSON.stringify(r.signatureSpec.elementCountSelectors));
      L.push('- 　　　　　 文本取样 ' + JSON.stringify(r.signatureSpec.textSelectors) + '（上限 '
        + r.signatureSpec.textCallCap + '，实做 ' + r.signatureSpec.textCallsMade + ' 次），哈希=' + r.signatureSpec.hash);
    }
    L.push('- S0 sigHash=' + (r.s0 ? r.s0.sigHash : '-') + ' counts=' + JSON.stringify(r.s0 ? r.s0.counts : null));
    if (r.timeline && r.timeline.length) {
      L.push('- timeline（每拍）：');
      for (const e of r.timeline) L.push('  - #' + e.i + ' t=' + e.tMs + 'ms sigHash=' + e.sigHash + ' routeDiff=' + e.routeDiff + (e.sigError ? (' err=' + e.sigError) : ''));
    } else {
      L.push('- timeline：（无 —— 未进入轮询，原因见 verdict/note）');
    }
    if (r.error) L.push('- error: ' + r.error);
  }
  L.push('');
  L.push('## 汇总');
  L.push(payload.summaryLine);
  L.push('RESHOOT_WRITTEN=' + payload.records.length);
  L.push('');
  L.push('> 本文件的判据只在「真实跑过模拟器」时才有内容；离线档位（--derive-only/--selfcheck）不产出任何帧。');
  return L.join('\n') + '\n';
}

/* ================= 离线档 1：--derive-only ================= */
function runDerive() {
  let manifest = null;
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST_IN, 'utf8')); }
  catch (e) { console.log('RESHOOT_DERIVE=FAIL reason=读不到上游 manifest ' + toRel(MANIFEST_IN) + ' : ' + e.message); process.exit(2); }
  const d = deriveTargets(manifest);
  console.log('RESHOOT_DERIVE source=' + toRel(MANIFEST_IN) + ' gitSha=' + (manifest.gitSha || '-') + ' shots=' + (manifest.shots || []).length);
  console.log('RESHOOT_DERIVE stateNotApplied_total=' + d.total + ' aliasLabel_false=' + d.targets.length
    + ' aliasLabel_true_excluded=' + d.aliasTrueExcluded);
  if (!d.targets.length) {
    // 空扫描集不得「通过」：这类 bug 在本仓反复出现（0 命中看起来像没问题）。
    console.log('RESHOOT_DERIVE=FAIL reason=派生目标集为空（aliasLabel===false 一条都没有），拒绝以空集判通过');
    process.exit(2);
  }
  const combos = new Set(d.targets.map((t) => t.comboKey));
  console.log('RESHOOT_DERIVE distinct_page_x_(dupOf->state)_combos=' + combos.size + ' identities='
    + Array.from(new Set(d.targets.map((t) => t.identity))).sort().join(','));
  const head = ['#', '身份', '页面', '状态', 'dupOf', '触发列表(候选数)', '根标记', 'params', '参数来源', 'dupOf帧哈希一致', 'suite', 'severity'];
  const rows = d.targets.map((t, idx) => {
    const rm = rootMarkerFromWxml(t.page);
    return [String(idx + 1), t.identity, t.page, t.state, t.dupOf, t.triggerList + '(' + t.triggerCandidates + ')',
      rm.marker, JSON.stringify(t.params), t.paramsSource, String(t.dupOfHashAgrees), t.suite, t.severity];
  });
  const widths = head.map((h, i) => Math.max(visualLen(h), ...rows.map((r) => visualLen(String(r[i])))));
  const line = (cells) => cells.map((c, i) => pad(String(c), widths[i])).join(' | ');
  console.log(line(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('-+-'));
  rows.forEach((r) => console.log(line(r)));
  for (const e of d.errors) console.log('RESHOOT_DERIVE_WARN ' + e);
  const perCombo = {};
  d.targets.forEach((t) => { perCombo[t.comboKey] = (perCombo[t.comboKey] || 0) + 1; });
  console.log('RESHOOT_DERIVE combos=' + Object.keys(perCombo).map((k) => k + '×' + perCombo[k]).join('  '));
  const dump = { mode: 'derive-only', generatedAt: new Date().toISOString(), gitSha: GIT_SHA,
    source: toRel(MANIFEST_IN), total: d.total, aliasTrueExcluded: d.aliasTrueExcluded,
    comboCount: combos.size, targets: d.targets, warnings: d.errors };
  writeOut(path.join(TMP_DIR, 'derive.json'), JSON.stringify(dump, null, 2));
  writeOut(path.join(TMP_DIR, 'derive-table.txt'), console_buf.join('\n') + '\n');
  console.log('RESHOOT_DERIVE=OK targets=' + d.targets.length + ' combos=' + combos.size
    + ' aliasTrueExcluded=' + d.aliasTrueExcluded + ' automator_required=' + (GUARD.automatorRequired ? 'YES(VIOLATION)' : 'no')
    + ' tcp_connects=' + GUARD.tcpConnectAttempts.length);
  process.exit(0);
}
const console_buf = [];
{ const orig = console.log; console.log = (...a) => { console_buf.push(a.join(' ')); orig.apply(console, a); }; }
function visualLen(s) { let n = 0; for (const ch of String(s)) n += ch.charCodeAt(0) > 0x2e80 ? 2 : 1; return n; }
function pad(s, w) { const d = w - visualLen(s); return s + ' '.repeat(d > 0 ? d : 0); }

/* ================= 离线档 2：--selfcheck =================
 * 镜像 r-exec.cjs 的 EXEC_SELFCHECK（r-exec.cjs:1877 起）：既断言判据，也断言**自己没越界**。 */
function makeFakeSignatureModel(script) {
  // script: { routeAt(tick), countsAt(tick), textAt(tick) } —— tick 在每次 probeRoute 时 +1，
  // 于是「一次签名 = 一个 tick」是确定的，与真实实现里 probeRoute 恰好在每次签名开头发生一致。
  let tick = 0;
  const elText = {};
  const mkEl = (sel) => ({ __sel: sel, tap: async () => {}, text: async () => String((script.textAt && script.textAt(tick) || {})[sel] || '') });
  return {
    get tick() { return tick; },
    routeCalls: 0,
    probeRoute: async () => { tick += 1; const r = script.routeAt(tick); return { top: r, depth: 1, stack: [r], error: '' }; },
    page: {
      async $(sel) { const c = counts(script, tick)[sel] || 0; return c > 0 ? mkEl(sel) : null; },
      async $$(sel) { const c = counts(script, tick)[sel] || 0; const out = []; for (let i = 0; i < c; i++) out.push(mkEl(sel + '#' + i)); return out; },
    },
  };
}
function counts(script, tick) { return (script.countsAt && script.countsAt(tick)) || {}; }

async function selfcheck() {
  const results = [];
  const fails = [];
  const ok = (name, cond, detail) => {
    results.push((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' :: ' + detail : ''));
    if (!cond) fails.push(name);
    console.log('SELFCHECK_' + (cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' :: ' + detail : ''));
  };

  console.log('RESHOOT_SELFCHECK_BEGIN mode=selfcheck repo=' + REPO + ' writeRoots=' + WRITE_ROOTS.map(toRel).join(','));
  console.log('SELFCHECK provenance gitSha=' + GIT_SHA + '（运行时 git rev-parse 派生；unknown 即 FAIL）');

  /* --- (a) 真实 manifest 的目标派生：条数一律打印，不跟硬编码常数比 --- */
  let manifest = null;
  let d = null;
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST_IN, 'utf8')); d = deriveTargets(manifest); }
  catch (e) { ok('a0-读上游 manifest', false, e.message); }
  if (d) {
    console.log('SELFCHECK_DERIVE total_stateNotApplied=' + d.total + ' aliasLabel_false=' + d.targets.length
      + ' aliasLabel_true_excluded=' + d.aliasTrueExcluded + ' distinct_combos=' + d.combos.length
      + ' identities=' + Array.from(new Set(d.targets.map((t) => t.identity))).sort().join(','));
    ok('a1-目标集非空（空集不得判通过）', d.targets.length > 0, 'targets=' + d.targets.length);
    ok('a2-排除项非空（aliasLabel:true 确有被排除）', d.aliasTrueExcluded > 0, 'aliasTrue=' + d.aliasTrueExcluded);
    ok('a3-条数自洽 false+true==total', d.targets.length + d.aliasTrueExcluded === d.total,
      d.targets.length + '+' + d.aliasTrueExcluded + '==' + d.total);
    ok('a4-组合数>0 且<=目标数', d.combos.length > 0 && d.combos.length <= d.targets.length,
      'combos=' + d.combos.length + ' targets=' + d.targets.length);
    ok('a5-每条目标都能解析出 params 来源', d.targets.every((t) => t.paramsSource && t.paramsSource.indexOf('UNRESOLVED') < 0),
      Array.from(new Set(d.targets.map((t) => t.paramsSource.split('@')[0]))).join(','));
    ok('a6-每条目标都有对应触发列表', d.targets.every((t) => t.triggerList !== 'NONE'),
      Array.from(new Set(d.targets.map((t) => t.triggerList))).join(','));
    ok('a7-目标键唯一（identity+page+state）', d.errors.filter((e) => e.indexOf('重复') >= 0).length === 0, d.errors.join(' / ') || 'none');
    ok('a8-派生过程未越界（automator/网络/落盘）',
      !GUARD.automatorRequired && GUARD.tcpConnectAttempts.length === 0 && GUARD.writes.length === 0,
      'automator=' + GUARD.automatorRequired + ' tcp=' + GUARD.tcpConnectAttempts.length + ' writes=' + GUARD.writes.length);
    // 可比性判据：选择器列表条数必须与 tour-R6.mjs 源码实测数一致，抄漏一条 = 补拍与上一轮不可比。
    const tourSrc = (() => { try { return fs.readFileSync(path.join(REPO, '.zcode', 'tmp', 'tour-R6.mjs'), 'utf8'); } catch (e) { return ''; } })();
    const countOf = (name) => {
      const m = new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];').exec(tourSrc);
      if (!m) return -1;
      return (m[1].match(/'[^']+'/g) || []).length;
    };
    const tourGeneric = countOf('TAP_GENERIC'); const tourOverlay = countOf('TAP_OVERLAY'); const tourSubmit = countOf('TAP_SUBMIT');
    ok('b1-TAP_GENERIC 条数==tour-R6.mjs', tourGeneric === TAP_GENERIC.length, 'mine=' + TAP_GENERIC.length + ' tour=' + tourGeneric);
    ok('b2-TAP_OVERLAY 条数==tour-R6.mjs', tourOverlay === TAP_OVERLAY.length, 'mine=' + TAP_OVERLAY.length + ' tour=' + tourOverlay);
    ok('b3-TAP_SUBMIT 条数==tour-R6.mjs', tourSubmit === TAP_SUBMIT.length, 'mine=' + TAP_SUBMIT.length + ' tour=' + tourSubmit);
  }

  /* --- (b) 判据分类学全覆盖 --- */
  const code = fs.readFileSync(__filename, 'utf8');
  const unproduced = VERDICTS.filter((v) => !VERDICT_PRODUCERS[v]);
  ok('c1-每个枚举都有登记产出路径', unproduced.length === 0, unproduced.join(',') || 'none');
  const notInSource = VERDICTS.filter((v) => code.indexOf("'" + v + "'") < 0);
  ok('c2-每个枚举在源码里都作为判据值出现', notInSource.length === 0, notInSource.join(',') || 'none');
  const enumDiff = VERDICTS.filter((v) => Object.keys(VERDICT_PRODUCERS).indexOf(v) < 0)
    .concat(Object.keys(VERDICT_PRODUCERS).filter((k) => VERDICTS.indexOf(k) < 0));
  ok('c3-枚举表与产出表键集相同', enumDiff.length === 0, enumDiff.join(',') || 'none');

  /* --- (c) 锁体往返：临时目录 + *-probe.lock 命名，绝不碰真实 tmp/qa/locks/ --- */
  const probeDir = path.join(TMP_DIR, 'selfcheck-locks', 'attempt-' + Date.now());
  const realLockDir = path.resolve(REAL_LOCK_DIR);
  ok('d0-自检锁目录在临时根内', isUnder(probeDir, TMP_DIR), toRel(probeDir));
  ok('d1-自检锁目录 != 真实锁目录', !isUnder(probeDir, realLockDir), 'real=' + toRel(realLockDir));
  const ctl = makeLockCtl({ dir: probeDir, resource: 'wechat-automation-0-probe', owner: LOCK_OWNER, allowForeignTakeover: false });
  const roundTrip = ctl.acquire();
  const body = ctl.read();
  ok('d2-空目录可获取', roundTrip.state === 'ACQUIRED', 'file=' + toRel(ctl.file));
  ok('d3-锁体字段齐全', !!(body && body.resource && body.owner && body.pid && body.status === 'LEASED' && body.leaseUntil && body.batch),
    body ? Object.keys(body).join(',') : 'null');
  const roundTripOk = !!(body && body.resource === ctl.resource && body.owner === LOCK_OWNER && body.pid === process.pid
    && body.status === 'LEASED' && new Date(body.leaseUntil).getTime() > Date.now());
  ok('d4-锁体 JSON 往返等价', roundTripOk, 'leaseUntil=' + (body && body.leaseUntil));
  const renew = ctl.acquire();
  ok('d5-同 owner 同 pid 再获取=续租而非 BUSY', renew.state === 'ACQUIRED' && !!renew.renewal, 'state=' + renew.state);
  ctl.heartbeat();
  ok('d6-心跳延长 leaseUntil', new Date(ctl.read().leaseUntil).getTime() >= Date.now() + LEASE_MS - 5000, 'extended');
  ok('d7-释锁写墓碑且不删文件', ctl.release() === true && fs.existsSync(ctl.file) && ctl.read().status === 'released', 'status=' + ctl.read().status);
  // 他人活锁 → BUSY，且**不改动**对方文件（逐字节比对）
  const foreign = path.join(probeDir, 'foreign');
  fs.mkdirSync(foreign, { recursive: true });
  const fctl = makeLockCtl({ dir: foreign, resource: 'wechat-automation-0-probe', owner: 'someone-else', allowForeignTakeover: false });
  const alivePid = process.pid;
  fs.writeFileSync(fctl.file, JSON.stringify({ resource: 'x-probe', owner: 'someone-else', pid: alivePid, status: 'LEASED', leaseUntil: new Date(Date.now() + 60000).toISOString() }, null, 1));
  const beforeBytes = fs.readFileSync(fctl.file);
  const mine = makeLockCtl({ dir: foreign, resource: 'wechat-automation-0-probe', owner: LOCK_OWNER, allowForeignTakeover: false });
  const busy = mine.acquire();
  ok('d8-他人活锁判 BUSY', busy.state === 'BUSY', 'state=' + busy.state + ' owner=' + (busy.lock && busy.lock.owner));
  ok('d9-BUSY 时未改写他人锁文件', Buffer.compare(beforeBytes, fs.readFileSync(mine.file)) === 0, 'byte-identical');
  const dead = makeLockCtl({ dir: path.join(foreign, 'dead'), resource: 'wechat-automation-0-probe', owner: LOCK_OWNER, allowForeignTakeover: false });
  fs.mkdirSync(dead.dir, { recursive: true });
  // 他人「过期租约墓碑」：默认拒绝接管（本工具不改写他人锁文件，哪怕它看起来已经没人要了）
  fs.writeFileSync(path.join(dead.dir, dead.resource + '.lock'), JSON.stringify({ owner: 'someone-else', pid: 2147483645, status: 'LEASED', leaseUntil: new Date(Date.now() - 60000).toISOString() }));
  ok('d10-他人过期锁默认拒绝接管（不改写他人文件）', dead.acquire().state === 'FOREIGN', 'allowForeignTakeover=false');
  const deadButLeased = makeLockCtl({ dir: path.join(foreign, 'dead-leased'), resource: 'wechat-automation-0-probe', owner: LOCK_OWNER, allowForeignTakeover: true });
  fs.mkdirSync(deadButLeased.dir, { recursive: true });
  // 租约未到期 ⇒ 即使 pid 已死也按 BUSY 处理（r-exec/tour 同口径；活租约不是我们可以顺手接走的）
  fs.writeFileSync(path.join(deadButLeased.dir, deadButLeased.resource + '.lock'), JSON.stringify({ owner: 'someone-else', pid: 2147483645, status: 'LEASED', leaseUntil: new Date(Date.now() + 60000).toISOString() }));
  ok('d10b-租约未到期一律 BUSY（即便开了接管开关）', deadButLeased.acquire().state === 'BUSY', 'allowForeignTakeover=true 也拒');
  // 心跳/释放的归属判据：pid 不是自己也绝不写
  ok('d11-非本人持有不释锁', (function () {
    const dir = path.join(foreign, 'notmine'); fs.mkdirSync(dir, { recursive: true });
    const c = makeLockCtl({ dir: dir, resource: 'wechat-automation-0-probe', owner: LOCK_OWNER });
    fs.writeFileSync(path.join(dir, c.resource + '.lock'), JSON.stringify({ owner: LOCK_OWNER, pid: 2147483646, status: 'LEASED' }));
    const b0 = fs.readFileSync(c.file);
    return c.release() === false && Buffer.compare(b0, fs.readFileSync(c.file)) === 0;
  })(), 'release()=false 且文件未变');
  ok('d12-真实锁目录在自检全程零写入',
    !GUARD.writes.some((w) => isUnder(path.join(REPO, w.rel), realLockDir)), 'writes=' + GUARD.writes.filter((w) => w.allowed).length);
  // 陈旧 pid 接管路径（r-exec/tour 语义）：同 owner 且 pidAlive=false 才接管
  ok('d13-同 owner 死 pid 可接管僵尸租约（pidAlive 判据生效）', (function () {
    const dir = path.join(foreign, 'stale-own'); fs.mkdirSync(dir, { recursive: true });
    const c = makeLockCtl({ dir: dir, resource: 'wechat-automation-0-probe', owner: LOCK_OWNER });
    fs.writeFileSync(path.join(dir, c.resource + '.lock'),
      JSON.stringify({ owner: LOCK_OWNER, pid: 2147483644, status: 'LEASED', leaseUntil: new Date(Date.now() + 60000).toISOString(), attempt: 3 }));
    const r = c.acquire();
    return r.state === 'ACQUIRED' && r.takeover === 'stale-own-pid' && c.read().pid === process.pid && c.read().attempt === 4;
  })(), 'takeover=stale-own-pid attempt+1');
  ok('d14-同 owner 活 pid 的租约不得被抢（BUSY）', (function () {
    // 「别的活进程」不能靠猜 pid：起一个真的短命子进程，用它的 pid 当活属主
    const dir = path.join(foreign, 'own-alive'); fs.mkdirSync(dir, { recursive: true });
    const child = require('child_process').spawn(process.execPath, ['-e', 'setTimeout(function(){},8000)'], { stdio: 'ignore' });
    try {
      fs.writeFileSync(path.join(dir, 'wechat-automation-0-probe.lock'),
        JSON.stringify({ owner: LOCK_OWNER, pid: child.pid, status: 'LEASED', leaseUntil: new Date(Date.now() + 60000).toISOString() }));
      const c = makeLockCtl({ dir: dir, resource: 'wechat-automation-0-probe', owner: LOCK_OWNER });
      return c.acquire().state === 'BUSY';
    } finally { try { child.kill(); } catch (e) { /* ignore */ } }
  })(), '另一活进程的租约 → BUSY');
  ok('d15-显式开关下才可接管他人过期死锁', (function () {
    const dir = path.join(foreign, 'foreign-dead-explicit'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'wechat-automation-0-probe.lock'),
      JSON.stringify({ owner: 'someone-else', pid: 2147483643, status: 'LEASED', leaseUntil: new Date(Date.now() - 60000).toISOString() }));
    const c = makeLockCtl({ dir: dir, resource: 'wechat-automation-0-probe', owner: LOCK_OWNER, allowForeignTakeover: true });
    const r = c.acquire();
    return r.state === 'ACQUIRED' && r.takeover === 'foreign-stale' && c.read().takenOverFromOwner === 'someone-else';
  })(), 'RESHOOT_TAKEOVER_FOREIGN_STALE=1 等价路径');

  /* --- (d) plain JS stub 驱动整条轮询循环（无 automator / 无模拟器） --- */
  async function driveStub(script, loopOpts) {
    const o = loopOpts || {};
    const fake = makeFakeSignatureModel(script);
    const targetRoute = script.target;
    const sigOpts = { page: fake.page, probeRoute: fake.probeRoute, rootMarker: '.fake-page', extraSelectors: [], rpcTimeoutMs: 500, textMax: 3 };
    const s0 = await computeSignature(sigOpts);
    const triggerHit = script.triggerHit === undefined ? '.card' : script.triggerHit;
    // 两条终止路径分开验：给足 timeoutMs 时只由 maxPolls 决定（确定性计数），
    // 给足 maxPolls 时才由 deadline 决定 —— 两者混在一起会让断言随机器快慢抖动。
    const res = await pollUntilChanged({
      s0: s0, targetRoute: targetRoute, signature: () => computeSignature(sigOpts),
      intervalMs: o.intervalMs || 2, timeoutMs: o.timeoutMs || 60000, maxPolls: o.maxPolls || 6,
    });
    const cls = classifyPoll(s0, res, targetRoute);
    return { s0: s0, res: res, cls: cls, triggerHit: triggerHit, sigOpts: sigOpts };
  }
  // LATE：S0 占 tick1；tick2/3 不变，tick4 起 overlay 计数 0→1 → 命中第 3 拍（非首拍）
  const lateScript = {
    target: 'pages/fake/index', triggerHit: '.card',
    routeAt: () => 'pages/fake/index',
    countsAt: (t) => ({ '.fake-page': 1, '[class*="popup"]': t >= 4 ? 2 : 0, '[class*="mask"]': t >= 4 ? 1 : 0 }),
    textAt: (t) => ({ '.fake-page': '标题' + (t >= 4 ? '-弹层' : '') }),
  };
  const late = await driveStub(lateScript);
  ok('e1-stub 驱动轮询：时间线非空且有上限', late.res.timeline.length >= 3 && late.res.timeline.length <= 6, 'polls=' + late.res.timeline.length);
  ok('e2-签名在第 3 拍变化 → STATE_APPLIED_LATE', late.cls.verdict === 'STATE_APPLIED_LATE',
    'verdict=' + late.cls.verdict + ' changedAtPoll=' + late.cls.changedAtPoll);
  ok('e3-变化即早停（未跑满 maxPolls）', late.res.polls < 6 && late.res.stopReason === 'changed', 'stop=' + late.res.stopReason + ' polls=' + late.res.polls);
  ok('e4-timeline 条目字段齐全 {i,tMs,sigHash,routeDiff}',
    late.res.timeline.every((e) => typeof e.i === 'number' && typeof e.tMs === 'number' && typeof e.sigHash === 'string' && typeof e.routeDiff === 'string'),
    JSON.stringify(late.res.timeline[0]));
  // EARLY：S0 占 tick1（popup=0），第 1 拍（tick2）就已是弹层态 ⇒ 变化发生在首拍
  const earlyScript = {
    target: 'pages/fake/index', triggerHit: '.card',
    routeAt: () => 'pages/fake/index',
    countsAt: (t) => ({ '.fake-page': 1, '[class*="popup"]': t >= 2 ? 1 : 0 }),
    textAt: () => ({ '.fake-page': '标题' }),
  };
  const early = await driveStub(earlyScript);
  ok('e5-首拍即变 → STATE_APPLIED_EARLY', early.cls.verdict === 'STATE_APPLIED_EARLY' && early.cls.changedAtPoll === 1,
    'verdict=' + early.cls.verdict + ' at=' + early.cls.changedAtPoll);
  // NO_STATE_CHANGE：6 拍全同
  const noChangeScript = {
    target: 'pages/fake/index', triggerHit: '.card',
    routeAt: () => 'pages/fake/index',
    countsAt: () => ({ '.fake-page': 1, '[class*="popup"]': 0 }),
    textAt: () => ({ '.fake-page': '恒定标题' }),
  };
  const noChange = await driveStub(noChangeScript);
  ok('e6-签名逐拍相同 → NO_STATE_CHANGE', noChange.cls.verdict === 'NO_STATE_CHANGE', 'verdict=' + noChange.cls.verdict);
  ok('e7-耗尽型判据跑满 maxPolls 且 sigHash 唯一',
    noChange.res.polls === 6 && new Set(noChange.res.timeline.map((e) => e.sigHash)).size === 1,
    'polls=' + noChange.res.polls + ' distinct=' + new Set(noChange.res.timeline.map((e) => e.sigHash)).size);
  ok('e8-LATE 与 NO_STATE_CHANGE 由签名序列区分（同一 stub 同一预算）',
    late.cls.verdict !== noChange.cls.verdict, 'late=' + late.cls.verdict + ' vs nochange=' + noChange.cls.verdict);
  // deadline 终止路径：maxPolls 给到极大、timeoutMs 收紧 ⇒ 由时间窗结束，拍数>=2 且判据仍是 NO_STATE_CHANGE
  const deadlineRun = await driveStub(noChangeScript, { intervalMs: 8, timeoutMs: 60, maxPolls: 1000 });
  ok('e7b-轮询可由时间窗终止（默认 8s 那条路径的形状）',
    deadlineRun.res.stopReason === 'timeout' && deadlineRun.res.polls >= 2 && deadlineRun.cls.verdict === 'NO_STATE_CHANGE'
      && deadlineRun.res.timeline.every((e) => e.sigHash === deadlineRun.s0.sigHash),
    'stop=' + deadlineRun.res.stopReason + ' polls=' + deadlineRun.res.polls + ' elapsed=' + deadlineRun.res.elapsedMs + 'ms');
  // NAV_ERROR：第 3 拍路由离开
  const navScript = {
    target: 'pages/fake/index', triggerHit: '.card',
    routeAt: (t) => (t >= 3 ? 'subpackages/other/page' : 'pages/fake/index'),
    countsAt: () => ({ '.fake-page': 1 }),
    textAt: () => ({}),
  };
  const nav = await driveStub(navScript);
  ok('e9-路由离开目标页 → NAV_ERROR 且逐字记录落点',
    nav.cls.verdict === 'NAV_ERROR' && nav.cls.landingRoute === 'subpackages/other/page',
    'verdict=' + nav.cls.verdict + ' landing=' + nav.cls.landingRoute);
  // 真实 tapSelector 语义：命中即返回该选择器；全不命中返回 ''（NO_TRIGGER_FOUND 的输入条件）
  const tapPage = makeFakeSignatureModel({ routeAt: () => 'x', countsAt: () => ({ '[class*="popup"]': 1 }), textAt: () => ({}) });
  const emptyPage = makeFakeSignatureModel({ routeAt: () => 'x', countsAt: () => ({}), textAt: () => ({}) });
  ok('e10-tapSelector 全不命中 → 空串', (await tapSelector(emptyPage.page, TAP_OVERLAY)) === '', 'candidates=' + TAP_OVERLAY.length);
  ok('e11-tapSelector 命中语义与 tour-R6.mjs:1031-1038 相同', (await tapSelector(tapPage.page, ['.nope', '[class*="popup"]'])) === '[class*="popup"]', 'hit=[class*="popup"]');

  /* --- 签名组成的可核对性 --- */
  ok('f1-签名含 route/元素计数/文本摘要三部分并写进 signatureSpec',
    !!(late.s0.signatureSpec && late.s0.signatureSpec.elementCountSelectors.length > 1 && late.s0.route === 'pages/fake/index'),
    'selectors=' + (late.s0.signatureSpec ? late.s0.signatureSpec.elementCountSelectors.length : 0) + ' textCalls=' + late.s0.textCalls);
  ok('f2-文本调用次数封顶（一拖不死整轮）', late.s0.textCalls <= 3 + 1, 'textCalls=' + late.s0.textCalls + ' cap=3');
  ok('f3-根标记从产物 WXML 实读（不靠固定 sleep）',
    rootMarkerFromWxml('pages/profile/index').marker === '.profile-page' && rootMarkerFromWxml('nope/nope').marker === 'view',
    'profile=' + rootMarkerFromWxml('pages/profile/index').marker + ' missing→fallback=' + rootMarkerFromWxml('nope/nope').marker);

  /* --- 帧记录字段名必须对上门禁读的口径（门禁读 j.shots??j.frames、s.path||s.file、s.contentHash、s.bytes、j.gitSha） --- */
  const fakeRec = { identity: 'A', page: 'pages/x/index', state: '弹层态', suite: 'S01', dupOf: '交互后',
    params: '', verdict: 'NO_STATE_CHANGE',
    shot: { path: 'reports/screenshots/round-6-reshoot/pages_x_index__A__弹层态.png', bytes: 1234, width: 378, height: 814,
      contentHash: sha16('x'), route: 'pages/x/index', routeStack: ['pages/x/index'], routeDepth: 1 } };
  const fakeManifest = buildShotManifest([fakeRec], metaFor());
  const gateShots = fakeManifest.shots ?? fakeManifest.frames ?? [];   // 与 verify-evidence-corpus.mjs 同一取法
  const fr = gateShots[0] || {};
  ok('f4-帧记录用门禁读的字段名（path/contentHash/bytes/page/state/identity + 顶层 gitSha）',
    gateShots.length === 1 && !!fr.path && !fr.file && !!fr.contentHash && typeof fr.bytes === 'number'
      && fr.page === 'pages/x/index' && fr.state === '弹层态' && fr.identity === 'A'
      && fakeManifest.gitSha === GIT_SHA && /^[0-9a-f]{7,40}$/.test(String(fakeManifest.gitSha)),
    'keys=' + Object.keys(fr).join(','));
  ok('f5-帧的 path 是仓库相对posix（与 round-6-tour manifest 同写法，门禁 cwd=仓库根可直接 existsSync）',
    /^reports\/screenshots\/round-6-reshoot\//.test(fr.path || '') && fr.path.indexOf('\\') < 0, fr.path);

  /* --- 越界总闸 --- */
  ok('z1-全程未 require automator', GUARD.automatorRequired === false, 'flag=' + GUARD.automatorRequired);
  ok('z2-全程未做 TCP 连接', GUARD.tcpConnectAttempts.length === 0, 'attempts=' + JSON.stringify(GUARD.tcpConnectAttempts) + ' blocked=' + GUARD.blockedTcp);
  const underReports = GUARD.writes.filter((w) => w.rel.indexOf('reports/') === 0);
  const underRealLocks = GUARD.writes.filter((w) => w.rel.indexOf('tmp/qa/locks/') === 0);
  ok('z3-未写 reports/**', underReports.length === 0, 'n=' + underReports.length);
  ok('z4-未写 tmp/qa/locks/**（含不删他人锁）', underRealLocks.length === 0, 'n=' + underRealLocks.length);
  ok('z5-所有落盘都在 .zcode/tmp/reshoot/ 内', GUARD.writes.every((w) => w.rel.indexOf('.zcode/tmp/reshoot/') === 0),
    GUARD.writes.map((w) => w.rel).slice(0, 3).join(',') || 'none-yet');
  ok('z6-gitSha 非字面量（运行时派生）', GIT_SHA === 'unknown' ? false : /^[0-9a-f]{7,40}$/.test(GIT_SHA), 'gitSha=' + GIT_SHA);

  const notExercised = ['IDENTITY_UNAVAILABLE（需后端 8080 在跑才能走到 mintSession 失败分支）',
    'CONN_ABORT（需 automator 真实连接失败才走到）',
    '真实端口 + 真实租约上的 exit 3（分类逻辑与 BUSY 输出已用临时锁目录夹具离线跑通，但未在 tmp/qa/locks 上验）'];
  console.log('SELFCHECK_NOTE 未离线执行的判据：' + notExercised.join('；'));
  console.log('SELFCHECK_NOTE 已离线执行的判据：STATE_APPLIED_LATE / STATE_APPLIED_EARLY / NO_STATE_CHANGE /'
    + ' NAV_ERROR（stub 页驱动真实轮询循环）、NO_TRIGGER_FOUND（tapSelector 空命中语义）、'
    + ' LOCK_BUSY 的分类与「不改写他人锁」不变量（d8-d15）');
  console.log('SELFCHECK guards: automator_required=' + (GUARD.automatorRequired ? 'YES(VIOLATION)' : 'no')
    + ' tcp_probe=' + (GUARD.tcpConnectAttempts.length ? 'RAN(VIOLATION)' : 'skipped')
    + ' writes_outside_tmp=' + (underReports.length + underRealLocks.length));
  console.log('SELFCHECK_TALLY PASS=' + results.filter((r) => r.indexOf('PASS') === 0).length + ' FAIL=' + fails.length
    + (fails.length ? ' failed=' + fails.join(',') : ''));
  if (fails.length) { console.log('RESHOOT_SELFCHECK=FAIL reason=' + fails.length + ' 项不通过'); process.exit(2); }
  console.log('RESHOOT_SELFCHECK=OK no_port_probe=1 no_automator_require=1 no_evidence_write=1 no_lock_dir_write=1');
  const dump = { mode: 'selfcheck', generatedAt: new Date().toISOString(), gitSha: GIT_SHA, results: results,
    derive: d ? { total: d.total, falseAlias: d.targets.length, aliasTrue: d.aliasTrueExcluded, combos: d.combos } : null,
    guards: { automatorRequired: GUARD.automatorRequired, tcpConnectAttempts: GUARD.tcpConnectAttempts, writes: GUARD.writes } };
  writeOut(path.join(TMP_DIR, 'selfcheck.json'), JSON.stringify(dump, null, 2));
  process.exit(0);
}

/* ================= 真实档 ================= */
let mp = null;
const records = [];
let heartbeatTimer = null;
let lockCtl = null;
let holdingLock = false;

function summaryLine(override) {
  const n = (v) => records.filter((r) => r.verdict === v).length;
  const decisive = ['STATE_APPLIED_LATE', 'STATE_APPLIED_EARLY', 'NO_STATE_CHANGE', 'NO_TRIGGER_FOUND', 'NAV_ERROR'];
  const err = records.filter((r) => decisive.indexOf(r.verdict) < 0).length;
  const result = override || ((records.length !== deriveCache.targets.length) ? 'FAIL'
    : (err > 0 ? 'PARTIAL' : 'PASS'));
  return 'RESHOOT_RESULT=' + result + ' targets=' + records.length
    + ' APPLIED_LATE=' + n('STATE_APPLIED_LATE') + ' APPLIED_EARLY=' + n('STATE_APPLIED_EARLY')
    + ' NO_CHANGE=' + n('NO_STATE_CHANGE') + ' NO_TRIGGER=' + n('NO_TRIGGER_FOUND')
    + ' NAV=' + n('NAV_ERROR') + ' ERR=' + err;
}
/* 落盘回执必须**读回来数**：本仓「声明的条数 != 盘上条数」这一类错已犯多次，
 * 只打印内存里的 records.length 等于没校验。 */
function writtenCountOnDisk() {
  try {
    const j = JSON.parse(fs.readFileSync(AUDIT_JSON, 'utf8'));
    return Array.isArray(j.records) ? j.records.length : -1;
  } catch (e) { return -1; }
}
const deriveCache = { targets: [], combos: [], aliasTrueExcluded: 0, total: 0 };
function metaFor() {
  return { sourceGitSha: (sourceManifest && sourceManifest.gitSha) || '-', pollIntervalMs: POLL_INTERVAL_MS,
    pollTimeoutMs: POLL_TIMEOUT_MS, maxPolls: MAX_POLLS, signatureSpec: (records.find((r) => r.signatureSpec) || {}).signatureSpec || null };
}
let sourceManifest = null;
// 每完成一个目标就重写三个产物：崩溃在第 3 个也必须留下 2 条完整记录（硬要求）
function flushAll() {
  const payload = Object.assign(buildShotManifest(records, metaFor()), {
    targetCount: deriveCache.targets.length, comboCount: deriveCache.combos.length,
    aliasTrueExcluded: deriveCache.aliasTrueExcluded, port: RUN_PORT, portSource: PORT_SOURCE,
    summaryLine: summaryLine(),
  });
  writeOut(SHOT_MANIFEST, JSON.stringify(payload, null, 2));
  writeOut(AUDIT_JSON, JSON.stringify(payload, null, 2));
  writeOut(AUDIT_MD, buildAuditMd(payload));
  console.log('[flush] records=' + records.length + ' -> ' + toRel(SHOT_MANIFEST) + ',' + toRel(AUDIT_JSON) + ',' + toRel(AUDIT_MD));
}
async function captureShotBuffer(tag) {
  let best = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let buf = null;
    try { buf = Buffer.from(await withTimeout(mp.screenshot(), RPC_TIMEOUT_MS * 2, 'screenshot'), 'base64'); }
    catch (e) { console.log('[shot] ' + tag + ' 第' + attempt + '次失败: ' + e.message); await sleep(2000); continue; }
    if (buf && buf.length && (!best || buf.length > best.length)) best = buf;
    if (best && best.length > 20000) break;
    console.log('[shot] ' + tag + ' 疑似白屏(' + (best ? best.length : 0) + 'B) 第' + attempt + '次');
    await sleep(2000);
  }
  return best;
}
async function probeRouteReal() {
  const raw = await withTimeout(mp.evaluate(new Function(
    "try { var ps=getCurrentPages(); if(!ps||!ps.length) return 'NONE';" +
    " var out=[]; for(var i=0;i<ps.length;i++){ var p=ps[i];" +
    " out.push(String((p&&(p.route||p.__route__))||'')); }" +
    " return JSON.stringify({top:out[out.length-1], depth:ps.length, stack:out});" +
    "} catch(e){ return 'ERR '+e.message; }")), RPC_TIMEOUT_MS, 'probeRoute');
  if (typeof raw === 'string' && raw.charAt(0) === '{') {
    const o = JSON.parse(raw);
    return { top: String(o.top || ''), depth: Number(o.depth || 0), stack: o.stack || [], error: '' };
  }
  return { top: '', depth: 0, stack: [], error: String(raw).slice(0, 120) };
}
let permGen = 0;
let permArmedGen = -1;
async function armPermissionMocks(reason) {
  if (permArmedGen === permGen) return [];
  permArmedGen = permGen;
  const armed = [];
  for (const m of PERM_MOCKS) {
    try { await mp.mockWxMethod(m.method, m.fn); armed.push(m.method); }
    catch (e) { console.log('[perm][WARN] mockWxMethod(' + m.method + ') 失败（本帧可能被系统弹窗污染）: ' + e.message.slice(0, 100)); }
  }
  console.log('[perm] 抑制权限弹窗（' + reason + ' gen=' + permGen + '）：' + (armed.join(',') || '(无)'));
  return armed;
}
async function connectAndPrepare() {
  const A = automatorRequired();
  for (let i = 1; i <= 3; i++) {
    try {
      mp = await A.connect({ wsEndpoint: WS_ENDPOINT });
      await mp.systemInfo();
      console.log('[connect] ok via ' + WS_ENDPOINT + ' attempt #' + i);
      return true;
    } catch (e) {
      console.log('[connect] 失败 #' + i + ': ' + e.message);
      mp = null;
      await sleep(4000);
    }
  }
  return false;
}
const identState = {};   // identity -> {ok, token, userId, verify, error}
async function ensureIdentity(ident) {
  if (identState[ident]) return identState[ident];
  const st = { ok: false, token: '', userId: '', verify: '', error: '' };
  try {
    const sess = await mintSession(ident);
    st.token = sess.token || '';
    st.userId = sess.userId || '';
    if (!st.token) throw new Error('mintSession 未返回 token（identity ' + ident + '）');
    permGen += 1; await armPermissionMocks('身份 ' + ident + ' 连接后');
    let v = String(await mp.evaluate(makeBootFn(st.token)));
    await sleep(2500);
    v = String(await mp.evaluate(makeVerifyFn()));
    if (v.indexOf('logged-in') < 0) {
      await sleep(4000);
      await mp.evaluate(makeBootFn(st.token));
      await sleep(2500);
      v = String(await mp.evaluate(makeVerifyFn()));
    }
    st.verify = v;
    st.ok = v.indexOf('logged-in') >= 0;
    if (!st.ok) st.error = 'bootstrap 后仍未登录（verify=' + v + '）';
  } catch (e) { st.error = (e && e.message ? e.message : String(e)).slice(0, 240); }
  st.tokenFingerprint = st.token ? sha16(st.token) : '';
  identState[ident] = st;
  console.log('[identity ' + ident + '] ok=' + st.ok + ' userId=' + st.userId + ' verify=' + st.verify + ' tokenSHA=' + st.tokenFingerprint + (st.error ? ' err=' + st.error : ''));
  return st;
}
async function waitRootMarker(pageDef, rootMarker, budgetMs) {
  const deadline = Date.now() + budgetMs;
  let landed = '';
  let markerSeen = false;
  while (Date.now() < deadline) {
    const r = await probeRouteReal();
    landed = r.top;
    if (landed === pageDef.page) {
      try {
        const pg = await mp.currentPage();
        if (pg) {
          const el = await withTimeout(pg.$(rootMarker), RPC_TIMEOUT_MS, 'root$');
          if (el) markerSeen = true;
        }
      } catch (e) { /* 标记取不到就继续按路由口径等 */ }
      if (markerSeen) return { ok: true, route: landed, markerSeen: true };
    }
    await sleep(300);
  }
  return { ok: landed === pageDef.page && markerSeen, route: landed, markerSeen: markerSeen };
}
async function runTarget(t) {
  const rec = {
    identity: t.identity, page: t.page, state: t.state, suite: t.suite, dupOf: t.dupOf,
    contentHash: t.contentHash, notSavedAs: t.notSavedAs, realContentOfFrame: t.realContentOfFrame,
    severity: t.severity, params: t.params, paramsSource: t.paramsSource,
    triggerList: t.triggerList, triggerCandidates: t.triggerCandidates, triggerTourRef: t.triggerTourRef,
    isFormPage: t.isFormPage, dupOfFramePath: t.dupOfFramePath, dupOfFrameHash: t.dupOfFrameHash,
    dupOfFrameBytes: t.dupOfFrameBytes, dupOfHashAgrees: t.dupOfHashAgrees,
    verdict: 'CONN_ABORT', note: '', timeline: [], shot: null, sameBytesAsDupOf: null,
    triggerHit: '', mockedWxMethods: [], landingRoute: '', routeDepth: null,
  };
  const finish = async () => { records.push(rec); try { flushAll(); } catch (e) { console.log('[flush][WARN] ' + e.message); } return rec; };
  const idst = await ensureIdentity(t.identity);
  if (!idst.ok) {
    rec.verdict = 'IDENTITY_UNAVAILABLE';
    rec.note = '身份 ' + t.identity + ' 会话无法复现：' + idst.error + '（宁可不补拍，也不拿另一个身份的会话冒充可比证据）';
    return finish();
  }
  try {
    const rm = rootMarkerFromWxml(t.page);
    rec.rootMarker = rm.marker; rec.rootMarkerSource = rm.source;
    permGen += 1;
    rec.mockedWxMethods = await armPermissionMocks('进页前 ' + t.page);
    try { await withTimeout(mp.mockWxMethod('showModal', { confirm: true, cancel: false, content: 'mock' }), RPC_TIMEOUT_MS, 'mock showModal'); rec.mockedWxMethods.push('showModal'); } catch (e) { /* tour-R6.mjs:1340 同样容错 */ }
    try { await withTimeout(mp.mockWxMethod('showActionSheet', { tapIndex: 0 }), RPC_TIMEOUT_MS, 'mock actionSheet'); rec.mockedWxMethods.push('showActionSheet'); } catch (e) { /* ignore */ }
    const url = '/' + t.page + (t.params || '');
    await withTimeout(mp.reLaunch(url), RPC_TIMEOUT_MS * 2, 'reLaunch');
    const w = await waitRootMarker({ page: t.page }, rm.marker, Number(ENV('RESHOOT_NAV_WAIT_MS', 15000)));
    if (!w.ok) {
      rec.verdict = 'NAV_ERROR';
      rec.landingRoute = w.route;
      rec.note = 'reLaunch ' + url + ' 未落在目标页（栈顶=' + (w.route || '(空)') + '，根标记 ' + rm.marker + ' 命中=' + w.markerSeen
        + '）—— D8 落点分诊：这一步失败与「状态未生效」是两件事，不得混记';
      return finish();
    }
    const pg0 = await mp.currentPage();
    const sigOpts = { page: pg0, probeRoute: probeRouteReal, rootMarker: rm.marker, extraSelectors: [], rpcTimeoutMs: RPC_TIMEOUT_MS, textMax: SIG_TEXT_MAX };
    const s0 = await computeSignature(sigOpts);
    rec.s0 = { sigHash: s0.sigHash, route: s0.route, counts: s0.counts, textCalls: s0.textCalls };
    rec.signatureSpec = s0.signatureSpec;
    rec.routeDepth = s0.routeDepth;
    const trig = triggerListFor(t.state);
    const hit = await tapSelector(pg0, trig ? trig.list : []);
    rec.triggerHit = hit;
    if (!hit) {
      rec.verdict = 'NO_TRIGGER_FOUND';
      rec.note = '照抄的选择器列表（' + (trig ? trig.name + ' ' + trig.tourRef : '无对应列表') + '）在本页一个都没命中'
        + ' —— 按纪律不新造选择器再宣称状态没问题';
      return finish();
    }
    // 与 tour 同一节奏：先按它的固定 settle 等一次（可比性），再进入轮询（判据）。
    await sleep(trig.settleMs);
    const res = await pollUntilChanged({ s0: s0, targetRoute: t.page, signature: () => computeSignature(sigOpts),
      intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS, maxPolls: MAX_POLLS });
    rec.timeline = res.timeline;
    rec.stopReason = res.stopReason;
    const cls = classifyPoll(s0, res, t.page);
    rec.verdict = cls.verdict;
    rec.changedAtPoll = (cls.changedAtPoll === undefined ? null : cls.changedAtPoll);
    rec.changedAtMs = (cls.changedAtMs === undefined ? null : cls.changedAtMs);
    rec.landingRoute = cls.landingRoute || '';
    rec.note = cls.note || '';
    const last = res.timeline[res.timeline.length - 1];
    if (last && last.sigHash && last.sigHash.indexOf('SIG_ERR:') !== 0) {
      const finalSig = await computeSignature(sigOpts).catch(() => null);
      if (finalSig) {
        rec.finalSig = { sigHash: finalSig.sigHash, route: finalSig.route, counts: finalSig.counts };
        rec.landingRoute = finalSig.route || rec.landingRoute;
        rec.routeDepth = finalSig.routeDepth;
        rec.routeStack = finalSig.routeStack || [];
      }
    }
    const file = shotFileName(t);
    const buf = await captureShotBuffer(t.identity + '__' + file);
    if (buf) {
      const relPath = toRel(path.join(SHOT_DIR, file));
      writeOut(path.join(SHOT_DIR, file), buf);
      const dims = pngDims(buf);
      const h = sha16(buf);
      rec.shot = { file: file, path: relPath, bytes: buf.length, width: dims ? dims.width : null, height: dims ? dims.height : null,
        contentHash: h, route: rec.landingRoute, routeStack: rec.routeStack || [], routeDepth: rec.routeDepth };
      rec.sameBytesAsDupOf = !!(t.contentHash && h === t.contentHash);
      rec.dupOfCompare = { dupOfContentHash: t.dupOfFrameHash || t.contentHash, reshootContentHash: h,
        agreeWithRecord: t.dupOfFrameHash ? t.dupOfFrameHash === t.contentHash : null };
    } else {
      rec.note = (rec.note ? rec.note + '；' : '') + '截图三次均失败 ⇒ 本目标无 UI 证据，不得当作已验证';
    }
    return finish();
  } catch (e) {
    rec.verdict = 'CONN_ABORT';
    rec.error = (e && e.message ? e.message : String(e)).slice(0, 300);
    rec.note = '目标期异常：' + rec.error;
    return finish();
  }
}
async function realRun() {
  try { sourceManifest = JSON.parse(fs.readFileSync(MANIFEST_IN, 'utf8')); }
  catch (e) { console.log('RESHOOT_RESULT=FAIL reason=读不到上游 manifest ' + toRel(MANIFEST_IN) + ' : ' + e.message); process.exit(2); }
  const d = deriveTargets(sourceManifest);
  deriveCache.targets = d.targets; deriveCache.combos = d.combos;
  deriveCache.aliasTrueExcluded = d.aliasTrueExcluded; deriveCache.total = d.total;
  console.log('RESHOOT_DERIVE stateNotApplied_total=' + d.total + ' targets=' + d.targets.length
    + ' combos=' + d.combos.length + ' aliasTrueExcluded=' + d.aliasTrueExcluded);
  if (!d.targets.length) {
    console.log('RESHOOT_RESULT=FAIL reason=派生目标集为空（aliasLabel===false 一条都没有）—— 空集不判通过');
    process.exit(2);
  }
  const port = await discoverPort();
  if (!port) process.exit(2);  // discoverPort 已打印 FAIL
  lockCtl = makeLockCtl({ dir: ENV('RESHOOT_LOCK_DIR', REAL_LOCK_DIR), resource: 'wechat-automation-' + port,
    owner: LOCK_OWNER, allowForeignTakeover: ENV('RESHOOT_TAKEOVER_FOREIGN_STALE', '') === '1' });
  const a = lockCtl.acquire();
  if (a.state !== 'ACQUIRED') {
    const l = a.lock || {};
    console.log('RESHOOT_LOCK=' + (a.state === 'BUSY' ? 'BUSY' : 'FOREIGN') + ' owner=' + (l.owner || '-')
      + ' pid=' + (l.pid || '-') + ' leaseUntil=' + (l.leaseUntil || '-') + ' file=' + toRel(lockCtl.file));
    console.log(summaryLine('BUSY'));
    console.log('RESHOOT_WRITTEN=0');
    console.log('RESHOOT_LOCK_NOTE=LOCK_BUSY（未连接即退出；本工具绝不改写或删除他人锁文件。'
      + '确认属主进程已死仍要接管时，须显式 RESHOOT_TAKEOVER_FOREIGN_STALE=1）');
    process.exit(3);
    return;
  }
  holdingLock = true;
  heartbeatTimer = setInterval(() => { try { lockCtl.heartbeat(); } catch (e) { /* ignore */ } }, HEARTBEAT_MS);
  if (heartbeatTimer.unref) heartbeatTimer.unref();
  console.log('[lock] acquired ' + toRel(lockCtl.file) + ' owner=' + LOCK_OWNER + ' pid=' + process.pid
    + (a.takeover ? ' takeover=' + a.takeover : ''));
  try {
    if (!(await connectAndPrepare())) {
      records.push({ identity: '-', page: '-', state: '-', suite: '-', dupOf: '-', verdict: 'CONN_ABORT',
        note: '无法连接微信开发者工具（' + WS_ENDPOINT + ' 重试 3 次）—— 0 条 UI 证据，绝不报成功', timeline: [], shot: null, sameBytesAsDupOf: null });
      flushAll();
      console.log(summaryLine('FAIL') + ' reason=无法连接，0 条 UI 证据');
      console.log('RESHOOT_WRITTEN=' + writtenCountOnDisk());
      process.exit(1);
      return;
    }
    const byIdent = {};
    for (const t of deriveCache.targets) (byIdent[t.identity] = byIdent[t.identity] || []).push(t);
    for (const ident of Object.keys(byIdent).sort()) {
      console.log('[identity ' + ident + '] 待补拍 ' + byIdent[ident].length + ' 个组合');
      for (const t of byIdent[ident]) {
        const started = Date.now();
        console.log('[target] ' + ident + ' ' + t.page + ' :: ' + t.state + ' (dupOf=' + t.dupOf + ')');
        await runTarget(t);
        const last = records[records.length - 1];
        console.log('[verdict] ' + ident + ' ' + t.page + ' ' + t.state + ' => ' + last.verdict
          + (last.changedAtPoll ? (' @poll#' + last.changedAtPoll + ' t=' + last.changedAtMs + 'ms') : '')
          + ' polls=' + (last.timeline ? last.timeline.length : 0) + ' 用时=' + (Date.now() - started) + 'ms');
        if (Date.now() - started > Number(ENV('RESHOOT_TARGET_BUDGET_MS', 180000))) {
          console.log('[budget] 本目标已超预算，继续下一目标但记录在案');
        }
        try { await mp.systemInfo(); } catch (e) {
          console.log('[conn] 会话疑似掉线（' + e.message.slice(0, 80) + '），重连');
          permGen += 1;
          if (!(await connectAndPrepare())) { console.log('[conn] 重连失败，剩余目标按 CONN_ABORT 记账'); break; }
          for (const k of Object.keys(identState)) delete identState[k];
        }
      }
    }
  } finally {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    try { if (mp) await mp.disconnect(); } catch (e) { /* ignore */ }
    if (holdingLock && lockCtl) { lockCtl.release(); console.log('[lock] released（墓碑保留：' + toRel(lockCtl.file) + '，不删文件）'); }
  }
  const line = summaryLine();
  console.log(line);
  const written = writtenCountOnDisk();
  console.log('RESHOOT_WRITTEN=' + written);
  // 「声明的条数」与「盘上读回的条数」不一致就是假证据 ⇒ 非零退出，别让 PARTIAL 冒充完工
  if (written !== records.length || written !== deriveCache.targets.length || line.indexOf('RESULT=FAIL') >= 0) {
    console.log('RESHOOT_MISMATCH=WRITTEN_VS_CLAIMED written=' + written + ' claimed=' + records.length
      + ' derived=' + deriveCache.targets.length);
    process.exit(1);
  }
  process.exit(line.indexOf('RESULT=PASS') >= 0 ? 0 : 1);
}
process.on('SIGINT', () => { console.log('[signal] SIGINT'); try { if (holdingLock && lockCtl) lockCtl.release(); } catch (e) { /* ignore */ } process.exit(130); });
process.on('SIGTERM', () => { console.log('[signal] SIGTERM'); try { if (holdingLock && lockCtl) lockCtl.release(); } catch (e) { /* ignore */ } process.exit(143); });
process.on('exit', () => { try { if (holdingLock && lockCtl) lockCtl.release(); } catch (e) { /* ignore */ } });

function usage() {
  console.log([
    'poll-reshoot.cjs —— round-6 stateNotApplied(aliasLabel:false) 补拍判据工具',
    '用法：',
    '  node scripts/qa/poll-reshoot.cjs --derive-only    派生目标表（离线；不 require automator、不连端口、只写 .zcode/tmp/reshoot/）',
    '  node scripts/qa/poll-reshoot.cjs --selfcheck      纯逻辑自检（同上；锁探针用临时目录 *-probe.lock）',
    '  D:\\codex-tools\\node-v22.17.0-win-x64\\node.exe scripts/qa/poll-reshoot.cjs   真实补拍（须 UI 空闲）',
    '退出码：0 全目标有决定性判据 / 1 部分或写出不一致 / 2 前置闸失败（端口、空集、自检）/ 3 锁占用',
  ].join('\n'));
  process.exit(0);
}

(async function main() {
  if (MODE === 'help') usage();
  if (MODE === 'derive') { runDerive(); return; }
  if (MODE === 'selfcheck') { await selfcheck(); return; }
  await realRun();
})().catch((e) => {
  console.log('RESHOOT_RESULT=FAIL reason=顶层异常 ' + ((e && e.stack) || e));
  console.log('RESHOOT_WRITTEN=' + records.length);
  try { if (holdingLock && lockCtl) lockCtl.release(); } catch (_) { /* ignore */ }
  process.exit(1);
});
